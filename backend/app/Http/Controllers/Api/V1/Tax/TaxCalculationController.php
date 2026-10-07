<?php

namespace App\Http\Controllers\Api\V1\Tax;

use App\Http\Controllers\Controller;
use App\Services\TaxCalculationService;
use App\Services\WithholdingTaxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxCalculationController extends Controller
{
    public function __construct(
        protected TaxCalculationService $taxCalculationService,
        protected WithholdingTaxService $withholdingTaxService
    ) {}

    public function calculate(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'amount' => 'required|numeric|min:0',
            'tax_category_id' => 'nullable|integer',
            'tax_rule_code' => 'nullable|string',
            'is_inclusive' => 'nullable|boolean',
            'date' => 'nullable|date',
            'customer_tax_status' => 'nullable|string',
            'supplier_tax_status' => 'nullable|string',
            'transaction_type' => 'nullable|string',
        ]);

        $calculation = $this->taxCalculationService->calculateItemTax(
            $companyId,
            (float) $data['amount'],
            $data['tax_category_id'] ?? null,
            $data['tax_rule_code'] ?? null,
            (bool) ($data['is_inclusive'] ?? false),
            $data['date'] ?? null,
            $data['customer_tax_status'] ?? null,
            $data['supplier_tax_status'] ?? null,
            $data['transaction_type'] ?? 'OUTPUT_VAT'
        );

        return response()->json([
            'success' => true,
            'data' => $calculation,
        ]);
    }

    public function calculateInvoice(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'items' => 'required|array',
            'items.*.amount' => 'nullable|numeric',
            'items.*.quantity' => 'nullable|numeric',
            'items.*.unit_price' => 'nullable|numeric',
            'items.*.tax_category_id' => 'nullable|integer',
            'items.*.tax_rule_code' => 'nullable|string',
            'items.*.is_inclusive' => 'nullable|boolean',
            'is_inclusive' => 'nullable|boolean',
            'date' => 'nullable|date',
            'tax_status' => 'nullable|string',
            'transaction_type' => 'nullable|string',
        ]);

        $calculation = $this->taxCalculationService->calculateInvoiceTax(
            $companyId,
            $data['items'],
            (bool) ($data['is_inclusive'] ?? false),
            $data['date'] ?? null,
            $data['tax_status'] ?? null,
            $data['transaction_type'] ?? 'OUTPUT_VAT'
        );

        return response()->json([
            'success' => true,
            'data' => $calculation,
        ]);
    }

    public function calculateWithholding(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'supplier_id' => 'nullable|integer',
            'amount' => 'required|numeric|min:0',
            'rule_code' => 'nullable|string',
            'date' => 'nullable|date',
        ]);

        $calculation = $this->withholdingTaxService->calculateWithholding(
            $companyId,
            $data['supplier_id'] ?? null,
            (float) $data['amount'],
            $data['rule_code'] ?? null,
            $data['date'] ?? null
        );

        return response()->json([
            'success' => true,
            'data' => $calculation,
        ]);
    }
}
