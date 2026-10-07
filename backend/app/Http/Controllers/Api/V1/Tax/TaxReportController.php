<?php

namespace App\Http\Controllers\Api\V1\Tax;

use App\Http\Controllers\Controller;
use App\Services\TaxReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxReportController extends Controller
{
    public function __construct(
        protected TaxReportingService $taxReportingService
    ) {}

    public function vatSummary(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $periodId = $request->query('tax_period_id') ? (int) $request->query('tax_period_id') : null;
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $summary = $this->taxReportingService->getVatSummary($companyId, $periodId, $startDate, $endDate);

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    public function outputVat(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $report = $this->taxReportingService->getOutputVatReport($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    public function inputVat(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $report = $this->taxReportingService->getInputVatReport($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    public function mushakFoundation(Request $request, int $periodId): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $mushak = $this->taxReportingService->getMushakReportFoundation($companyId, $periodId);

        return response()->json([
            'success' => true,
            'data' => $mushak,
        ]);
    }
}
