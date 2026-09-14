<?php

namespace Tests\Feature\ProductMaster;

use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\Brand;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;
    protected Category $category;
    protected Brand $brand;
    protected Unit $unit;
    protected Attribute $colorAttribute;
    protected Attribute $sizeAttribute;

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
        
        $this->category = Category::create([
            'name' => 'Electronics',
            'slug' => 'electronics',
            'company_id' => $this->company->id
        ]);
        
        $this->brand = Brand::create([
            'name' => 'Sony',
            'slug' => 'sony',
            'company_id' => $this->company->id
        ]);
        
        $this->unit = Unit::create([
            'name' => 'Piece',
            'short_code' => 'pcs',
            'company_id' => $this->company->id
        ]);

        $this->colorAttribute = Attribute::create([
            'name' => 'Color',
            'company_id' => $this->company->id
        ]);
        
        $this->sizeAttribute = Attribute::create([
            'name' => 'Size',
            'company_id' => $this->company->id
        ]);
    }

    public function test_can_create_simple_product()
    {
        $payload = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Simple TV',
            'product_type' => 'simple',
            'has_variants' => false,
            'variants' => [
                [
                    'sku' => 'TV-001',
                    'variant_name' => 'Simple TV',
                    'cost_price' => 500,
                    'selling_price' => 800,
                ]
            ]
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', ['name' => 'Simple TV']);
        $this->assertDatabaseHas('product_variants', ['sku' => 'TV-001', 'attribute_signature' => '']);
    }

    public function test_can_create_variable_product()
    {
        $valRed = AttributeValue::create(['attribute_id' => $this->colorAttribute->id, 'value' => 'Red']);
        $valBlue = AttributeValue::create(['attribute_id' => $this->colorAttribute->id, 'value' => 'Blue']);
        $valLarge = AttributeValue::create(['attribute_id' => $this->sizeAttribute->id, 'value' => 'Large']);

        $payload = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Variable Shirt',
            'product_type' => 'variable',
            'has_variants' => true,
            'variants' => [
                [
                    'sku' => 'SHIRT-RED-L',
                    'variant_name' => 'Red / Large',
                    'cost_price' => 10,
                    'selling_price' => 20,
                    'attribute_value_ids' => [$valRed->id, $valLarge->id]
                ],
                [
                    'sku' => 'SHIRT-BLUE-L',
                    'variant_name' => 'Blue / Large',
                    'cost_price' => 10,
                    'selling_price' => 20,
                    'attribute_value_ids' => [$valBlue->id, $valLarge->id]
                ]
            ]
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('product_variants', ['sku' => 'SHIRT-RED-L']);
        
        // Check sorted signature
        $expectedSignature1 = implode('-', collect([$valRed->id, $valLarge->id])->sort()->toArray());
        $this->assertDatabaseHas('product_variants', [
            'sku' => 'SHIRT-RED-L',
            'attribute_signature' => $expectedSignature1
        ]);
    }

    public function test_rejects_duplicate_sku_globally()
    {
        Product::create([
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Old Product',
            'slug' => 'old-product',
            'product_type' => 'simple',
            'has_variants' => false,
        ])->variants()->create([
            'sku' => 'DUPE-123',
            'variant_name' => 'Old Variant',
            'attribute_signature' => '',
        ]);

        $payload = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'New Product',
            'product_type' => 'simple',
            'has_variants' => false,
            'variants' => [
                [
                    'sku' => 'DUPE-123',
                    'variant_name' => 'New Variant',
                    'cost_price' => 10,
                    'selling_price' => 20,
                ]
            ]
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/products', $payload);
        $response->assertStatus(409);
    }

    public function test_rejects_duplicate_attribute_combination_in_same_product()
    {
        $valRed = AttributeValue::create(['attribute_id' => $this->colorAttribute->id, 'value' => 'Red']);

        $payload = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Variable Shirt',
            'product_type' => 'variable',
            'has_variants' => true,
            'variants' => [
                [
                    'sku' => 'SHIRT-RED-1',
                    'variant_name' => 'Red',
                    'cost_price' => 10,
                    'selling_price' => 20,
                    'attribute_value_ids' => [$valRed->id]
                ],
                [
                    'sku' => 'SHIRT-RED-2',
                    'variant_name' => 'Red Duplicate',
                    'cost_price' => 10,
                    'selling_price' => 20,
                    'attribute_value_ids' => [$valRed->id]
                ]
            ]
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/products', $payload);
        $response->assertStatus(409);
        $this->assertDatabaseMissing('products', ['name' => 'Variable Shirt']);
    }

    public function test_allows_same_attribute_combination_in_different_products()
    {
        $valRed = AttributeValue::create(['attribute_id' => $this->colorAttribute->id, 'value' => 'Red']);

        $payload1 = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Shirt A',
            'product_type' => 'variable',
            'has_variants' => true,
            'variants' => [
                [
                    'sku' => 'SHIRT-A-RED',
                    'variant_name' => 'Red',
                    'cost_price' => 10,
                    'selling_price' => 20,
                    'attribute_value_ids' => [$valRed->id]
                ]
            ]
        ];

        $this->actingAs($this->user)->postJson('/api/v1/products', $payload1)->assertStatus(201);

        $payload2 = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Shirt B',
            'product_type' => 'variable',
            'has_variants' => true,
            'variants' => [
                [
                    'sku' => 'SHIRT-B-RED',
                    'variant_name' => 'Red',
                    'cost_price' => 10,
                    'selling_price' => 20,
                    'attribute_value_ids' => [$valRed->id]
                ]
            ]
        ];

        $this->actingAs($this->user)->postJson('/api/v1/products', $payload2)->assertStatus(201);
    }
}
