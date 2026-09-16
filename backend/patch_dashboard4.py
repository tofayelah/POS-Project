import re

with open('backend/app/Http/Controllers/Api/V1/Reports/DashboardReportController.php', 'r') as f:
    content = f.read()

# 1. Add warehouseId
if "$warehouseId = $request->query('warehouse_id');" not in content:
    content = content.replace(
        "$branchId = $request->query('branch_id');",
        "$branchId = $request->query('branch_id');\n        $warehouseId = $request->query('warehouse_id');"
    )

# 2. Add to Sale, Return, Purchase, Expense queries
content = content.replace(
"""        if ($branchId) {
            $saleQuery->where('branch_id', $branchId);
            $salesReturnQuery->where('branch_id', $branchId);
            $purchaseQuery->where('branch_id', $branchId);
            $expenseQuery->where('branch_id', $branchId);
        }""",
"""        if ($branchId) {
            $saleQuery->where('branch_id', $branchId);
            $salesReturnQuery->where('branch_id', $branchId);
            $purchaseQuery->where('branch_id', $branchId);
            $expenseQuery->where('branch_id', $branchId);
        }
        if ($warehouseId) {
            $saleQuery->where('warehouse_id', $warehouseId);
            $salesReturnQuery->where('warehouse_id', $warehouseId);
            $purchaseQuery->where('warehouse_id', $warehouseId);
            $expenseQuery->where('warehouse_id', $warehouseId);
        }"""
)

# 3. Add to SaleItems Query
content = content.replace(
"""        if ($branchId) {
            $saleItemsQuery->where('sales.branch_id', $branchId);
        }""",
"""        if ($branchId) {
            $saleItemsQuery->where('sales.branch_id', $branchId);
        }
        if ($warehouseId) {
            $saleItemsQuery->where('sales.warehouse_id', $warehouseId);
        }"""
)

# 4. Add to InventoryQuery
content = content.replace(
"""        $inventoryQuery = Inventory::where('company_id', $companyId);
        if ($branchId) {
            $inventoryQuery->whereHas('warehouse', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        $inventoryValue = (float) $inventoryQuery->sum('total_value');""",
"""        $inventoryQuery = Inventory::where('company_id', $companyId);
        if ($branchId) {
            $inventoryQuery->whereHas('warehouse', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        if ($warehouseId) {
            $inventoryQuery->where('warehouse_id', $warehouseId);
        }
        $inventoryValue = (float) $inventoryQuery->sum('total_value');"""
)

# 5. Low Stock Query
content = content.replace(
"""        if ($branchId) {
            $lowStockQuery->join('warehouses', 'inventories.warehouse_id', '=', 'warehouses.id')
                          ->where('warehouses.branch_id', $branchId);
        }
        
        $lowStock = $lowStockQuery->count();""",
"""        if ($branchId) {
            $lowStockQuery->join('warehouses', 'inventories.warehouse_id', '=', 'warehouses.id')
                          ->where('warehouses.branch_id', $branchId);
        }
        if ($warehouseId) {
            $lowStockQuery->where('inventories.warehouse_id', $warehouseId);
        }
        
        $lowStock = $lowStockQuery->count();"""
)

# 6. Low Stock Details Query
content = content.replace(
"""        if ($branchId) {
            $lowStockDetailsQuery->where('warehouses.branch_id', $branchId);
        }

        $lowStockDetails = $lowStockDetailsQuery->get();""",
"""        if ($branchId) {
            $lowStockDetailsQuery->where('warehouses.branch_id', $branchId);
        }
        if ($warehouseId) {
            $lowStockDetailsQuery->where('inventories.warehouse_id', $warehouseId);
        }

        $lowStockDetails = $lowStockDetailsQuery->get();"""
)

# 7. Payment Methods Query
content = content.replace(
"""        if ($branchId) {
            $paymentMethodsQuery->where('sales.branch_id', $branchId);
        }

        $paymentMethods = $paymentMethodsQuery""",
"""        if ($branchId) {
            $paymentMethodsQuery->where('sales.branch_id', $branchId);
        }
        if ($warehouseId) {
            $paymentMethodsQuery->where('sales.warehouse_id', $warehouseId);
        }

        $paymentMethods = $paymentMethodsQuery"""
)

# 8. Recent Sales
content = content.replace(
"""        if ($branchId) {
            $recentSalesQuery->where('sales.branch_id', $branchId);
        }
        $recentSales = $recentSalesQuery->get();""",
"""        if ($branchId) {
            $recentSalesQuery->where('sales.branch_id', $branchId);
        }
        if ($warehouseId) {
            $recentSalesQuery->where('sales.warehouse_id', $warehouseId);
        }
        $recentSales = $recentSalesQuery->get();"""
)

# 9. Recent Purchases
content = content.replace(
"""        if ($branchId) {
            $recentPurchasesQuery->where('purchases.branch_id', $branchId);
        }
        $recentPurchases = $recentPurchasesQuery->get();""",
"""        if ($branchId) {
            $recentPurchasesQuery->where('purchases.branch_id', $branchId);
        }
        if ($warehouseId) {
            $recentPurchasesQuery->where('purchases.warehouse_id', $warehouseId);
        }
        $recentPurchases = $recentPurchasesQuery->get();"""
)

with open('backend/app/Http/Controllers/Api/V1/Reports/DashboardReportController.php', 'w') as f:
    f.write(content)

print("Patched DashboardReportController.php with warehouse_id successfully.")
