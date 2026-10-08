<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Models\YearEndClosing;
use App\Services\FinancialPeriodClosingService;
use App\Services\YearEndClosingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialPeriodController extends Controller
{
    public function __construct(
        protected FinancialPeriodClosingService $periodClosingService,
        protected YearEndClosingService $yearEndClosingService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $fiscalYearId = $request->query('fiscal_year_id') ? (int) $request->query('fiscal_year_id') : null;

        $periods = $this->periodClosingService->getPeriods($companyId, $fiscalYearId);

        return response()->json([
            'success' => true,
            'data' => $periods,
        ]);
    }

    public function softLock(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $period = $this->periodClosingService->softLockPeriod($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => "Accounting period {$period->name} is now SOFT-LOCKED",
            'data' => $period,
        ]);
    }

    public function close(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $force = (bool) $request->input('force', false);

        $period = $this->periodClosingService->closePeriod($companyId, $id, $request->user()->id, $force);

        return response()->json([
            'success' => true,
            'message' => "Accounting period {$period->name} closed successfully",
            'data' => $period,
        ]);
    }

    public function reopen(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'reason' => 'required|string|min:5|max:500',
        ]);

        $period = $this->periodClosingService->reopenPeriod($companyId, $id, $validated['reason'], $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => "Accounting period {$period->name} reopened successfully",
            'data' => $period,
        ]);
    }

    // Year-End Closing
    public function yearEndClosingsList(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $closings = YearEndClosing::where('company_id', $companyId)
            ->with(['fiscalYear', 'retainedEarningsAccount', 'closingJournalEntry', 'closedBy:id,name'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $closings,
        ]);
    }

    public function previewYearEnd(Request $request, int $fiscalYearId): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $preview = $this->yearEndClosingService->previewYearEndClosing($companyId, $fiscalYearId);

        return response()->json([
            'success' => true,
            'data' => $preview,
        ]);
    }

    public function executeYearEnd(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'retained_earnings_account_id' => 'required|exists:accounts,id',
            'notes' => 'nullable|string',
        ]);

        $closing = $this->yearEndClosingService->executeYearEndClosing(
            $companyId,
            (int) $validated['fiscal_year_id'],
            (int) $validated['retained_earnings_account_id'],
            $validated['notes'] ?? null,
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Year-end closing successfully executed and balanced to Retained Earnings',
            'data' => $closing,
        ]);
    }

    public function reverseYearEnd(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'reason' => 'required|string|min:5|max:500',
        ]);

        $closing = $this->yearEndClosingService->reverseYearEndClosing($companyId, $id, $validated['reason'], $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Year-end closing reversed and Fiscal Year re-opened',
            'data' => $closing,
        ]);
    }
}
