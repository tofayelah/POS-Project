<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\CustomerLedger;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerReportController extends Controller
{
    public function receivables(Request $request)
    {
        $companyId = $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id')
            ?? ($request->user() ? $request->user()->companies()->first()?->id : null);
        
        $salesSub = '(SELECT COALESCE(SUM(s.grand_total), 0) FROM sales s WHERE s.customer_id = customers.id AND s.company_id = customers.company_id AND s.status = \'COMPLETED\')';
        $paidSub = '(SELECT COALESCE(SUM(pa.amount), 0) FROM payment_allocations pa JOIN sales s ON s.id = pa.allocatable_id WHERE (pa.allocatable_type = \'Sale\' OR pa.allocatable_type LIKE \'%Sale\') AND s.customer_id = customers.id AND s.company_id = customers.company_id AND s.status = \'COMPLETED\')';
        $ledgerSub = '(SELECT cl.balance_after FROM customer_ledgers cl WHERE cl.customer_id = customers.id AND cl.company_id = customers.company_id ORDER BY cl.id DESC LIMIT 1)';
        $balanceExpr = 'COALESCE(' . $ledgerSub . ', (COALESCE(customers.opening_balance, 0) + ' . $salesSub . ' - ' . $paidSub . '))';

        $query = Customer::where('company_id', $companyId)
            ->select('customers.*')
            ->selectRaw("{$salesSub} as total_sales")
            ->selectRaw("{$salesSub} as total_purchases")
            ->selectRaw("{$paidSub} as total_paid")
            ->selectRaw("{$balanceExpr} as balance");
            
        // Apply filters
        if ($request->filled('customer_group_id')) {
            $query->where('customer_group_id', $request->customer_group_id);
        }

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $likeOperator = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($search, $likeOperator) {
                $q->where('name', $likeOperator, $search)
                  ->orWhere('customer_code', $likeOperator, $search)
                  ->orWhere('mobile', $likeOperator, $search);
            });
        }
        
        $sortBy = $request->query('sort_by', 'name');
        $sortDirection = $request->query('sort_direction', 'asc');
        
        if (in_array($sortBy, ['name', 'balance', 'total_sales', 'total_purchases', 'total_paid', 'customer_code'])) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->query('per_page', 50);
        $paginator = $query->paginate(in_array($perPage, [25, 50, 100, 250]) ? $perPage : 50);
        
        $totalsQuery = DB::query()->fromSub($query->clone()->reorder(), 'filtered_customers');
        $totals = [
            'total_receivables' => (float) ($totalsQuery->sum('balance') ?? 0),
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
        $companyId = $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id')
            ?? ($request->user() ? $request->user()->companies()->first()?->id : null);
        
        $customer = Customer::where('company_id', $companyId)->findOrFail($id);
        
        $query = CustomerLedger::where('company_id', $companyId)
            ->where('customer_id', $id)
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
                'customer' => $customer
            ]
        ]);
    }
}
