<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\SupplierLedger;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierReportController extends Controller
{
    public function payables(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $query = Supplier::where('company_id', $companyId);
            
        $sortBy = $request->query('sort_by', 'name');
        $sortDirection = $request->query('sort_direction', 'asc');
        
        if (in_array($sortBy, ['name', 'balance', 'total_purchases', 'total_paid'])) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->query('per_page', 50);
        $paginator = $query->paginate(in_array($perPage, [25, 50, 100, 250]) ? $perPage : 50);
        
        $totalsQuery = clone $query;
        $totals = [
            'total_payables' => (float) $totalsQuery->sum('balance'),
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

    public function ledger(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        $supplier = Supplier::where('company_id', $companyId)->findOrFail($id);
        
        $query = SupplierLedger::where('company_id', $companyId)
            ->where('supplier_id', $id)
            ->orderBy('transaction_date', 'asc')
            ->orderBy('id', 'asc');
            
        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        $perPage = (int) $request->query('per_page', 50);
        $paginator = $query->paginate(in_array($perPage, [25, 50, 100, 250]) ? $perPage : 50);
        
        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage()
            ],
            'summary' => [
                'supplier' => $supplier
            ]
        ]);
    }
}
