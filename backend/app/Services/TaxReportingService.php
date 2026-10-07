<?php

namespace App\Services;

use App\Models\TaxAdjustment;
use App\Models\TaxPeriod;
use App\Models\TaxProfile;
use App\Models\TaxTransaction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class TaxReportingService
{
    public function getVatSummary(
        int $companyId,
        ?int $periodId = null,
        ?string $startDate = null,
        ?string $endDate = null
    ): array {
        $query = TaxTransaction::where('company_id', $companyId)
            ->where('status', TaxTransaction::STATUS_POSTED);

        if ($periodId) {
            $query->where('tax_period_id', $periodId);
        } elseif ($startDate && $endDate) {
            $query->whereBetween('document_date', [$startDate, $endDate]);
        }

        $transactions = $query->get();

        $outputVat = (float) $transactions->where('transaction_type', TaxTransaction::TYPE_SALE_OUTPUT)->sum('tax_amount');
        $outputSd = (float) $transactions->where('transaction_type', TaxTransaction::TYPE_SALE_OUTPUT)->sum('sd_amount');
        $inputVat = (float) $transactions->where('transaction_type', TaxTransaction::TYPE_PURCHASE_INPUT)->sum('tax_amount');
        $inputSd = (float) $transactions->where('transaction_type', TaxTransaction::TYPE_PURCHASE_INPUT)->sum('sd_amount');
        $returnReversals = (float) $transactions->where('transaction_type', TaxTransaction::TYPE_SALE_RETURN_REVERSAL)->sum('tax_amount');
        $settlements = (float) abs($transactions->where('transaction_type', TaxTransaction::TYPE_TAX_SETTLEMENT)->sum('tax_amount'));

        $adjQuery = TaxAdjustment::where('company_id', $companyId)->where('status', TaxAdjustment::STATUS_POSTED);
        if ($periodId) {
            $adjQuery->where('tax_period_id', $periodId);
        }
        $adjustments = (float) $adjQuery->sum('tax_amount');

        $netOutputVat = round($outputVat - $returnReversals, 4);
        $netVatPayable = round($netOutputVat - $inputVat + $adjustments, 4);
        $closingBalance = round($netVatPayable - $settlements, 4);

        return [
            'total_sales_taxable' => (float) $transactions->where('transaction_type', TaxTransaction::TYPE_SALE_OUTPUT)->sum('taxable_amount'),
            'total_output_vat' => $outputVat,
            'total_output_sd' => $outputSd,
            'total_return_reversals' => $returnReversals,
            'net_output_vat' => $netOutputVat,
            'total_purchase_taxable' => (float) $transactions->where('transaction_type', TaxTransaction::TYPE_PURCHASE_INPUT)->sum('taxable_amount'),
            'total_input_vat' => $inputVat,
            'total_input_sd' => $inputSd,
            'total_adjustments' => $adjustments,
            'net_vat_payable' => $netVatPayable,
            'total_settlements' => $settlements,
            'closing_vat_liability' => max(0, $closingBalance),
            'closing_vat_refundable' => $closingBalance < 0 ? abs($closingBalance) : 0,
            'transaction_count' => $transactions->count(),
        ];
    }

    public function getOutputVatReport(int $companyId, array $filters = []): array
    {
        $query = TaxTransaction::with(['rule', 'source'])
            ->where('company_id', $companyId)
            ->where('transaction_type', TaxTransaction::TYPE_SALE_OUTPUT);

        if (!empty($filters['start_date']) && !empty($filters['end_date'])) {
            $query->whereBetween('document_date', [$filters['start_date'], $filters['end_date']]);
        }
        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        $records = $query->orderBy('document_date', 'desc')->get();

        return [
            'total_invoices' => $records->count(),
            'total_taxable' => (float) $records->sum('taxable_amount'),
            'total_vat' => (float) $records->sum('tax_amount'),
            'total_sd' => (float) $records->sum('sd_amount'),
            'total_tax' => (float) $records->sum('total_tax_amount'),
            'records' => $records,
        ];
    }

    public function getInputVatReport(int $companyId, array $filters = []): array
    {
        $query = TaxTransaction::with(['rule', 'source'])
            ->where('company_id', $companyId)
            ->where('transaction_type', TaxTransaction::TYPE_PURCHASE_INPUT);

        if (!empty($filters['start_date']) && !empty($filters['end_date'])) {
            $query->whereBetween('document_date', [$filters['start_date'], $filters['end_date']]);
        }
        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        $records = $query->orderBy('document_date', 'desc')->get();

        return [
            'total_bills' => $records->count(),
            'total_taxable' => (float) $records->sum('taxable_amount'),
            'total_input_vat' => (float) $records->sum('tax_amount'),
            'total_input_sd' => (float) $records->sum('sd_amount'),
            'records' => $records,
        ];
    }

    /**
     * Mushak-oriented reporting foundation structured for VAT Act 2012 / NBR compliance.
     */
    public function getMushakReportFoundation(int $companyId, int $periodId): array
    {
        $period = TaxPeriod::where('company_id', $companyId)->findOrFail($periodId);
        $profile = TaxProfile::where('company_id', $companyId)->first();
        $summary = $this->getVatSummary($companyId, $periodId);

        return [
            'taxpayer' => [
                'legal_name' => $profile?->legal_name ?? 'N/A',
                'trade_name' => $profile?->trade_name ?? 'N/A',
                'bin' => $profile?->bin ?? 'N/A',
                'tin' => $profile?->tin ?? 'N/A',
                'tax_circle' => $profile?->tax_circle ?? 'N/A',
                'tax_zone' => $profile?->tax_zone ?? 'N/A',
                'commissionerate' => $profile?->commissionerate ?? 'N/A',
                'address' => $profile?->address ?? 'N/A',
            ],
            'period' => [
                'id' => $period->id,
                'name' => $period->period_name,
                'start_date' => $period->period_start->toDateString(),
                'end_date' => $period->period_end->toDateString(),
                'status' => $period->status,
                'filing_reference' => $period->filing_reference,
            ],
            'mushak_9_1_parts' => [
                'part_3_goods_services_supply' => [
                    'standard_rated_supplies' => $summary['total_sales_taxable'],
                    'output_vat' => $summary['total_output_vat'],
                    'supplementary_duty' => $summary['total_output_sd'],
                ],
                'part_4_purchases_inputs' => [
                    'standard_rated_inputs' => $summary['total_purchase_taxable'],
                    'input_vat' => $summary['total_input_vat'],
                    'input_sd' => $summary['total_input_sd'],
                ],
                'part_5_adjustments' => [
                    'increasing_adjustments' => (float) TaxAdjustment::where('company_id', $companyId)->where('tax_period_id', $periodId)->whereIn('adjustment_type', [TaxAdjustment::TYPE_OUTPUT_INCREASE, TaxAdjustment::TYPE_INPUT_DECREASE])->sum('tax_amount'),
                    'decreasing_adjustments' => (float) TaxAdjustment::where('company_id', $companyId)->where('tax_period_id', $periodId)->whereIn('adjustment_type', [TaxAdjustment::TYPE_OUTPUT_DECREASE, TaxAdjustment::TYPE_INPUT_INCREASE])->sum('tax_amount'),
                    'net_adjustment' => $summary['total_adjustments'],
                ],
                'part_6_net_tax_calculation' => [
                    'net_payable_amount' => $summary['net_vat_payable'],
                    'treasury_payments' => $summary['total_settlements'],
                    'closing_payable' => $summary['closing_vat_liability'],
                    'closing_refundable' => $summary['closing_vat_refundable'],
                ],
            ],
            'legal_disclaimer' => 'Bangladesh VAT/Tax compliance foundation. Structured per NBR VAT and SD Act 2012 format.',
        ];
    }

    public function getTaxTransactionRegister(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $query = TaxTransaction::with(['rule', 'period'])
            ->where('company_id', $companyId);

        if (!empty($filters['transaction_type'])) {
            $query->where('transaction_type', $filters['transaction_type']);
        }
        if (!empty($filters['tax_period_id'])) {
            $query->where('tax_period_id', $filters['tax_period_id']);
        }
        if (!empty($filters['start_date']) && !empty($filters['end_date'])) {
            $query->whereBetween('document_date', [$filters['start_date'], $filters['end_date']]);
        }

        $perPage = (int) ($filters['per_page'] ?? 20);
        return $query->orderBy('document_date', 'desc')->orderBy('id', 'desc')->paginate($perPage);
    }
}
