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
            $query->whereDate('purchase_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('purchase_date', '<=', $request->date_to);
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
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        $sortBy = $request->query('sort_by', 'purchase_date');
        $sortDirection = $request->query('sort_direction', 'desc');
        
        if (in_array($sortBy, ['purchase_date', 'grand_total', 'paid_amount', 'due_amount', 'purchase_number'])) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->query('per_page', 50);
        $paginator = $query->paginate(in_array($perPage, [25, 50, 100, 250]) ? $perPage : 50);
        
        $totalsQuery = clone $query;
        $totals = [
            'total_purchases' => $totalsQuery->count(),
            'total_gross_purchases' => $totalsQuery->sum('grand_total'),
            'total_tax' => $totalsQuery->sum('tax'),
            'total_discount' => $totalsQuery->sum('discount'),
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
}
