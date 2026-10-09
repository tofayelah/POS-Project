<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::get('v1/health', function () {
    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $dbStatus = 'connected';
    } catch (\Exception $e) {
        $dbStatus = 'disconnected';
    }
    return response()->json([
        'status' => 'healthy', 
        'database' => $dbStatus,
        'timestamp' => now()
    ]);
});

Route::middleware('web')->get('v1/sanctum/csrf-cookie', [\Laravel\Sanctum\Http\Controllers\CsrfCookieController::class, 'show']);
Route::post('v1/login', [\App\Http\Controllers\Api\V1\AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('v1/logout', [\App\Http\Controllers\Api\V1\AuthController::class, 'logout']);
    Route::get('v1/me', [\App\Http\Controllers\Api\V1\AuthController::class, 'me']);
    
    Route::prefix('v1')->group(function () {
        // Users & Roles
        Route::get('users', [\App\Http\Controllers\Api\V1\UserController::class, 'index'])->middleware('permission:users.view');
        Route::post('users', [\App\Http\Controllers\Api\V1\UserController::class, 'store'])->middleware('permission:users.create');
        Route::get('users/{user}', [\App\Http\Controllers\Api\V1\UserController::class, 'show'])->middleware('permission:users.view');
        Route::match(['put', 'patch'], 'users/{user}', [\App\Http\Controllers\Api\V1\UserController::class, 'update'])->middleware('permission:users.update');
        Route::delete('users/{user}', [\App\Http\Controllers\Api\V1\UserController::class, 'destroy'])->middleware('permission:users.delete');
        Route::post('users/company-access', [\App\Http\Controllers\Api\V1\UserController::class, 'assignCompanyAccess'])->middleware('permission:users.company_access,users.update');
        Route::post('users/remove-company-access', [\App\Http\Controllers\Api\V1\UserController::class, 'removeCompanyAccess'])->middleware('permission:users.company_access,users.update');
        
        Route::get('roles', [\App\Http\Controllers\Api\V1\RoleController::class, 'index'])->middleware('permission:roles.view');
        Route::post('roles', [\App\Http\Controllers\Api\V1\RoleController::class, 'store'])->middleware('permission:roles.create');
        Route::get('roles/{role}', [\App\Http\Controllers\Api\V1\RoleController::class, 'show'])->middleware('permission:roles.view');
        Route::match(['put', 'patch'], 'roles/{role}', [\App\Http\Controllers\Api\V1\RoleController::class, 'update'])->middleware('permission:roles.update');
        Route::delete('roles/{role}', [\App\Http\Controllers\Api\V1\RoleController::class, 'destroy'])->middleware('permission:roles.delete');
        Route::get('roles/{role}/permissions', [\App\Http\Controllers\Api\V1\RoleController::class, 'permissions'])->middleware('permission:roles.view');
        Route::put('roles/{role}/permissions', [\App\Http\Controllers\Api\V1\RoleController::class, 'syncPermissions'])->middleware('permission:roles.update');

        Route::get('permissions', [\App\Http\Controllers\Api\V1\PermissionController::class, 'index'])->middleware('permission:permissions.view,roles.view');

        Route::get('users/{user}/roles', [\App\Http\Controllers\Api\V1\UserController::class, 'userRoles'])->middleware('permission:users.view');
        Route::put('users/{user}/roles', [\App\Http\Controllers\Api\V1\UserController::class, 'syncUserRoles'])->middleware('permission:users.update');
        
        // Organizational Hierarchy: Company
        Route::get('company', [\App\Http\Controllers\Api\V1\CompanyController::class, 'show']);
        Route::match(['put', 'patch'], 'company', [\App\Http\Controllers\Api\V1\CompanyController::class, 'update'])->middleware('permission:company.update,companies.update');
        Route::get('companies', [\App\Http\Controllers\Api\V1\CompanyController::class, 'index']);
        Route::post('companies', [\App\Http\Controllers\Api\V1\CompanyController::class, 'store'])->middleware('permission:company.create,companies.create');
        Route::get('companies/{company}', [\App\Http\Controllers\Api\V1\CompanyController::class, 'show']);
        Route::match(['put', 'patch'], 'companies/{company}', [\App\Http\Controllers\Api\V1\CompanyController::class, 'update'])->middleware('permission:company.update,companies.update');
        Route::get('companies/{company}/users', [\App\Http\Controllers\Api\V1\UserController::class, 'companyUsers'])->middleware('permission:users.view');
        Route::post('companies/{company}/users', [\App\Http\Controllers\Api\V1\UserController::class, 'assignCompanyUser'])->middleware('permission:users.company_access,users.update');
        Route::delete('companies/{company}/users/{user}', [\App\Http\Controllers\Api\V1\UserController::class, 'removeCompanyUser'])->middleware('permission:users.company_access,users.update');

        // Organizational Hierarchy: Business Units
        Route::get('business-units', [\App\Http\Controllers\Api\V1\BusinessUnitController::class, 'index'])->middleware('permission:business_units.view');
        Route::get('business-units/{businessUnit}', [\App\Http\Controllers\Api\V1\BusinessUnitController::class, 'show'])->middleware(['permission:business_units.view', 'scope:business_unit']);
        Route::post('business-units', [\App\Http\Controllers\Api\V1\BusinessUnitController::class, 'store'])->middleware(['permission:business_units.create', 'scope:company']);
        Route::match(['put', 'patch'], 'business-units/{businessUnit}', [\App\Http\Controllers\Api\V1\BusinessUnitController::class, 'update'])->middleware(['permission:business_units.update', 'scope:business_unit']);
        Route::delete('business-units/{businessUnit}', [\App\Http\Controllers\Api\V1\BusinessUnitController::class, 'destroy'])->middleware(['permission:business_units.delete', 'scope:business_unit']);
        
        // Organizational Hierarchy: Branches
        Route::get('branches', [\App\Http\Controllers\Api\V1\BranchController::class, 'index'])->middleware('permission:branches.view');
        Route::get('branches/{branch}', [\App\Http\Controllers\Api\V1\BranchController::class, 'show'])->middleware(['permission:branches.view', 'scope:branch']);
        Route::post('branches', [\App\Http\Controllers\Api\V1\BranchController::class, 'store'])->middleware(['permission:branches.create', 'scope:business_unit']);
        Route::match(['put', 'patch'], 'branches/{branch}', [\App\Http\Controllers\Api\V1\BranchController::class, 'update'])->middleware(['permission:branches.update', 'scope:branch']);
        Route::delete('branches/{branch}', [\App\Http\Controllers\Api\V1\BranchController::class, 'destroy'])->middleware(['permission:branches.delete', 'scope:branch']);
        
        // Organizational Hierarchy: Warehouses
        Route::get('warehouses', [\App\Http\Controllers\Api\V1\WarehouseController::class, 'index'])->middleware('permission:warehouses.view');
        Route::get('warehouses/{warehouse}', [\App\Http\Controllers\Api\V1\WarehouseController::class, 'show'])->middleware(['permission:warehouses.view', 'scope:warehouse']);
        Route::post('warehouses', [\App\Http\Controllers\Api\V1\WarehouseController::class, 'store'])->middleware(['permission:warehouses.create', 'scope:branch']);
        Route::match(['put', 'patch'], 'warehouses/{warehouse}', [\App\Http\Controllers\Api\V1\WarehouseController::class, 'update'])->middleware(['permission:warehouses.update', 'scope:warehouse']);
        Route::delete('warehouses/{warehouse}', [\App\Http\Controllers\Api\V1\WarehouseController::class, 'destroy'])->middleware(['permission:warehouses.delete', 'scope:warehouse']);
        
        // System Settings / Configuration Center
        Route::prefix('settings')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\SettingController::class, 'index'])->middleware('permission:settings.view');
            Route::get('/groups', [\App\Http\Controllers\Api\V1\SettingController::class, 'getGroups'])->middleware('permission:settings.view');
            Route::get('/system-info', [\App\Http\Controllers\Api\V1\SettingController::class, 'systemInfo'])->middleware('permission:settings.view');
            Route::post('/numbering/preview', [\App\Http\Controllers\Api\V1\SettingController::class, 'previewNumbering'])->middleware('permission:settings.view,settings.numbering');
            Route::prefix('maintenance')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\V1\MaintenanceController::class, 'index'])->middleware('permission:maintenance.view,settings.maintenance,settings.view');
                Route::post('/backup', [\App\Http\Controllers\Api\V1\MaintenanceController::class, 'createBackup'])->middleware('permission:maintenance.backup,settings.maintenance');
                Route::get('/backups', [\App\Http\Controllers\Api\V1\MaintenanceController::class, 'listBackups'])->middleware('permission:maintenance.view,settings.maintenance');
                Route::get('/backup/{id}/download', [\App\Http\Controllers\Api\V1\MaintenanceController::class, 'downloadBackup']);
                Route::get('/backups/{id}/download', [\App\Http\Controllers\Api\V1\MaintenanceController::class, 'downloadBackup']);
                Route::post('/reset/preview', [\App\Http\Controllers\Api\V1\MaintenanceController::class, 'previewReset']);
                Route::post('/reset', [\App\Http\Controllers\Api\V1\MaintenanceController::class, 'executeReset']);
                Route::post('/demo/preview', [\App\Http\Controllers\Api\V1\MaintenanceController::class, 'previewDemo']);
                Route::post('/demo', [\App\Http\Controllers\Api\V1\MaintenanceController::class, 'insertDemo'])->middleware('permission:maintenance.demo,settings.maintenance');
                Route::post('/demo/insert', [\App\Http\Controllers\Api\V1\MaintenanceController::class, 'insertDemo'])->middleware('permission:maintenance.demo,settings.maintenance');
                Route::post('/demo/remove', [\App\Http\Controllers\Api\V1\MaintenanceController::class, 'removeDemo']);
            });
            Route::get('/{group}', [\App\Http\Controllers\Api\V1\SettingController::class, 'showGroup'])->middleware('permission:settings.view');
            Route::match(['put', 'patch'], '/{group}', [\App\Http\Controllers\Api\V1\SettingController::class, 'updateGroup'])->middleware('permission:settings.update');
            Route::get('/{group}/{key}', [\App\Http\Controllers\Api\V1\SettingController::class, 'showKey'])->middleware('permission:settings.view');
            Route::match(['put', 'patch'], '/{group}/{key}', [\App\Http\Controllers\Api\V1\SettingController::class, 'updateKey'])->middleware('permission:settings.update');
        });
        Route::match(['put', 'patch'], 'settings', [\App\Http\Controllers\Api\V1\SettingController::class, 'update'])->middleware('permission:settings.update');
        Route::get('system/status', [\App\Http\Controllers\Api\V1\System\SystemStatusController::class, 'status']);
        
        // Audit Logs (Read-only / append-only governance)
        Route::get('audit-logs', [\App\Http\Controllers\Api\V1\AuditLogController::class, 'index'])->middleware('permission:audit_logs.view,audit.view');
        Route::get('audit-logs/{id}', [\App\Http\Controllers\Api\V1\AuditLogController::class, 'show'])->middleware('permission:audit_logs.view,audit.view');
        Route::post('audit-logs', [\App\Http\Controllers\Api\V1\AuditLogController::class, 'store']);
        Route::match(['put', 'patch'], 'audit-logs/{id}', [\App\Http\Controllers\Api\V1\AuditLogController::class, 'update']);
        Route::delete('audit-logs/{id}', [\App\Http\Controllers\Api\V1\AuditLogController::class, 'destroy']);
        
        // Metrics & Overview
        Route::get('dashboard/metrics', [\App\Http\Controllers\Api\V1\DashboardController::class, 'metrics']);

        // SPRINT 02 — Product Master Catalog Routes
        // Categories
        Route::get('categories', [\App\Http\Controllers\Api\V1\CategoryController::class, 'index'])->middleware('permission:categories.view');
        Route::get('categories/{category}', [\App\Http\Controllers\Api\V1\CategoryController::class, 'show'])->middleware('permission:categories.view');
        Route::post('categories', [\App\Http\Controllers\Api\V1\CategoryController::class, 'store'])->middleware(['permission:categories.create', 'scope:company']);
        Route::match(['put', 'patch'], 'categories/{category}', [\App\Http\Controllers\Api\V1\CategoryController::class, 'update'])->middleware(['permission:categories.update', 'scope:company']);
        Route::delete('categories/{category}', [\App\Http\Controllers\Api\V1\CategoryController::class, 'destroy'])->middleware(['permission:categories.delete', 'scope:company']);
        
        // Brands
        Route::get('brands', [\App\Http\Controllers\Api\V1\BrandController::class, 'index'])->middleware('permission:brands.view');
        Route::get('brands/{brand}', [\App\Http\Controllers\Api\V1\BrandController::class, 'show'])->middleware('permission:brands.view');
        Route::post('brands', [\App\Http\Controllers\Api\V1\BrandController::class, 'store'])->middleware(['permission:brands.create', 'scope:company']);
        Route::match(['put', 'patch'], 'brands/{brand}', [\App\Http\Controllers\Api\V1\BrandController::class, 'update'])->middleware(['permission:brands.update', 'scope:company']);
        Route::delete('brands/{brand}', [\App\Http\Controllers\Api\V1\BrandController::class, 'destroy'])->middleware(['permission:brands.delete', 'scope:company']);
        
        // Units
        Route::get('units', [\App\Http\Controllers\Api\V1\UnitController::class, 'index'])->middleware('permission:units.view');
        Route::get('units/{unit}', [\App\Http\Controllers\Api\V1\UnitController::class, 'show'])->middleware('permission:units.view');
        Route::post('units', [\App\Http\Controllers\Api\V1\UnitController::class, 'store'])->middleware(['permission:units.create', 'scope:company']);
        Route::match(['put', 'patch'], 'units/{unit}', [\App\Http\Controllers\Api\V1\UnitController::class, 'update'])->middleware(['permission:units.update', 'scope:company']);
        Route::delete('units/{unit}', [\App\Http\Controllers\Api\V1\UnitController::class, 'destroy'])->middleware(['permission:units.delete', 'scope:company']);
        
        // Attributes & Values
        Route::get('attributes', [\App\Http\Controllers\Api\V1\AttributeController::class, 'index'])->middleware('permission:attributes.view');
        Route::get('attributes/{attribute}', [\App\Http\Controllers\Api\V1\AttributeController::class, 'show'])->middleware('permission:attributes.view');
        Route::post('attributes', [\App\Http\Controllers\Api\V1\AttributeController::class, 'store'])->middleware(['permission:attributes.create', 'scope:company']);
        Route::match(['put', 'patch'], 'attributes/{attribute}', [\App\Http\Controllers\Api\V1\AttributeController::class, 'update'])->middleware(['permission:attributes.update', 'scope:company']);
        Route::delete('attributes/{attribute}', [\App\Http\Controllers\Api\V1\AttributeController::class, 'destroy'])->middleware(['permission:attributes.delete', 'scope:company']);
        
        // Products Catalog
        Route::get('products', [\App\Http\Controllers\Api\V1\ProductController::class, 'index'])->middleware('permission:products.view');
        Route::get('products/{product}', [\App\Http\Controllers\Api\V1\ProductController::class, 'show'])->middleware('permission:products.view');
        Route::post('products', [\App\Http\Controllers\Api\V1\ProductController::class, 'store'])->middleware(['permission:products.create', 'scope:company']);
        Route::match(['put', 'patch'], 'products/{product}', [\App\Http\Controllers\Api\V1\ProductController::class, 'update'])->middleware(['permission:products.update', 'scope:company']);
        Route::post('products/{product}/activate', [\App\Http\Controllers\Api\V1\ProductController::class, 'activate'])->middleware(['permission:products.activate', 'scope:company']);
        Route::post('products/{product}/deactivate', [\App\Http\Controllers\Api\V1\ProductController::class, 'deactivate'])->middleware(['permission:products.deactivate', 'scope:company']);
        Route::delete('products/{product}', [\App\Http\Controllers\Api\V1\ProductController::class, 'destroy'])->middleware(['permission:products.delete', 'scope:company']);
        
        // Product Variants
        Route::get('product-variants', [\App\Http\Controllers\Api\V1\ProductVariantController::class, 'index'])->middleware('permission:product_variants.view');
        Route::get('product-variants/{variant}', [\App\Http\Controllers\Api\V1\ProductVariantController::class, 'show'])->middleware('permission:product_variants.view');
        Route::match(['put', 'patch'], 'product-variants/{variant}', [\App\Http\Controllers\Api\V1\ProductVariantController::class, 'update'])->middleware(['permission:product_variants.update', 'scope:company']);
        Route::post('product-variants/{variant}/activate', [\App\Http\Controllers\Api\V1\ProductVariantController::class, 'activate'])->middleware(['permission:product_variants.activate', 'scope:company']);
        Route::post('product-variants/{variant}/deactivate', [\App\Http\Controllers\Api\V1\ProductVariantController::class, 'deactivate'])->middleware(['permission:product_variants.deactivate', 'scope:company']);
        
        // Barcodes
        Route::get('barcodes', [\App\Http\Controllers\Api\V1\BarcodeController::class, 'index'])->middleware('permission:barcodes.view');
        Route::get('barcodes/lookup/{code}', [\App\Http\Controllers\Api\V1\BarcodeController::class, 'lookup'])->middleware('permission:barcodes.view');
        Route::post('barcodes', [\App\Http\Controllers\Api\V1\BarcodeController::class, 'store'])->middleware(['permission:barcodes.create', 'scope:company']);
        Route::post('barcodes/{barcode}/set-primary', [\App\Http\Controllers\Api\V1\BarcodeController::class, 'setPrimary'])->middleware(['permission:barcodes.update', 'scope:company']);
        Route::delete('barcodes/{barcode}', [\App\Http\Controllers\Api\V1\BarcodeController::class, 'destroy'])->middleware(['permission:barcodes.delete', 'scope:company']);
        
        // SPRINT 03 — Inventory Routes
        Route::get('storage-locations', [\App\Http\Controllers\Api\V1\StorageLocationController::class, 'index'])->middleware('permission:storage_locations.view,inventory.view');
        Route::get('storage-locations/{storageLocation}', [\App\Http\Controllers\Api\V1\StorageLocationController::class, 'show'])->middleware('permission:storage_locations.view,inventory.view');
        Route::post('storage-locations', [\App\Http\Controllers\Api\V1\StorageLocationController::class, 'store'])->middleware(['permission:storage_locations.create,inventory.manage_locations', 'scope:company']);
        Route::match(['put', 'patch'], 'storage-locations/{storageLocation}', [\App\Http\Controllers\Api\V1\StorageLocationController::class, 'update'])->middleware(['permission:storage_locations.update,inventory.manage_locations', 'scope:company']);
        Route::delete('storage-locations/{storageLocation}', [\App\Http\Controllers\Api\V1\StorageLocationController::class, 'destroy'])->middleware(['permission:storage_locations.delete,inventory.manage_locations', 'scope:company']);
        Route::get('stock-batches', [\App\Http\Controllers\Api\V1\StockBatchController::class, 'index'])->middleware('permission:inventory.view');
        Route::post('stock-batches', [\App\Http\Controllers\Api\V1\StockBatchController::class, 'store'])->middleware(['permission:inventory.manage_batches', 'scope:company']);
        Route::get('stock-batches/expiry-report', [\App\Http\Controllers\Api\V1\StockBatchController::class, 'expiryReport'])->middleware('permission:inventory.expiry.view,inventory.view');
        Route::get('stock-batches/{id}', [\App\Http\Controllers\Api\V1\StockBatchController::class, 'show'])->middleware('permission:inventory.batches.view,inventory.view');
        Route::match(['put', 'patch'], 'stock-batches/{id}', [\App\Http\Controllers\Api\V1\StockBatchController::class, 'update'])->middleware(['permission:inventory.batches.manage,inventory.manage_batches', 'scope:company']);
        Route::post('stock-batches/{id}/status', [\App\Http\Controllers\Api\V1\StockBatchController::class, 'toggleStatus'])->middleware(['permission:inventory.batches.manage,inventory.manage_batches', 'scope:company']);

        Route::get('inventory', [\App\Http\Controllers\Api\V1\InventoryController::class, 'index'])->middleware('permission:inventory.view');
        Route::get('inventory/low-stock', [\App\Http\Controllers\Api\V1\InventoryController::class, 'lowStock'])->middleware('permission:inventory.view');
        Route::get('inventory/reorder-alerts', [\App\Http\Controllers\Api\V1\InventoryController::class, 'reorderAlerts'])->middleware('permission:inventory.view');
        Route::get('inventory/barcode-lookup/{barcode}', [\App\Http\Controllers\Api\V1\InventoryController::class, 'barcodeLookup'])->middleware('permission:inventory.view,pos.view');
        Route::get('inventory/movements', [\App\Http\Controllers\Api\V1\InventoryController::class, 'movements'])->middleware('permission:inventory.movement.view');
        
        Route::post('inventory/opening-stock', [\App\Http\Controllers\Api\V1\InventoryController::class, 'openingStock'])->middleware(['permission:inventory.create', 'scope:company']);
        Route::post('inventory/adjustments', [\App\Http\Controllers\Api\V1\InventoryController::class, 'adjustStock'])->middleware(['permission:inventory.adjust', 'scope:company']);
        Route::post('inventory/adjustments/in', [\App\Http\Controllers\Api\V1\InventoryController::class, 'adjustmentIn'])->middleware(['permission:inventory.adjust', 'scope:company']);
        Route::post('inventory/adjustments/out', [\App\Http\Controllers\Api\V1\InventoryController::class, 'adjustmentOut'])->middleware(['permission:inventory.adjust', 'scope:company']);
        Route::post('inventory/damage-loss', [\App\Http\Controllers\Api\V1\InventoryController::class, 'recordDamageLoss'])->middleware(['permission:inventory.adjust', 'scope:company']);
        Route::post('inventory/transfers/direct', [\App\Http\Controllers\Api\V1\InventoryController::class, 'directTransfer'])->middleware(['permission:inventory.transfer.create', 'scope:company']);
        
        Route::get('inventory/transfers', [\App\Http\Controllers\Api\V1\TransferController::class, 'index'])->middleware('permission:inventory.transfer.view');
        Route::get('inventory/transfers/{transfer}', [\App\Http\Controllers\Api\V1\TransferController::class, 'show'])->middleware('permission:inventory.transfer.view');
        Route::post('inventory/transfers', [\App\Http\Controllers\Api\V1\TransferController::class, 'store'])->middleware(['permission:inventory.transfer.create', 'scope:company']);
        Route::post('inventory/transfers/{transfer}/submit', [\App\Http\Controllers\Api\V1\TransferController::class, 'submit'])->middleware(['permission:inventory.transfer.create', 'scope:company']);
        Route::post('inventory/transfers/{transfer}/approve', [\App\Http\Controllers\Api\V1\TransferController::class, 'approve'])->middleware(['permission:inventory.transfer.approve', 'scope:company']);
        Route::post('inventory/transfers/{transfer}/ship', [\App\Http\Controllers\Api\V1\TransferController::class, 'ship'])->middleware(['permission:inventory.transfer.ship', 'scope:company']);
        Route::post('inventory/transfers/{transfer}/receive', [\App\Http\Controllers\Api\V1\TransferController::class, 'receive'])->middleware(['permission:inventory.transfer.receive', 'scope:company']);
        Route::post('inventory/transfers/{transfer}/cancel', [\App\Http\Controllers\Api\V1\TransferController::class, 'cancel'])->middleware(['permission:inventory.transfer.create', 'scope:company']);

        // Phase 6 — Physical Stock Count Routes
        Route::get('inventory/stock-counts', [\App\Http\Controllers\Api\V1\StockCountController::class, 'index'])->middleware('permission:inventory.count.view,inventory.view');
        Route::post('inventory/stock-counts', [\App\Http\Controllers\Api\V1\StockCountController::class, 'store'])->middleware(['permission:inventory.count.create,inventory.create', 'scope:company']);
        Route::get('inventory/stock-counts/{id}', [\App\Http\Controllers\Api\V1\StockCountController::class, 'show'])->middleware('permission:inventory.count.view,inventory.view');
        Route::post('inventory/stock-counts/{id}/start', [\App\Http\Controllers\Api\V1\StockCountController::class, 'start'])->middleware(['permission:inventory.count.create,inventory.create', 'scope:company']);
        Route::match(['put', 'patch'], 'inventory/stock-counts/{id}/items', [\App\Http\Controllers\Api\V1\StockCountController::class, 'updateItems'])->middleware(['permission:inventory.count.create,inventory.create', 'scope:company']);
        Route::post('inventory/stock-counts/{id}/submit', [\App\Http\Controllers\Api\V1\StockCountController::class, 'submit'])->middleware(['permission:inventory.count.submit,inventory.count.create', 'scope:company']);
        Route::post('inventory/stock-counts/{id}/review', [\App\Http\Controllers\Api\V1\StockCountController::class, 'review'])->middleware(['permission:inventory.count.approve,inventory.count.view', 'scope:company']);
        Route::post('inventory/stock-counts/{id}/approve', [\App\Http\Controllers\Api\V1\StockCountController::class, 'approve'])->middleware(['permission:inventory.count.approve,inventory.approve', 'scope:company']);
        Route::post('inventory/stock-counts/{id}/post', [\App\Http\Controllers\Api\V1\StockCountController::class, 'post'])->middleware(['permission:inventory.count.post,inventory.adjust', 'scope:company']);
        Route::post('inventory/stock-counts/{id}/cancel', [\App\Http\Controllers\Api\V1\StockCountController::class, 'cancel'])->middleware(['permission:inventory.count.create,inventory.count.approve', 'scope:company']);
        // SPRINT 04 — Suppliers & Purchase Routes
        // Suppliers
        Route::get('suppliers', [\App\Http\Controllers\Api\V1\SupplierController::class, 'index'])->middleware('permission:suppliers.view');
        Route::get('suppliers/next-code', [\App\Http\Controllers\Api\V1\SupplierController::class, 'nextCode'])->middleware('permission:suppliers.view');
        Route::post('suppliers', [\App\Http\Controllers\Api\V1\SupplierController::class, 'store'])->middleware('permission:suppliers.create');
        Route::get('suppliers/{id}', [\App\Http\Controllers\Api\V1\SupplierController::class, 'show'])->middleware('permission:suppliers.view');
        Route::get('suppliers/{id}/balance', [\App\Http\Controllers\Api\V1\SupplierController::class, 'balance'])->middleware('permission:suppliers.view');
        Route::put('suppliers/{id}', [\App\Http\Controllers\Api\V1\SupplierController::class, 'update'])->middleware('permission:suppliers.update');
        Route::delete('suppliers/{id}', [\App\Http\Controllers\Api\V1\SupplierController::class, 'destroy'])->middleware('permission:suppliers.delete');
        
        // Purchase Orders
        Route::get('purchase-orders/next-number', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'nextNumber'])->middleware('permission:purchase_orders.view');
        Route::get('purchase-orders', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'index'])->middleware('permission:purchase_orders.view');
        Route::post('purchase-orders', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'store'])->middleware('permission:purchase_orders.create');
        Route::get('purchase-orders/{id}', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'show'])->middleware('permission:purchase_orders.view');
        Route::post('purchase-orders/{id}/approve', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'approve'])->middleware('permission:purchase_orders.approve');
        Route::post('purchase-orders/{id}/cancel', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'cancel'])->middleware('permission:purchase_orders.create');
        
        // Goods Receipts
        Route::get('goods-receipts/next-number', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'nextNumber'])->middleware('permission:goods_receipts.create');
        Route::get('goods-receipts', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'index'])->middleware('permission:goods_receipts.view');
        Route::post('goods-receipts', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'store'])->middleware('permission:goods_receipts.create');
        Route::get('goods-receipts/{id}', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'show'])->middleware('permission:goods_receipts.view');
        Route::post('goods-receipts/{id}/post', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'postReceipt'])->middleware('permission:goods_receipts.post');
        Route::post('goods-receipts/{id}/cancel', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'cancel'])->middleware('permission:goods_receipts.cancel');
        
        // Purchases & Invoices
        Route::get('purchases', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'index'])->middleware('permission:purchases.view');
        Route::post('purchases', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'store'])->middleware('permission:purchases.create');
        Route::get('purchases/{id}', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'show'])->middleware('permission:purchases.view');
        Route::post('purchases/{id}/post', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'postPurchase'])->middleware('permission:purchases.create');
        Route::post('purchases/{id}/cancel', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'cancel'])->middleware('permission:purchases.create');

        Route::get('purchase-invoices', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'index'])->middleware('permission:purchases.view');
        Route::post('purchase-invoices', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'store'])->middleware('permission:purchases.create');
        Route::get('purchase-invoices/{id}', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'show'])->middleware('permission:purchases.view');
        Route::post('purchase-invoices/{id}/post', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'postPurchase'])->middleware('permission:purchases.create');
        Route::post('purchase-invoices/{id}/cancel', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'cancel'])->middleware('permission:purchases.create');
        
        // SPRINT 05 — Customers & Ledger
        Route::get('customer-groups', [\App\Http\Controllers\Api\V1\CustomerGroupController::class, 'index'])->middleware('permission:customer_groups.view');
        Route::post('customer-groups', [\App\Http\Controllers\Api\V1\CustomerGroupController::class, 'store'])->middleware('permission:customer_groups.create');
        Route::get('customer-groups/{id}', [\App\Http\Controllers\Api\V1\CustomerGroupController::class, 'show'])->middleware('permission:customer_groups.view');
        Route::put('customer-groups/{id}', [\App\Http\Controllers\Api\V1\CustomerGroupController::class, 'update'])->middleware('permission:customer_groups.update');
        Route::delete('customer-groups/{id}', [\App\Http\Controllers\Api\V1\CustomerGroupController::class, 'destroy'])->middleware('permission:customer_groups.delete');

        Route::get('customers/next-code', [\App\Http\Controllers\Api\V1\CustomerController::class, 'nextCode'])->middleware('permission:customers.view,pos.view');
        Route::get('customers/search', [\App\Http\Controllers\Api\V1\CustomerController::class, 'search'])->middleware('permission:customers.view,pos.view');
        Route::get('customers', [\App\Http\Controllers\Api\V1\CustomerController::class, 'index'])->middleware('permission:customers.view');
        Route::post('customers', [\App\Http\Controllers\Api\V1\CustomerController::class, 'store'])->middleware('permission:customers.create,pos.view');
        Route::get('customers/{id}', [\App\Http\Controllers\Api\V1\CustomerController::class, 'show'])->middleware('permission:customers.view');
        Route::get('customers/{id}/balance', [\App\Http\Controllers\Api\V1\CustomerController::class, 'balance'])->middleware('permission:customers.view,pos.view');
        Route::put('customers/{id}', [\App\Http\Controllers\Api\V1\CustomerController::class, 'update'])->middleware('permission:customers.update');
        Route::delete('customers/{id}', [\App\Http\Controllers\Api\V1\CustomerController::class, 'destroy'])->middleware('permission:customers.delete');

        Route::get('customers/{id}/ledger', [\App\Http\Controllers\Api\V1\CustomerLedgerController::class, 'index'])->middleware('permission:customer_ledger.view');
        Route::post('customers/{id}/opening-balance', [\App\Http\Controllers\Api\V1\CustomerLedgerController::class, 'storeOpeningBalance'])->middleware('permission:customer_ledger.create_opening_balance');
        Route::post('customers/{id}/ledger/adjustment', [\App\Http\Controllers\Api\V1\CustomerLedgerController::class, 'storeAdjustment'])->middleware('permission:customer_ledger.create_adjustment');
        Route::get('customers/{id}/points', [\App\Http\Controllers\Api\V1\LoyaltyController::class, 'customerPoints'])->middleware('permission:customers.view,pos.view,loyalty.view');
        Route::get('customers/{id}/points/ledger', [\App\Http\Controllers\Api\V1\LoyaltyController::class, 'customerPointLedger'])->middleware('permission:customers.view,pos.view,loyalty.view');
        Route::post('customers/{id}/points/adjust', [\App\Http\Controllers\Api\V1\LoyaltyController::class, 'adjustPoints'])->middleware('permission:customers.update,loyalty.adjust');

        // Phase 5.3 — Store Credit API
        Route::get('customers/{id}/store-credit', [\App\Http\Controllers\Api\V1\StoreCreditController::class, 'customerCredit'])->middleware('permission:customers.view,store_credit.view,pos.view');
        Route::get('customers/{id}/store-credit/transactions', [\App\Http\Controllers\Api\V1\StoreCreditController::class, 'customerTransactions'])->middleware('permission:customers.view,store_credit.view');
        Route::post('customers/{id}/store-credit/issue', [\App\Http\Controllers\Api\V1\StoreCreditController::class, 'issue'])->middleware('permission:customers.update,store_credit.issue');
        Route::post('customers/{id}/store-credit/redeem', [\App\Http\Controllers\Api\V1\StoreCreditController::class, 'redeem'])->middleware('permission:customers.update,store_credit.redeem');
        Route::post('customers/{id}/store-credit/adjust', [\App\Http\Controllers\Api\V1\StoreCreditController::class, 'adjust'])->middleware('permission:customers.update,store_credit.adjust');

        // SPRINT 06 — POS & Sales
        Route::get('pos/terminals', [\App\Http\Controllers\Api\V1\PosTerminalController::class, 'index'])->middleware('permission:pos.view');
        Route::post('pos/terminals', [\App\Http\Controllers\Api\V1\PosTerminalController::class, 'store'])->middleware('permission:pos.view');
        Route::get('pos/terminals/{id}', [\App\Http\Controllers\Api\V1\PosTerminalController::class, 'show'])->middleware('permission:pos.view');
        Route::put('pos/terminals/{id}', [\App\Http\Controllers\Api\V1\PosTerminalController::class, 'update'])->middleware('permission:pos.view');
        Route::put('pos/terminals/{id}/payment-methods', [\App\Http\Controllers\Api\V1\PosTerminalController::class, 'syncPaymentMethods'])->middleware('permission:pos.view');

        Route::get('pos/payment-methods', [\App\Http\Controllers\Api\V1\PaymentMethodController::class, 'index'])->middleware('permission:pos.view');
        Route::post('pos/payment-methods', [\App\Http\Controllers\Api\V1\PaymentMethodController::class, 'store'])->middleware('permission:pos.view');
        Route::put('pos/payment-methods/{id}', [\App\Http\Controllers\Api\V1\PaymentMethodController::class, 'update'])->middleware('permission:pos.view');
        Route::post('pos/payment-methods/{id}/toggle', [\App\Http\Controllers\Api\V1\PaymentMethodController::class, 'toggle'])->middleware('permission:pos.view');

        Route::get('pos/loyalty/settings', [\App\Http\Controllers\Api\V1\LoyaltyController::class, 'getSettings'])->middleware('permission:pos.view');
        Route::put('pos/loyalty/settings', [\App\Http\Controllers\Api\V1\LoyaltyController::class, 'updateSettings'])->middleware('permission:pos.view');

        Route::get('pos/sessions', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'index'])->middleware('permission:pos.view,pos_shifts.view');
        Route::get('pos/sessions/current', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'current'])->middleware('permission:pos.view,pos_shifts.view');
        Route::post('pos/sessions/open', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'open'])->middleware('permission:pos.open_session,pos_shifts.open');
        Route::get('pos/sessions/{id}', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'show'])->middleware('permission:pos.view,pos_shifts.view');
        Route::post('pos/sessions/{id}/close', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'close'])->middleware('permission:pos.close_session,pos_shifts.close');
        Route::get('pos/sessions/{id}/reconciliation', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'reconciliation'])->middleware('permission:pos.view,pos_shifts.view');
        Route::post('pos/sessions/{id}/cash-in', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'cashIn'])->middleware('permission:pos_shifts.cash_in,pos.view');
        Route::post('pos/sessions/{id}/cash-out', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'cashOut'])->middleware('permission:pos_shifts.cash_out,pos.view');
        Route::get('pos/sessions/{id}/movements', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'movements'])->middleware('permission:pos.view,pos_shifts.view');
        Route::post('pos/sessions/{id}/approve-variance', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'approveVariance'])->middleware('permission:pos_shifts.approve_variance');

        // POS Shift Alias Routes
        Route::get('pos/shifts', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'index'])->middleware('permission:pos.view,pos_shifts.view');
        Route::get('pos/shifts/current', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'current'])->middleware('permission:pos.view,pos_shifts.view');
        Route::post('pos/shifts/open', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'open'])->middleware('permission:pos.open_session,pos_shifts.open');
        Route::get('pos/shifts/{id}', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'show'])->middleware('permission:pos.view,pos_shifts.view');
        Route::post('pos/shifts/{id}/close', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'close'])->middleware('permission:pos.close_session,pos_shifts.close');
        Route::get('pos/shifts/{id}/reconciliation', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'reconciliation'])->middleware('permission:pos.view,pos_shifts.view');
        Route::post('pos/shifts/{id}/cash-in', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'cashIn'])->middleware('permission:pos_shifts.cash_in,pos.view');
        Route::post('pos/shifts/{id}/cash-out', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'cashOut'])->middleware('permission:pos_shifts.cash_out,pos.view');
        Route::get('pos/shifts/{id}/movements', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'movements'])->middleware('permission:pos.view,pos_shifts.view');
        Route::post('pos/shifts/{id}/approve-variance', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'approveVariance'])->middleware('permission:pos_shifts.approve_variance');

        Route::get('pos/products/search', [\App\Http\Controllers\Api\V1\PosProductController::class, 'search'])->middleware('permission:pos.view');
        Route::get('pos/barcode/{barcode}', [\App\Http\Controllers\Api\V1\PosProductController::class, 'barcode'])->middleware('permission:pos.view');

        Route::get('sales', [\App\Http\Controllers\Api\V1\SaleController::class, 'index'])->middleware('permission:sales.view');
        Route::get('sales/held', [\App\Http\Controllers\Api\V1\SaleController::class, 'held'])->middleware('permission:pos.hold,pos.view,sales.view');
        Route::delete('sales/held/{id}', [\App\Http\Controllers\Api\V1\SaleController::class, 'destroyHeld'])->middleware('permission:pos.hold,pos.view,sales.view');
        Route::get('sales/{id}', [\App\Http\Controllers\Api\V1\SaleController::class, 'show'])->middleware('permission:sales.view');
        Route::get('sales/{id}/receipt', [\App\Http\Controllers\Api\V1\SaleController::class, 'receipt'])->middleware('permission:receipts.view,sales.view,pos.view');
        Route::post('sales/{id}/receipt/reprint', [\App\Http\Controllers\Api\V1\SaleController::class, 'reprint'])->middleware('permission:receipts.reprint,sales.view,pos.view');
        Route::post('sales/hold', [\App\Http\Controllers\Api\V1\SaleController::class, 'hold'])->middleware('permission:pos.hold,pos.view');
        Route::post('sales/complete', [\App\Http\Controllers\Api\V1\SaleController::class, 'complete'])->middleware('permission:sales.complete');
        // SPRINT 07 — Sales Return & Exchange
        Route::get('sales-returns', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'index'])->middleware('permission:sales_return.view');
        Route::get('sales-returns/{id}', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'show'])->middleware('permission:sales_return.view');
        Route::get('sales-returns/{id}/receipt', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'receipt'])->middleware('permission:receipts.view,sales_return.view,pos.view');
        Route::post('sales-returns/{id}/receipt/reprint', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'reprint'])->middleware('permission:receipts.reprint,sales_return.view,pos.view');
        Route::post('sales-returns', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'store'])->middleware('permission:sales_return.create');
        Route::get('sales/{id}/returnable-items', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'returnableItems'])->middleware('permission:sales_return.create');
        Route::put('sales-returns/{id}', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'update'])->middleware('permission:sales_return.update');
        Route::post('sales-returns/{id}/approve', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'approve'])->middleware('permission:sales_return.approve');
        Route::post('sales-returns/{id}/complete', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'complete'])->middleware('permission:sales_return.complete');
        Route::post('sales-returns/{id}/cancel', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'cancel'])->middleware('permission:sales_return.cancel');
        Route::post('sales-returns/{id}/refund', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'refund'])->middleware('permission:sales_return.refund');
        Route::post('sales-returns/{id}/exchange', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'exchange'])->middleware('permission:sales_return.exchange');

        // SPRINT 08 — Expenses
        Route::get('expense-categories', [\App\Http\Controllers\Api\V1\ExpenseCategoryController::class, 'index'])->middleware('permission:expense_category.view');
        Route::post('expense-categories', [\App\Http\Controllers\Api\V1\ExpenseCategoryController::class, 'store'])->middleware('permission:expense_category.create');
        Route::get('expense-categories/{id}', [\App\Http\Controllers\Api\V1\ExpenseCategoryController::class, 'show'])->middleware('permission:expense_category.view');
        Route::put('expense-categories/{id}', [\App\Http\Controllers\Api\V1\ExpenseCategoryController::class, 'update'])->middleware('permission:expense_category.update');
        Route::post('expense-categories/{id}/activate', [\App\Http\Controllers\Api\V1\ExpenseCategoryController::class, 'activate'])->middleware('permission:expense_category.activate');
        Route::post('expense-categories/{id}/deactivate', [\App\Http\Controllers\Api\V1\ExpenseCategoryController::class, 'deactivate'])->middleware('permission:expense_category.deactivate');

        Route::get('expenses', [\App\Http\Controllers\Api\V1\ExpenseController::class, 'index'])->middleware('permission:expense.view');
        Route::post('expenses', [\App\Http\Controllers\Api\V1\ExpenseController::class, 'store'])->middleware('permission:expense.create');
        Route::get('expenses/{id}', [\App\Http\Controllers\Api\V1\ExpenseController::class, 'show'])->middleware('permission:expense.view');
        Route::put('expenses/{id}', [\App\Http\Controllers\Api\V1\ExpenseController::class, 'update'])->middleware('permission:expense.update');
        Route::post('expenses/{id}/submit', [\App\Http\Controllers\Api\V1\ExpenseController::class, 'submit'])->middleware('permission:expense.submit');
        Route::post('expenses/{id}/approve', [\App\Http\Controllers\Api\V1\ExpenseController::class, 'approve'])->middleware('permission:expense.approve');
        Route::post('expenses/{id}/reject', [\App\Http\Controllers\Api\V1\ExpenseController::class, 'reject'])->middleware('permission:expense.reject');
        Route::post('expenses/{id}/complete', [\App\Http\Controllers\Api\V1\ExpenseController::class, 'complete'])->middleware('permission:expense.complete');
        Route::post('expenses/{id}/cancel', [\App\Http\Controllers\Api\V1\ExpenseController::class, 'cancel'])->middleware('permission:expense.cancel');
        Route::post('expenses/{id}/payments', [\App\Http\Controllers\Api\V1\ExpenseController::class, 'addPayment'])->middleware('permission:expense.payment.create');

        // SPRINT 11 — Reports & Dashboard
        Route::get('dashboard/summary', [\App\Http\Controllers\Api\V1\Reports\DashboardReportController::class, 'summary'])->middleware('permission:reports.dashboard');
        
        Route::get('reports/sales', [\App\Http\Controllers\Api\V1\Reports\SalesReportController::class, 'sales'])->middleware('permission:reports.sales.view');
        Route::get('reports/sales-returns', [\App\Http\Controllers\Api\V1\Reports\SalesReportController::class, 'salesReturns'])->middleware('permission:reports.sales_return.view');
        
        Route::get('reports/purchases', [\App\Http\Controllers\Api\V1\Reports\PurchaseReportController::class, 'purchases'])->middleware('permission:reports.purchase.view');
        
        Route::get('reports/expenses', [\App\Http\Controllers\Api\V1\Reports\ExpenseReportController::class, 'expenses'])->middleware('permission:reports.expense.view');
        
        Route::get('reports/inventory', [\App\Http\Controllers\Api\V1\Reports\InventoryReportController::class, 'stockSummary'])->middleware('permission:reports.inventory.view');
        Route::get('reports/inventory/movements', [\App\Http\Controllers\Api\V1\Reports\InventoryReportController::class, 'movements'])->middleware('permission:reports.stock_movement.view');
        Route::get('reports/inventory/valuation', [\App\Http\Controllers\Api\V1\Reports\InventoryReportController::class, 'valuation'])->middleware('permission:inventory.valuation.view,reports.inventory.view');
        Route::get('reports/inventory/reconciliation', [\App\Http\Controllers\Api\V1\Reports\InventoryReportController::class, 'reconciliation'])->middleware('permission:inventory.reconciliation.view,reports.inventory.view');
        Route::post('reports/inventory/reconciliation/run', [\App\Http\Controllers\Api\V1\Reports\InventoryReportController::class, 'reconciliation'])->middleware('permission:inventory.reconciliation.run,reports.inventory.view');
        
        Route::get('reports/customer-receivables', [\App\Http\Controllers\Api\V1\Reports\CustomerReportController::class, 'receivables'])->middleware('permission:reports.customer.view');
        Route::get('reports/customers/{id}/ledger', [\App\Http\Controllers\Api\V1\Reports\CustomerReportController::class, 'ledger'])->middleware('permission:reports.customer.view');
        
        Route::get('reports/supplier-payables', [\App\Http\Controllers\Api\V1\Reports\SupplierReportController::class, 'payables'])->middleware('permission:reports.supplier.view');
        Route::get('reports/suppliers/{id}/ledger', [\App\Http\Controllers\Api\V1\Reports\SupplierReportController::class, 'ledger'])->middleware('permission:reports.supplier.view');

        // SPRINT 09 — Accounting Engine
        Route::get('account-groups', [\App\Http\Controllers\Api\V1\AccountGroupController::class, 'index'])->middleware('permission:account_group.view');
        Route::post('account-groups', [\App\Http\Controllers\Api\V1\AccountGroupController::class, 'store'])->middleware('permission:account_group.create');
        
        Route::get('accounts', [\App\Http\Controllers\Api\V1\AccountController::class, 'index'])->middleware('permission:account.view');
        Route::post('accounts', [\App\Http\Controllers\Api\V1\AccountController::class, 'store'])->middleware('permission:account.create');
        Route::get('accounts/{id}', [\App\Http\Controllers\Api\V1\AccountController::class, 'show'])->middleware('permission:account.view');
        Route::put('accounts/{id}', [\App\Http\Controllers\Api\V1\AccountController::class, 'update'])->middleware('permission:account.create');
        Route::delete('accounts/{id}', [\App\Http\Controllers\Api\V1\AccountController::class, 'destroy'])->middleware('permission:account.create');
        Route::post('accounts/{id}/activate', [\App\Http\Controllers\Api\V1\AccountController::class, 'activate'])->middleware('permission:account.activate');
        Route::post('accounts/{id}/deactivate', [\App\Http\Controllers\Api\V1\AccountController::class, 'deactivate'])->middleware('permission:account.deactivate');

        Route::get('fiscal-years', [\App\Http\Controllers\Api\V1\FiscalYearController::class, 'index'])->middleware('permission:fiscal_year.view');
        Route::post('fiscal-years', [\App\Http\Controllers\Api\V1\FiscalYearController::class, 'store'])->middleware('permission:fiscal_year.create');
        Route::post('fiscal-years/{id}/close', [\App\Http\Controllers\Api\V1\FiscalYearController::class, 'close'])->middleware('permission:fiscal_year.close');

        Route::get('accounting-periods', [\App\Http\Controllers\Api\V1\AccountingPeriodController::class, 'index'])->middleware('permission:accounting_period.view');
        Route::post('accounting-periods', [\App\Http\Controllers\Api\V1\AccountingPeriodController::class, 'store'])->middleware('permission:accounting_period.create');
        Route::post('accounting-periods/{id}/lock', [\App\Http\Controllers\Api\V1\AccountingPeriodController::class, 'lock'])->middleware('permission:accounting_period.lock');
        Route::post('accounting-periods/{id}/unlock', [\App\Http\Controllers\Api\V1\AccountingPeriodController::class, 'unlock'])->middleware('permission:accounting_period.unlock');
        Route::post('accounting-periods/{id}/close', [\App\Http\Controllers\Api\V1\AccountingPeriodController::class, 'close'])->middleware('permission:accounting_period.close');

        Route::get('journals', [\App\Http\Controllers\Api\V1\JournalEntryController::class, 'index'])->middleware('permission:journal.view');
        Route::post('journals', [\App\Http\Controllers\Api\V1\JournalEntryController::class, 'store'])->middleware('permission:journal.create');
        Route::get('journals/{id}', [\App\Http\Controllers\Api\V1\JournalEntryController::class, 'show'])->middleware('permission:journal.view');
        Route::post('journals/{id}/post', [\App\Http\Controllers\Api\V1\JournalEntryController::class, 'postJournal'])->middleware('permission:journal.post');
        Route::post('journals/{id}/cancel', [\App\Http\Controllers\Api\V1\JournalEntryController::class, 'cancelJournal'])->middleware('permission:journal.cancel');
        Route::post('journals/{id}/reverse', [\App\Http\Controllers\Api\V1\JournalEntryController::class, 'reverseJournal'])->middleware('permission:journal.reverse');
        Route::post('accounting/cash-bank-transfer', [\App\Http\Controllers\Api\V1\JournalEntryController::class, 'transferCashBank'])->middleware('permission:journal.create');
        
        Route::get('general-ledger', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'generalLedger'])->middleware('permission:general_ledger.view');
        Route::get('trial-balance', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'trialBalance'])->middleware('permission:trial_balance.view');
        Route::get('reports/general-ledger', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'generalLedger'])->middleware('permission:general_ledger.view');
        Route::get('reports/trial-balance', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'trialBalance'])->middleware('permission:trial_balance.view');
        Route::get('reports/profit-loss', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'profitAndLoss'])->middleware('permission:general_ledger.view');
        Route::get('reports/balance-sheet', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'balanceSheet'])->middleware('permission:general_ledger.view');
        Route::get('reports/cash-flow', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'cashFlow'])->middleware('permission:general_ledger.view');
        Route::get('reports/vat', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'vatReport'])->middleware('permission:general_ledger.view');
        Route::get('accounting/general-ledger', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'generalLedger'])->middleware('permission:general_ledger.view');
        Route::get('accounting/trial-balance', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'trialBalance'])->middleware('permission:trial_balance.view');
        Route::get('accounting/profit-loss', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'profitAndLoss'])->middleware('permission:general_ledger.view');
        Route::get('accounting/balance-sheet', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'balanceSheet'])->middleware('permission:general_ledger.view');
        Route::get('accounting/cash-flow', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'cashFlow'])->middleware('permission:general_ledger.view');
        Route::get('accounting/vat-report', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'vatReport'])->middleware('permission:general_ledger.view');

        // GATE 1.4 — Payments & Allocations
        Route::get('payments', [\App\Http\Controllers\Api\V1\PaymentController::class, 'index'])->middleware('permission:payments.view');
        Route::post('payments', [\App\Http\Controllers\Api\V1\PaymentController::class, 'store'])->middleware('permission:payments.create');
        Route::get('payments/{id}', [\App\Http\Controllers\Api\V1\PaymentController::class, 'show'])->middleware('permission:payments.view');
        Route::post('payments/{id}/allocate', [\App\Http\Controllers\Api\V1\PaymentController::class, 'allocate'])->middleware('permission:payments.allocate');

        // PHASE 7 — Advanced Procurement Intelligence Routes
        // Purchase Requisitions
        Route::get('purchase-requisitions/next-number', [\App\Http\Controllers\Api\V1\PurchaseRequisitionController::class, 'nextNumber'])->middleware(['permission:procurement.requisitions.view,purchase_orders.view', 'scope:company']);
        Route::get('purchase-requisitions', [\App\Http\Controllers\Api\V1\PurchaseRequisitionController::class, 'index'])->middleware(['permission:procurement.requisitions.view,purchase_orders.view', 'scope:company']);
        Route::post('purchase-requisitions', [\App\Http\Controllers\Api\V1\PurchaseRequisitionController::class, 'store'])->middleware(['permission:procurement.requisitions.create,purchase_orders.create', 'scope:company']);
        Route::get('purchase-requisitions/{id}', [\App\Http\Controllers\Api\V1\PurchaseRequisitionController::class, 'show'])->middleware(['permission:procurement.requisitions.view,purchase_orders.view', 'scope:company']);
        Route::post('purchase-requisitions/{id}/submit', [\App\Http\Controllers\Api\V1\PurchaseRequisitionController::class, 'submit'])->middleware(['permission:procurement.requisitions.create,purchase_orders.create', 'scope:company']);
        Route::post('purchase-requisitions/{id}/review', [\App\Http\Controllers\Api\V1\PurchaseRequisitionController::class, 'review'])->middleware(['permission:procurement.requisitions.review,purchase_orders.approve', 'scope:company']);
        Route::post('purchase-requisitions/{id}/approve', [\App\Http\Controllers\Api\V1\PurchaseRequisitionController::class, 'approve'])->middleware(['permission:procurement.requisitions.approve,purchase_orders.approve', 'scope:company']);
        Route::post('purchase-requisitions/{id}/reject', [\App\Http\Controllers\Api\V1\PurchaseRequisitionController::class, 'reject'])->middleware(['permission:procurement.requisitions.approve,purchase_orders.approve', 'scope:company']);
        Route::post('purchase-requisitions/{id}/cancel', [\App\Http\Controllers\Api\V1\PurchaseRequisitionController::class, 'cancel'])->middleware(['permission:procurement.requisitions.create,purchase_orders.create', 'scope:company']);
        Route::post('purchase-requisitions/{id}/convert-po', [\App\Http\Controllers\Api\V1\PurchaseRequisitionController::class, 'convertToPo'])->middleware(['permission:procurement.requisitions.convert,purchase_orders.create', 'scope:company']);
        Route::post('purchase-requisitions/{id}/convert-rfq', [\App\Http\Controllers\Api\V1\PurchaseRequisitionController::class, 'convertToRfq'])->middleware(['permission:procurement.requisitions.convert,purchase_orders.create', 'scope:company']);

        // Requests for Quotation (RFQs)
        Route::get('rfqs/next-number', [\App\Http\Controllers\Api\V1\RfqController::class, 'nextNumber'])->middleware(['permission:procurement.rfq.view,purchase_orders.view', 'scope:company']);
        Route::get('rfqs', [\App\Http\Controllers\Api\V1\RfqController::class, 'index'])->middleware(['permission:procurement.rfq.view,purchase_orders.view', 'scope:company']);
        Route::post('rfqs', [\App\Http\Controllers\Api\V1\RfqController::class, 'store'])->middleware(['permission:procurement.rfq.create,purchase_orders.create', 'scope:company']);
        Route::get('rfqs/{id}', [\App\Http\Controllers\Api\V1\RfqController::class, 'show'])->middleware(['permission:procurement.rfq.view,purchase_orders.view', 'scope:company']);
        Route::post('rfqs/{id}/invite', [\App\Http\Controllers\Api\V1\RfqController::class, 'invite'])->middleware(['permission:procurement.rfq.create,purchase_orders.create', 'scope:company']);
        Route::post('rfqs/{id}/quotations', [\App\Http\Controllers\Api\V1\RfqController::class, 'recordQuotation'])->middleware(['permission:procurement.rfq.create,purchase_orders.create', 'scope:company']);
        Route::get('rfqs/{id}/compare', [\App\Http\Controllers\Api\V1\RfqController::class, 'compare'])->middleware(['permission:procurement.rfq.evaluate,purchase_orders.view', 'scope:company']);
        Route::post('rfqs/{id}/award', [\App\Http\Controllers\Api\V1\RfqController::class, 'award'])->middleware(['permission:procurement.rfq.award,purchase_orders.approve', 'scope:company']);

        // Supplier Qualification & Performance
        Route::post('suppliers/{id}/qualification', [\App\Http\Controllers\Api\V1\SupplierQualificationController::class, 'updateStatus'])->middleware(['permission:procurement.suppliers.qualify,suppliers.update', 'scope:company']);
        Route::get('suppliers/{id}/performance', [\App\Http\Controllers\Api\V1\SupplierPerformanceController::class, 'show'])->middleware(['permission:procurement.suppliers.performance,suppliers.view', 'scope:company']);
        Route::post('suppliers/{id}/recalculate-score', [\App\Http\Controllers\Api\V1\SupplierPerformanceController::class, 'recalculate'])->middleware(['permission:procurement.suppliers.qualify,suppliers.update', 'scope:company']);
        Route::get('procurement/supplier-rankings', [\App\Http\Controllers\Api\V1\SupplierPerformanceController::class, 'rankings'])->middleware(['permission:procurement.suppliers.performance,suppliers.view', 'scope:company']);

        // Supplier Contracts & Price Agreements
        Route::get('supplier-contracts', [\App\Http\Controllers\Api\V1\SupplierContractController::class, 'index'])->middleware(['permission:procurement.contracts.view,suppliers.view', 'scope:company']);
        Route::post('supplier-contracts', [\App\Http\Controllers\Api\V1\SupplierContractController::class, 'store'])->middleware(['permission:procurement.contracts.manage,suppliers.update', 'scope:company']);
        Route::get('supplier-contracts/{id}', [\App\Http\Controllers\Api\V1\SupplierContractController::class, 'show'])->middleware(['permission:procurement.contracts.view,suppliers.view', 'scope:company']);
        Route::put('supplier-contracts/{id}', [\App\Http\Controllers\Api\V1\SupplierContractController::class, 'update'])->middleware(['permission:procurement.contracts.manage,suppliers.update', 'scope:company']);
        Route::delete('supplier-contracts/{id}', [\App\Http\Controllers\Api\V1\SupplierContractController::class, 'destroy'])->middleware(['permission:procurement.contracts.manage,suppliers.delete', 'scope:company']);
        Route::get('supplier-price-agreements', [\App\Http\Controllers\Api\V1\SupplierContractController::class, 'priceAgreements'])->middleware(['permission:procurement.contracts.view,suppliers.view', 'scope:company']);
        Route::post('supplier-price-agreements', [\App\Http\Controllers\Api\V1\SupplierContractController::class, 'storePriceAgreement'])->middleware(['permission:procurement.contracts.manage,suppliers.update', 'scope:company']);
        Route::get('procurement/resolve-price', [\App\Http\Controllers\Api\V1\SupplierContractController::class, 'resolvePrice'])->middleware(['permission:procurement.contracts.view,purchase_orders.view', 'scope:company']);

        // Procurement Analytics, 3-Way Matching & Planning
        Route::get('procurement/dashboard', [\App\Http\Controllers\Api\V1\ProcurementAnalyticsController::class, 'dashboard'])->middleware(['permission:procurement.dashboard.view,purchase_orders.view', 'scope:company']);
        Route::get('procurement/three-way-match/{purchaseId}', [\App\Http\Controllers\Api\V1\ProcurementAnalyticsController::class, 'threeWayMatch'])->middleware(['permission:procurement.matching.view,purchases.view', 'scope:company']);
        Route::get('procurement/match-exceptions', [\App\Http\Controllers\Api\V1\ProcurementAnalyticsController::class, 'matchExceptions'])->middleware(['permission:procurement.matching.view,purchases.view', 'scope:company']);
        Route::get('procurement/ppv-summary', [\App\Http\Controllers\Api\V1\ProcurementAnalyticsController::class, 'ppvSummary'])->middleware(['permission:procurement.matching.view,purchases.view', 'scope:company']);
        Route::get('procurement/recommendations', [\App\Http\Controllers\Api\V1\ProcurementAnalyticsController::class, 'recommendations'])->middleware(['permission:procurement.planning.view,purchase_orders.view', 'scope:company']);
        Route::post('procurement/recommendations/create-requisition', [\App\Http\Controllers\Api\V1\ProcurementAnalyticsController::class, 'createRequisitionFromRecommendations'])->middleware(['permission:procurement.requisitions.create,purchase_orders.create', 'scope:company']);

        // PHASE 8 — Advanced Customer + Credit + CRM + Intelligence Routes
        // Customer Credit & Requests
        Route::get('customers/{id}/credit-summary', [\App\Http\Controllers\Api\V1\CustomerCreditController::class, 'summary'])->middleware(['permission:customers.view', 'scope:company']);
        Route::get('customer-credit-requests', [\App\Http\Controllers\Api\V1\CustomerCreditController::class, 'listRequests'])->middleware(['permission:customers.view', 'scope:company']);
        Route::post('customers/{id}/request-credit', [\App\Http\Controllers\Api\V1\CustomerCreditController::class, 'requestCredit'])->middleware(['permission:customers.credit_manage,customers.update', 'scope:company']);
        Route::post('customer-credit-requests/{id}/approve', [\App\Http\Controllers\Api\V1\CustomerCreditController::class, 'approveRequest'])->middleware(['permission:customers.credit_approve,customers.update', 'scope:company']);
        Route::post('customer-credit-requests/{id}/reject', [\App\Http\Controllers\Api\V1\CustomerCreditController::class, 'rejectRequest'])->middleware(['permission:customers.credit_approve,customers.update', 'scope:company']);
        Route::post('customers/{id}/credit-hold', [\App\Http\Controllers\Api\V1\CustomerCreditController::class, 'toggleHold'])->middleware(['permission:customers.credit_manage,customers.update', 'scope:company']);

        // Accounts Receivable Aging & Statements
        Route::get('customers/{id}/statement', [\App\Http\Controllers\Api\V1\CustomerArController::class, 'statement'])->middleware(['permission:customers.view', 'scope:company']);
        Route::get('customers/{id}/aging', [\App\Http\Controllers\Api\V1\CustomerArController::class, 'customerAging'])->middleware(['permission:customers.view', 'scope:company']);
        Route::get('ar/aging-summary', [\App\Http\Controllers\Api\V1\CustomerArController::class, 'companyAging'])->middleware(['permission:customers.view', 'scope:company']);
        Route::get('ar/collection-priorities', [\App\Http\Controllers\Api\V1\CustomerArController::class, 'collectionPriorities'])->middleware(['permission:customers.view', 'scope:company']);

        // CRM: Activities, Complaints, Opportunities & Timeline
        Route::get('crm/dashboard', [\App\Http\Controllers\Api\V1\CustomerCrmController::class, 'dashboard'])->middleware(['permission:crm.view,customers.view', 'scope:company']);
        Route::get('customers/{id}/timeline', [\App\Http\Controllers\Api\V1\CustomerCrmController::class, 'timeline'])->middleware(['permission:crm.view,customers.view', 'scope:company']);
        Route::get('crm/activities', [\App\Http\Controllers\Api\V1\CustomerCrmController::class, 'listActivities'])->middleware(['permission:crm.view,customers.view', 'scope:company']);
        Route::post('crm/activities', [\App\Http\Controllers\Api\V1\CustomerCrmController::class, 'createActivity'])->middleware(['permission:crm.manage,customers.update', 'scope:company']);
        Route::post('crm/activities/{id}/complete', [\App\Http\Controllers\Api\V1\CustomerCrmController::class, 'completeActivity'])->middleware(['permission:crm.manage,customers.update', 'scope:company']);
        Route::get('crm/complaints', [\App\Http\Controllers\Api\V1\CustomerCrmController::class, 'listComplaints'])->middleware(['permission:crm.view,customers.view', 'scope:company']);
        Route::post('crm/complaints', [\App\Http\Controllers\Api\V1\CustomerCrmController::class, 'createComplaint'])->middleware(['permission:crm.manage,customers.update', 'scope:company']);
        Route::post('crm/complaints/{id}/resolve', [\App\Http\Controllers\Api\V1\CustomerCrmController::class, 'resolveComplaint'])->middleware(['permission:crm.manage,customers.update', 'scope:company']);
        Route::get('crm/opportunities', [\App\Http\Controllers\Api\V1\CustomerCrmController::class, 'listOpportunities'])->middleware(['permission:crm.view,customers.view', 'scope:company']);
        Route::post('crm/opportunities', [\App\Http\Controllers\Api\V1\CustomerCrmController::class, 'createOpportunity'])->middleware(['permission:crm.manage,customers.update', 'scope:company']);
        Route::put('crm/opportunities/{id}', [\App\Http\Controllers\Api\V1\CustomerCrmController::class, 'updateOpportunity'])->middleware(['permission:crm.manage,customers.update', 'scope:company']);

        // Customer Intelligence (RFM, CLV, At-Risk, 360)
        Route::get('customers/{id}/360', [\App\Http\Controllers\Api\V1\CustomerIntelligenceController::class, 'show360'])->middleware(['permission:customer_intelligence.view,customers.view', 'scope:company']);
        Route::get('customer-intelligence/rfm-summary', [\App\Http\Controllers\Api\V1\CustomerIntelligenceController::class, 'rfmSummary'])->middleware(['permission:customer_intelligence.view,customers.view', 'scope:company']);
        Route::post('customer-intelligence/recalculate-rfm', [\App\Http\Controllers\Api\V1\CustomerIntelligenceController::class, 'recalculateRfm'])->middleware(['permission:customer_intelligence.manage,customers.update', 'scope:company']);
        Route::get('customer-intelligence/at-risk', [\App\Http\Controllers\Api\V1\CustomerIntelligenceController::class, 'atRiskCustomers'])->middleware(['permission:customer_intelligence.view,customers.view', 'scope:company']);
        Route::get('customers/{id}/clv', [\App\Http\Controllers\Api\V1\CustomerIntelligenceController::class, 'customerClv'])->middleware(['permission:customer_intelligence.view,customers.view', 'scope:company']);

        // Sales Intelligence (Dashboards, Breakdown, Salesperson Attribution, Forecast & Procurement Integration)
        Route::get('sales-intelligence/dashboard', [\App\Http\Controllers\Api\V1\SalesIntelligenceController::class, 'dashboard'])->middleware(['permission:sales_intelligence.view,reports.view', 'scope:company']);
        Route::get('sales-intelligence/by-customer', [\App\Http\Controllers\Api\V1\SalesIntelligenceController::class, 'salesByCustomer'])->middleware(['permission:sales_intelligence.view,reports.view', 'scope:company']);
        Route::get('sales-intelligence/by-branch', [\App\Http\Controllers\Api\V1\SalesIntelligenceController::class, 'salesByBranch'])->middleware(['permission:sales_intelligence.view,reports.view', 'scope:company']);
        Route::get('sales-intelligence/by-product', [\App\Http\Controllers\Api\V1\SalesIntelligenceController::class, 'salesByProduct'])->middleware(['permission:sales_intelligence.view,reports.view', 'scope:company']);
        Route::get('sales-intelligence/salespersons', [\App\Http\Controllers\Api\V1\SalesIntelligenceController::class, 'salespersonPerformance'])->middleware(['permission:sales_intelligence.view,reports.view', 'scope:company']);
        Route::get('sales-intelligence/returns', [\App\Http\Controllers\Api\V1\SalesIntelligenceController::class, 'returnsAnalysis'])->middleware(['permission:sales_intelligence.view,reports.view', 'scope:company']);
        Route::get('sales-intelligence/demand-forecast', [\App\Http\Controllers\Api\V1\SalesIntelligenceController::class, 'demandForecast'])->middleware(['permission:sales_intelligence.view,reports.view', 'scope:company']);
        Route::get('sales-intelligence/reorder-recommendations', [\App\Http\Controllers\Api\V1\SalesIntelligenceController::class, 'reorderRecommendations'])->middleware(['permission:sales_intelligence.view,reports.view', 'scope:company']);

        // =========================================================================
        // PHASE 9 — HRM + ATTENDANCE + LEAVE + PAYROLL ROUTES
        // =========================================================================

        // Departments & Designations
        Route::get('departments', [\App\Http\Controllers\Api\V1\DepartmentController::class, 'index'])->middleware(['permission:departments.view,employees.view', 'scope:company']);
        Route::post('departments', [\App\Http\Controllers\Api\V1\DepartmentController::class, 'store'])->middleware(['permission:departments.manage,employees.create', 'scope:company']);
        Route::put('departments/{id}', [\App\Http\Controllers\Api\V1\DepartmentController::class, 'update'])->middleware(['permission:departments.manage,employees.update', 'scope:company']);
        Route::delete('departments/{id}', [\App\Http\Controllers\Api\V1\DepartmentController::class, 'destroy'])->middleware(['permission:departments.manage,employees.delete', 'scope:company']);

        Route::get('designations', [\App\Http\Controllers\Api\V1\DesignationController::class, 'index'])->middleware(['permission:designations.view,employees.view', 'scope:company']);
        Route::post('designations', [\App\Http\Controllers\Api\V1\DesignationController::class, 'store'])->middleware(['permission:designations.manage,employees.create', 'scope:company']);
        Route::put('designations/{id}', [\App\Http\Controllers\Api\V1\DesignationController::class, 'update'])->middleware(['permission:designations.manage,employees.update', 'scope:company']);
        Route::delete('designations/{id}', [\App\Http\Controllers\Api\V1\DesignationController::class, 'destroy'])->middleware(['permission:designations.manage,employees.delete', 'scope:company']);

        // Employees
        Route::get('employees', [\App\Http\Controllers\Api\V1\EmployeeController::class, 'index'])->middleware(['permission:employees.view', 'scope:company']);
        Route::post('employees', [\App\Http\Controllers\Api\V1\EmployeeController::class, 'store'])->middleware(['permission:employees.create', 'scope:company']);
        Route::get('employees/{id}', [\App\Http\Controllers\Api\V1\EmployeeController::class, 'show'])->middleware(['permission:employees.view', 'scope:company']);
        Route::put('employees/{id}', [\App\Http\Controllers\Api\V1\EmployeeController::class, 'update'])->middleware(['permission:employees.update', 'scope:company']);
        Route::get('employees/{id}/360', [\App\Http\Controllers\Api\V1\EmployeeController::class, 'show360'])->middleware(['permission:employees.view', 'scope:company']);

        // Shifts & Attendance
        Route::get('shifts', [\App\Http\Controllers\Api\V1\ShiftController::class, 'index'])->middleware(['permission:shifts.view,attendance.view', 'scope:company']);
        Route::post('shifts', [\App\Http\Controllers\Api\V1\ShiftController::class, 'store'])->middleware(['permission:shifts.manage,attendance.manage', 'scope:company']);
        Route::put('shifts/{id}', [\App\Http\Controllers\Api\V1\ShiftController::class, 'update'])->middleware(['permission:shifts.manage,attendance.manage', 'scope:company']);
        Route::delete('shifts/{id}', [\App\Http\Controllers\Api\V1\ShiftController::class, 'destroy'])->middleware(['permission:shifts.manage,attendance.manage', 'scope:company']);
        Route::post('shifts/assign', [\App\Http\Controllers\Api\V1\ShiftController::class, 'assignShift'])->middleware(['permission:shifts.manage,attendance.manage', 'scope:company']);

        Route::get('attendances', [\App\Http\Controllers\Api\V1\AttendanceController::class, 'index'])->middleware(['permission:attendance.view', 'scope:company']);
        Route::post('attendances/check-in', [\App\Http\Controllers\Api\V1\AttendanceController::class, 'checkIn'])->middleware(['permission:attendance.checkin,attendance.view', 'scope:company']);
        Route::post('attendances/check-out', [\App\Http\Controllers\Api\V1\AttendanceController::class, 'checkOut'])->middleware(['permission:attendance.checkin,attendance.view', 'scope:company']);
        Route::post('attendances/adjust', [\App\Http\Controllers\Api\V1\AttendanceController::class, 'requestAdjustment'])->middleware(['permission:attendance.manage,attendance.view', 'scope:company']);
        Route::post('attendance-adjustments/{id}/approve', [\App\Http\Controllers\Api\V1\AttendanceController::class, 'approveAdjustment'])->middleware(['permission:attendance.manage', 'scope:company']);
        Route::get('attendances/summary', [\App\Http\Controllers\Api\V1\AttendanceController::class, 'summary'])->middleware(['permission:attendance.view', 'scope:company']);

        // Leave Management
        Route::get('leave-types', [\App\Http\Controllers\Api\V1\LeaveController::class, 'leaveTypes'])->middleware(['permission:leave.view', 'scope:company']);
        Route::post('leave-types', [\App\Http\Controllers\Api\V1\LeaveController::class, 'storeLeaveType'])->middleware(['permission:leave.manage,leave.approve', 'scope:company']);
        Route::put('leave-types/{id}', [\App\Http\Controllers\Api\V1\LeaveController::class, 'updateLeaveType'])->middleware(['permission:leave.manage,leave.approve', 'scope:company']);
        Route::get('leave-balances', [\App\Http\Controllers\Api\V1\LeaveController::class, 'balances'])->middleware(['permission:leave.view', 'scope:company']);
        Route::get('leave-applications', [\App\Http\Controllers\Api\V1\LeaveController::class, 'applications'])->middleware(['permission:leave.view', 'scope:company']);
        Route::post('leave-applications', [\App\Http\Controllers\Api\V1\LeaveController::class, 'storeApplication'])->middleware(['permission:leave.apply,leave.view', 'scope:company']);
        Route::post('leave-applications/{id}/approve', [\App\Http\Controllers\Api\V1\LeaveController::class, 'approveApplication'])->middleware(['permission:leave.approve', 'scope:company']);
        Route::post('leave-applications/{id}/reject', [\App\Http\Controllers\Api\V1\LeaveController::class, 'rejectApplication'])->middleware(['permission:leave.approve', 'scope:company']);

        // Salary Structures & Components
        Route::get('salary-components', [\App\Http\Controllers\Api\V1\SalaryStructureController::class, 'components'])->middleware(['permission:salary.view,payroll.view', 'scope:company']);
        Route::post('salary-components', [\App\Http\Controllers\Api\V1\SalaryStructureController::class, 'storeComponent'])->middleware(['permission:salary.manage,payroll.approve', 'scope:company']);
        Route::get('salary-structures', [\App\Http\Controllers\Api\V1\SalaryStructureController::class, 'index'])->middleware(['permission:salary.view,payroll.view', 'scope:company']);
        Route::post('salary-structures', [\App\Http\Controllers\Api\V1\SalaryStructureController::class, 'store'])->middleware(['permission:salary.manage,payroll.approve', 'scope:company']);
        Route::post('salary-structures/assign', [\App\Http\Controllers\Api\V1\SalaryStructureController::class, 'assignStructure'])->middleware(['permission:salary.manage,payroll.approve', 'scope:company']);

        // Payroll Lifecycle
        Route::get('payroll/periods', [\App\Http\Controllers\Api\V1\PayrollController::class, 'periods'])->middleware(['permission:payroll.view', 'scope:company']);
        Route::post('payroll/periods', [\App\Http\Controllers\Api\V1\PayrollController::class, 'storePeriod'])->middleware(['permission:payroll.calculate,payroll.approve', 'scope:company']);
        Route::get('payroll/runs', [\App\Http\Controllers\Api\V1\PayrollController::class, 'runs'])->middleware(['permission:payroll.view', 'scope:company']);
        Route::post('payroll/runs', [\App\Http\Controllers\Api\V1\PayrollController::class, 'createRun'])->middleware(['permission:payroll.calculate,payroll.approve', 'scope:company']);
        Route::get('payroll/runs/{id}', [\App\Http\Controllers\Api\V1\PayrollController::class, 'showRun'])->middleware(['permission:payroll.view', 'scope:company']);
        Route::post('payroll/runs/{id}/calculate', [\App\Http\Controllers\Api\V1\PayrollController::class, 'calculateRun'])->middleware(['permission:payroll.calculate', 'scope:company']);
        Route::post('payroll/runs/{id}/approve', [\App\Http\Controllers\Api\V1\PayrollController::class, 'approveRun'])->middleware(['permission:payroll.approve', 'scope:company']);
        Route::post('payroll/runs/{id}/post', [\App\Http\Controllers\Api\V1\PayrollController::class, 'postRun'])->middleware(['permission:payroll.post', 'scope:company']);
        Route::post('payroll/runs/{id}/settle', [\App\Http\Controllers\Api\V1\PayrollController::class, 'settlePayout'])->middleware(['permission:payroll.payout', 'scope:company']);

        // Employee Advances & Loans
        Route::get('employee-advances', [\App\Http\Controllers\Api\V1\EmployeeAdvanceController::class, 'index'])->middleware(['permission:advances.view', 'scope:company']);
        Route::post('employee-advances', [\App\Http\Controllers\Api\V1\EmployeeAdvanceController::class, 'store'])->middleware(['permission:advances.request,advances.view', 'scope:company']);
        Route::post('employee-advances/{id}/approve', [\App\Http\Controllers\Api\V1\EmployeeAdvanceController::class, 'approve'])->middleware(['permission:advances.manage', 'scope:company']);
        Route::post('employee-advances/{id}/disburse', [\App\Http\Controllers\Api\V1\EmployeeAdvanceController::class, 'disburse'])->middleware(['permission:advances.manage', 'scope:company']);

        Route::get('employee-loans', [\App\Http\Controllers\Api\V1\EmployeeLoanController::class, 'index'])->middleware(['permission:loans.view', 'scope:company']);
        Route::post('employee-loans', [\App\Http\Controllers\Api\V1\EmployeeLoanController::class, 'store'])->middleware(['permission:loans.manage', 'scope:company']);
        Route::post('employee-loans/{id}/disburse', [\App\Http\Controllers\Api\V1\EmployeeLoanController::class, 'disburse'])->middleware(['permission:loans.manage', 'scope:company']);

        // HRM & Payroll Dashboards
        Route::get('hrm/dashboard', [\App\Http\Controllers\Api\V1\HrmDashboardController::class, 'hrDashboard'])->middleware(['permission:hrm.dashboard.view,employees.view', 'scope:company']);
        Route::get('hrm/payroll-dashboard', [\App\Http\Controllers\Api\V1\HrmDashboardController::class, 'payrollDashboard'])->middleware(['permission:hrm.dashboard.view,payroll.view', 'scope:company']);

        // ================================================================
        // PHASE 10: BANGLADESH VAT & TAX COMPLIANCE FOUNDATION
        // ================================================================
        Route::prefix('tax')->group(function () {
            // Profile & Registrations
            Route::get('profile', [\App\Http\Controllers\Api\V1\Tax\TaxProfileController::class, 'show'])->middleware(['permission:tax.view', 'scope:company']);
            Route::put('profile', [\App\Http\Controllers\Api\V1\Tax\TaxProfileController::class, 'update'])->middleware(['permission:tax.manage', 'scope:company']);
            Route::get('registrations', [\App\Http\Controllers\Api\V1\Tax\TaxRegistrationController::class, 'index'])->middleware(['permission:tax.view', 'scope:company']);
            Route::post('registrations', [\App\Http\Controllers\Api\V1\Tax\TaxRegistrationController::class, 'store'])->middleware(['permission:tax.manage', 'scope:company']);
            Route::delete('registrations/{id}', [\App\Http\Controllers\Api\V1\Tax\TaxRegistrationController::class, 'destroy'])->middleware(['permission:tax.manage', 'scope:company']);

            // Categories & Rules
            Route::get('categories', [\App\Http\Controllers\Api\V1\Tax\TaxRuleController::class, 'categories'])->middleware(['permission:tax.view', 'scope:company']);
            Route::post('categories', [\App\Http\Controllers\Api\V1\Tax\TaxRuleController::class, 'storeCategory'])->middleware(['permission:tax.manage', 'scope:company']);
            Route::get('rules', [\App\Http\Controllers\Api\V1\Tax\TaxRuleController::class, 'index'])->middleware(['permission:tax.view', 'scope:company']);
            Route::post('rules', [\App\Http\Controllers\Api\V1\Tax\TaxRuleController::class, 'store'])->middleware(['permission:tax.manage', 'scope:company']);
            Route::put('rules/{id}', [\App\Http\Controllers\Api\V1\Tax\TaxRuleController::class, 'update'])->middleware(['permission:tax.manage', 'scope:company']);
            Route::patch('rules/{id}/status', [\App\Http\Controllers\Api\V1\Tax\TaxRuleController::class, 'toggleStatus'])->middleware(['permission:tax.manage', 'scope:company']);

            // Tax Periods
            Route::get('periods', [\App\Http\Controllers\Api\V1\Tax\TaxPeriodController::class, 'index'])->middleware(['permission:tax.view', 'scope:company']);
            Route::get('periods/current', [\App\Http\Controllers\Api\V1\Tax\TaxPeriodController::class, 'current'])->middleware(['permission:tax.view', 'scope:company']);
            Route::post('periods', [\App\Http\Controllers\Api\V1\Tax\TaxPeriodController::class, 'store'])->middleware(['permission:tax.manage', 'scope:company']);
            Route::post('periods/{id}/lock', [\App\Http\Controllers\Api\V1\Tax\TaxPeriodController::class, 'lock'])->middleware(['permission:tax.close_period', 'scope:company']);
            Route::post('periods/{id}/file', [\App\Http\Controllers\Api\V1\Tax\TaxPeriodController::class, 'file'])->middleware(['permission:tax.close_period', 'scope:company']);
            Route::post('periods/{id}/close', [\App\Http\Controllers\Api\V1\Tax\TaxPeriodController::class, 'close'])->middleware(['permission:tax.close_period', 'scope:company']);

            // Tax Subledger & Settlement
            Route::get('transactions', [\App\Http\Controllers\Api\V1\Tax\TaxTransactionController::class, 'index'])->middleware(['permission:tax.view', 'scope:company']);
            Route::get('transactions/{id}', [\App\Http\Controllers\Api\V1\Tax\TaxTransactionController::class, 'show'])->middleware(['permission:tax.view', 'scope:company']);
            Route::post('transactions/settle', [\App\Http\Controllers\Api\V1\Tax\TaxTransactionController::class, 'settle'])->middleware(['permission:tax.settle', 'scope:company']);

            // Tax Reconciliation
            Route::get('periods/{periodId}/reconciliation', [\App\Http\Controllers\Api\V1\Tax\TaxReconciliationController::class, 'show'])->middleware(['permission:tax.reconcile', 'scope:company']);
            Route::post('periods/{periodId}/reconcile', [\App\Http\Controllers\Api\V1\Tax\TaxReconciliationController::class, 'reconcile'])->middleware(['permission:tax.reconcile', 'scope:company']);

            // Tax Adjustments
            Route::get('adjustments', [\App\Http\Controllers\Api\V1\Tax\TaxAdjustmentController::class, 'index'])->middleware(['permission:tax.view', 'scope:company']);
            Route::post('adjustments', [\App\Http\Controllers\Api\V1\Tax\TaxAdjustmentController::class, 'store'])->middleware(['permission:tax.adjust', 'scope:company']);
            Route::post('adjustments/{id}/approve', [\App\Http\Controllers\Api\V1\Tax\TaxAdjustmentController::class, 'approve'])->middleware(['permission:tax.adjust', 'scope:company']);
            Route::post('adjustments/{id}/post', [\App\Http\Controllers\Api\V1\Tax\TaxAdjustmentController::class, 'post'])->middleware(['permission:tax.post', 'scope:company']);

            // Pure Calculations / Previews
            Route::post('calculate', [\App\Http\Controllers\Api\V1\Tax\TaxCalculationController::class, 'calculate'])->middleware(['permission:tax.calculate,tax.view', 'scope:company']);
            Route::post('calculate-invoice', [\App\Http\Controllers\Api\V1\Tax\TaxCalculationController::class, 'calculateInvoice'])->middleware(['permission:tax.calculate,tax.view', 'scope:company']);
            Route::post('calculate-withholding', [\App\Http\Controllers\Api\V1\Tax\TaxCalculationController::class, 'calculateWithholding'])->middleware(['permission:tax.calculate,tax.view', 'scope:company']);
        });

        // Tax Reports
        Route::prefix('reports/tax')->group(function () {
            Route::get('vat-summary', [\App\Http\Controllers\Api\V1\Tax\TaxReportController::class, 'vatSummary'])->middleware(['permission:reports.tax.view,tax.view', 'scope:company']);
            Route::get('output-vat', [\App\Http\Controllers\Api\V1\Tax\TaxReportController::class, 'outputVat'])->middleware(['permission:reports.tax.view,tax.view', 'scope:company']);
            Route::get('input-vat', [\App\Http\Controllers\Api\V1\Tax\TaxReportController::class, 'inputVat'])->middleware(['permission:reports.tax.view,tax.view', 'scope:company']);
            Route::get('mushak-foundation/{periodId}', [\App\Http\Controllers\Api\V1\Tax\TaxReportController::class, 'mushakFoundation'])->middleware(['permission:reports.tax.view,tax.view', 'scope:company']);
        });

        // ================================================================
        // PHASE 11: E-COMMERCE ADMIN & CUSTOMER AUTHENTICATED PORTAL
        // ================================================================
        Route::prefix('ecommerce')->group(function () {
            // Store Settings
            Route::get('store', [\App\Http\Controllers\AdminEcommerceController::class, 'getStore'])->middleware(['permission:ecommerce.view', 'scope:company']);
            Route::put('store/{id}', [\App\Http\Controllers\AdminEcommerceController::class, 'updateStore'])->middleware(['permission:ecommerce.settings.manage', 'scope:company']);

            // Orders
            Route::get('orders', [\App\Http\Controllers\AdminEcommerceController::class, 'getOrders'])->middleware(['permission:ecommerce.orders.view', 'scope:company']);
            Route::get('orders/{id}', [\App\Http\Controllers\AdminEcommerceController::class, 'getOrderDetail'])->middleware(['permission:ecommerce.orders.view', 'scope:company']);
            Route::post('orders/{id}/cancel', [\App\Http\Controllers\AdminEcommerceController::class, 'cancelOrder'])->middleware(['permission:ecommerce.orders.manage', 'scope:company']);

            // Fulfillment & Shipments
            Route::post('orders/{id}/shipments', [\App\Http\Controllers\AdminEcommerceController::class, 'createShipment'])->middleware(['permission:ecommerce.fulfillment.manage', 'scope:company']);
            Route::post('shipments/{id}/ship', [\App\Http\Controllers\AdminEcommerceController::class, 'markShipped'])->middleware(['permission:ecommerce.fulfillment.manage', 'scope:company']);
            Route::post('shipments/{id}/deliver', [\App\Http\Controllers\AdminEcommerceController::class, 'markDelivered'])->middleware(['permission:ecommerce.fulfillment.manage', 'scope:company']);

            // Catalog Publishing
            Route::get('catalog', [\App\Http\Controllers\AdminEcommerceController::class, 'getCatalog'])->middleware(['permission:ecommerce.catalog.view', 'scope:company']);
            Route::put('catalog/{id}/publish', [\App\Http\Controllers\AdminEcommerceController::class, 'updateCatalogPublishing'])->middleware(['permission:ecommerce.catalog.manage', 'scope:company']);

            // Categories
            Route::get('categories', [\App\Http\Controllers\AdminEcommerceController::class, 'getCategories'])->middleware(['permission:ecommerce.catalog.view', 'scope:company']);
            Route::post('categories', [\App\Http\Controllers\AdminEcommerceController::class, 'createCategory'])->middleware(['permission:ecommerce.catalog.manage', 'scope:company']);

            // Coupons
            Route::get('coupons', [\App\Http\Controllers\AdminEcommerceController::class, 'getCoupons'])->middleware(['permission:ecommerce.coupons.manage', 'scope:company']);
            Route::post('coupons', [\App\Http\Controllers\AdminEcommerceController::class, 'createCoupon'])->middleware(['permission:ecommerce.coupons.manage', 'scope:company']);

            // Shipping
            Route::get('shipping/methods', [\App\Http\Controllers\AdminEcommerceController::class, 'getShippingMethods'])->middleware(['permission:ecommerce.shipping.manage', 'scope:company']);
            Route::post('shipping/methods', [\App\Http\Controllers\AdminEcommerceController::class, 'createShippingMethod'])->middleware(['permission:ecommerce.shipping.manage', 'scope:company']);

            // Reviews Moderation
            Route::get('reviews', [\App\Http\Controllers\AdminEcommerceController::class, 'getReviews'])->middleware(['permission:ecommerce.reviews.manage', 'scope:company']);
            Route::put('reviews/{id}/status', [\App\Http\Controllers\AdminEcommerceController::class, 'updateReviewStatus'])->middleware(['permission:ecommerce.reviews.manage', 'scope:company']);

            // Reports
            Route::get('reports/overview', [\App\Http\Controllers\AdminEcommerceController::class, 'getReportsOverview'])->middleware(['permission:ecommerce.reports.view', 'scope:company']);
        });

        // Customer Authenticated Portal Routes
        Route::prefix('customer')->group(function () {
            Route::get('profile', [\App\Http\Controllers\CustomerPortalController::class, 'getProfile']);
            Route::get('addresses', [\App\Http\Controllers\CustomerPortalController::class, 'getAddresses']);
            Route::post('addresses', [\App\Http\Controllers\CustomerPortalController::class, 'saveAddress']);
            Route::delete('addresses/{id}', [\App\Http\Controllers\CustomerPortalController::class, 'deleteAddress']);
            Route::get('orders', [\App\Http\Controllers\CustomerPortalController::class, 'getOrders']);
            Route::get('orders/{id}', [\App\Http\Controllers\CustomerPortalController::class, 'getOrderDetail']);
            Route::post('wishlist/toggle', [\App\Http\Controllers\CustomerPortalController::class, 'toggleWishlist']);
            Route::post('reviews', [\App\Http\Controllers\CustomerPortalController::class, 'submitReview']);
            Route::post('returns', [\App\Http\Controllers\CustomerPortalController::class, 'submitReturnRequest']);
        });

        // ================================================================
        // PHASE 12: ADVANCED FINANCIAL MANAGEMENT ROUTES
        // ================================================================
        Route::prefix('financial-management')->middleware(['scope:company'])->group(function () {
            // Budgets & Budget Controls
            Route::get('budgets', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'index'])->middleware(['permission:budgets.view,financial_management.view']);
            Route::post('budgets', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'store'])->middleware(['permission:budgets.manage,financial_management.manage']);
            Route::get('budgets/{id}', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'show'])->middleware(['permission:budgets.view,financial_management.view']);
            Route::put('budgets/{id}', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'update'])->middleware(['permission:budgets.manage,financial_management.manage']);
            Route::post('budgets/{id}/submit', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'submit'])->middleware(['permission:budgets.manage,financial_management.manage']);
            Route::post('budgets/{id}/approve', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'approve'])->middleware(['permission:budgets.approve,financial_management.manage']);
            Route::post('budgets/{id}/activate', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'activate'])->middleware(['permission:budgets.approve,financial_management.manage']);
            Route::post('budgets/{id}/close', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'close'])->middleware(['permission:budgets.manage,financial_management.manage']);
            Route::post('budgets/{id}/revise', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'revise'])->middleware(['permission:budgets.manage,financial_management.manage']);
            Route::get('budgets/{id}/vs-actual', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'budgetVsActual'])->middleware(['permission:budgets.view,financial_management.view']);
            Route::get('budget-controls', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'getControls'])->middleware(['permission:budgets.view,financial_management.view']);
            Route::post('budget-controls', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'storeControl'])->middleware(['permission:budgets.manage,financial_management.manage']);
            Route::post('budget-controls/check', [\App\Http\Controllers\Api\V1\Finance\BudgetController::class, 'checkControl'])->middleware(['permission:budgets.view,financial_management.view']);

            // Cash & Treasury
            Route::get('cash-treasury/positions', [\App\Http\Controllers\Api\V1\Finance\CashTreasuryController::class, 'positions'])->middleware(['permission:cash_forecast.view,financial_management.view']);
            Route::get('cash-treasury/forecast', [\App\Http\Controllers\Api\V1\Finance\CashTreasuryController::class, 'forecast'])->middleware(['permission:cash_forecast.view,financial_management.view']);
            Route::post('cash-treasury/transfer', [\App\Http\Controllers\Api\V1\Finance\CashTreasuryController::class, 'transfer'])->middleware(['permission:bank_accounts.manage,financial_management.manage']);

            // Bank Accounts & Reconciliation
            Route::get('bank-accounts', [\App\Http\Controllers\Api\V1\Finance\BankManagementController::class, 'indexAccounts'])->middleware(['permission:bank_accounts.view,financial_management.view']);
            Route::post('bank-accounts', [\App\Http\Controllers\Api\V1\Finance\BankManagementController::class, 'storeAccount'])->middleware(['permission:bank_accounts.manage,financial_management.manage']);
            Route::get('bank-accounts/{id}/statements', [\App\Http\Controllers\Api\V1\Finance\BankManagementController::class, 'indexStatements'])->middleware(['permission:bank_reconciliation.view,financial_management.view']);
            Route::post('bank-accounts/{id}/statements', [\App\Http\Controllers\Api\V1\Finance\BankManagementController::class, 'importStatement'])->middleware(['permission:bank_reconciliation.manage,financial_management.manage']);
            Route::get('bank-reconciliations', [\App\Http\Controllers\Api\V1\Finance\BankManagementController::class, 'indexReconciliations'])->middleware(['permission:bank_reconciliation.view,financial_management.view']);
            Route::post('bank-reconciliations', [\App\Http\Controllers\Api\V1\Finance\BankManagementController::class, 'startReconciliation'])->middleware(['permission:bank_reconciliation.manage,financial_management.manage']);
            Route::post('bank-reconciliations/{id}/auto-match', [\App\Http\Controllers\Api\V1\Finance\BankManagementController::class, 'autoMatch'])->middleware(['permission:bank_reconciliation.manage,financial_management.manage']);
            Route::post('bank-reconciliations/{id}/manual-match', [\App\Http\Controllers\Api\V1\Finance\BankManagementController::class, 'manualMatch'])->middleware(['permission:bank_reconciliation.manage,financial_management.manage']);
            Route::post('bank-reconciliations/{id}/finalize', [\App\Http\Controllers\Api\V1\Finance\BankManagementController::class, 'finalize'])->middleware(['permission:bank_reconciliation.manage,financial_management.manage']);

            // Financial Periods & Year-End Closing
            Route::get('financial-periods', [\App\Http\Controllers\Api\V1\Finance\FinancialPeriodController::class, 'index'])->middleware(['permission:financial_periods.view,financial_management.view']);
            Route::post('financial-periods/{id}/soft-lock', [\App\Http\Controllers\Api\V1\Finance\FinancialPeriodController::class, 'softLock'])->middleware(['permission:financial_periods.manage,financial_management.manage']);
            Route::post('financial-periods/{id}/close', [\App\Http\Controllers\Api\V1\Finance\FinancialPeriodController::class, 'close'])->middleware(['permission:financial_periods.manage,financial_management.manage']);
            Route::post('financial-periods/{id}/reopen', [\App\Http\Controllers\Api\V1\Finance\FinancialPeriodController::class, 'reopen'])->middleware(['permission:financial_periods.reopen,financial_management.manage']);
            Route::get('year-end-closings', [\App\Http\Controllers\Api\V1\Finance\FinancialPeriodController::class, 'yearEndClosingsList'])->middleware(['permission:year_end.view,financial_management.view']);
            Route::get('year-end-closings/preview/{fiscalYearId}', [\App\Http\Controllers\Api\V1\Finance\FinancialPeriodController::class, 'previewYearEnd'])->middleware(['permission:year_end.view,financial_management.view']);
            Route::post('year-end-closings/execute', [\App\Http\Controllers\Api\V1\Finance\FinancialPeriodController::class, 'executeYearEnd'])->middleware(['permission:year_end.close,financial_management.manage']);
            Route::post('year-end-closings/{id}/reverse', [\App\Http\Controllers\Api\V1\Finance\FinancialPeriodController::class, 'reverseYearEnd'])->middleware(['permission:year_end.close,financial_management.manage']);

            // Cost & Profit Centres
            Route::get('cost-centres', [\App\Http\Controllers\Api\V1\Finance\CostProfitCentreController::class, 'indexCostCentres'])->middleware(['permission:cost_centres.view,financial_management.view']);
            Route::post('cost-centres', [\App\Http\Controllers\Api\V1\Finance\CostProfitCentreController::class, 'storeCostCentre'])->middleware(['permission:cost_centres.manage,financial_management.manage']);
            Route::get('cost-centres/expense-report', [\App\Http\Controllers\Api\V1\Finance\CostProfitCentreController::class, 'costCentreExpenseReport'])->middleware(['permission:cost_centres.view,financial_management.view']);
            Route::get('profit-centres', [\App\Http\Controllers\Api\V1\Finance\CostProfitCentreController::class, 'indexProfitCentres'])->middleware(['permission:profit_centres.view,financial_management.view']);
            Route::post('profit-centres', [\App\Http\Controllers\Api\V1\Finance\CostProfitCentreController::class, 'storeProfitCentre'])->middleware(['permission:profit_centres.manage,financial_management.manage']);
            Route::get('profit-centres/performance-report', [\App\Http\Controllers\Api\V1\Finance\CostProfitCentreController::class, 'profitCentrePerformanceReport'])->middleware(['permission:profit_centres.view,financial_management.view']);

            // Advanced AR & AP Aging
            Route::get('ar/aging', [\App\Http\Controllers\Api\V1\Finance\AdvancedArApController::class, 'arAging'])->middleware(['permission:financial_reports.view,financial_management.view']);
            Route::get('ap/aging', [\App\Http\Controllers\Api\V1\Finance\AdvancedArApController::class, 'apAging'])->middleware(['permission:financial_reports.view,financial_management.view']);

            // Fixed Assets & Depreciation
            Route::get('fixed-assets/categories', [\App\Http\Controllers\Api\V1\Finance\FixedAssetController::class, 'indexCategories'])->middleware(['permission:fixed_assets.view,financial_management.view']);
            Route::post('fixed-assets/categories', [\App\Http\Controllers\Api\V1\Finance\FixedAssetController::class, 'storeCategory'])->middleware(['permission:fixed_assets.manage,financial_management.manage']);
            Route::get('fixed-assets', [\App\Http\Controllers\Api\V1\Finance\FixedAssetController::class, 'index'])->middleware(['permission:fixed_assets.view,financial_management.view']);
            Route::post('fixed-assets', [\App\Http\Controllers\Api\V1\Finance\FixedAssetController::class, 'store'])->middleware(['permission:fixed_assets.manage,financial_management.manage']);
            Route::get('fixed-assets/{id}', [\App\Http\Controllers\Api\V1\Finance\FixedAssetController::class, 'show'])->middleware(['permission:fixed_assets.view,financial_management.view']);
            Route::post('fixed-assets/run-depreciation', [\App\Http\Controllers\Api\V1\Finance\FixedAssetController::class, 'runDepreciation'])->middleware(['permission:fixed_assets.depreciation,financial_management.manage']);
            Route::post('fixed-assets/{id}/dispose', [\App\Http\Controllers\Api\V1\Finance\FixedAssetController::class, 'dispose'])->middleware(['permission:fixed_assets.dispose,financial_management.manage']);

            // Analytics, Financial Ratios & Executive Telemetry
            Route::get('analytics/ratios', [\App\Http\Controllers\Api\V1\Finance\FinancialAnalyticsController::class, 'ratios'])->middleware(['permission:financial_reports.view,financial_management.view']);
            Route::get('analytics/forecast', [\App\Http\Controllers\Api\V1\Finance\FinancialAnalyticsController::class, 'forecast'])->middleware(['permission:cash_forecast.view,financial_management.view']);
            Route::get('analytics/telemetry', [\App\Http\Controllers\Api\V1\Finance\FinancialAnalyticsController::class, 'telemetry'])->middleware(['permission:financial_reports.view,financial_management.view']);
        });
    });
});

// ================================================================
// PHASE 11: PUBLIC STOREFRONT & CUSTOMER AUTH & WEBHOOKS
// ================================================================
Route::prefix('v1')->group(function () {
    // Customer Auth
    Route::post('customer/register', [\App\Http\Controllers\CustomerPortalController::class, 'register']);
    Route::post('customer/login', [\App\Http\Controllers\CustomerPortalController::class, 'login']);

    // Payment Webhooks
    Route::post('payments/webhook/{gateway}', [\App\Http\Controllers\PaymentWebhookController::class, 'handleWebhook']);

    // Public Storefront Catalog, Cart & Checkout
    Route::prefix('store/{store}')->group(function () {
        Route::get('info', [\App\Http\Controllers\StorefrontCatalogController::class, 'getStoreInfo']);
        Route::get('products', [\App\Http\Controllers\StorefrontCatalogController::class, 'getProducts']);
        Route::get('products/{slug}', [\App\Http\Controllers\StorefrontCatalogController::class, 'getProductDetail']);
        Route::get('categories', [\App\Http\Controllers\StorefrontCatalogController::class, 'getCategories']);
        Route::get('shipping-methods', [\App\Http\Controllers\StorefrontCatalogController::class, 'getShippingMethods']);

        // Cart
        Route::get('cart', [\App\Http\Controllers\StorefrontCartController::class, 'getCart']);
        Route::post('cart/items', [\App\Http\Controllers\StorefrontCartController::class, 'addItem']);
        Route::put('cart/items/{id}', [\App\Http\Controllers\StorefrontCartController::class, 'updateItem']);
        Route::delete('cart/items/{id}', [\App\Http\Controllers\StorefrontCartController::class, 'removeItem']);
        Route::delete('cart', [\App\Http\Controllers\StorefrontCartController::class, 'clearCart']);
        Route::post('cart/coupon', [\App\Http\Controllers\StorefrontCartController::class, 'applyCoupon']);
        Route::delete('cart/coupon', [\App\Http\Controllers\StorefrontCartController::class, 'removeCoupon']);

        // Checkout
        Route::post('checkout', [\App\Http\Controllers\StorefrontCheckoutController::class, 'checkout']);
        Route::get('orders/{orderNumber}/track', [\App\Http\Controllers\StorefrontCheckoutController::class, 'trackOrder']);
    });
});

// ================================================================
// PHASE 13: ADVANCED BI & MANAGEMENT REPORTING
// ================================================================
Route::middleware('auth:sanctum')->prefix('v1/bi')->group(function () {
    // Executive Dashboard & Preferences
    Route::get('dashboard/executive', [\App\Http\Controllers\Api\V1\Bi\BiDashboardController::class, 'executive'])->middleware('permission:bi.view,bi.dashboard');
    Route::get('dashboard/sales', [\App\Http\Controllers\Api\V1\Bi\BiDashboardController::class, 'sales'])->middleware('permission:bi.view,bi.dashboard');
    Route::get('dashboard/preferences/{key}', [\App\Http\Controllers\Api\V1\Bi\BiDashboardController::class, 'getPreferences']);
    Route::post('dashboard/preferences/{key}', [\App\Http\Controllers\Api\V1\Bi\BiDashboardController::class, 'savePreferences']);

    // Specialized Domain BI
    Route::get('sales', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'sales'])->middleware('permission:bi.view,bi.sales');
    Route::get('profitability', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'profitability'])->middleware('permission:bi.view,bi.profitability');
    Route::get('inventory', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'inventory'])->middleware('permission:bi.view,bi.inventory');
    Route::get('procurement', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'procurement'])->middleware('permission:bi.view,bi.procurement');
    Route::get('customer', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'customer'])->middleware('permission:bi.view,bi.customer');
    Route::get('supplier', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'supplier'])->middleware('permission:bi.view,bi.supplier');
    Route::get('pos', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'pos'])->middleware('permission:bi.view,bi.pos');
    Route::get('ecommerce', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'ecommerce'])->middleware('permission:bi.view,bi.ecommerce');
    Route::get('hr', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'hr'])->middleware('permission:bi.view,bi.hr');
    Route::get('finance', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'finance'])->middleware('permission:bi.view,bi.finance');
    Route::get('vat', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'vat'])->middleware('permission:bi.view,bi.vat');
    Route::get('branch', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'branch'])->middleware('permission:bi.view,bi.branch');
    Route::get('product', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'product'])->middleware('permission:bi.view,bi.product');
    Route::get('channel', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'channel'])->middleware('permission:bi.view,bi.sales');
    Route::get('salesperson', [\App\Http\Controllers\Api\V1\Bi\BiDomainController::class, 'salesperson'])->middleware('permission:bi.view,bi.sales');

    // Management Alerts
    Route::get('alerts', [\App\Http\Controllers\Api\V1\Bi\BiAlertController::class, 'index'])->middleware('permission:bi.view,bi.alerts');
    Route::post('alerts/evaluate', [\App\Http\Controllers\Api\V1\Bi\BiAlertController::class, 'evaluate'])->middleware('permission:bi.view,bi.alerts');
    Route::post('alerts/{id}/acknowledge', [\App\Http\Controllers\Api\V1\Bi\BiAlertController::class, 'acknowledge'])->middleware('permission:bi.view,bi.alerts');
    Route::post('alerts/{id}/resolve', [\App\Http\Controllers\Api\V1\Bi\BiAlertController::class, 'resolve'])->middleware('permission:bi.view,bi.alerts');

    // Report Builder & Saved Reports
    Route::get('reports/catalog', [\App\Http\Controllers\Api\V1\Bi\BiReportBuilderController::class, 'catalog'])->middleware('permission:bi.view,bi.report_builder');
    Route::post('reports/execute', [\App\Http\Controllers\Api\V1\Bi\BiReportBuilderController::class, 'execute'])->middleware('permission:bi.view,bi.report_builder');
    Route::post('reports/export', [\App\Http\Controllers\Api\V1\Bi\BiReportBuilderController::class, 'export'])->middleware('permission:bi.view,bi.export');
    Route::get('reports/saved', [\App\Http\Controllers\Api\V1\Bi\BiReportBuilderController::class, 'savedReports'])->middleware('permission:bi.view,bi.saved_reports');
    Route::post('reports/saved', [\App\Http\Controllers\Api\V1\Bi\BiReportBuilderController::class, 'storeSavedReport'])->middleware('permission:bi.view,bi.saved_reports');
    Route::get('reports/saved/{id}/run', [\App\Http\Controllers\Api\V1\Bi\BiReportBuilderController::class, 'runSavedReport'])->middleware('permission:bi.view,bi.saved_reports');
    Route::put('reports/saved/{id}', [\App\Http\Controllers\Api\V1\Bi\BiReportBuilderController::class, 'updateSavedReport'])->middleware('permission:bi.view,bi.saved_reports');
    Route::delete('reports/saved/{id}', [\App\Http\Controllers\Api\V1\Bi\BiReportBuilderController::class, 'destroySavedReport'])->middleware('permission:bi.view,bi.saved_reports');
});


