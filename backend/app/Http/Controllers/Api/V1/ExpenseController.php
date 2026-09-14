<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Services\ExpenseService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    protected $expenseService;

    public function __construct(ExpenseService $expenseService)
    {
        $this->expenseService = $expenseService;
    }

    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $query = Expense::where('company_id', $companyId)
            ->with(['category', 'supplier', 'branch', 'requester', 'approver']);

        if ($request->has('expense_number')) {
            $query->where('expense_number', 'like', '%' . $request->expense_number . '%');
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }
        if ($request->has('expense_category_id')) {
            $query->where('expense_category_id', $request->expense_category_id);
        }
        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }
        if ($request->has('start_date')) {
            $query->where('expense_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('expense_date', '<=', $request->end_date);
        }
        
        $expenses = $query->orderBy('id', 'desc')->paginate($request->per_page ?? 20);
            
        return response()->json(['success' => true, 'data' => $expenses]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'business_unit_id' => ['nullable', 'exists:business_units,id', Rule::exists('business_units', 'id')->where('company_id', $companyId)],
            'branch_id' => ['nullable', 'exists:branches,id', Rule::exists('branches', 'id')->where('company_id', $companyId)],
            'warehouse_id' => ['nullable', 'exists:warehouses,id', Rule::exists('warehouses', 'id')->where('company_id', $companyId)],
            'expense_category_id' => ['required', 'exists:expense_categories,id', Rule::exists('expense_categories', 'id')->where('company_id', $companyId)],
            'supplier_id' => ['nullable', 'exists:suppliers,id', Rule::exists('suppliers', 'id')->where('company_id', $companyId)],
            'expense_date' => 'nullable|date',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string',
            'idempotency_key' => 'nullable|string',
            
            'items' => 'required|array|min:1',
            'items.*.expense_category_id' => ['nullable', 'exists:expense_categories,id', Rule::exists('expense_categories', 'id')->where('company_id', $companyId)],
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'nullable|numeric|min:0.0001',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0',
            'items.*.reference' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
        ]);
        
        try {
            $expense = $this->expenseService->createExpense($companyId, $validated, $request->user()->id);
            return response()->json(['success' => true, 'data' => $expense], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $expense = Expense::where('company_id', $companyId)
            ->with(['items', 'payments', 'category', 'supplier', 'branch', 'requester', 'approver', 'completer', 'canceller'])
            ->findOrFail($id);
            
        return response()->json(['success' => true, 'data' => $expense]);
    }

    public function update(Request $request, $id)
    {
        return response()->json(['success' => false, 'message' => 'Expense editing is not fully implemented in Sprint 08.'], 501);
    }

    public function submit(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        try {
            $expense = $this->expenseService->submitExpense($companyId, $id, $request->user()->id);
            return response()->json(['success' => true, 'data' => $expense]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }

    public function approve(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        try {
            $expense = $this->expenseService->approveExpense($companyId, $id, $request->user()->id);
            return response()->json(['success' => true, 'data' => $expense]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }

    public function reject(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        try {
            $expense = $this->expenseService->rejectExpense($companyId, $id, $request->user()->id);
            return response()->json(['success' => true, 'data' => $expense]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }

    public function complete(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'payments' => 'nullable|array',
            'payments.*.payment_method' => 'required|in:CASH,CARD,BKASH,NAGAD,BANK',
            'payments.*.amount' => 'required|numeric|min:0.0001',
            'payments.*.payment_date' => 'nullable|date',
            'payments.*.reference' => 'nullable|string',
            'payments.*.transaction_reference' => 'nullable|string',
            'payments.*.notes' => 'nullable|string',
        ]);
        
        try {
            $expense = $this->expenseService->completeExpense($companyId, $id, $request->user()->id, $validated['payments'] ?? []);
            return response()->json(['success' => true, 'data' => $expense]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }

    public function cancel(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        try {
            $expense = $this->expenseService->cancelExpense($companyId, $id, $request->user()->id);
            return response()->json(['success' => true, 'data' => $expense]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }

    public function addPayment(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'payment_method' => 'required|in:CASH,CARD,BKASH,NAGAD,BANK',
            'amount' => 'required|numeric|min:0.0001',
            'payment_date' => 'nullable|date',
            'reference' => 'nullable|string',
            'transaction_reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);
        
        try {
            $payment = $this->expenseService->addPayment($companyId, $id, $request->user()->id, $validated);
            return response()->json(['success' => true, 'data' => $payment]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }
}
