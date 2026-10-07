<?php

namespace App\Http\Controllers\Api\V1\Tax;

use App\Http\Controllers\Controller;
use App\Models\TaxReconciliation;
use App\Services\TaxReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxReconciliationController extends Controller
{
    public function __construct(
        protected TaxReconciliationService $taxReconciliationService
    ) {}

    public function show(Request $request, int $periodId): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $recon = TaxReconciliation::where('company_id', $companyId)
            ->where('tax_period_id', $periodId)
            ->first();

        return response()->json([
            'success' => true,
            'data' => $recon,
        ]);
    }

    public function reconcile(Request $request, int $periodId): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $recon = $this->taxReconciliationService->reconcilePeriod($companyId, $periodId, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax reconciliation performed successfully.',
            'data' => $recon,
        ]);
    }
}
