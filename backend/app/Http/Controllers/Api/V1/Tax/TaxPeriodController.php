<?php

namespace App\Http\Controllers\Api\V1\Tax;

use App\Http\Controllers\Controller;
use App\Services\TaxPeriodService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxPeriodController extends Controller
{
    public function __construct(
        protected TaxPeriodService $taxPeriodService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $periods = $this->taxPeriodService->getPeriods($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $periods,
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $period = $this->taxPeriodService->getCurrentPeriod($companyId, $request->query('date'));

        return response()->json([
            'success' => true,
            'data' => $period,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'period_name' => 'required|string|max:100',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'status' => 'nullable|string|max:30',
            'notes' => 'nullable|string',
        ]);

        $period = $this->taxPeriodService->createPeriod($companyId, $data, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax period created successfully.',
            'data' => $period,
        ], 201);
    }

    public function lock(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $period = $this->taxPeriodService->lockPeriod($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax period locked/finalized successfully.',
            'data' => $period,
        ]);
    }

    public function file(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'filing_reference' => 'required|string|max:150',
        ]);

        $period = $this->taxPeriodService->filePeriod($companyId, $id, $data['filing_reference'], $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax period marked as FILED successfully.',
            'data' => $period,
        ]);
    }

    public function close(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $period = $this->taxPeriodService->closePeriod($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax period CLOSED successfully.',
            'data' => $period,
        ]);
    }
}
