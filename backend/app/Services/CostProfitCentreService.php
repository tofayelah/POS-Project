<?php

namespace App\Services;

use App\Models\CostCentre;
use App\Models\ProfitCentre;
use App\Models\JournalEntryLine;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class CostProfitCentreService
{
    // Cost Centres
    public function getCostCentresTree(int $companyId): array
    {
        $all = CostCentre::where('company_id', $companyId)
            ->with(['manager:id,name', 'creator:id,name'])
            ->get();

        $buildTree = function ($parentId = null) use (&$buildTree, $all) {
            $branch = [];
            foreach ($all as $item) {
                if ($item->parent_id == $parentId) {
                    $children = $buildTree($item->id);
                    $node = $item->toArray();
                    $node['children'] = $children;
                    $branch[] = $node;
                }
            }
            return $branch;
        };

        return $buildTree(null);
    }

    public function createCostCentre(int $companyId, array $data, int $userId): CostCentre
    {
        $existing = CostCentre::where('company_id', $companyId)->where('code', $data['code'])->first();
        if ($existing) {
            throw new ConflictHttpException("Cost Centre with code {$data['code']} already exists.");
        }

        $cc = CostCentre::create([
            'company_id' => $companyId,
            'parent_id' => $data['parent_id'] ?? null,
            'code' => $data['code'],
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'ACTIVE',
            'manager_id' => $data['manager_id'] ?? null,
            'created_by' => $userId,
        ]);

        AuditLog::log($companyId, $userId, 'COST_CENTRE_CREATED', $cc->id, 'CostCentre', "Created Cost Centre: {$cc->code} - {$cc->name}");

        return $cc;
    }

    public function getCostCentreExpenseReport(int $companyId, array $filters = []): array
    {
        $costCentres = CostCentre::where('company_id', $companyId)->get();

        $reports = [];
        $grandTotal = 0;

        foreach ($costCentres as $cc) {
            $query = JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $filters) {
                $q->where('company_id', $companyId)
                  ->where('status', 'POSTED');

                if (!empty($filters['start_date'])) {
                    $q->where('journal_date', '>=', $filters['start_date']);
                }
                if (!empty($filters['end_date'])) {
                    $q->where('journal_date', '<=', $filters['end_date']);
                }
            })->where('cost_centre_id', $cc->id)
              ->whereHas('account', function ($q) {
                  $q->where('account_type', 'EXPENSE');
              });

            $expenseAmount = (float) $query->sum(DB::raw('debit - credit'));
            $grandTotal += $expenseAmount;

            $reports[] = [
                'cost_centre_id' => $cc->id,
                'code' => $cc->code,
                'name' => $cc->name,
                'parent_id' => $cc->parent_id,
                'total_expense' => round($expenseAmount, 2),
            ];
        }

        return [
            'grand_total_expenses' => round($grandTotal, 2),
            'cost_centres' => $reports,
        ];
    }

    // Profit Centres
    public function getProfitCentres(int $companyId): array
    {
        return ProfitCentre::where('company_id', $companyId)
            ->with(['businessUnit:id,name', 'branch:id,name', 'manager:id,name'])
            ->get()
            ->toArray();
    }

    public function createProfitCentre(int $companyId, array $data, int $userId): ProfitCentre
    {
        $existing = ProfitCentre::where('company_id', $companyId)->where('code', $data['code'])->first();
        if ($existing) {
            throw new ConflictHttpException("Profit Centre with code {$data['code']} already exists.");
        }

        $pc = ProfitCentre::create([
            'company_id' => $companyId,
            'business_unit_id' => $data['business_unit_id'] ?? null,
            'branch_id' => $data['branch_id'] ?? null,
            'code' => $data['code'],
            'name' => $data['name'],
            'type' => $data['type'] ?? 'BRANCH',
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'ACTIVE',
            'manager_id' => $data['manager_id'] ?? null,
            'created_by' => $userId,
        ]);

        AuditLog::log($companyId, $userId, 'PROFIT_CENTRE_CREATED', $pc->id, 'ProfitCentre', "Created Profit Centre: {$pc->code} - {$pc->name}");

        return $pc;
    }

    public function getProfitCentrePerformanceReport(int $companyId, array $filters = []): array
    {
        $profitCentres = ProfitCentre::where('company_id', $companyId)->get();

        $reports = [];
        $totalRevenueAll = 0;
        $totalOperatingProfitAll = 0;

        foreach ($profitCentres as $pc) {
            $baseLineQuery = JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $filters) {
                $q->where('company_id', $companyId)
                  ->where('status', 'POSTED');

                if (!empty($filters['start_date'])) {
                    $q->where('journal_date', '>=', $filters['start_date']);
                }
                if (!empty($filters['end_date'])) {
                    $q->where('journal_date', '<=', $filters['end_date']);
                }
            })->where('profit_centre_id', $pc->id);

            // Revenue
            $revenueQuery = clone $baseLineQuery;
            $revenue = (float) $revenueQuery->whereHas('account', function ($q) {
                $q->where('account_type', 'REVENUE');
            })->sum(DB::raw('credit - debit'));

            // Direct Costs / COGS
            $directCostQuery = clone $baseLineQuery;
            $directCosts = (float) $directCostQuery->whereHas('account', function ($q) {
                $q->where('account_type', 'EXPENSE')
                  ->where(function ($sub) {
                      $sub->where('account_code', 'like', '5%')
                          ->orWhere('account_name', 'ilike', '%cogs%')
                          ->orWhere('account_name', 'ilike', '%cost of goods%');
                  });
            })->sum(DB::raw('debit - credit'));

            // Operating Expenses (other expenses)
            $opexQuery = clone $baseLineQuery;
            $operatingExpenses = (float) $opexQuery->whereHas('account', function ($q) {
                $q->where('account_type', 'EXPENSE')
                  ->whereNot(function ($sub) {
                      $sub->where('account_code', 'like', '5%')
                          ->orWhere('account_name', 'ilike', '%cogs%')
                          ->orWhere('account_name', 'ilike', '%cost of goods%');
                  });
            })->sum(DB::raw('debit - credit'));

            $contributionMargin = $revenue - $directCosts;
            $operatingProfit = $contributionMargin - $operatingExpenses;

            $contributionMarginPct = $revenue > 0 ? round(($contributionMargin / $revenue) * 100, 2) : 0;
            $operatingMarginPct = $revenue > 0 ? round(($operatingProfit / $revenue) * 100, 2) : 0;

            $totalRevenueAll += $revenue;
            $totalOperatingProfitAll += $operatingProfit;

            $reports[] = [
                'profit_centre_id' => $pc->id,
                'code' => $pc->code,
                'name' => $pc->name,
                'type' => $pc->type,
                'revenue' => round($revenue, 2),
                'direct_costs' => round($directCosts, 2),
                'contribution_margin' => round($contributionMargin, 2),
                'contribution_margin_pct' => $contributionMarginPct,
                'operating_expenses' => round($operatingExpenses, 2),
                'operating_profit' => round($operatingProfit, 2),
                'operating_margin_pct' => $operatingMarginPct,
            ];
        }

        return [
            'total_revenue' => round($totalRevenueAll, 2),
            'total_operating_profit' => round($totalOperatingProfitAll, 2),
            'profit_centres' => $reports,
        ];
    }
}
