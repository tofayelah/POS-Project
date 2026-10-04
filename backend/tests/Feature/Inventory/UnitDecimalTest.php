<?php

namespace Tests\Feature\Inventory;

use App\Models\Category;
use App\Models\Company;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StorageLocation;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class UnitDecimalTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected Warehouse $warehouse;
    protected User $user;
    protected InventoryService $inventoryService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::create(['name' => 'Decimal Test Company']);
        $this->warehouse = Warehouse::create(['name' => 'Main Warehouse', 'company_id' => $this->company->id]);
        $this->user = User::create([
            'name' => 'Admin',
            'email' => 'admin_dec@test.com',
            'password' => bcrypt('password'),
            'company_id' => $this->company->id,
        ]);

        $this->inventoryService = app(InventoryService::class);
    }

    public function test_decimal_not_allowed_rejects_fractional_quantity()
    {
        $category = Category::create(['name' => 'General', 'slug' => 'gen', 'company_id' => $this->company->id]);
        $unitInteger = Unit::create(['name' => 'Piece', 'short_code' => 'pc', 'company_id' => $this->company->id, 'decimal_allowed' => false]);

        $product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unitInteger->id,
            'name' => 'Integer Item',
            'slug' => 'integer-item',
            'status' => 'active',
            'product_type' => 'simple',
            'has_variants' => false,
        ]);

        $variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'INT-PC-1',
            'variant_name' => 'Standard',
            'cost_price' => 50,
            'selling_price' => 100,
            'attribute_signature' => '',
        ]);

        // Attempting to stock in 2.5 pieces must throw ConflictHttpException
        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage("Fractional quantities are not allowed for unit 'Piece'.");

        $this->inventoryService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $variant->id,
            quantity: 2.5,
            unitCost: 50.0,
            referenceType: 'TEST',
            referenceId: 1,
            referenceNumber: 'REF-001'
        );
    }

    public function test_decimal_not_allowed_allows_integer_quantity()
    {
        $category = Category::create(['name' => 'General', 'slug' => 'gen2', 'company_id' => $this->company->id]);
        $unitInteger = Unit::create(['name' => 'Piece', 'short_code' => 'pc2', 'company_id' => $this->company->id, 'decimal_allowed' => false]);

        $product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unitInteger->id,
            'name' => 'Integer Item 2',
            'slug' => 'integer-item-2',
            'status' => 'active',
            'product_type' => 'simple',
            'has_variants' => false,
        ]);

        $variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'INT-PC-2',
            'variant_name' => 'Standard',
            'cost_price' => 50,
            'selling_price' => 100,
            'attribute_signature' => '',
        ]);

        // Stock in 2.0 pieces succeeds
        $movement = $this->inventoryService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $variant->id,
            quantity: 2.0,
            unitCost: 50.0,
            referenceType: 'TEST',
            referenceId: 1,
            referenceNumber: 'REF-002'
        );

        $this->assertNotNull($movement);
        $this->assertEquals(2.0, (float) $movement->quantity);
    }

    public function test_decimal_allowed_accepts_fractional_quantity()
    {
        $category = Category::create(['name' => 'General', 'slug' => 'gen3', 'company_id' => $this->company->id]);
        $unitDecimal = Unit::create(['name' => 'Kilogram', 'short_code' => 'kg', 'company_id' => $this->company->id, 'decimal_allowed' => true]);

        $product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unitDecimal->id,
            'name' => 'Decimal Item',
            'slug' => 'decimal-item',
            'status' => 'active',
            'product_type' => 'simple',
            'has_variants' => false,
        ]);

        $variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'DEC-KG-1',
            'variant_name' => 'Standard',
            'cost_price' => 120,
            'selling_price' => 200,
            'attribute_signature' => '',
        ]);

        // Stock in 1.250 kg succeeds
        $movement = $this->inventoryService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $variant->id,
            quantity: 1.250,
            unitCost: 120.0,
            referenceType: 'TEST',
            referenceId: 1,
            referenceNumber: 'REF-003'
        );

        $this->assertNotNull($movement);
        $this->assertEquals(1.250, (float) $movement->quantity);
    }

    public function test_cross_company_storage_location_is_blocked()
    {
        $companyB = Company::create(['name' => 'Company B']);
        $warehouseB = Warehouse::create(['name' => 'Warehouse B', 'company_id' => $companyB->id]);
        $locationB = StorageLocation::create([
            'company_id' => $companyB->id,
            'warehouse_id' => $warehouseB->id,
            'name' => 'Bin B1',
            'code' => 'LOC-B-01',
            'is_active' => true,
        ]);

        $category = Category::create(['name' => 'General', 'slug' => 'gen4', 'company_id' => $this->company->id]);
        $unit = Unit::create(['name' => 'Piece', 'short_code' => 'pc4', 'company_id' => $this->company->id, 'decimal_allowed' => false]);
        $product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Test Item',
            'slug' => 'test-item',
            'status' => 'active',
            'product_type' => 'simple',
            'has_variants' => false,
        ]);
        $variant = ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'TEST-VAR-LOC',
            'variant_name' => 'Standard',
            'cost_price' => 50,
            'selling_price' => 100,
            'attribute_signature' => '',
        ]);

        // Company A attempts to use Company B's storage location
        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage("Storage location does not belong to the specified company.");

        $this->inventoryService->stockIn(
            companyId: $this->company->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $variant->id,
            quantity: 5.0,
            unitCost: 50.0,
            referenceType: 'TEST',
            referenceId: 1,
            referenceNumber: 'REF-004',
            storageLocationId: $locationB->id
        );
    }
}
