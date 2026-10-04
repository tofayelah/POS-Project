<?php

namespace Tests\Feature\ProductMaster;

use App\Models\Barcode;
use App\Models\Category;
use App\Models\Company;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BarcodeTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::create(['name' => 'Test Company']);
        $this->user = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'company_id' => $this->company->id,
        ]);
        
        $category = Category::create(['name' => 'Cat', 'slug' => 'cat', 'company_id' => $this->company->id]);
        $unit = Unit::create(['name' => 'Unit', 'short_code' => 'u', 'company_id' => $this->company->id]);

        $product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Test Prod',
            'slug' => 'test-prod',
        ]);

        $this->variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'TEST-SKU',
            'variant_name' => 'Test',
            'attribute_signature' => ''
        ]);
    }

    public function test_can_create_barcode()
    {
        $payload = [
            'company_id' => $this->company->id,
            'product_variant_id' => $this->variant->id,
            'barcode' => '123456789012',
            'barcode_type' => 'UPC',
            'is_primary' => true,
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/barcodes', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('barcodes', ['barcode' => '123456789012']);
    }

    public function test_rejects_duplicate_barcode()
    {
        Barcode::create([
            'product_variant_id' => $this->variant->id,
            'barcode' => '12345',
            'barcode_type' => 'EAN'
        ]);

        $payload = [
            'company_id' => $this->company->id,
            'product_variant_id' => $this->variant->id,
            'barcode' => '12345',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/barcodes', $payload);
        $response->assertStatus(422);
    }

    public function test_allows_same_barcode_across_different_companies()
    {
        $company2 = Company::create(['name' => 'Company 2']);
        $user2 = User::create([
            'name' => 'Admin 2',
            'email' => 'admin2@test.com',
            'password' => bcrypt('password'),
            'company_id' => $company2->id,
        ]);
        $category2 = Category::create(['name' => 'Cat 2', 'slug' => 'cat-2', 'company_id' => $company2->id]);
        $unit2 = Unit::create(['name' => 'Unit 2', 'short_code' => 'u2', 'company_id' => $company2->id]);
        $product2 = Product::create([
            'company_id' => $company2->id,
            'category_id' => $category2->id,
            'unit_id' => $unit2->id,
            'name' => 'Prod 2',
            'slug' => 'prod-2',
        ]);
        $variant2 = ProductVariant::create([
            'product_id' => $product2->id,
            'sku' => 'SKU-COMP-2',
            'variant_name' => 'Var 2',
            'attribute_signature' => ''
        ]);

        // Company 1 creates barcode
        $payload1 = [
            'company_id' => $this->company->id,
            'product_variant_id' => $this->variant->id,
            'barcode' => 'SHARED-BARCODE-999',
            'barcode_type' => 'UPC',
            'is_primary' => true,
        ];
        $this->actingAs($this->user)->postJson('/api/v1/barcodes', $payload1)->assertStatus(201);

        // Company 2 creates identical barcode
        $payload2 = [
            'company_id' => $company2->id,
            'product_variant_id' => $variant2->id,
            'barcode' => 'SHARED-BARCODE-999',
            'barcode_type' => 'UPC',
            'is_primary' => true,
        ];
        $this->actingAs($user2)->postJson('/api/v1/barcodes', $payload2)->assertStatus(201);

        $this->assertEquals(2, Barcode::where('barcode', 'SHARED-BARCODE-999')->count());
    }
}
