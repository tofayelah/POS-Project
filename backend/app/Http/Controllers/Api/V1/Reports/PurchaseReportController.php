<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use Illuminate\Http\Request;

class PurchaseReportController extends Controller
{
    public function purchases(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $query = Purchase::where('company_id', $companyId)
            ->with(['supplier', 'branch', 'warehouse', 'createdBy']);
            
        // Apply filters
        if ($request->filled('date_from')) {
            $query->whereDate('invoice_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('invoice_date', '<=', $request->date_to);
        }
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }
        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }
        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $sortBy = $request->query('sort_by', 'invoice_date');
        $sortDirection = $request->query('sort_direction', 'desc');
        
        if (in_array($sortBy, ['invoice_date', 'grand_total', 'subtotal', 'tax_total', 'discount_total', 'supplier_invoice_number'])) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->query('per_page', 50);
        $paginator = $query->paginate(in_array($perPage, [25, 50, 100, 250]) ? $perPage : 50);
        
        $totalsQuery = clone $query;
        $totals = [
            'total_purchases' => $totalsQuery->count(),
            'total_gross_purchases' => (float) $totalsQuery->sum('grand_total'),
            'total_subtotal' => (float) $totalsQuery->sum('subtotal'),
            'total_tax' => (float) $totalsQuery->sum('tax_total'),
            'total_discount' => (float) $totalsQuery->sum('discount_total'),
            'total_shipping' => (float) $totalsQuery->sum('shipping_cost'),
            'total_paid' => 0.0,
            'total_due' => 0.0,
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
}
