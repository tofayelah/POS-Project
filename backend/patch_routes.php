<?php
$content = file_get_contents('backend/routes/api.php');
$routes = <<<ROUTES
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
ROUTES;

$content = str_replace('// SPRINT 09 — Accounting Engine', $routes, $content);
file_put_contents('backend/routes/api.php', $content);
