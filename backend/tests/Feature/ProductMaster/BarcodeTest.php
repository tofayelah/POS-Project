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
}
