<?php

namespace Tests\Feature\ProductMaster;

use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\Barcode;
use App\Models\Brand;
use App\Models\BusinessUnit;
use App\Models\Category;
use App\Models\Company;
use App\Models\Product;
use App\Models\ProductVariant;
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

    public function test_allows_same_sku_across_different_companies()
    {
        $company2 = Company::create(['name' => 'Second Company']);
        $user2 = User::create([
            'name' => 'Admin 2',
            'email' => 'admin2@test.com',
            'password' => bcrypt('password'),
            'company_id' => $company2->id,
        ]);
        $category2 = Category::create(['name' => 'Cat 2', 'slug' => 'cat-2', 'company_id' => $company2->id]);
        $unit2 = Unit::create(['name' => 'Unit 2', 'short_code' => 'u2', 'company_id' => $company2->id]);

        // Company 1 creates SKU-UNIQUE-101
        $payload1 = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Prod Company 1',
            'product_type' => 'simple',
            'has_variants' => false,
            'variants' => [
                [
                    'sku' => 'SKU-CROSS-TENANT',
                    'variant_name' => 'Default',
                    'cost_price' => 10,
                    'selling_price' => 20,
                ]
            ]
        ];
        $this->actingAs($this->user)->postJson('/api/v1/products', $payload1)->assertStatus(201);

        // Company 2 creates exact same SKU
        $payload2 = [
            'company_id' => $company2->id,
            'category_id' => $category2->id,
            'unit_id' => $unit2->id,
            'name' => 'Prod Company 2',
            'product_type' => 'simple',
            'has_variants' => false,
            'variants' => [
                [
                    'sku' => 'SKU-CROSS-TENANT',
                    'variant_name' => 'Default',
                    'cost_price' => 15,
                    'selling_price' => 30,
                ]
            ]
        ];
        $this->actingAs($user2)->postJson('/api/v1/products', $payload2)->assertStatus(201);

        $this->assertEquals(2, ProductVariant::where('sku', 'SKU-CROSS-TENANT')->count());
    }

    public function test_company_a_cannot_activate_company_b_product()
    {
        $companyB = Company::create(['name' => 'Company B']);
        $userB = User::create([
            'name' => 'Admin B',
            'email' => 'adminb@test.com',
            'password' => bcrypt('password'),
            'company_id' => $companyB->id,
        ]);
        $categoryB = Category::create(['name' => 'Cat B', 'slug' => 'cat-b', 'company_id' => $companyB->id]);
        $unitB = Unit::create(['name' => 'Unit B', 'short_code' => 'ub', 'company_id' => $companyB->id]);

        $productB = Product::create([
            'company_id' => $companyB->id,
            'category_id' => $categoryB->id,
            'unit_id' => $unitB->id,
            'name' => 'Product B',
            'slug' => 'product-b',
            'status' => 'inactive',
            'product_type' => 'simple',
            'has_variants' => false,
        ]);

        // User A (Company A) tries to activate Company B product
        $response = $this->actingAs($this->user)->postJson("/api/v1/products/{$productB->id}/activate");
        $response->assertStatus(403);
    }

    public function test_company_a_cannot_deactivate_company_b_product()
    {
        $companyB = Company::create(['name' => 'Company B']);
        $userB = User::create([
            'name' => 'Admin B',
            'email' => 'adminb@test.com',
            'password' => bcrypt('password'),
            'company_id' => $companyB->id,
        ]);
        $categoryB = Category::create(['name' => 'Cat B', 'slug' => 'cat-b', 'company_id' => $companyB->id]);
        $unitB = Unit::create(['name' => 'Unit B', 'short_code' => 'ub', 'company_id' => $companyB->id]);

        $productB = Product::create([
            'company_id' => $companyB->id,
            'category_id' => $categoryB->id,
            'unit_id' => $unitB->id,
            'name' => 'Product B',
            'slug' => 'product-b',
            'status' => 'active',
            'product_type' => 'simple',
            'has_variants' => false,
        ]);

        // User A (Company A) tries to deactivate Company B product
        $response = $this->actingAs($this->user)->postJson("/api/v1/products/{$productB->id}/deactivate");
        $response->assertStatus(403);
    }

    public function test_persists_and_returns_all_thirteen_item_master_fields()
    {
        $valRed = AttributeValue::create(['attribute_id' => $this->colorAttribute->id, 'value' => 'Crimson Red']);

        $payload = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'unit_id' => $this->unit->id,
            'name' => 'Flagship Smart TV',
            'product_type' => 'variable',
            'has_variants' => true,
            'tax_rate' => 15.00,
            'tax_type' => 'inclusive',
            'reorder_level' => 25,
            'variants' => [
                [
                    'sku' => 'TV-OLED-55-RED',
                    'variant_name' => '55 Inch Red',
                    'cost_price' => 500.0000,
                    'selling_price' => 800.0000,
                    'mrp' => 850.0000,
                    'attribute_value_ids' => [$valRed->id],
                    'barcodes' => [
                        [
                            'barcode' => '8801234567890',
                            'barcode_type' => 'EAN',
                            'is_primary' => true,
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $productId = $response->json('data.id');
        $this->assertNotNull($productId);

        // Database assertions for all 13 fields
        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'unit_id' => $this->unit->id,
            'name' => 'Flagship Smart TV',
            'product_type' => 'variable',
            'has_variants' => true,
            'tax_rate' => 15.00,
            'tax_type' => 'inclusive',
            'reorder_level' => 25,
        ]);

        $this->assertDatabaseHas('product_variants', [
            'product_id' => $productId,
            'company_id' => $this->company->id,
            'sku' => 'TV-OLED-55-RED',
            'variant_name' => '55 Inch Red',
            'cost_price' => 500.0000,
            'selling_price' => 800.0000,
            'mrp' => 850.0000,
        ]);

        $variant = ProductVariant::where('sku', 'TV-OLED-55-RED')->first();
        $this->assertNotNull($variant);

        $this->assertDatabaseHas('product_variant_attribute_values', [
            'product_variant_id' => $variant->id,
            'attribute_value_id' => $valRed->id,
        ]);

        $this->assertDatabaseHas('barcodes', [
            'company_id' => $this->company->id,
            'product_variant_id' => $variant->id,
            'barcode' => '8801234567890',
            'barcode_type' => 'EAN',
            'is_primary' => true,
        ]);

        // GET endpoint assertion
        $getResponse = $this->actingAs($this->user)->getJson("/api/v1/products/{$productId}");
        $getResponse->assertStatus(200)
            ->assertJsonPath('data.category_id', $this->category->id)
            ->assertJsonPath('data.brand_id', $this->brand->id)
            ->assertJsonPath('data.unit_id', $this->unit->id)
            ->assertJsonPath('data.product_type', 'variable')
            ->assertJsonPath('data.has_variants', true)
            ->assertJsonPath('data.tax_rate', 15)
            ->assertJsonPath('data.tax_type', 'inclusive')
            ->assertJsonPath('data.reorder_level', 25)
            ->assertJsonPath('data.variants.0.sku', 'TV-OLED-55-RED')
            ->assertJsonPath('data.variants.0.barcodes.0.barcode', '8801234567890');
    }

    public function test_rejects_duplicate_barcode_within_same_company()
    {
        $payload1 = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Product Alpha',
            'product_type' => 'simple',
            'has_variants' => false,
            'variants' => [
                [
                    'sku' => 'SKU-ALPHA',
                    'variant_name' => 'Default',
                    'cost_price' => 10,
                    'selling_price' => 20,
                    'barcodes' => [
                        ['barcode' => '999988887777', 'barcode_type' => 'EAN', 'is_primary' => true],
                    ],
                ],
            ],
        ];
        $this->actingAs($this->user)->postJson('/api/v1/products', $payload1)->assertStatus(201);

        // Attempt second product with duplicate barcode in same company
        $payload2 = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Product Beta',
            'product_type' => 'simple',
            'has_variants' => false,
            'variants' => [
                [
                    'sku' => 'SKU-BETA',
                    'variant_name' => 'Default',
                    'cost_price' => 15,
                    'selling_price' => 30,
                    'barcodes' => [
                        ['barcode' => '999988887777', 'barcode_type' => 'EAN', 'is_primary' => true],
                    ],
                ],
            ],
        ];
        $response = $this->actingAs($this->user)->postJson('/api/v1/products', $payload2);
        $response->assertStatus(409);
    }

    public function test_allows_same_barcode_across_different_companies()
    {
        $company2 = Company::create(['name' => 'Other Tenant Co']);
        $user2 = User::create([
            'name' => 'Admin 2',
            'email' => 'admin2_barcode@test.com',
            'password' => bcrypt('password'),
            'company_id' => $company2->id,
        ]);
        $category2 = Category::create(['name' => 'Cat 2', 'slug' => 'cat-2-bc', 'company_id' => $company2->id]);
        $unit2 = Unit::create(['name' => 'Unit 2', 'short_code' => 'u2bc', 'company_id' => $company2->id]);

        $payload1 = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Product Company 1',
            'product_type' => 'simple',
            'has_variants' => false,
            'variants' => [
                [
                    'sku' => 'SKU-CO1',
                    'variant_name' => 'Default',
                    'cost_price' => 10,
                    'selling_price' => 20,
                    'barcodes' => [
                        ['barcode' => '555566667777', 'barcode_type' => 'EAN', 'is_primary' => true],
                    ],
                ],
            ],
        ];
        $this->actingAs($this->user)->postJson('/api/v1/products', $payload1)->assertStatus(201);

        $payload2 = [
            'company_id' => $company2->id,
            'category_id' => $category2->id,
            'unit_id' => $unit2->id,
            'name' => 'Product Company 2',
            'product_type' => 'simple',
            'has_variants' => false,
            'variants' => [
                [
                    'sku' => 'SKU-CO2',
                    'variant_name' => 'Default',
                    'cost_price' => 12,
                    'selling_price' => 24,
                    'barcodes' => [
                        ['barcode' => '555566667777', 'barcode_type' => 'EAN', 'is_primary' => true],
                    ],
                ],
            ],
        ];
        $this->actingAs($user2)->postJson('/api/v1/products', $payload2)->assertStatus(201);

        $this->assertEquals(2, Barcode::where('barcode', '555566667777')->count());
    }

    public function test_updates_product_with_new_tax_pricing_and_reorder_level()
    {
        $payload = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Initial TV',
            'product_type' => 'simple',
            'has_variants' => false,
            'tax_rate' => 5.00,
            'tax_type' => 'exclusive',
            'reorder_level' => 5,
            'variants' => [
                [
                    'sku' => 'TV-INIT',
                    'variant_name' => 'Default',
                    'cost_price' => 100,
                    'selling_price' => 150,
                    'mrp' => 160,
                ],
            ],
        ];
        $res = $this->actingAs($this->user)->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $productId = $res->json('data.id');
        $variantId = $res->json('data.variants.0.id');

        $updatePayload = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'unit_id' => $this->unit->id,
            'name' => 'Updated TV',
            'product_type' => 'simple',
            'has_variants' => false,
            'tax_rate' => 10.00,
            'tax_type' => 'inclusive',
            'reorder_level' => 15,
            'variants' => [
                [
                    'id' => $variantId,
                    'sku' => 'TV-INIT',
                    'variant_name' => 'Default',
                    'cost_price' => 110,
                    'selling_price' => 170,
                    'mrp' => 180,
                ],
            ],
        ];

        $updateRes = $this->actingAs($this->user)->putJson("/api/v1/products/{$productId}", $updatePayload);
        $updateRes->assertStatus(200);

        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'name' => 'Updated TV',
            'brand_id' => $this->brand->id,
            'tax_rate' => 10.00,
            'tax_type' => 'inclusive',
            'reorder_level' => 15,
        ]);

        $this->assertDatabaseHas('product_variants', [
            'id' => $variantId,
            'cost_price' => 110,
            'selling_price' => 170,
            'mrp' => 180,
        ]);
    }

    public function test_tenant_isolation_blocks_cross_company_product_and_variant_read_and_mutation()
    {
        $companyB = Company::create(['name' => 'Company B Corp']);
        $userB = User::create([
            'name' => 'Admin B',
            'email' => 'admin_iso_b@test.com',
            'password' => bcrypt('password'),
            'company_id' => $companyB->id,
        ]);
        $categoryB = Category::create(['name' => 'Cat B', 'slug' => 'cat-iso-b', 'company_id' => $companyB->id]);
        $unitB = Unit::create(['name' => 'Unit B', 'short_code' => 'ub-iso', 'company_id' => $companyB->id]);

        $productB = Product::create([
            'company_id' => $companyB->id,
            'category_id' => $categoryB->id,
            'unit_id' => $unitB->id,
            'name' => 'Company B Secret Product',
            'status' => 'active',
            'product_type' => 'simple',
            'has_variants' => false,
        ]);

        $variantB = ProductVariant::create([
            'company_id' => $companyB->id,
            'product_id' => $productB->id,
            'sku' => 'SKU-COMP-B-SECRET',
            'variant_name' => 'Default',
            'cost_price' => 50,
            'selling_price' => 100,
            'status' => 'active',
        ]);

        // User A (from this->company) cannot view Company B product
        $this->actingAs($this->user)->getJson("/api/v1/products/{$productB->id}")->assertStatus(403);

        // User A cannot update Company B product
        $this->actingAs($this->user)->putJson("/api/v1/products/{$productB->id}", [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Hacked Name',
            'product_type' => 'simple',
            'has_variants' => false,
            'variants' => [['sku' => 'SKU-COMP-B-SECRET', 'variant_name' => 'Default', 'cost_price' => 50, 'selling_price' => 100]],
        ])->assertStatus(403);

        // User A cannot view Company B variant
        $this->actingAs($this->user)->getJson("/api/v1/product-variants/{$variantB->id}")->assertStatus(403);

        // User A cannot update Company B variant
        $this->actingAs($this->user)->putJson("/api/v1/product-variants/{$variantB->id}", [
            'selling_price' => 999,
        ])->assertStatus(403);

        // User A cannot deactivate Company B variant
        $this->actingAs($this->user)->postJson("/api/v1/product-variants/{$variantB->id}/deactivate")->assertStatus(403);

        // User A index of variants does NOT list Company B variant
        $res = $this->actingAs($this->user)->getJson('/api/v1/product-variants');
        $res->assertStatus(200);
        $ids = collect($res->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($variantB->id, $ids);
    }

    public function test_variable_product_edit_preserves_variant_ids_without_duplicates_or_unintended_deletions()
    {
        $valRed = AttributeValue::create(['attribute_id' => $this->colorAttribute->id, 'value' => 'Ruby Red']);
        $valBlue = AttributeValue::create(['attribute_id' => $this->colorAttribute->id, 'value' => 'Sapphire Blue']);
        $valGreen = AttributeValue::create(['attribute_id' => $this->colorAttribute->id, 'value' => 'Emerald Green']);

        // 1. Create variable product with 2 variants
        $createPayload = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Multi-Variant Polo Shirt',
            'product_type' => 'variable',
            'has_variants' => true,
            'variants' => [
                [
                    'sku' => 'POLO-RED',
                    'variant_name' => 'Red',
                    'cost_price' => 20.00,
                    'selling_price' => 40.00,
                    'attribute_value_ids' => [$valRed->id],
                ],
                [
                    'sku' => 'POLO-BLUE',
                    'variant_name' => 'Blue',
                    'cost_price' => 22.00,
                    'selling_price' => 45.00,
                    'attribute_value_ids' => [$valBlue->id],
                ],
            ],
        ];

        $res = $this->actingAs($this->user)->postJson('/api/v1/products', $createPayload);
        $res->assertStatus(201);
        $productId = $res->json('data.id');
        $variantRedId = $res->json('data.variants.0.id');
        $variantBlueId = $res->json('data.variants.1.id');

        // 2. Edit product: update prices on RED (passing ID), keep BLUE (passing ID), add GREEN (no ID)
        $updatePayload = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Multi-Variant Polo Shirt - Updated',
            'product_type' => 'variable',
            'has_variants' => true,
            'variants' => [
                [
                    'id' => $variantRedId,
                    'sku' => 'POLO-RED',
                    'variant_name' => 'Red',
                    'cost_price' => 25.00,
                    'selling_price' => 50.00,
                    'attribute_value_ids' => [$valRed->id],
                ],
                [
                    'id' => $variantBlueId,
                    'sku' => 'POLO-BLUE',
                    'variant_name' => 'Blue',
                    'cost_price' => 22.00,
                    'selling_price' => 45.00,
                    'attribute_value_ids' => [$valBlue->id],
                ],
                [
                    'sku' => 'POLO-GREEN',
                    'variant_name' => 'Green',
                    'cost_price' => 24.00,
                    'selling_price' => 48.00,
                    'attribute_value_ids' => [$valGreen->id],
                ],
            ],
        ];

        $updateRes = $this->actingAs($this->user)->putJson("/api/v1/products/{$productId}", $updatePayload);
        $updateRes->assertStatus(200);

        // 3. Reload from GET /api/v1/products/{id}
        $getRes = $this->actingAs($this->user)->getJson("/api/v1/products/{$productId}");
        $getRes->assertStatus(200);
        $variants = $getRes->json('data.variants');
        $this->assertCount(3, $variants);

        // Verify Red preserved original ID and updated prices
        $redReloaded = collect($variants)->firstWhere('sku', 'POLO-RED');
        $this->assertEquals($variantRedId, $redReloaded['id']);
        $this->assertEquals(25.00, (float) $redReloaded['cost_price']);
        $this->assertEquals(50.00, (float) $redReloaded['selling_price']);

        // Verify Blue preserved original ID
        $blueReloaded = collect($variants)->firstWhere('sku', 'POLO-BLUE');
        $this->assertEquals($variantBlueId, $blueReloaded['id']);

        // Verify Green created as new
        $greenReloaded = collect($variants)->firstWhere('sku', 'POLO-GREEN');
        $this->assertNotNull($greenReloaded['id']);
        $this->assertNotEquals($variantRedId, $greenReloaded['id']);
        $this->assertNotEquals($variantBlueId, $greenReloaded['id']);

        // Database variant count for this product is exactly 3 (no ghost duplicates)
        $this->assertEquals(3, ProductVariant::where('product_id', $productId)->count());
    }

    public function test_pos_barcode_and_sku_lookup_resolves_product_variant()
    {
        $payload = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'POS Scan Item',
            'product_type' => 'simple',
            'has_variants' => false,
            'variants' => [
                [
                    'sku' => 'SKU-SCAN-ME',
                    'variant_name' => 'Default',
                    'cost_price' => 15,
                    'selling_price' => 30,
                    'barcodes' => [
                        ['barcode' => '8901234567890', 'barcode_type' => 'EAN', 'is_primary' => true],
                    ],
                ],
            ],
        ];

        $res = $this->actingAs($this->user)->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $variantId = $res->json('data.variants.0.id');

        // Lookup via Barcode endpoint with barcode
        $barcodeRes = $this->actingAs($this->user)->getJson('/api/v1/pos/barcode/8901234567890');
        $barcodeRes->assertStatus(200);
        $this->assertEquals($variantId, $barcodeRes->json('data.id'));
        $this->assertEquals('SKU-SCAN-ME', $barcodeRes->json('data.sku'));

        // Lookup via Barcode endpoint with SKU fallback
        $skuRes = $this->actingAs($this->user)->getJson('/api/v1/pos/barcode/SKU-SCAN-ME');
        $skuRes->assertStatus(200);
        $this->assertEquals($variantId, $skuRes->json('data.id'));

        // Search endpoint via query
        $searchRes = $this->actingAs($this->user)->getJson('/api/v1/pos/products/search?q=8901234567890');
        $searchRes->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($searchRes->json('data')));
        $this->assertEquals($variantId, $searchRes->json('data.0.id'));
    }

    public function test_retains_four_decimal_precision_and_mrp_fallback()
    {
        $payload = [
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'High Precision Item',
            'product_type' => 'simple',
            'has_variants' => false,
            'variants' => [
                [
                    'sku' => 'SKU-PRECISION-01',
                    'variant_name' => 'Default',
                    'cost_price' => 12.3456,
                    'selling_price' => 23.4567,
                    'wholesale_price' => null, // Should fallback to selling_price
                    'mrp' => null,             // Should fallback to selling_price
                ],
            ],
        ];

        $res = $this->actingAs($this->user)->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $productId = $res->json('data.id');

        $variant = ProductVariant::where('product_id', $productId)->first();
        $this->assertNotNull($variant);

        // Database assertions for DECIMAL(15,4)
        $this->assertEquals(12.3456, (float) $variant->cost_price);
        $this->assertEquals(23.4567, (float) $variant->selling_price);
        $this->assertEquals(23.4567, (float) $variant->mrp);
        $this->assertEquals(23.4567, (float) $variant->wholesale_price);
    }
}

