<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Services\SupplierPerformanceService;
use Illuminate\Http\Request;

class SupplierPerformanceController extends Controller
{
    protected SupplierPerformanceService $performanceService;

    public function __construct(SupplierPerformanceService $performanceService)
    {
        $this->performanceService = $performanceService;
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $supplier = Supplier::where('company_id', $companyId)->findOrFail($id);

        $periodDays = $request->filled('period_days') ? (int) $request->period_days : null;
        $scorecard = $this->performanceService->evaluatePerformance($supplier, $periodDays);

        return response()->json([
            'success' => true,
            'data' => $scorecard,
        ]);
    }

    public function recalculate(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $supplier = Supplier::where('company_id', $companyId)->findOrFail($id);

        $updated = $this->performanceService->recalculateAndCacheScore($supplier, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Supplier reliability score recalculated successfully.',
            'data' => [
                'supplier_id' => $updated->id,
                'score_cached' => $updated->score_cached,
                'last_evaluated_at' => $updated->last_evaluated_at,
            ],
        ]);
    }

    public function rankings(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $rankings = $this->performanceService->getCompanySupplierRankings($companyId);

        return response()->json([
            'success' => true,
            'data' => $rankings,
        ]);
    }
}
