<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseReportController extends Controller
{
    public function expenses(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $query = Expense::where('company_id', $companyId)
            ->with(['expenseCategory', 'supplier', 'branch', 'warehouse', 'requestedBy']);
            
        // Apply filters
        if ($request->filled('date_from')) {
            $query->whereDate('expense_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('expense_date', '<=', $request->date_to);
        }
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }
        if ($request->filled('category_id')) {
            $query->where('expense_category_id', $request->category_id);
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
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        $sortBy = $request->query('sort_by', 'expense_date');
        $sortDirection = $request->query('sort_direction', 'desc');
        
        if (in_array($sortBy, ['expense_date', 'total_amount', 'paid_amount', 'due_amount', 'expense_number'])) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->query('per_page', 50);
        $paginator = $query->paginate(in_array($perPage, [25, 50, 100, 250]) ? $perPage : 50);
        
        $totalsQuery = clone $query;
        $totals = [
            'total_expenses' => $totalsQuery->count(),
            'total_amount' => $totalsQuery->sum('total_amount'),
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
