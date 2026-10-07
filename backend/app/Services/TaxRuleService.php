<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\TaxCategory;
use App\Models\TaxComponent;
use App\Models\TaxRule;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class TaxRuleService
{
    public function getCategories(int $companyId): Collection
    {
        return TaxCategory::where(function ($q) use ($companyId) {
            $q->where('company_id', $companyId)
              ->orWhereNull('company_id');
        })->get();
    }

    public function createCategory(int $companyId, array $data): TaxCategory
    {
        return TaxCategory::create([
            'company_id' => $companyId,
            'name' => $data['name'],
            'code' => $data['code'] ?? strtoupper(str_replace(' ', '_', $data['name'])),
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    public function getRules(int $companyId, array $filters = []): Collection
    {
        $query = TaxRule::with(['category', 'components'])
            ->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)
                  ->orWhereNull('company_id');
            });

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['tax_category_id'])) {
            $query->where('tax_category_id', $filters['tax_category_id']);
        }

        if (!empty($filters['code'])) {
            $query->where('code', $filters['code']);
        }

        return $query->orderBy('priority', 'desc')->orderBy('effective_from', 'desc')->get();
    }

    /**
     * Find effective tax rule for a given category/code on a target date.
     */
    public function getEffectiveRule(
        int $companyId,
        ?int $taxCategoryId = null,
        ?string $categoryCode = null,
        ?string $ruleCode = null,
        ?string $date = null
    ): ?TaxRule {
        $targetDate = $date ?? now()->toDateString();

        $query = TaxRule::with(['category', 'components'])
            ->where('status', TaxRule::STATUS_ACTIVE)
            ->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)
                  ->orWhereNull('company_id');
            })
            ->where('effective_from', '<=', $targetDate)
            ->where(function ($q) use ($targetDate) {
                $q->whereNull('effective_to')
                  ->orWhere('effective_to', '>=', $targetDate);
            });

        if ($ruleCode) {
            $query->where('code', $ruleCode);
        } elseif ($taxCategoryId) {
            $query->where('tax_category_id', $taxCategoryId);
        } elseif ($categoryCode) {
            $query->whereHas('category', function ($q) use ($categoryCode) {
                $q->where('code', $categoryCode);
            });
        }

        // Company-specific rule takes precedence over global, highest priority first
        return $query->orderByRaw('company_id IS NULL ASC')
            ->orderBy('priority', 'desc')
            ->orderBy('effective_from', 'desc')
            ->first();
    }

    public function createRule(int $companyId, array $data, ?int $userId = null): TaxRule
    {
        return DB::transaction(function () use ($companyId, $data, $userId) {
            $rule = TaxRule::create([
                'company_id' => $companyId,
                'tax_category_id' => $data['tax_category_id'],
                'code' => $data['code'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'rate' => $data['rate'] ?? 0,
                'calculation_method' => $data['calculation_method'] ?? TaxRule::CALC_PERCENTAGE,
                'base_method' => $data['base_method'] ?? TaxRule::BASE_NET,
                'inclusive_allowed' => $data['inclusive_allowed'] ?? true,
                'exclusive_allowed' => $data['exclusive_allowed'] ?? true,
                'priority' => $data['priority'] ?? 1,
                'effective_from' => $data['effective_from'] ?? now()->toDateString(),
                'effective_to' => $data['effective_to'] ?? null,
                'legal_reference' => $data['legal_reference'] ?? null,
                'status' => $data['status'] ?? TaxRule::STATUS_ACTIVE,
            ]);

            if (!empty($data['components']) && is_array($data['components'])) {
                foreach ($data['components'] as $idx => $comp) {
                    TaxComponent::create([
                        'company_id' => $companyId,
                        'tax_rule_id' => $rule->id,
                        'code' => $comp['code'] ?? 'VAT',
                        'name' => $comp['name'] ?? 'VAT Component',
                        'type' => $comp['type'] ?? TaxComponent::TYPE_OUTPUT_VAT,
                        'rate' => $comp['rate'] ?? $rule->rate,
                        'sequence' => $comp['sequence'] ?? ($idx + 1),
                        'account_id' => $comp['account_id'] ?? null,
                        'legal_reference' => $comp['legal_reference'] ?? null,
                    ]);
                }
            }

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_RULE_CREATED',
                'auditable_type' => TaxRule::class,
                'auditable_id' => $rule->id,
                'new_values' => $rule->toArray(),
            ]);

            return $rule->load(['category', 'components']);
        });
    }

    public function updateRule(int $companyId, int $ruleId, array $data, ?int $userId = null): TaxRule
    {
        return DB::transaction(function () use ($companyId, $ruleId, $data, $userId) {
            $rule = TaxRule::where('company_id', $companyId)->find($ruleId);
            if (!$rule) {
                throw new NotFoundHttpException("Tax rule ID {$ruleId} not found.");
            }

            $oldValues = $rule->toArray();

            $rule->update([
                'name' => $data['name'] ?? $rule->name,
                'description' => $data['description'] ?? $rule->description,
                'rate' => isset($data['rate']) ? $data['rate'] : $rule->rate,
                'calculation_method' => $data['calculation_method'] ?? $rule->calculation_method,
                'base_method' => $data['base_method'] ?? $rule->base_method,
                'inclusive_allowed' => isset($data['inclusive_allowed']) ? $data['inclusive_allowed'] : $rule->inclusive_allowed,
                'exclusive_allowed' => isset($data['exclusive_allowed']) ? $data['exclusive_allowed'] : $rule->exclusive_allowed,
                'priority' => $data['priority'] ?? $rule->priority,
                'effective_from' => $data['effective_from'] ?? $rule->effective_from,
                'effective_to' => $data['effective_to'] ?? $rule->effective_to,
                'legal_reference' => $data['legal_reference'] ?? $rule->legal_reference,
                'status' => $data['status'] ?? $rule->status,
            ]);

            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => 'TAX_RULE_UPDATED',
                'auditable_type' => TaxRule::class,
                'auditable_id' => $rule->id,
                'old_values' => $oldValues,
                'new_values' => $rule->toArray(),
            ]);

            return $rule->load(['category', 'components']);
        });
    }

    public function activateRule(int $companyId, int $ruleId, ?int $userId = null): TaxRule
    {
        return $this->updateRule($companyId, $ruleId, ['status' => TaxRule::STATUS_ACTIVE], $userId);
    }

    public function deactivateRule(int $companyId, int $ruleId, ?int $userId = null): TaxRule
    {
        return $this->updateRule($companyId, $ruleId, ['status' => TaxRule::STATUS_INACTIVE], $userId);
    }
}
