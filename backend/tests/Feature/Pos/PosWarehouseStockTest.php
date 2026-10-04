<?php

namespace Tests\Feature\Pos;

use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\PaymentMethod;
use App\Models\PosTerminal;
use App\Models\PosSession;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use App\Services\PosService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosWarehouseStockTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected BusinessUnit $bu;
    protected Branch $branchA;
    protected Branch $branchB;
    protected Warehouse $warehouseA;
    protected Warehouse $warehouseB;
    protected User $cashier;
    protected ProductVariant $variant;
    protected PosTerminal $terminalA;
    protected PosSession $sessionA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::create(['name' => 'Retail Company']);
        $this->bu = BusinessUnit::create(['name' => 'Retail BU', 'company_id' => $this->company->id]);
        
        $this->branchA = Branch::create(['name' => 'Branch A', 'company_id' => $this->company->id, 'business_unit_id' => $this->bu->id]);
        $this->warehouseA = Warehouse::create(['name' => 'Warehouse A', 'company_id' => $this->company->id, 'branch_id' => $this->branchA->id, 'business_unit_id' => $this->bu->id]);

        $this->branchB = Branch::create(['name' => 'Branch B', 'company_id' => $this->company->id, 'business_unit_id' => $this->bu->id]);
        $this->warehouseB = Warehouse::create(['name' => 'Warehouse B', 'company_id' => $this->company->id, 'branch_id' => $this->branchB->id, 'business_unit_id' => $this->bu->id]);

        $this->cashier = User::create([
            'name' => 'Cashier A',
            'email' => 'cashier@test.com',
            'password' => bcrypt('password'),
        ]);
        $this->cashier->companies()->attach($this->company->id);
        $this->cashier->branches()->attach($this->branchA->id);

        $permOpen = Permission::firstOrCreate(['name' => 'pos.open_session'], ['group' => 'pos']);
        $permClose = Permission::firstOrCreate(['name' => 'pos.close_session'], ['group' => 'pos']);
        $permView = Permission::firstOrCreate(['name' => 'pos.view'], ['group' => 'pos']);
        $permSale = Permission::firstOrCreate(['name' => 'sales.complete'], ['group' => 'pos']);
        $role = Role::firstOrCreate(['name' => 'POS Cashier']);
        $role->permissions()->syncWithoutDetaching([$permOpen->id, $permClose->id, $permView->id, $permSale->id]);
        $this->cashier->roles()->syncWithoutDetaching([$role->id]);

        $category = Category::create(['name' => 'General', 'slug' => 'general', 'company_id' => $this->company->id]);
        $unit = Unit::create(['name' => 'Piece', 'short_code' => 'pc', 'company_id' => $this->company->id, 'decimal_allowed' => false]);

        $product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Retail Shirt',
            'slug' => 'retail-shirt',
            'status' => 'active',
            'product_type' => 'simple',
            'has_variants' => false,
        ]);

        $this->variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'SHIRT-POS-100',
            'variant_name' => 'Standard',
            'cost_price' => 100,
            'selling_price' => 200,
            'status' => 'active',
            'attribute_signature' => '',
        ]);

        $this->variant->barcodes()->create([
            'company_id' => $this->company->id,
            'barcode' => '8901234567890',
            'barcode_type' => 'EAN',
            'is_primary' => true,
            'status' => 'active',
        ]);

        // Stock in 50 units into Warehouse B (Branch B). Warehouse A has 0 stock.
        $invService = app(InventoryService::class);
        $invService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouseB->id,
            productVariantId: $this->variant->id,
            quantity: 50.0,
            unitCost: 100.0,
            referenceType: 'OPENING',
            referenceId: 1,
            referenceNumber: 'REF-001'
        );

        $this->terminalA = PosTerminal::create([
            'company_id' => $this->company->id,
            'business_unit_id' => $this->bu->id,
            'branch_id' => $this->branchA->id,
            'warehouse_id' => $this->warehouseA->id,
            'terminal_code' => 'TERM-A1',
            'terminal_name' => 'Terminal A1',
            'status' => 'ACTIVE',
        ]);

        $posService = app(PosService::class);
        $this->sessionA = $posService->openSession(
            $this->company->id,
            $this->terminalA->id,
            $this->cashier->id,
            1000
        );
    }

    public function test_pos_search_scopes_stock_to_cashier_active_warehouse()
    {
        // When cashier on Terminal A searches products, stock must be 0 (Warehouse A = 0, Warehouse B = 50)
        $response = $this->actingAs($this->cashier)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->getJson('/api/v1/pos/products/search?q=SHIRT');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertEquals(0, $data[0]['available_stock'], 'Terminal A in Warehouse A must show 0 stock despite Warehouse B having 50 units.');
    }

    public function test_pos_barcode_scopes_stock_to_cashier_active_warehouse()
    {
        // When cashier on Terminal A scans barcode, stock must be 0
        $response = $this->actingAs($this->cashier)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->getJson('/api/v1/pos/barcode/8901234567890');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals(0, $data['available_stock'], 'Barcode scan on Terminal A must show 0 stock.');
    }

    public function test_pos_search_with_explicit_warehouse_filter()
    {
        // Explicitly asking for Warehouse B returns 50 stock
        $response = $this->actingAs($this->cashier)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->getJson('/api/v1/pos/products/search?q=SHIRT&warehouse_id=' . $this->warehouseB->id);

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals(50, $data[0]['available_stock']);
    }

    public function test_sale_completion_uses_session_warehouse_and_rejects_insufficient_stock()
    {
        // Terminal A belongs to Warehouse A (0 stock). Attempting to complete sale must fail with 409
        $pm = PaymentMethod::create(['company_id' => $this->company->id, 'code' => 'CASH', 'name' => 'Cash', 'type' => 'CASH', 'is_active' => true]);

        $payload = [
            'pos_session_id' => $this->sessionA->id,
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 1,
                    'unit_price' => 200,
                ]
            ],
            'payments' => [
                [
                    'method' => 'CASH',
                    'amount' => 200,
                ]
            ]
        ];

        $response = $this->actingAs($this->cashier)
            ->withHeader('X-Company-ID', (string) $this->company->id)
            ->postJson('/api/v1/sales/complete', $payload);

        $response->assertStatus(409);
        $this->assertStringContainsString('Insufficient stock in warehouse', $response->json('message'));
    }
}
