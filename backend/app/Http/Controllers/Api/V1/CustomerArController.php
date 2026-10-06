<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\CustomerAgingService;
use App\Services\CustomerStatementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerArController extends Controller
{
    public function __construct(
        protected CustomerAgingService $agingService,
        protected CustomerStatementService $statementService
    ) {}

    public function statement(Request $request, int $customerId): JsonResponse
    {
        $this->authorize('customers.view');
        $companyId = $request->attributes->get('company_id');

        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $statement = $this->statementService->generateStatement($companyId, $customer->id, $startDate, $endDate);

        return response()->json([
            'success' => true,
            'data' => $statement,
        ]);
    }

    public function customerAging(Request $request, int $customerId): JsonResponse
    {
        $this->authorize('customers.view');
        $companyId = $request->attributes->get('company_id');

        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);
        $asOfDate = $request->input('as_of_date', now()->toDateString());

        $aging = $this->agingService->getCustomerAgingSummary($companyId, $customer->id, $asOfDate);

        return response()->json([
            'success' => true,
            'data' => $aging,
        ]);
    }

    public function companyAging(Request $request): JsonResponse
    {
        $this->authorize('customers.view');
        $companyId = $request->attributes->get('company_id');

        $asOfDate = $request->input('as_of_date', now()->toDateString());
        $summary = $this->agingService->getCompanyAgingSummary($companyId, $asOfDate);

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    public function collectionPriorities(Request $request): JsonResponse
    {
        $this->authorize('customers.view');
        $companyId = $request->attributes->get('company_id');

        $limit = (int) $request->input('limit', 20);
        $priorities = $this->agingService->getCollectionPriorities($companyId, $limit);

        return response()->json([
            'success' => true,
            'data' => $priorities,
        ]);
    }
}
