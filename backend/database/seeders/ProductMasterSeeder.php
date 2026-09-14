<?php

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\Barcode;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Company;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Unit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductMasterSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::first();
        if (! $company) {
            $company = Company::create([
                'uuid' => (string) Str::uuid(),
                'name' => 'Apex Retail Ltd',
                'legal_name' => 'Apex Retail Holdings Limited',
                'code' => 'APEX-01',
                'country' => 'Bangladesh',
                'currency_code' => 'BDT',
                'timezone' => 'Asia/Dhaka',
                'status' => 'active',
            ]);
        }

        $companyId = $company->id;

        // 1. Categories Hierarchy
        $undergarments = Category::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Undergarments'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'undergarments', 'sort_order' => 1, 'status' => 'active']
        );

        $catBra = Category::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Bra'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'bra', 'parent_id' => $undergarments->id, 'sort_order' => 1, 'status' => 'active']
        );

        $catPanty = Category::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Panty'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'panty', 'parent_id' => $undergarments->id, 'sort_order' => 2, 'status' => 'active']
        );

        $catBraSet = Category::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Bra Set'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'bra-set', 'parent_id' => $undergarments->id, 'sort_order' => 3, 'status' => 'active']
        );

        $catCamisole = Category::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Camisole'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'camisole', 'parent_id' => $undergarments->id, 'sort_order' => 4, 'status' => 'active']
        );

        $kids = Category::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Baby & Kids'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'baby-and-kids', 'sort_order' => 2, 'status' => 'active']
        );

        $catBaby = Category::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Baby Care'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'baby-care', 'parent_id' => $kids->id, 'sort_order' => 1, 'status' => 'active']
        );

        $catBoys = Category::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Boys Clothing'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'boys-clothing', 'parent_id' => $kids->id, 'sort_order' => 2, 'status' => 'active']
        );

        $catGirls = Category::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Girls Clothing'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'girls-clothing', 'parent_id' => $kids->id, 'sort_order' => 3, 'status' => 'active']
        );

        // 2. Brands
        $brandBlossom = Brand::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Blossom'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'blossom', 'description' => 'Premium women essentials', 'status' => 'active']
        );

        $brandComfort = Brand::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'ComfortWear'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'comfortwear', 'description' => 'Everyday comfort innerwear', 'status' => 'active']
        );

        $brandTiny = Brand::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'TinyStars'],
            ['uuid' => (string) Str::uuid(), 'slug' => 'tinystars', 'description' => 'Safe & soft kids apparel', 'status' => 'active']
        );

        // 3. Units
        $unitPcs = Unit::firstOrCreate(
            ['company_id' => $companyId, 'short_code' => 'pcs'],
            ['uuid' => (string) Str::uuid(), 'name' => 'Piece', 'decimal_allowed' => false, 'status' => 'active']
        );

        $unitDz = Unit::firstOrCreate(
            ['company_id' => $companyId, 'short_code' => 'dz'],
            ['uuid' => (string) Str::uuid(), 'name' => 'Dozen', 'decimal_allowed' => false, 'status' => 'active']
        );

        $unitPack = Unit::firstOrCreate(
            ['company_id' => $companyId, 'short_code' => 'pk'],
            ['uuid' => (string) Str::uuid(), 'name' => 'Pack', 'decimal_allowed' => false, 'status' => 'active']
        );

        // 4. Attributes & Values
        $attrColor = Attribute::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Color'],
            ['uuid' => (string) Str::uuid(), 'code' => 'color', 'sort_order' => 1, 'status' => 'active']
        );

        $colorValues = [];
        foreach (['Black', 'White', 'Red', 'Pink', 'Blue'] as $index => $colorName) {
            $colorValues[$colorName] = AttributeValue::firstOrCreate(
                ['attribute_id' => $attrColor->id, 'value' => $colorName],
                ['uuid' => (string) Str::uuid(), 'code' => Str::slug($colorName), 'sort_order' => $index + 1, 'status' => 'active']
            );
        }

        $attrSize = Attribute::firstOrCreate(
            ['company_id' => $companyId, 'name' => 'Size'],
            ['uuid' => (string) Str::uuid(), 'code' => 'size', 'sort_order' => 2, 'status' => 'active']
        );

        $sizeValues = [];
        foreach (['32', '34', '36', '38', 'S', 'M', 'L', 'XL'] as $index => $sizeName) {
            $sizeValues[$sizeName] = AttributeValue::firstOrCreate(
                ['attribute_id' => $attrSize->id, 'value' => $sizeName],
                ['uuid' => (string) Str::uuid(), 'code' => Str::slug($sizeName), 'sort_order' => $index + 1, 'status' => 'active']
            );
        }

        // 5. Products
        // A. Simple Product: Daily Cotton Camisole
        $simpleProduct = Product::firstOrCreate(
            ['company_id' => $companyId, 'slug' => 'daily-cotton-camisole'],
            [
                'uuid' => (string) Str::uuid(),
                'category_id' => $catCamisole->id,
                'brand_id' => $brandComfort->id,
                'unit_id' => $unitPcs->id,
                'name' => 'Daily Cotton Camisole',
                'product_code' => 'CAM-001',
                'description' => 'Breathable 100% combed cotton camisole with adjustable straps.',
                'product_type' => 'simple',
                'has_variants' => false,
                'tax_rate' => 5.00,
                'tax_type' => 'exclusive',
                'reorder_level' => 20,
                'status' => 'active',
            ]
        );

        $simpleVariant = ProductVariant::firstOrCreate(
            ['sku' => 'CAM-001-STD'],
            [
                'uuid' => (string) Str::uuid(),
                'product_id' => $simpleProduct->id,
                'variant_name' => 'Standard',
                'cost_price' => 150.0000,
                'selling_price' => 280.0000,
                'wholesale_price' => 220.0000,
                'mrp' => 300.0000,
                'status' => 'active',
            ]
        );

        Barcode::firstOrCreate(
            ['barcode' => '8901234500018'],
            [
                'uuid' => (string) Str::uuid(),
                'product_variant_id' => $simpleVariant->id,
                'barcode_type' => 'EAN',
                'is_primary' => true,
                'status' => 'active',
            ]
        );

        // B. Variable Product: Classic Cotton Bra (8 variants: 2 colors x 4 sizes)
        $variableProduct = Product::firstOrCreate(
            ['company_id' => $companyId, 'slug' => 'classic-cotton-bra'],
            [
                'uuid' => (string) Str::uuid(),
                'category_id' => $catBra->id,
                'brand_id' => $brandBlossom->id,
                'unit_id' => $unitPcs->id,
                'name' => 'Classic Cotton Bra',
                'product_code' => 'BRA-CC-100',
                'description' => 'Non-padded everyday cotton bra offering gentle support and lift.',
                'product_type' => 'variable',
                'has_variants' => true,
                'tax_rate' => 7.50,
                'tax_type' => 'exclusive',
                'reorder_level' => 50,
                'status' => 'active',
            ]
        );

        $targetColors = ['Black', 'White'];
        $targetSizes = ['32', '34', '36', '38'];
        $baseEan = 8901234510000;
        $counter = 1;

        foreach ($targetColors as $colorName) {
            foreach ($targetSizes as $sizeName) {
                $sku = "BRA-CC-{$colorName[0]}-{$sizeName}";
                $variantName = "{$colorName} / {$sizeName}";

                $variant = ProductVariant::firstOrCreate(
                    ['sku' => $sku],
                    [
                        'uuid' => (string) Str::uuid(),
                        'product_id' => $variableProduct->id,
                        'variant_name' => $variantName,
                        'cost_price' => 220.0000,
                        'selling_price' => 450.0000,
                        'wholesale_price' => 360.0000,
                        'mrp' => 499.0000,
                        'status' => 'active',
                    ]
                );

                // Sync pivot attributes
                $variant->attributeValues()->syncWithoutDetaching([
                    $colorValues[$colorName]->id => ['attribute_id' => $attrColor->id],
                    $sizeValues[$sizeName]->id => ['attribute_id' => $attrSize->id],
                ]);

                // Create primary barcode
                $barcodeStr = (string) ($baseEan + $counter);
                Barcode::firstOrCreate(
                    ['barcode' => $barcodeStr],
                    [
                        'uuid' => (string) Str::uuid(),
                        'product_variant_id' => $variant->id,
                        'barcode_type' => 'EAN',
                        'is_primary' => true,
                        'status' => 'active',
                    ]
                );

                $counter++;
            }
        }
    }
}
