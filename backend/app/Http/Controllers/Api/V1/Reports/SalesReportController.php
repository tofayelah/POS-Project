<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SalesReturn;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SalesReportController extends Controller
{
    public function sales(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $query = Sale::where('company_id', $companyId)
            ->with(['customer', 'branch', 'warehouse', 'posTerminal', 'cashier']);
            
        $this->applyFilters($query, $request);
        
        // Ensure we sort appropriately
        $sortBy = $request->query('sort_by', 'sale_date');
        $sortDirection = $request->query('sort_direction', 'desc');
        
        if (in_array($sortBy, ['sale_date', 'grand_total', 'paid_amount', 'due_amount', 'invoice_number'])) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->query('per_page', 50);
        $paginator = $query->paginate(in_array($perPage, [25, 50, 100, 250]) ? $perPage : 50);
        
        // Aggregate totals for the filtered set
        $totalsQuery = clone $query;
        $totals = [
            'total_sales' => $totalsQuery->count(),
            'total_gross_sales' => $totalsQuery->sum('grand_total'),
            'total_tax' => $totalsQuery->sum('tax_total'),
            'total_discount' => $totalsQuery->sum('discount_total'),
            'total_paid' => $totalsQuery->sum('paid_amount'),
            'total_due' => $totalsQuery->sum('due_amount'),
        ];
        
        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage()
            ],
            'summary' => $totals
        ]);
    }

    public function salesReturns(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $query = SalesReturn::where('company_id', $companyId)
            ->with(['customer', 'branch', 'warehouse', 'cashier', 'originalSale']);
            
        // Apply filters
        if ($request->filled('date_from')) {
            $query->whereDate('return_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('return_date', '<=', $request->date_to);
        }
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }
        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('return_type')) {
            $query->where('return_type', $request->return_type);
        }
        
        $sortBy = $request->query('sort_by', 'return_date');
        $sortDirection = $request->query('sort_direction', 'desc');
        
        if (in_array($sortBy, ['return_date', 'refund_amount', 'store_credit_amount', 'return_number'])) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->query('per_page', 50);
        $paginator = $query->paginate(in_array($perPage, [25, 50, 100, 250]) ? $perPage : 50);
        
        $totalsQuery = clone $query;
        $totals = [
            'total_returns' => $totalsQuery->count(),
            'total_refund_amount' => $totalsQuery->sum('refund_amount'),
            'total_store_credit' => $totalsQuery->sum('store_credit_amount'),
            'total_tax' => $totalsQuery->sum('tax_total'),
        ];
        
        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage()
            ],
            'summary' => $totals
        ]);
    }

    private function applyFilters($query, Request $request)
    {
        if ($request->filled('date_from')) {
            $query->whereDate('sale_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('sale_date', '<=', $request->date_to);
        }
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }
        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }
        if ($request->filled('terminal_id')) {
            $query->where('pos_terminal_id', $request->terminal_id);
        }
        if ($request->filled('cashier_id')) {
            $query->where('cashier_id', $request->cashier_id);
        }
        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }
    }
}
