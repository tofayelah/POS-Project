<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerCreditRequest;
use App\Services\CustomerCreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerCreditController extends Controller
{
    public function __construct(
        protected CustomerCreditService $creditService
    ) {}

    public function summary(Request $request, int $customerId): JsonResponse
    {
        $this->authorize('customers.view');
        $companyId = $request->attributes->get('company_id');

        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);
        $summary = $this->creditService->getCreditSummary($companyId, $customer->id);

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    public function listRequests(Request $request): JsonResponse
    {
        $this->authorize('customers.view');
        $companyId = $request->attributes->get('company_id');

        $query = CustomerCreditRequest::with(['customer:id,customer_code,name,credit_limit,credit_days,credit_status', 'requester:id,name', 'approver:id,name'])
            ->where('company_id', $companyId);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    public function requestCredit(Request $request, int $customerId): JsonResponse
    {
        $this->authorize('customers.credit_manage');
        $companyId = $request->attributes->get('company_id');
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $validated = $request->validate([
            'requested_credit_limit' => 'required|numeric|min:0',
            'requested_credit_days' => 'required|integer|min:0|max:365',
            'reason' => 'required|string|max:1000',
        ]);

        $creditRequest = $this->creditService->requestCredit(
            $companyId,
            $customer->id,
            $validated,
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Credit limit request submitted successfully',
            'data' => $creditRequest->load(['customer', 'requester']),
        ], 201);
    }

    public function approveRequest(Request $request, int $requestId): JsonResponse
    {
        $this->authorize('customers.credit_approve');
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        $creditRequest = $this->creditService->approveCredit(
            $companyId,
            $requestId,
            $validated['notes'] ?? null,
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Credit request approved and customer limit updated',
            'data' => $creditRequest->load(['customer', 'reviewer']),
        ]);
    }

    public function rejectRequest(Request $request, int $requestId): JsonResponse
    {
        $this->authorize('customers.credit_approve');
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $creditRequest = $this->creditService->rejectCredit(
            $companyId,
            $requestId,
            $validated['rejection_reason'],
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Credit request rejected',
            'data' => $creditRequest->load(['customer', 'reviewer']),
        ]);
    }

    public function toggleHold(Request $request, int $customerId): JsonResponse
    {
        $this->authorize('customers.credit_manage');
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'status' => 'required|in:ACTIVE,APPROVED,ON_HOLD,BLOCKED',
            'reason' => 'required_if:status,ON_HOLD,BLOCKED|nullable|string|max:500',
        ]);

        $customer = $this->creditService->toggleCreditHold(
            $companyId,
            $customerId,
            $validated['status'],
            $validated['reason'] ?? null,
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => "Customer credit status updated to {$validated['status']}",
            'data' => $customer,
        ]);
    }
}
