<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Services\TreasuryCashService;
use App\Services\AccountingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashTreasuryController extends Controller
{
    public function __construct(
        protected TreasuryCashService $treasuryCashService,
        protected AccountingService $accountingService
    ) {}

    public function positions(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $positions = $this->treasuryCashService->getCurrentCashPositions($companyId);

        return response()->json([
            'success' => true,
            'data' => $positions,
        ]);
    }

    public function forecast(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $horizonDays = $request->query('horizon_days') ? (int) $request->query('horizon_days') : 90;

        $forecast = $this->treasuryCashService->getCashFlowForecast($companyId, $horizonDays);

        return response()->json([
            'success' => true,
            'data' => $forecast,
        ]);
    }

    public function transfer(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'from_account_id' => 'required|exists:accounts,id',
            'to_account_id' => 'required|exists:accounts,id|different:from_account_id',
            'amount' => 'required|numeric|min:0.01',
            'transfer_date' => 'nullable|date',
            'description' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:100',
            'idempotency_key' => 'nullable|string|max:255',
        ]);

        $journal = $this->accountingService->transferCashBank($companyId, $validated, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Cash/Bank transfer executed successfully',
            'data' => $journal,
        ]);
    }
}
