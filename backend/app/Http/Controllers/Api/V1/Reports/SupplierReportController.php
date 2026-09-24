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
        $companyId = $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id')
            ?? ($request->user() ? $request->user()->companies()->first()?->id : null);
        
        $purchasesSub = '(SELECT COALESCE(SUM(p.grand_total), 0) FROM purchases p WHERE p.supplier_id = suppliers.id AND p.company_id = suppliers.company_id AND p.status = \'POSTED\')';
        $paidSub = '(SELECT COALESCE(SUM(pa.amount), 0) FROM payment_allocations pa JOIN purchases p ON p.id = pa.allocatable_id WHERE (pa.allocatable_type = \'Purchase\' OR pa.allocatable_type LIKE \'%Purchase\') AND p.supplier_id = suppliers.id AND p.company_id = suppliers.company_id AND p.status = \'POSTED\')';
        $balanceExpr = '(COALESCE(suppliers.opening_balance, 0) + ' . $purchasesSub . ' - ' . $paidSub . ')';

        $query = Supplier::where('company_id', $companyId)
            ->select('suppliers.*')
            ->selectRaw("{$purchasesSub} as total_purchases")
            ->selectRaw("{$paidSub} as total_paid")
            ->selectRaw("{$balanceExpr} as balance");

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $likeOperator = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($search, $likeOperator) {
                $q->where('name', $likeOperator, $search)
                  ->orWhere('supplier_code', $likeOperator, $search)
                  ->orWhere('mobile', $likeOperator, $search);
            });
        }
            
        $sortBy = $request->query('sort_by', 'name');
        $sortDirection = $request->query('sort_direction', 'asc');
        
        if (in_array($sortBy, ['name', 'balance', 'total_purchases', 'total_paid', 'supplier_code'])) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->query('per_page', 50);
        $paginator = $query->paginate(in_array($perPage, [25, 50, 100, 250]) ? $perPage : 50);
        
        $totalsQuery = DB::query()->fromSub($query->clone()->reorder(), 'filtered_suppliers');
        $totals = [
            'total_payables' => (float) ($totalsQuery->sum('balance') ?? 0),
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
