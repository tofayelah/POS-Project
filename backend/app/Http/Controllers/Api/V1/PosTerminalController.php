<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PosTerminal;
use App\Models\Warehouse;
use App\Models\Branch;
use App\Models\Account;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PosTerminalController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        PaymentMethodController::ensureDefaultMethodsExist($companyId);

        $query = PosTerminal::where('company_id', $companyId)
            ->with([
                'branch:id,name',
                'warehouse:id,name',
                'paymentMethods',
                'defaultCashAccount:id,account_code,account_name',
                'defaultCardAccount:id,account_code,account_name',
                'defaultBkashAccount:id,account_code,account_name',
                'defaultNagadAccount:id,account_code,account_name',
                'defaultBankAccount:id,account_code,account_name',
            ]);

        if ($request->has('status') && !empty($request->query('status'))) {
            $query->where('status', strtoupper($request->query('status')));
        }

        if ($request->has('branch_id') && !empty($request->query('branch_id'))) {
            $query->where('branch_id', $request->query('branch_id'));
        }

        $user = $request->user();
        if ($user && method_exists($user, 'hasRole') && !$user->hasRole('Super Admin')) {
            if (method_exists($user, 'branches')) {
                $assignedBranchIds = $user->branches()->where('branches.company_id', $companyId)->pluck('branches.id')->toArray();
                if (!empty($assignedBranchIds)) {
                    $query->where(function ($q) use ($assignedBranchIds) {
                        $q->whereIn('branch_id', $assignedBranchIds)->orWhereNull('branch_id');
                    });
                }
            }
        }

        $terminals = $query->get();

        return response()->json(['success' => true, 'data' => $terminals]);
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        PaymentMethodController::ensureDefaultMethodsExist($companyId);

        $terminal = PosTerminal::where('company_id', $companyId)
            ->with([
                'branch:id,name',
                'warehouse:id,name',
                'paymentMethods',
                'defaultCashAccount:id,account_code,account_name',
                'defaultCardAccount:id,account_code,account_name',
                'defaultBkashAccount:id,account_code,account_name',
                'defaultNagadAccount:id,account_code,account_name',
                'defaultBankAccount:id,account_code,account_name',
            ])
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $terminal]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'terminal_code' => 'required|string|max:255',
            'terminal_name' => 'required|string|max:255',
            'warehouse_id' => 'required|exists:warehouses,id',
            'branch_id' => 'nullable|exists:branches,id',
            'status' => 'nullable|in:ACTIVE,INACTIVE',
            'default_cash_account_id' => 'nullable|exists:accounts,id',
            'default_card_account_id' => 'nullable|exists:accounts,id',
            'default_bkash_account_id' => 'nullable|exists:accounts,id',
            'default_nagad_account_id' => 'nullable|exists:accounts,id',
            'default_bank_account_id' => 'nullable|exists:accounts,id',
            'receipt_header' => 'nullable|string',
            'receipt_footer' => 'nullable|string',
        ]);

        // Enforce Company Scope
        $warehouse = Warehouse::where('company_id', $companyId)->find($validated['warehouse_id']);
        if (!$warehouse) {
            return response()->json(['success' => false, 'message' => 'Invalid or inaccessible warehouse.'], 422);
        }

        if (!empty($validated['branch_id'])) {
            $branch = Branch::where('company_id', $companyId)->find($validated['branch_id']);
            if (!$branch) {
                return response()->json(['success' => false, 'message' => 'Invalid or inaccessible branch.'], 422);
            }
            if ($warehouse->branch_id && $warehouse->branch_id != $branch->id) {
                return response()->json(['success' => false, 'message' => 'Selected warehouse does not belong to the chosen branch.'], 422);
            }
        } elseif ($warehouse->branch_id) {
            $validated['branch_id'] = $warehouse->branch_id;
        }

        foreach (['default_cash_account_id', 'default_card_account_id', 'default_bkash_account_id', 'default_nagad_account_id', 'default_bank_account_id'] as $accField) {
            if (!empty($validated[$accField])) {
                $acc = Account::where('company_id', $companyId)->find($validated[$accField]);
                if (!$acc) {
                    return response()->json(['success' => false, 'message' => "Invalid or inaccessible account for {$accField}."], 422);
                }
            }
        }

        if (PosTerminal::where('company_id', $companyId)->where('terminal_code', $validated['terminal_code'])->exists()) {
            return response()->json(['success' => false, 'message' => 'Terminal code already exists.'], 422);
        }

        $validated['company_id'] = $companyId;
        $validated['business_unit_id'] = $warehouse->business_unit_id;
        $validated['created_by'] = $request->user()->id;

        $terminal = PosTerminal::create($validated);

        // By default, attach all company payment methods enabled for this new terminal
        PaymentMethodController::ensureDefaultMethodsExist($companyId);
        $methods = PaymentMethod::where('company_id', $companyId)->get();
        $syncData = [];
        foreach ($methods as $m) {
            $syncData[$m->id] = ['is_enabled' => true];
        }
        $terminal->paymentMethods()->sync($syncData);

        return response()->json([
            'success' => true,
            'message' => 'Terminal created.',
            'data' => $terminal->load([
                'branch:id,name',
                'warehouse:id,name',
                'paymentMethods',
                'defaultCashAccount:id,account_code,account_name',
                'defaultCardAccount:id,account_code,account_name',
                'defaultBkashAccount:id,account_code,account_name',
                'defaultNagadAccount:id,account_code,account_name',
                'defaultBankAccount:id,account_code,account_name',
            ]),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $terminal = PosTerminal::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'terminal_code' => 'nullable|string|max:255',
            'terminal_name' => 'nullable|string|max:255',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'branch_id' => 'nullable|exists:branches,id',
            'status' => 'nullable|in:ACTIVE,INACTIVE',
            'default_cash_account_id' => 'nullable|exists:accounts,id',
            'default_card_account_id' => 'nullable|exists:accounts,id',
            'default_bkash_account_id' => 'nullable|exists:accounts,id',
            'default_nagad_account_id' => 'nullable|exists:accounts,id',
            'default_bank_account_id' => 'nullable|exists:accounts,id',
            'receipt_header' => 'nullable|string',
            'receipt_footer' => 'nullable|string',
        ]);

        if (isset($validated['terminal_code']) && $validated['terminal_code'] !== $terminal->terminal_code) {
            if (PosTerminal::where('company_id', $companyId)
                ->where('terminal_code', $validated['terminal_code'])
                ->where('id', '!=', $id)
                ->exists()) {
                return response()->json(['success' => false, 'message' => 'Terminal code already exists.'], 422);
            }
        }

        $warehouseId = $validated['warehouse_id'] ?? $terminal->warehouse_id;
        $branchId = array_key_exists('branch_id', $validated) ? $validated['branch_id'] : $terminal->branch_id;

        if (!empty($validated['warehouse_id'])) {
            $warehouse = Warehouse::where('company_id', $companyId)->find($validated['warehouse_id']);
            if (!$warehouse) {
                return response()->json(['success' => false, 'message' => 'Invalid or inaccessible warehouse.'], 422);
            }
            $validated['business_unit_id'] = $warehouse->business_unit_id;
        } else {
            $warehouse = Warehouse::where('company_id', $companyId)->find($warehouseId);
        }

        if (!empty($branchId)) {
            $branch = Branch::where('company_id', $companyId)->find($branchId);
            if (!$branch) {
                return response()->json(['success' => false, 'message' => 'Invalid or inaccessible branch.'], 422);
            }
            if ($warehouse && $warehouse->branch_id && $warehouse->branch_id != $branchId) {
                return response()->json(['success' => false, 'message' => 'Selected warehouse does not belong to the chosen branch.'], 422);
            }
        }

        foreach (['default_cash_account_id', 'default_card_account_id', 'default_bkash_account_id', 'default_nagad_account_id', 'default_bank_account_id'] as $accField) {
            if (!empty($validated[$accField])) {
                $acc = Account::where('company_id', $companyId)->find($validated[$accField]);
                if (!$acc) {
                    return response()->json(['success' => false, 'message' => "Invalid or inaccessible account for {$accField}."], 422);
                }
            }
        }

        $validated['updated_by'] = $request->user()->id;

        $terminal->update($validated);
        
        return response()->json([
            'success' => true,
            'message' => 'Terminal updated.',
            'data' => $terminal->load([
                'branch:id,name',
                'warehouse:id,name',
                'paymentMethods',
                'defaultCashAccount:id,account_code,account_name',
                'defaultCardAccount:id,account_code,account_name',
                'defaultBkashAccount:id,account_code,account_name',
                'defaultNagadAccount:id,account_code,account_name',
                'defaultBankAccount:id,account_code,account_name',
            ]),
        ]);
    }

    public function syncPaymentMethods(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $terminal = PosTerminal::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'methods' => 'required|array',
            'methods.*.payment_method_id' => 'required|exists:payment_methods,id',
            'methods.*.is_enabled' => 'required|boolean',
        ]);

        $syncData = [];
        foreach ($validated['methods'] as $item) {
            $pm = PaymentMethod::where('company_id', $companyId)->findOrFail($item['payment_method_id']);
            $syncData[$pm->id] = ['is_enabled' => (bool)$item['is_enabled']];
        }

        $terminal->paymentMethods()->sync($syncData);

        return response()->json([
            'success' => true,
            'message' => 'Terminal payment methods updated.',
            'data' => $terminal->load('paymentMethods'),
        ]);
    }
}
