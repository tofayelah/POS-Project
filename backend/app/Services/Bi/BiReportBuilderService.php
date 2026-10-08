<?php

namespace App\Services\Bi;

use App\Models\BiDashboardPreference;
use App\Models\BiSavedReport;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BiReportBuilderService
{
    /**
     * Get dataset catalog with dimensions and metrics available for custom reporting.
     */
    public function getDatasetCatalog(): array
    {
        return [
            'sales' => [
                'name' => 'Sales & Revenue',
                'description' => 'Authoritative sales orders, line items, and revenue metrics',
                'dimensions' => [
                    'date' => ['label' => 'Date', 'column' => 'sales.sale_date'],
                    'month' => ['label' => 'Month', 'column' => "TO_CHAR(sales.sale_date, 'YYYY-MM')"],
                    'branch' => ['label' => 'Branch', 'column' => 'branches.name'],
                    'channel' => ['label' => 'Channel', 'column' => "COALESCE(sales.channel, 'POS')"],
                    'customer' => ['label' => 'Customer', 'column' => 'customers.name'],
                    'product' => ['label' => 'Product', 'column' => 'products.name'],
                    'category' => ['label' => 'Category', 'column' => 'categories.name'],
                    'payment_status' => ['label' => 'Payment Status', 'column' => 'sales.payment_status'],
                ],
                'metrics' => [
                    'orders_count' => ['label' => 'Total Orders', 'sql' => 'COUNT(DISTINCT sales.id)'],
                    'gross_sales' => ['label' => 'Gross Sales', 'sql' => 'COALESCE(SUM(sales.subtotal + sales.tax_total), 0)'],
                    'discounts' => ['label' => 'Discounts', 'sql' => 'COALESCE(SUM(sales.discount_total), 0)'],
                    'net_sales' => ['label' => 'Net Sales', 'sql' => 'COALESCE(SUM(sales.grand_total), 0)'],
                    'paid_amount' => ['label' => 'Paid Amount', 'sql' => 'COALESCE(SUM(sales.paid_amount), 0)'],
                    'due_amount' => ['label' => 'Due Amount', 'sql' => 'COALESCE(SUM(sales.due_amount), 0)'],
                    'units_sold' => ['label' => 'Units Sold', 'sql' => 'COALESCE(SUM(sale_items.quantity), 0)'],
                ],
            ],
            'profitability' => [
                'name' => 'Profitability & Margins',
                'description' => 'Gross margin, net profit, and cost of goods sold',
                'dimensions' => [
                    'date' => ['label' => 'Date', 'column' => 'sales.sale_date'],
                    'branch' => ['label' => 'Branch', 'column' => 'branches.name'],
                    'channel' => ['label' => 'Channel', 'column' => "COALESCE(sales.channel, 'POS')"],
                    'product' => ['label' => 'Product', 'column' => 'products.name'],
                    'category' => ['label' => 'Category', 'column' => 'categories.name'],
                ],
                'metrics' => [
                    'revenue' => ['label' => 'Revenue', 'sql' => 'COALESCE(SUM(sale_items.line_total), 0)'],
                    'cogs' => ['label' => 'COGS', 'sql' => 'COALESCE(SUM(CASE WHEN sale_items.total_cost_snapshot > 0 THEN sale_items.total_cost_snapshot ELSE (sale_items.quantity * sale_items.unit_cost_snapshot) END), 0)'],
                    'gross_profit' => ['label' => 'Gross Profit', 'sql' => 'COALESCE(SUM(sale_items.line_total) - SUM(CASE WHEN sale_items.total_cost_snapshot > 0 THEN sale_items.total_cost_snapshot ELSE (sale_items.quantity * sale_items.unit_cost_snapshot) END), 0)'],
                ],
            ],
            'inventory' => [
                'name' => 'Inventory & Stock Valuation',
                'description' => 'Real-time stock on hand, valuation, and reorder levels',
                'dimensions' => [
                    'product' => ['label' => 'Product', 'column' => 'products.name'],
                    'category' => ['label' => 'Category', 'column' => 'categories.name'],
                    'warehouse' => ['label' => 'Warehouse', 'column' => 'warehouses.name'],
                    'branch' => ['label' => 'Branch', 'column' => 'branches.name'],
                ],
                'metrics' => [
                    'current_stock' => ['label' => 'Stock Quantity', 'sql' => 'COALESCE(SUM(inventories.quantity), 0)'],
                    'total_value' => ['label' => 'Stock Valuation', 'sql' => 'COALESCE(SUM(inventories.total_value), 0)'],
                    'reorder_point' => ['label' => 'Reorder Point', 'sql' => 'MAX(inventories.reorder_point)'],
                ],
            ],
            'procurement' => [
                'name' => 'Procurement & Purchases',
                'description' => 'Supplier purchase orders, invoice amounts, and spend',
                'dimensions' => [
                    'date' => ['label' => 'Invoice Date', 'column' => 'purchases.invoice_date'],
                    'supplier' => ['label' => 'Supplier', 'column' => 'suppliers.name'],
                    'branch' => ['label' => 'Branch', 'column' => 'branches.name'],
                    'status' => ['label' => 'Status', 'column' => 'purchases.status'],
                ],
                'metrics' => [
                    'invoices_count' => ['label' => 'Invoice Count', 'sql' => 'COUNT(DISTINCT purchases.id)'],
                    'total_spend' => ['label' => 'Total Spend', 'sql' => 'COALESCE(SUM(purchases.grand_total), 0)'],
                    'tax_total' => ['label' => 'Tax Total', 'sql' => 'COALESCE(SUM(purchases.tax_total), 0)'],
                ],
            ],
            'customer' => [
                'name' => 'Customer Portfolio',
                'description' => 'Customer purchase frequency, RFM segments, and dues',
                'dimensions' => [
                    'customer' => ['label' => 'Customer Name', 'column' => 'customers.name'],
                    'status' => ['label' => 'Status', 'column' => 'customers.status'],
                    'city' => ['label' => 'City', 'column' => "COALESCE(customers.city, 'Unknown')"],
                ],
                'metrics' => [
                    'customers_count' => ['label' => 'Customer Count', 'sql' => 'COUNT(DISTINCT customers.id)'],
                    'total_opening_balance' => ['label' => 'Opening Balance', 'sql' => 'COALESCE(SUM(customers.opening_balance), 0)'],
                ],
            ],
        ];
    }

    /**
     * Execute custom report query dynamically based on dataset configuration.
     */
    public function executeReport(int $companyId, array $config): array
    {
        $catalog = $this->getDatasetCatalog();
        $datasetKey = $config['dataset'] ?? 'sales';

        if (!isset($catalog[$datasetKey])) {
            throw new \InvalidArgumentException("Invalid dataset: {$datasetKey}");
        }

        $dsInfo = $catalog[$datasetKey];
        $selectedDims = array_filter($config['dimensions'] ?? [], fn($d) => isset($dsInfo['dimensions'][$d]));
        $selectedMetrics = array_filter($config['metrics'] ?? [], fn($m) => isset($dsInfo['metrics'][$m]));

        if (empty($selectedMetrics)) {
            // Pick first metric by default
            $selectedMetrics = [array_key_first($dsInfo['metrics'])];
        }

        $query = null;
        $selects = [];
        $groupBy = [];

        // Base query setup based on dataset
        if ($datasetKey === 'sales' || $datasetKey === 'profitability') {
            $query = DB::table('sales')
                ->leftJoin('sale_items', 'sales.id', '=', 'sale_items.sale_id')
                ->leftJoin('branches', 'sales.branch_id', '=', 'branches.id')
                ->leftJoin('customers', 'sales.customer_id', '=', 'customers.id')
                ->leftJoin('products', 'sale_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->where('sales.company_id', $companyId)
                ->where('sales.status', 'COMPLETED');

            if (!empty($config['filters']['date_from']) && !empty($config['filters']['date_to'])) {
                $query->whereBetween('sales.sale_date', [
                    Carbon::parse($config['filters']['date_from'])->toDateString(),
                    Carbon::parse($config['filters']['date_to'])->toDateString(),
                ]);
            }
            if (!empty($config['filters']['branch_id'])) {
                $query->where('sales.branch_id', $config['filters']['branch_id']);
            }
        } elseif ($datasetKey === 'inventory') {
            $query = DB::table('inventories')
                ->join('products', 'inventories.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->leftJoin('warehouses', 'inventories.warehouse_id', '=', 'warehouses.id')
                ->leftJoin('branches', 'inventories.branch_id', '=', 'branches.id')
                ->where('inventories.company_id', $companyId);

            if (!empty($config['filters']['warehouse_id'])) {
                $query->where('inventories.warehouse_id', $config['filters']['warehouse_id']);
            }
            if (!empty($config['filters']['branch_id'])) {
                $query->where('inventories.branch_id', $config['filters']['branch_id']);
            }
        } elseif ($datasetKey === 'procurement') {
            $query = DB::table('purchases')
                ->leftJoin('suppliers', 'purchases.supplier_id', '=', 'suppliers.id')
                ->leftJoin('branches', 'purchases.branch_id', '=', 'branches.id')
                ->where('purchases.company_id', $companyId)
                ->where('purchases.status', 'POSTED');

            if (!empty($config['filters']['date_from']) && !empty($config['filters']['date_to'])) {
                $query->whereBetween('purchases.invoice_date', [
                    Carbon::parse($config['filters']['date_from'])->toDateString(),
                    Carbon::parse($config['filters']['date_to'])->toDateString(),
                ]);
            }
        } elseif ($datasetKey === 'customer') {
            $query = DB::table('customers')
                ->where('customers.company_id', $companyId);
        }

        // Build dimensions
        foreach ($selectedDims as $dimKey) {
            $dimCol = $dsInfo['dimensions'][$dimKey]['column'];
            $selects[] = DB::raw("{$dimCol} as {$dimKey}");
            $groupBy[] = DB::raw($dimCol);
        }

        // Build metrics
        foreach ($selectedMetrics as $metKey) {
            $metSql = $dsInfo['metrics'][$metKey]['sql'];
            $selects[] = DB::raw("{$metSql} as {$metKey}");
        }

        $query->select($selects);

        if (!empty($groupBy)) {
            $query->groupBy($groupBy);
        }

        // Sorting
        $sortBy = $config['sort_by'] ?? ($selectedMetrics[0] ?? null);
        $sortDir = strtolower($config['sort_direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        if ($sortBy) {
            $query->orderBy($sortBy, $sortDir);
        }

        $limit = min(500, max(1, (int) ($config['limit'] ?? 100)));
        $rows = $query->limit($limit)->get()->toArray();

        return [
            'dataset' => $datasetKey,
            'dimensions' => $selectedDims,
            'metrics' => $selectedMetrics,
            'count' => count($rows),
            'data' => $rows,
        ];
    }

    /**
     * Export custom report as CSV.
     */
    public function exportCsv(int $companyId, array $config): string
    {
        $reportData = $this->executeReport($companyId, $config);
        $rows = $reportData['data'];

        if (empty($rows)) {
            return "No data available for export.\n";
        }

        $headers = array_keys((array) $rows[0]);
        $fp = fopen('php://memory', 'r+');
        fputcsv($fp, $headers);

        foreach ($rows as $row) {
            fputcsv($fp, (array) $row);
        }

        rewind($fp);
        $csv = stream_get_contents($fp);
        fclose($fp);

        return $csv;
    }

    /**
     * Saved reports CRUD.
     */
    public function listSavedReports(int $companyId, int $userId): array
    {
        return BiSavedReport::where('company_id', $companyId)
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)->orWhere('is_public', true);
            })
            ->orderByDesc('updated_at')
            ->get()
            ->toArray();
    }

    public function saveReport(int $companyId, int $userId, array $data): BiSavedReport
    {
        return BiSavedReport::create(array_merge($data, [
            'company_id' => $companyId,
            'user_id' => $userId,
        ]));
    }

    public function updateReport(int $companyId, int $userId, int $reportId, array $data): BiSavedReport
    {
        $report = BiSavedReport::where('company_id', $companyId)->findOrFail($reportId);
        $report->update($data);
        return $report;
    }

    public function deleteReport(int $companyId, int $userId, int $reportId): bool
    {
        $report = BiSavedReport::where('company_id', $companyId)->findOrFail($reportId);
        return (bool) $report->delete();
    }

    /**
     * Dashboard Personalization Preferences.
     */
    public function getDashboardPreference(int $companyId, int $userId, string $dashboardKey): ?BiDashboardPreference
    {
        return BiDashboardPreference::where('company_id', $companyId)
            ->where('user_id', $userId)
            ->where('dashboard_key', $dashboardKey)
            ->first();
    }

    public function saveDashboardPreference(int $companyId, int $userId, string $dashboardKey, array $preferences): BiDashboardPreference
    {
        return BiDashboardPreference::updateOrCreate(
            [
                'company_id' => $companyId,
                'user_id' => $userId,
                'dashboard_key' => $dashboardKey,
            ],
            [
                'widget_order' => $preferences['widget_order'] ?? null,
                'hidden_widgets' => $preferences['hidden_widgets'] ?? null,
                'custom_filters' => $preferences['custom_filters'] ?? null,
            ]
        );
    }
}
