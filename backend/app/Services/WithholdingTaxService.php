<?php

namespace App\Services;

use App\Models\Supplier;
use App\Models\TaxCategory;
use App\Models\TaxRule;

class WithholdingTaxService
{
    public function __construct(
        protected TaxRuleService $taxRuleService
    ) {}

    public function calculateWithholding(
        int $companyId,
        ?int $supplierId,
        float $amount,
        ?string $ruleCode = null,
        ?string $date = null
    ): array {
        $taxDate = $date ?? now()->toDateString();
        $supplier = $supplierId ? Supplier::where('company_id', $companyId)->find($supplierId) : null;

        // If supplier is exempt from withholding
        if ($supplier && $supplier->tax_status === 'EXEMPT') {
            return [
                'taxable_amount' => round($amount, 4),
                'withholding_rate' => 0.0,
                'withholding_amount' => 0.0,
                'net_payable' => round($amount, 4),
                'rule_code' => null,
                'legal_reference' => 'Statutory Supplier Withholding Exemption',
            ];
        }

        $rule = null;
        if ($ruleCode) {
            $rule = $this->taxRuleService->getEffectiveRule($companyId, null, null, $ruleCode, $taxDate);
        } else {
            $rule = $this->taxRuleService->getEffectiveRule($companyId, null, TaxCategory::CODE_WITHHOLDING_TAX, null, $taxDate);
        }

        $rate = $rule ? (float)$rule->rate : 0.0;
        $withholdingAmount = round($amount * ($rate / 100), 4);
        $netPayable = round($amount - $withholdingAmount, 4);

        return [
            'taxable_amount' => round($amount, 4),
            'withholding_rate' => $rate,
            'withholding_amount' => $withholdingAmount,
            'net_payable' => $netPayable,
            'rule_code' => $rule?->code,
            'legal_reference' => $rule?->legal_reference ?? 'Income Tax Act 2023 / VDS Rules',
        ];
    }
}
