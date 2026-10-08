<?php

namespace App\Http\Controllers\Api\V1\Bi;

use App\Http\Controllers\Controller;
use App\Services\Bi\BiKpiAlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BiAlertController extends Controller
{
    public function __construct(
        protected BiKpiAlertService $alertService
    ) {}

    protected function getCompanyId(Request $request): int
    {
        return $request->attributes->get('company_id') ?? auth()->user()->company_id;
    }

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $severity = $request->query('severity');

        $alerts = $this->alertService->getActiveAlerts($companyId, $severity);

        return response()->json([
            'status' => 'success',
            'data' => $alerts,
        ]);
    }

    public function evaluate(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);

        $alerts = $this->alertService->evaluateAlerts($companyId);

        return response()->json([
            'status' => 'success',
            'data' => $alerts,
            'message' => 'Management alerts evaluated successfully.',
        ]);
    }

    public function acknowledge(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $userId = auth()->id();

        $alert = $this->alertService->acknowledgeAlert($companyId, $id, $userId);

        return response()->json([
            'status' => 'success',
            'data' => $alert,
            'message' => 'Alert marked as acknowledged.',
        ]);
    }

    public function resolve(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);

        $alert = $this->alertService->resolveAlert($companyId, $id);

        return response()->json([
            'status' => 'success',
            'data' => $alert,
            'message' => 'Alert marked as resolved.',
        ]);
    }
}
