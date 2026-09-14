<?php
$files = [
    'backend/app/Http/Controllers/Api/V1/BrandController.php',
    'backend/app/Http/Controllers/Api/V1/ProductController.php',
    'backend/app/Http/Controllers/Api/V1/UnitController.php',
    'backend/app/Http/Controllers/Api/V1/InventoryController.php',
    'backend/app/Http/Controllers/Api/V1/TransferController.php',
    'backend/app/Http/Controllers/Api/V1/AttributeController.php',
    'backend/app/Http/Controllers/Api/V1/CategoryController.php',
    'backend/app/Http/Controllers/Api/V1/SupplierController.php',
    'backend/app/Http/Controllers/Api/V1/SupplierLedgerController.php',
    'backend/app/Http/Controllers/Api/V1/CustomerController.php',
    'backend/app/Http/Controllers/Api/V1/CustomerGroupController.php',
];

foreach ($files as $file) {
    if (!file_exists($file)) continue;
    $content = file_get_contents($file);

    // Common replacements to enforce company isolation
    $content = preg_replace('/if \(\$request->filled\(\'company_id\'\)\) \{.*?\}\s+/s', '', $content);
    
    // Sometimes we need to add the company ID scope to the query
    if (strpos($content, '$query = Brand::') !== false) {
        $content = str_replace('$query = Brand::withCount(\'products\');', '$companyId = $request->attributes->get(\'company_id\');' . "\n" . '        $query = Brand::where(\'company_id\', $companyId)->withCount(\'products\');', $content);
    }
    if (strpos($content, '$query = Category::') !== false) {
        $content = str_replace('$query = Category::withCount(\'products\');', '$companyId = $request->attributes->get(\'company_id\');' . "\n" . '        $query = Category::where(\'company_id\', $companyId)->withCount(\'products\');', $content);
    }
    if (strpos($content, '$query = Unit::') !== false) {
        $content = str_replace('$query = Unit::query();', '$companyId = $request->attributes->get(\'company_id\');' . "\n" . '        $query = Unit::where(\'company_id\', $companyId);', $content);
    }
    if (strpos($content, '$query = Attribute::') !== false) {
        $content = str_replace('$query = Attribute::with(\'values\');', '$companyId = $request->attributes->get(\'company_id\');' . "\n" . '        $query = Attribute::where(\'company_id\', $companyId)->with(\'values\');', $content);
    }
    if (strpos($content, '$query = Product::') !== false) {
        $content = str_replace('$query = Product::with([\'category\', \'brand\', \'variants\']);', '$companyId = $request->attributes->get(\'company_id\');' . "\n" . '        $query = Product::where(\'company_id\', $companyId)->with([\'category\', \'brand\', \'variants\']);', $content);
    }

    // Update show(), update(), destroy() methods to enforce company scope check
    // This is hard to do generally, but let's check for IDOR.
    
    file_put_contents($file, $content);
}
echo "Done patching indexes\n";
