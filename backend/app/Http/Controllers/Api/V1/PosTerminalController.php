<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PosTerminal;
use App\Models\Warehouse;
use App\Models\Branch;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PosTerminalController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        PaymentMethodController::ensureDefaultMethodsExist($companyId);

        $terminals = PosTerminal::where('company_id', $companyId)
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
            ->get();

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
        $warehouse = Warehouse::where('company_id', $companyId)->findOrFail($validated['warehouse_id']);
        if (!empty($validated['branch_id'])) {
            Branch::where('company_id', $companyId)->findOrFail($validated['branch_id']);
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

        return response()->json(['success' => true, 'message' => 'Terminal created.', 'data' => $terminal->load('paymentMethods')], 201);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $terminal = PosTerminal::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'terminal_name' => 'nullable|string|max:255',
            'status' => 'nullable|in:ACTIVE,INACTIVE',
            'default_cash_account_id' => 'nullable|exists:accounts,id',
            'default_card_account_id' => 'nullable|exists:accounts,id',
            'default_bkash_account_id' => 'nullable|exists:accounts,id',
            'default_nagad_account_id' => 'nullable|exists:accounts,id',
            'default_bank_account_id' => 'nullable|exists:accounts,id',
            'receipt_header' => 'nullable|string',
            'receipt_footer' => 'nullable|string',
        ]);

        $terminal->update($validated);
        
        return response()->json([
            'success' => true,
            'message' => 'Terminal updated.',
            'data' => $terminal->load([
                'paymentMethods',
                'defaultCashAccount',
                'defaultCardAccount',
                'defaultBkashAccount',
                'defaultNagadAccount',
                'defaultBankAccount',
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
