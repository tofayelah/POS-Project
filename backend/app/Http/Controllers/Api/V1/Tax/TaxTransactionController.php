<?php

namespace App\Http\Controllers\Api\V1\Tax;

use App\Http\Controllers\Controller;
use App\Models\TaxTransaction;
use App\Services\TaxPostingService;
use App\Services\TaxReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxTransactionController extends Controller
{
    public function __construct(
        protected TaxReportingService $taxReportingService,
        protected TaxPostingService $taxPostingService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $transactions = $this->taxReportingService->getTaxTransactionRegister($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $transactions,
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $transaction = TaxTransaction::with(['components', 'rule', 'period', 'journalEntry'])
            ->where('company_id', $companyId)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $transaction,
        ]);
    }

    public function settle(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'tax_period_id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01',
            'payment_method_id' => 'required|integer',
            'reference_number' => 'required|string|max:100',
        ]);

        $settlement = $this->taxPostingService->settleTaxPayable(
            $companyId,
            $data['tax_period_id'],
            (float) $data['amount'],
            $data['payment_method_id'],
            $data['reference_number'],
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Treasury Challan VAT settlement posted successfully.',
            'data' => $settlement,
        ]);
    }
}
