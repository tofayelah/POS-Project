<?php

namespace App\Services;

use App\Models\TaxCategory;
use App\Models\TaxComponent;
use App\Models\TaxRule;

class TaxCalculationService
{
    protected TaxRuleService $taxRuleService;

    public function __construct(TaxRuleService $taxRuleService)
    {
        $this->taxRuleService = $taxRuleService;
    }

    /**
     * Authoritative calculation for a single line item.
     * Pure calculation: ZERO GL side-effects.
     */
    public function calculateItemTax(
        int $companyId,
        float $amount,
        ?int $taxCategoryId = null,
        ?string $taxRuleCode = null,
        bool $isInclusive = false,
        ?string $date = null,
        ?string $customerTaxStatus = null,
        ?string $supplierTaxStatus = null,
        ?string $transactionType = 'OUTPUT_VAT'
    ): array {
        $taxDate = $date ?? now()->toDateString();

        // 1. Check entity-level exemptions or zero-rating overrides
        $effectiveStatus = $customerTaxStatus ?? $supplierTaxStatus ?? 'TAXABLE';
        if ($effectiveStatus === 'EXEMPT') {
            return $this->buildZeroTaxResponse($amount, $isInclusive, TaxCategory::CODE_EXEMPT, 'Statutory Entity Exemption');
        }
        if ($effectiveStatus === 'ZERO_RATED') {
            return $this->buildZeroTaxResponse($amount, $isInclusive, TaxCategory::CODE_ZERO_RATED, 'Export / International Zero-Rated Supply');
        }

        // 2. Resolve Effective Tax Rule
        $rule = null;
        if ($taxRuleCode) {
            $rule = $this->taxRuleService->getEffectiveRule($companyId, null, null, $taxRuleCode, $taxDate);
        } elseif ($taxCategoryId) {
            $rule = $this->taxRuleService->getEffectiveRule($companyId, $taxCategoryId, null, null, $taxDate);
        } else {
            // Default to standard VAT category if available
            $rule = $this->taxRuleService->getEffectiveRule($companyId, null, TaxCategory::CODE_STANDARD_VAT, null, $taxDate);
        }

        // If rule explicitly marks ZERO_RATED or EXEMPT
        if ($rule) {
            $categoryCode = $rule->category?->code ?? TaxCategory::CODE_STANDARD_VAT;
            if ($categoryCode === TaxCategory::CODE_EXEMPT || (float)$rule->rate === 0.0 && $categoryCode !== TaxCategory::CODE_STANDARD_VAT) {
                return $this->buildZeroTaxResponse($amount, $isInclusive, $categoryCode, $rule->legal_reference, $rule);
            }
            if ($categoryCode === TaxCategory::CODE_ZERO_RATED) {
                return $this->buildZeroTaxResponse($amount, $isInclusive, TaxCategory::CODE_ZERO_RATED, $rule->legal_reference, $rule);
            }
        }

        // 3. Extract Rates (VAT Rate, Supplementary Duty Rate, etc.)
        $vatRate = $rule ? (float)$rule->rate : 0.0;
        $sdRate = 0.0;
        $atRate = 0.0;

        if ($rule && $rule->components->isNotEmpty()) {
            $hasExplicitVatComp = false;
            foreach ($rule->components as $comp) {
                if ($comp->type === TaxComponent::TYPE_SUPPLEMENTARY_DUTY) {
                    $sdRate += (float)$comp->rate;
                } elseif ($comp->type === TaxComponent::TYPE_ADVANCE_TAX) {
                    $atRate += (float)$comp->rate;
                } elseif ($comp->type === TaxComponent::TYPE_OUTPUT_VAT || $comp->type === TaxComponent::TYPE_INPUT_VAT) {
                    if (!$hasExplicitVatComp) {
                        $vatRate = 0.0;
                        $hasExplicitVatComp = true;
                    }
                    $vatRate += (float)$comp->rate;
                }
            }
        }

        // 4. Inclusive vs Exclusive Mathematical Calculations
        if ($isInclusive) {
            // NBR compound formula for VAT-inclusive prices:
            // Gross = Net * (1 + SD_rate/100) * (1 + VAT_rate/100)
            $sdFactor = 1 + ($sdRate / 100);
            $vatFactor = 1 + ($vatRate / 100);
            $totalFactor = $sdFactor * $vatFactor;

            $netAmount = round($amount / $totalFactor, 4);
            $sdAmount = round($netAmount * ($sdRate / 100), 4);
            $vatBase = round($netAmount + $sdAmount, 4);
            $vatAmount = round($vatBase * ($vatRate / 100), 4);

            // Reconcile precision difference against input gross
            $grossAmount = round($amount, 4);
        } else {
            // Exclusive calculation:
            // SD is applied to Net, then VAT is applied to (Net + SD)
            $netAmount = round($amount, 4);
            $sdAmount = round($netAmount * ($sdRate / 100), 4);
            $vatBase = round($netAmount + $sdAmount, 4);
            $vatAmount = round($vatBase * ($vatRate / 100), 4);
            $grossAmount = round($netAmount + $sdAmount + $vatAmount, 4);
        }

        $atAmount = round($netAmount * ($atRate / 100), 4);
        $totalTax = round($vatAmount + $sdAmount + $atAmount, 4);

        // 5. Build Structured Components Breakdown
        $components = [];
        if ($sdAmount > 0 || $sdRate > 0) {
            $components[] = [
                'code' => 'SD',
                'name' => 'Supplementary Duty',
                'type' => TaxComponent::TYPE_SUPPLEMENTARY_DUTY,
                'rate' => $sdRate,
                'taxable_base' => $netAmount,
                'tax_amount' => $sdAmount,
                'legal_reference' => 'VAT and SD Act 2012, Schedule 2',
            ];
        }

        $components[] = [
            'code' => 'VAT',
            'name' => 'Value Added Tax',
            'type' => $transactionType === 'INPUT_VAT' ? TaxComponent::TYPE_INPUT_VAT : TaxComponent::TYPE_OUTPUT_VAT,
            'rate' => $vatRate,
            'taxable_base' => $vatBase,
            'tax_amount' => $vatAmount,
            'legal_reference' => $rule?->legal_reference ?? 'VAT and SD Act 2012, Sec 15',
        ];

        if ($atAmount > 0) {
            $components[] = [
                'code' => 'AT',
                'name' => 'Advance Tax',
                'type' => TaxComponent::TYPE_ADVANCE_TAX,
                'rate' => $atRate,
                'taxable_base' => $netAmount,
                'tax_amount' => $atAmount,
                'legal_reference' => 'VAT and SD Act 2012, Sec 31',
            ];
        }

        return [
            'taxable_amount' => $netAmount,
            'tax_amount' => $vatAmount,
            'sd_amount' => $sdAmount,
            'at_amount' => $atAmount,
            'withholding_amount' => 0.0,
            'total_tax_amount' => $totalTax,
            'gross_amount' => $grossAmount,
            'is_inclusive' => $isInclusive,
            'tax_category' => $rule?->category?->code ?? TaxCategory::CODE_STANDARD_VAT,
            'tax_rule_id' => $rule?->id,
            'tax_rule_code' => $rule?->code,
            'effective_rate' => $vatRate,
            'legal_reference' => $rule?->legal_reference,
            'components' => $components,
        ];
    }

    /**
     * Authoritative calculation for multiple line items on a document.
     */
    public function calculateInvoiceTax(
        int $companyId,
        array $items,
        bool $isInclusive = false,
        ?string $date = null,
        ?string $taxStatus = null,
        ?string $transactionType = 'OUTPUT_VAT'
    ): array {
        $subtotal = 0.0;
        $totalVat = 0.0;
        $totalSd = 0.0;
        $totalAt = 0.0;
        $grandTotal = 0.0;
        $lineResults = [];

        foreach ($items as $item) {
            $lineAmount = (float)($item['amount'] ?? (($item['quantity'] ?? 1) * ($item['unit_price'] ?? 0)));
            $taxCategoryId = $item['tax_category_id'] ?? null;
            $taxRuleCode = $item['tax_rule_code'] ?? null;
            $lineInclusive = $item['is_inclusive'] ?? $isInclusive;

            $result = $this->calculateItemTax(
                $companyId,
                $lineAmount,
                $taxCategoryId,
                $taxRuleCode,
                $lineInclusive,
                $date,
                $taxStatus,
                null,
                $transactionType
            );

            $subtotal += $result['taxable_amount'];
            $totalVat += $result['tax_amount'];
            $totalSd += $result['sd_amount'];
            $totalAt += $result['at_amount'];
            $grandTotal += $result['gross_amount'];

            $lineResults[] = $result;
        }

        return [
            'subtotal' => round($subtotal, 4),
            'tax_amount' => round($totalVat, 4),
            'sd_amount' => round($totalSd, 4),
            'at_amount' => round($totalAt, 4),
            'total_tax_amount' => round($totalVat + $totalSd + $totalAt, 4),
            'grand_total' => round($grandTotal, 4),
            'is_inclusive' => $isInclusive,
            'lines' => $lineResults,
        ];
    }

    protected function buildZeroTaxResponse(
        float $amount,
        bool $isInclusive,
        string $categoryCode,
        ?string $legalReference = null,
        ?TaxRule $rule = null
    ): array {
        $rounded = round($amount, 4);
        return [
            'taxable_amount' => $rounded,
            'tax_amount' => 0.0,
            'sd_amount' => 0.0,
            'at_amount' => 0.0,
            'withholding_amount' => 0.0,
            'total_tax_amount' => 0.0,
            'gross_amount' => $rounded,
            'is_inclusive' => $isInclusive,
            'tax_category' => $categoryCode,
            'tax_rule_id' => $rule?->id,
            'tax_rule_code' => $rule?->code,
            'effective_rate' => 0.0,
            'legal_reference' => $legalReference,
            'components' => [
                [
                    'code' => $categoryCode === TaxCategory::CODE_ZERO_RATED ? 'VAT-0' : 'EXEMPT',
                    'name' => $categoryCode === TaxCategory::CODE_ZERO_RATED ? 'Zero-Rated Supply' : 'Exempt Supply',
                    'type' => TaxComponent::TYPE_OUTPUT_VAT,
                    'rate' => 0.0,
                    'taxable_base' => $rounded,
                    'tax_amount' => 0.0,
                    'legal_reference' => $legalReference,
                ]
            ],
        ];
    }
}
