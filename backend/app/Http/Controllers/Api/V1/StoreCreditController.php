<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\StoreCreditService;
use Illuminate\Http\Request;

class StoreCreditController extends Controller
{
    public function __construct(
        protected StoreCreditService $storeCreditService
    ) {}

    /**
     * Get customer's store credit account details and balance.
     */
    public function customerCredit(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $customer = Customer::where('company_id', $companyId)->findOrFail($id);

        $account = $this->storeCreditService->getOrCreateAccount($companyId, $customer->id);
        $balance = (float) $account->current_balance;

        return response()->json([
            'success' => true,
            'data' => [
                'customer_id' => $customer->id,
                'customer_name' => $customer->name,
                'account_status' => $account->status,
                'current_balance' => $balance,
                'can_redeem' => $balance > 0 && $account->status === 'ACTIVE',
            ],
        ]);
    }

    /**
     * Get paginated transaction history for a customer's store credit account.
     */
    public function customerTransactions(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        Customer::where('company_id', $companyId)->findOrFail($id);

        $filters = [
            'type' => $request->get('type'),
            'date_from' => $request->get('date_from'),
            'date_to' => $request->get('date_to'),
            'per_page' => (int) $request->get('per_page', 20),
        ];

        $transactions = $this->storeCreditService->getTransactions($companyId, (int) $id, $filters);

        return response()->json([
            'success' => true,
            'data' => $transactions,
        ]);
    }

    /**
     * Issue store credit to a customer.
     */
    public function issue(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $customer = Customer::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:100',
            'expires_at' => 'nullable|date',
        ]);

        $transaction = $this->storeCreditService->issueCredit(
            $companyId,
            $customer->id,
            (float) $validated['amount'],
            'Manual',
            null,
            $validated['reference_number'] ?? null,
            $validated['description'] ?? 'Store credit issued',
            !empty($validated['expires_at']) ? \Carbon\Carbon::parse($validated['expires_at']) : null,
            $request->user()?->id,
            'ISSUE'
        );

        return response()->json([
            'success' => true,
            'message' => 'Store credit issued successfully.',
            'data' => [
                'customer_id' => $customer->id,
                'current_balance' => $this->storeCreditService->getBalance($companyId, $customer->id),
                'transaction' => $transaction,
            ],
        ]);
    }

    /**
     * Redeem store credit for a customer.
     */
    public function redeem(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $customer = Customer::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:100',
        ]);

        $transaction = $this->storeCreditService->redeemCredit(
            $companyId,
            $customer->id,
            (float) $validated['amount'],
            'Manual',
            null,
            $validated['reference_number'] ?? null,
            $validated['description'] ?? 'Store credit redeemed',
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Store credit redeemed successfully.',
            'data' => [
                'customer_id' => $customer->id,
                'current_balance' => $this->storeCreditService->getBalance($companyId, $customer->id),
                'transaction' => $transaction,
            ],
        ]);
    }

    /**
     * Adjust store credit balance for a customer.
     */
    public function adjust(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $customer = Customer::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'amount' => 'required|numeric|not_in:0',
            'reason' => 'required|string|max:255',
        ]);

        $transaction = $this->storeCreditService->adjustCredit(
            $companyId,
            $customer->id,
            (float) $validated['amount'],
            $validated['reason'],
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Store credit adjusted successfully.',
            'data' => [
                'customer_id' => $customer->id,
                'current_balance' => $this->storeCreditService->getBalance($companyId, $customer->id),
                'transaction' => $transaction,
            ],
        ]);
    }
}
