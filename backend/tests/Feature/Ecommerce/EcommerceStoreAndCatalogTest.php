<?php

namespace Tests\Feature\Ecommerce;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Company;
use App\Models\EcommerceCategory;
use App\Models\EcommerceStore;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Database\Seeders\EcommercePermissionsSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EcommerceStoreAndCatalogTest extends TestCase
{
    use RefreshDatabase;

    protected Company $company;
    protected User $user;
    protected Warehouse $warehouse;
    protected Unit $unit;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->seed(EcommercePermissionsSeeder::class);

        $this->company = Company::factory()->create();
        $this->warehouse = Warehouse::create([
            'company_id' => $this->company->id,
            'name' => 'Main Warehouse',
            'code' => 'MWH-01',
            'status' => 'active',
        ]);

        $this->unit = Unit::create([
            'company_id' => $this->company->id,
            'name' => 'Pieces',
            'short_code' => 'PCS',
        ]);

        $this->category = Category::create([
            'company_id' => $this->company->id,
            'name' => 'Electronics',
            'code' => 'ELEC',
        ]);

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($superAdmin->id);
    }

    public function test_get_and_update_ecommerce_store_settings(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Company-ID', $this->company->id)
            ->getJson('/api/v1/ecommerce/store');

        $response->assertStatus(200)
            ->assertJsonPath('code', 'MAIN')
            ->assertJsonPath('currency', 'BDT');

        $storeId = $response->json('id');

        $updateResponse = $this->actingAs($this->user)
            ->withHeader('X-Company-ID', $this->company->id)
            ->putJson("/api/v1/ecommerce/store/{$storeId}", [
                'name' => 'Flagship Online Store',
                'cod_enabled' => true,
                'guest_checkout_enabled' => true,
                'order_prefix' => 'FLAG-',
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('name', 'Flagship Online Store')
            ->assertJsonPath('order_prefix', 'FLAG-');
    }

    public function test_product_publishing_and_visibility_filtering(): void
    {
        // 1. Published and Omnichannel
        $p1 = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Wireless Headphones',
            'slug' => 'wireless-headphones',
            'status' => 'active',
            'is_published' => true,
            'visibility' => 'BOTH',
            'featured' => true,
        ]);
        ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $p1->id,
            'sku' => 'WH-BLK',
            'variant_name' => 'Black',
            'cost_price' => 1500,
            'selling_price' => 2500,
        ]);

        // 2. Unpublished product
        $p2 = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Secret Prototype',
            'slug' => 'secret-prototype',
            'status' => 'active',
            'is_published' => false,
            'visibility' => 'BOTH',
        ]);
        ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $p2->id,
            'sku' => 'SEC-01',
            'variant_name' => 'Standard',
            'cost_price' => 5000,
            'selling_price' => 10000,
        ]);

        // 3. POS only product
        $p3 = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'In-Store Physical Gift Card',
            'slug' => 'gift-card',
            'status' => 'active',
            'is_published' => true,
            'visibility' => 'POS_ONLY',
        ]);
        ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $p3->id,
            'sku' => 'GC-01',
            'variant_name' => 'Standard',
            'cost_price' => 10,
            'selling_price' => 500,
        ]);

        // Public storefront request
        $response = $this->withHeader('X-Company-ID', $this->company->id)
            ->getJson('/api/v1/store/MAIN/products');

        $response->assertStatus(200);
        $data = $response->json('data');

        // Must ONLY return Wireless Headphones
        $this->assertCount(1, $data);
        $this->assertEquals('Wireless Headphones', $data[0]['name']);

        // VERIFY ZERO LEAKAGE of cost_price
        $responseContent = json_encode($data);
        $this->assertStringNotContainsString('1500', $responseContent);
        $this->assertStringNotContainsString('cost_price', $responseContent);
    }

    public function test_public_product_search_and_detail(): void
    {
        $product = Product::create([
            'company_id' => $this->company->id,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'name' => 'Mechanical Gaming Keyboard RGB',
            'slug' => 'gaming-keyboard-rgb',
            'status' => 'active',
            'is_published' => true,
            'visibility' => 'ECOMMERCE_ONLY',
        ]);
        ProductVariant::create([
            'company_id' => $this->company->id,
            'product_id' => $product->id,
            'sku' => 'KB-BLUE',
            'variant_name' => 'Blue Switches',
            'cost_price' => 2000,
            'selling_price' => 3800,
        ]);

        // Search by keyword
        $searchRes = $this->withHeader('X-Company-ID', $this->company->id)
            ->getJson('/api/v1/store/MAIN/products?search=Keyboard');

        $searchRes->assertStatus(200);
        $this->assertCount(1, $searchRes->json('data'));

        // Detail endpoint
        $detailRes = $this->withHeader('X-Company-ID', $this->company->id)
            ->getJson('/api/v1/store/MAIN/products/gaming-keyboard-rgb');

        $detailRes->assertStatus(200)
            ->assertJsonPath('name', 'Mechanical Gaming Keyboard RGB')
            ->assertJsonPath('primary_variant.selling_price', 3800);
    }

    public function test_category_hierarchy(): void
    {
        $parent = EcommerceCategory::create([
            'company_id' => $this->company->id,
            'name' => 'Fashion',
            'slug' => 'fashion',
            'is_active' => true,
        ]);

        $child = EcommerceCategory::create([
            'company_id' => $this->company->id,
            'parent_id' => $parent->id,
            'name' => 'Mens Apparel',
            'slug' => 'mens-apparel',
            'is_active' => true,
        ]);

        $response = $this->withHeader('X-Company-ID', $this->company->id)
            ->getJson('/api/v1/store/MAIN/categories');

        $response->assertStatus(200);
        $cats = $response->json();
        $this->assertCount(1, $cats);
        $this->assertEquals('Fashion', $cats[0]['name']);
        $this->assertCount(1, $cats[0]['children']);
        $this->assertEquals('Mens Apparel', $cats[0]['children'][0]['name']);
    }
}
