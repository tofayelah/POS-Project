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

Route::post('v1/login', [\App\Http\Controllers\Api\V1\AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('v1/logout', [\App\Http\Controllers\Api\V1\AuthController::class, 'logout']);
    Route::get('v1/me', [\App\Http\Controllers\Api\V1\AuthController::class, 'me']);

    Route::prefix('v1')->group(function () {
        // Users & Roles
        Route::get('users', [\App\Http\Controllers\Api\V1\UserController::class, 'index'])->middleware('permission:users.view');
        Route::post('users', [\App\Http\Controllers\Api\V1\UserController::class, 'store'])->middleware('permission:users.create');
        Route::match(['put', 'patch'], 'users/{user}', [\App\Http\Controllers\Api\V1\UserController::class, 'update'])->middleware('permission:users.update');

        Route::get('roles', [\App\Http\Controllers\Api\V1\RoleController::class, 'index'])->middleware('permission:roles.view');

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

        // Organizational Hierarchy: Storage Locations
        Route::get('storage-locations', [\App\Http\Controllers\Api\V1\StorageLocationController::class, 'index'])->middleware('permission:storage_locations.view');
        Route::get('storage-locations/{storageLocation}', [\App\Http\Controllers\Api\V1\StorageLocationController::class, 'show'])->middleware('permission:storage_locations.view');
        Route::post('storage-locations', [\App\Http\Controllers\Api\V1\StorageLocationController::class, 'store'])->middleware(['permission:storage_locations.create', 'scope:warehouse']);
        Route::match(['put', 'patch'], 'storage-locations/{storageLocation}', [\App\Http\Controllers\Api\V1\StorageLocationController::class, 'update'])->middleware('permission:storage_locations.update');
        Route::delete('storage-locations/{storageLocation}', [\App\Http\Controllers\Api\V1\StorageLocationController::class, 'destroy'])->middleware('permission:storage_locations.delete');

        // System Settings
        Route::get('settings', [\App\Http\Controllers\Api\V1\SettingController::class, 'index'])->middleware('permission:settings.view');
        Route::match(['put', 'patch'], 'settings', [\App\Http\Controllers\Api\V1\SettingController::class, 'update'])->middleware('permission:settings.update');

        // Audit Logs
        Route::get('audit-logs', [\App\Http\Controllers\Api\V1\AuditLogController::class, 'index'])->middleware('permission:audit_logs.view');

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
        Route::get('inventory', [\App\Http\Controllers\Api\V1\InventoryController::class, 'index'])->middleware('permission:inventory.view');
        Route::get('inventory/low-stock', [\App\Http\Controllers\Api\V1\InventoryController::class, 'lowStock'])->middleware('permission:inventory.view');
        Route::get('inventory/movements', [\App\Http\Controllers\Api\V1\InventoryController::class, 'movements'])->middleware('permission:inventory.movement.view');

        Route::post('inventory/opening-stock', [\App\Http\Controllers\Api\V1\InventoryController::class, 'openingStock'])->middleware(['permission:inventory.create', 'scope:company']);
        Route::post('inventory/adjustments', [\App\Http\Controllers\Api\V1\InventoryController::class, 'adjustStock'])->middleware(['permission:inventory.adjust', 'scope:company']);
        Route::post('inventory/damage-loss', [\App\Http\Controllers\Api\V1\InventoryController::class, 'recordDamageLoss'])->middleware(['permission:inventory.adjust', 'scope:company']);

        Route::get('inventory/transfers', [\App\Http\Controllers\Api\V1\TransferController::class, 'index'])->middleware('permission:inventory.transfer.view');
        Route::get('inventory/transfers/{transfer}', [\App\Http\Controllers\Api\V1\TransferController::class, 'show'])->middleware('permission:inventory.transfer.view');
        Route::post('inventory/transfers', [\App\Http\Controllers\Api\V1\TransferController::class, 'store'])->middleware(['permission:inventory.transfer.create', 'scope:company']);
        Route::post('inventory/transfers/{transfer}/submit', [\App\Http\Controllers\Api\V1\TransferController::class, 'submit'])->middleware(['permission:inventory.transfer.create', 'scope:company']);
        Route::post('inventory/transfers/{transfer}/approve', [\App\Http\Controllers\Api\V1\TransferController::class, 'approve'])->middleware(['permission:inventory.transfer.approve', 'scope:company']);
        Route::post('inventory/transfers/{transfer}/ship', [\App\Http\Controllers\Api\V1\TransferController::class, 'ship'])->middleware(['permission:inventory.transfer.ship', 'scope:company']);
        Route::post('inventory/transfers/{transfer}/receive', [\App\Http\Controllers\Api\V1\TransferController::class, 'receive'])->middleware(['permission:inventory.transfer.receive', 'scope:company']);
        Route::post('inventory/transfers/{transfer}/cancel', [\App\Http\Controllers\Api\V1\TransferController::class, 'cancel'])->middleware(['permission:inventory.transfer.create', 'scope:company']);
        // SPRINT 04 — Suppliers & Purchase Routes
        // Suppliers
        Route::get('suppliers', [\App\Http\Controllers\Api\V1\SupplierController::class, 'index'])->middleware('permission:suppliers.view');
        Route::post('suppliers', [\App\Http\Controllers\Api\V1\SupplierController::class, 'store'])->middleware('permission:suppliers.create');
        Route::get('suppliers/{id}', [\App\Http\Controllers\Api\V1\SupplierController::class, 'show'])->middleware('permission:suppliers.view');
        Route::put('suppliers/{id}', [\App\Http\Controllers\Api\V1\SupplierController::class, 'update'])->middleware('permission:suppliers.update');
        Route::delete('suppliers/{id}', [\App\Http\Controllers\Api\V1\SupplierController::class, 'destroy'])->middleware('permission:suppliers.delete');

        // Purchase Orders
        Route::get('purchase-orders', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'index'])->middleware('permission:purchase_orders.view');
        Route::post('purchase-orders', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'store'])->middleware('permission:purchase_orders.create');
        Route::get('purchase-orders/{id}', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'show'])->middleware('permission:purchase_orders.view');
        Route::post('purchase-orders/{id}/approve', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'approve'])->middleware('permission:purchase_orders.approve');

        // Goods Receipts
        Route::get('goods-receipts', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'index'])->middleware('permission:goods_receipts.view');
        Route::post('goods-receipts', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'store'])->middleware('permission:goods_receipts.create');
        Route::post('goods-receipts/{id}/post', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'postReceipt'])->middleware('permission:goods_receipts.post');

        // Purchases
        Route::get('purchases', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'index'])->middleware('permission:purchases.view');
        Route::post('purchases', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'store'])->middleware('permission:purchases.create');
        Route::post('purchases/{id}/post', [\App\Http\Controllers\Api\V1\PurchaseController::class, 'postPurchase'])->middleware('permission:purchases.create');

        // SPRINT 05 — Customers & Ledger
        Route::get('customer-groups', [\App\Http\Controllers\Api\V1\CustomerGroupController::class, 'index'])->middleware('permission:customer_groups.view');
        Route::post('customer-groups', [\App\Http\Controllers\Api\V1\CustomerGroupController::class, 'store'])->middleware('permission:customer_groups.create');
        Route::get('customer-groups/{id}', [\App\Http\Controllers\Api\V1\CustomerGroupController::class, 'show'])->middleware('permission:customer_groups.view');
        Route::put('customer-groups/{id}', [\App\Http\Controllers\Api\V1\CustomerGroupController::class, 'update'])->middleware('permission:customer_groups.update');
        Route::delete('customer-groups/{id}', [\App\Http\Controllers\Api\V1\CustomerGroupController::class, 'destroy'])->middleware('permission:customer_groups.delete');

        Route::get('customers/search', [\App\Http\Controllers\Api\V1\CustomerController::class, 'search'])->middleware('permission:customers.view');
        Route::get('customers', [\App\Http\Controllers\Api\V1\CustomerController::class, 'index'])->middleware('permission:customers.view');
        Route::post('customers', [\App\Http\Controllers\Api\V1\CustomerController::class, 'store'])->middleware('permission:customers.create');
        Route::get('customers/{id}', [\App\Http\Controllers\Api\V1\CustomerController::class, 'show'])->middleware('permission:customers.view');
        Route::put('customers/{id}', [\App\Http\Controllers\Api\V1\CustomerController::class, 'update'])->middleware('permission:customers.update');
        Route::delete('customers/{id}', [\App\Http\Controllers\Api\V1\CustomerController::class, 'destroy'])->middleware('permission:customers.delete');

        Route::get('customers/{id}/ledger', [\App\Http\Controllers\Api\V1\CustomerLedgerController::class, 'index'])->middleware('permission:customer_ledger.view');
        Route::post('customers/{id}/opening-balance', [\App\Http\Controllers\Api\V1\CustomerLedgerController::class, 'storeOpeningBalance'])->middleware('permission:customer_ledger.create_opening_balance');
        Route::post('customers/{id}/ledger/adjustment', [\App\Http\Controllers\Api\V1\CustomerLedgerController::class, 'storeAdjustment'])->middleware('permission:customer_ledger.create_adjustment');

        // SPRINT 06 — POS & Sales
        Route::get('pos/terminals', [\App\Http\Controllers\Api\V1\PosTerminalController::class, 'index'])->middleware('permission:pos.view');
        Route::post('pos/terminals', [\App\Http\Controllers\Api\V1\PosTerminalController::class, 'store'])->middleware('permission:pos.view');
        Route::put('pos/terminals/{id}', [\App\Http\Controllers\Api\V1\PosTerminalController::class, 'update'])->middleware('permission:pos.view');

        Route::get('pos/sessions/current', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'current'])->middleware('permission:pos.view');
        Route::post('pos/sessions/open', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'open'])->middleware('permission:pos.open_session');
        Route::post('pos/sessions/{id}/close', [\App\Http\Controllers\Api\V1\PosSessionController::class, 'close'])->middleware('permission:pos.close_session');

        Route::get('pos/products/search', [\App\Http\Controllers\Api\V1\PosProductController::class, 'search'])->middleware('permission:pos.view');
        Route::get('pos/barcode/{barcode}', [\App\Http\Controllers\Api\V1\PosProductController::class, 'barcode'])->middleware('permission:pos.view');

        Route::get('sales', [\App\Http\Controllers\Api\V1\SaleController::class, 'index'])->middleware('permission:sales.view');
        Route::get('sales/{id}', [\App\Http\Controllers\Api\V1\SaleController::class, 'show'])->middleware('permission:sales.view');
        Route::post('sales/hold', [\App\Http\Controllers\Api\V1\SaleController::class, 'hold'])->middleware('permission:pos.hold');
        Route::post('sales/complete', [\App\Http\Controllers\Api\V1\SaleController::class, 'complete'])->middleware('permission:sales.complete');
        // SPRINT 07 — Sales Return & Exchange
        Route::get('sales-returns', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'index'])->middleware('permission:sales_return.view');
        Route::get('sales-returns/{id}', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'show'])->middleware('permission:sales_return.view');
        Route::post('sales-returns', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'store'])->middleware('permission:sales_return.create');
        Route::get('sales/{id}/returnable-items', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'returnableItems'])->middleware('permission:sales_return.create');
        Route::put('sales-returns/{id}', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'update']);
        Route::post('sales-returns/{id}/approve', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'approve']);
        Route::post('sales-returns/{id}/complete', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'complete']);
        Route::post('sales-returns/{id}/cancel', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'cancel']);
        Route::post('sales-returns/{id}/refund', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'refund']);
        Route::post('sales-returns/{id}/exchange', [\App\Http\Controllers\Api\V1\SalesReturnController::class, 'exchange']);

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

        Route::get('reports/customer-receivables', [\App\Http\Controllers\Api\V1\Reports\CustomerReportController::class, 'receivables'])->middleware('permission:reports.customer.view');
        Route::get('reports/customers/{id}/ledger', [\App\Http\Controllers\Api\V1\Reports\CustomerReportController::class, 'ledger'])->middleware('permission:reports.customer.view');

        Route::get('reports/supplier-payables', [\App\Http\Controllers\Api\V1\Reports\SupplierReportController::class, 'payables'])->middleware('permission:reports.supplier.view');
        Route::get('reports/suppliers/{id}/ledger', [\App\Http\Controllers\Api\V1\Reports\SupplierReportController::class, 'ledger'])->middleware('permission:reports.supplier.view');

        // SPRINT 09 — Accounting Engine
        Route::get('account-groups', [\App\Http\Controllers\Api\V1\AccountGroupController::class, 'index'])->middleware('permission:account_group.view');
        Route::post('account-groups', [\App\Http\Controllers\Api\V1\AccountGroupController::class, 'store'])->middleware('permission:account_group.create');

        Route::get('accounts', [\App\Http\Controllers\Api\V1\AccountController::class, 'index'])->middleware('permission:account.view');
        Route::post('accounts', [\App\Http\Controllers\Api\V1\AccountController::class, 'store'])->middleware('permission:account.create');
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

        Route::get('general-ledger', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'generalLedger'])->middleware('permission:general_ledger.view');
        Route::get('trial-balance', [\App\Http\Controllers\Api\V1\AccountingReportController::class, 'trialBalance'])->middleware('permission:trial_balance.view');
    });
});
