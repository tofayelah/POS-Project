<?php

namespace App\Http\Controllers\Api\V1\Tax;

use App\Http\Controllers\Controller;
use App\Services\TaxAdjustmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxAdjustmentController extends Controller
{
    public function __construct(
        protected TaxAdjustmentService $taxAdjustmentService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $adjustments = $this->taxAdjustmentService->listAdjustments($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $adjustments,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'branch_id' => 'nullable|integer',
            'tax_period_id' => 'required|integer',
            'adjustment_type' => 'required|string|max:50',
            'reason' => 'required|string',
            'amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'required|numeric',
            'legal_reference' => 'nullable|string|max:255',
            'source_tax_transaction_id' => 'nullable|integer',
        ]);

        $adj = $this->taxAdjustmentService->createAdjustment($companyId, $data, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax adjustment created in DRAFT status.',
            'data' => $adj,
        ], 201);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $adj = $this->taxAdjustmentService->approveAdjustment($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax adjustment approved successfully.',
            'data' => $adj,
        ]);
    }

    public function post(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $adj = $this->taxAdjustmentService->postAdjustment($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax adjustment posted to General Ledger and Tax Subledger successfully.',
            'data' => $adj,
        ]);
    }
}
