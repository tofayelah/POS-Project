<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Services\AdvancedReceivablePayableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdvancedArApController extends Controller
{
    public function __construct(
        protected AdvancedReceivablePayableService $arApService
    ) {}

    public function arAging(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $report = $this->arApService->getAdvancedArAging($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    public function apAging(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $report = $this->arApService->getAdvancedApAging($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }
}
