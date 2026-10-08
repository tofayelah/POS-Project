<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\BudgetLine;
use App\Models\BudgetControl;
use App\Models\JournalEntryLine;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Carbon\Carbon;

class BudgetService
{
    public function createBudget(int $companyId, array $data, int $userId): Budget
    {
        return DB::transaction(function () use ($companyId, $data, $userId) {
            $totalAmount = 0;
            if (!empty($data['lines'])) {
                foreach ($data['lines'] as $l) {
                    $totalAmount += (float) ($l['amount'] ?? 0);
                }
            }

            $budget = Budget::create([
                'company_id' => $companyId,
                'fiscal_year_id' => $data['fiscal_year_id'],
                'name' => $data['name'],
                'budget_type' => $data['budget_type'] ?? 'ORIGINAL',
                'status' => 'DRAFT',
                'version' => $data['version'] ?? 1,
                'total_budgeted_amount' => $totalAmount,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ]);

            if (!empty($data['lines'])) {
                foreach ($data['lines'] as $line) {
                    $budget->lines()->create([
                        'account_id' => $line['account_id'],
                        'cost_centre_id' => $line['cost_centre_id'] ?? null,
                        'profit_centre_id' => $line['profit_centre_id'] ?? null,
                        'accounting_period_id' => $line['accounting_period_id'] ?? null,
                        'business_unit_id' => $line['business_unit_id'] ?? null,
                        'branch_id' => $line['branch_id'] ?? null,
                        'amount' => (float) ($line['amount'] ?? 0),
                        'notes' => $line['notes'] ?? null,
                    ]);
                }
            }

            AuditLog::log($companyId, $userId, 'BUDGET_CREATED', $budget->id, 'Budget', "Created budget: {$budget->name} v{$budget->version}");

            return $budget->load('lines.account', 'lines.costCentre', 'lines.profitCentre');
        });
    }

    public function updateBudget(int $companyId, int $budgetId, array $data, int $userId): Budget
    {
        return DB::transaction(function () use ($companyId, $budgetId, $data, $userId) {
            $budget = Budget::where('company_id', $companyId)->lockForUpdate()->findOrFail($budgetId);

            if (!in_array($budget->status, ['DRAFT', 'UNDER_REVIEW'])) {
                throw new ConflictHttpException("Cannot edit budget with status {$budget->status}.");
            }

            if (isset($data['name'])) $budget->name = $data['name'];
            if (isset($data['notes'])) $budget->notes = $data['notes'];
            if (isset($data['budget_type'])) $budget->budget_type = $data['budget_type'];

            if (isset($data['lines'])) {
                $budget->lines()->delete();
                $totalAmount = 0;
                foreach ($data['lines'] as $line) {
                    $amt = (float) ($line['amount'] ?? 0);
                    $totalAmount += $amt;
                    $budget->lines()->create([
                        'account_id' => $line['account_id'],
                        'cost_centre_id' => $line['cost_centre_id'] ?? null,
                        'profit_centre_id' => $line['profit_centre_id'] ?? null,
                        'accounting_period_id' => $line['accounting_period_id'] ?? null,
                        'business_unit_id' => $line['business_unit_id'] ?? null,
                        'branch_id' => $line['branch_id'] ?? null,
                        'amount' => $amt,
                        'notes' => $line['notes'] ?? null,
                    ]);
                }
                $budget->total_budgeted_amount = $totalAmount;
            }

            $budget->save();

            AuditLog::log($companyId, $userId, 'BUDGET_UPDATED', $budget->id, 'Budget', "Updated budget: {$budget->name}");

            return $budget->load('lines.account', 'lines.costCentre', 'lines.profitCentre');
        });
    }

    public function submitBudget(int $companyId, int $budgetId, int $userId): Budget
    {
        $budget = Budget::where('company_id', $companyId)->findOrFail($budgetId);
        if ($budget->status !== 'DRAFT') {
            throw new ConflictHttpException("Only DRAFT budgets can be submitted for review.");
        }

        $budget->status = 'UNDER_REVIEW';
        $budget->save();

        AuditLog::log($companyId, $userId, 'BUDGET_SUBMITTED', $budget->id, 'Budget', "Submitted budget {$budget->name} for review");

        return $budget;
    }

    public function approveBudget(int $companyId, int $budgetId, int $userId): Budget
    {
        $budget = Budget::where('company_id', $companyId)->findOrFail($budgetId);
        if (!in_array($budget->status, ['DRAFT', 'UNDER_REVIEW'])) {
            throw new ConflictHttpException("Budget is not in a state to be approved.");
        }

        $budget->status = 'APPROVED';
        $budget->approved_by = $userId;
        $budget->approved_at = Carbon::now();
        $budget->save();

        AuditLog::log($companyId, $userId, 'BUDGET_APPROVED', $budget->id, 'Budget', "Approved budget {$budget->name}");

        return $budget;
    }

    public function activateBudget(int $companyId, int $budgetId, int $userId): Budget
    {
        return DB::transaction(function () use ($companyId, $budgetId, $userId) {
            $budget = Budget::where('company_id', $companyId)->lockForUpdate()->findOrFail($budgetId);
            if ($budget->status !== 'APPROVED') {
                throw new ConflictHttpException("Only APPROVED budgets can be activated.");
            }

            // Mark previous active budgets for the same fiscal year as CLOSED
            Budget::where('company_id', $companyId)
                ->where('fiscal_year_id', $budget->fiscal_year_id)
                ->where('status', 'ACTIVE')
                ->where('id', '!=', $budget->id)
                ->update(['status' => 'CLOSED']);

            $budget->status = 'ACTIVE';
            $budget->save();

            AuditLog::log($companyId, $userId, 'BUDGET_ACTIVATED', $budget->id, 'Budget', "Activated budget {$budget->name} v{$budget->version}");

            return $budget;
        });
    }

    public function closeBudget(int $companyId, int $budgetId, int $userId): Budget
    {
        $budget = Budget::where('company_id', $companyId)->findOrFail($budgetId);
        $budget->status = 'CLOSED';
        $budget->save();

        AuditLog::log($companyId, $userId, 'BUDGET_CLOSED', $budget->id, 'Budget', "Closed budget {$budget->name}");

        return $budget;
    }

    public function createRevisedVersion(int $companyId, int $budgetId, int $userId): Budget
    {
        return DB::transaction(function () use ($companyId, $budgetId, $userId) {
            $original = Budget::where('company_id', $companyId)->with('lines')->findOrFail($budgetId);

            $maxVersion = Budget::where('company_id', $companyId)
                ->where('fiscal_year_id', $original->fiscal_year_id)
                ->max('version') ?? 1;

            $revised = Budget::create([
                'company_id' => $companyId,
                'fiscal_year_id' => $original->fiscal_year_id,
                'name' => $original->name . ' (Rev ' . ($maxVersion + 1) . ')',
                'budget_type' => 'REVISED',
                'status' => 'DRAFT',
                'version' => $maxVersion + 1,
                'total_budgeted_amount' => $original->total_budgeted_amount,
                'notes' => "Revised from budget #{$original->id} v{$original->version}",
                'created_by' => $userId,
            ]);

            foreach ($original->lines as $line) {
                $revised->lines()->create([
                    'account_id' => $line->account_id,
                    'cost_centre_id' => $line->cost_centre_id,
                    'profit_centre_id' => $line->profit_centre_id,
                    'accounting_period_id' => $line->accounting_period_id,
                    'business_unit_id' => $line->business_unit_id,
                    'branch_id' => $line->branch_id,
                    'amount' => $line->amount,
                    'notes' => $line->notes,
                ]);
            }

            AuditLog::log($companyId, $userId, 'BUDGET_REVISED', $revised->id, 'Budget', "Created revised budget v{$revised->version} from #{$original->id}");

            return $revised->load('lines.account', 'lines.costCentre', 'lines.profitCentre');
        });
    }

    public function getBudgetVsActual(int $companyId, int $budgetId, array $filters = []): array
    {
        $budget = Budget::where('company_id', $companyId)->with(['lines.account', 'lines.costCentre', 'lines.profitCentre', 'lines.accountingPeriod'])->findOrFail($budgetId);

        $results = [];
        $totalBudgeted = 0;
        $totalActual = 0;

        foreach ($budget->lines as $line) {
            $accountId = $line->account_id;
            $account = $line->account;
            $accountType = $account ? $account->account_type : 'EXPENSE';

            // Query actual amounts from posted journals in this fiscal year
            $query = JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $budget, $filters) {
                $q->where('company_id', $companyId)
                    ->where('status', 'POSTED')
                    ->where('fiscal_year_id', $budget->fiscal_year_id);

                if (!empty($filters['start_date'])) {
                    $q->where('journal_date', '>=', $filters['start_date']);
                }
                if (!empty($filters['end_date'])) {
                    $q->where('journal_date', '<=', $filters['end_date']);
                }
            })->where('account_id', $accountId);

            if ($line->cost_centre_id) {
                $query->where('cost_centre_id', $line->cost_centre_id);
            }
            if ($line->profit_centre_id) {
                $query->where('profit_centre_id', $line->profit_centre_id);
            }
            if ($line->accounting_period_id) {
                $query->whereHas('journalEntry', function ($q) use ($line) {
                    $q->where('accounting_period_id', $line->accounting_period_id);
                });
            }

            $debitSum = (float) $query->sum('debit');
            $creditSum = (float) $query->sum('credit');

            // For Expense and Asset: net debit = debit - credit. For Revenue and Liability: net credit = credit - debit.
            if (in_array($accountType, ['EXPENSE', 'ASSET'])) {
                $actual = $debitSum - $creditSum;
            } else {
                $actual = $creditSum - $debitSum;
            }

            $budgeted = (float) $line->amount;
            $variance = $budgeted - $actual; // Positive means favorable (under budget for expense)
            $variancePercentage = $budgeted != 0 ? round(($variance / $budgeted) * 100, 2) : 0;
            $utilizationPercentage = $budgeted != 0 ? round(($actual / $budgeted) * 100, 2) : 0;

            $totalBudgeted += $budgeted;
            $totalActual += $actual;

            $results[] = [
                'line_id' => $line->id,
                'account_id' => $accountId,
                'account_code' => $account ? $account->account_code : '',
                'account_name' => $account ? $account->account_name : '',
                'account_type' => $accountType,
                'cost_centre_id' => $line->cost_centre_id,
                'cost_centre_name' => $line->costCentre ? $line->costCentre->name : null,
                'profit_centre_id' => $line->profit_centre_id,
                'profit_centre_name' => $line->profitCentre ? $line->profitCentre->name : null,
                'accounting_period' => $line->accountingPeriod ? $line->accountingPeriod->name : null,
                'budgeted_amount' => round($budgeted, 2),
                'actual_amount' => round($actual, 2),
                'variance_amount' => round($variance, 2),
                'variance_percentage' => $variancePercentage,
                'utilization_percentage' => $utilizationPercentage,
                'status' => $utilizationPercentage > 100 ? 'OVER_BUDGET' : ($utilizationPercentage >= 85 ? 'WARNING' : 'ON_TRACK'),
            ];
        }

        $totalVariance = $totalBudgeted - $totalActual;
        $totalVariancePercentage = $totalBudgeted != 0 ? round(($totalVariance / $totalBudgeted) * 100, 2) : 0;
        $totalUtilization = $totalBudgeted != 0 ? round(($totalActual / $totalBudgeted) * 100, 2) : 0;

        return [
            'budget' => [
                'id' => $budget->id,
                'name' => $budget->name,
                'fiscal_year_id' => $budget->fiscal_year_id,
                'version' => $budget->version,
                'status' => $budget->status,
                'total_budgeted' => round($totalBudgeted, 2),
                'total_actual' => round($totalActual, 2),
                'total_variance' => round($totalVariance, 2),
                'total_variance_percentage' => $totalVariancePercentage,
                'total_utilization' => $totalUtilization,
            ],
            'lines' => $results,
        ];
    }

    public function checkBudgetControl(int $companyId, int $accountId, ?int $costCentreId, float $additionalAmount): array
    {
        $controls = BudgetControl::where('company_id', $companyId)
            ->where('is_active', true)
            ->where(function ($q) use ($accountId, $costCentreId) {
                $q->where(function ($sub) use ($accountId) {
                    $sub->where('account_id', $accountId);
                })->orWhere(function ($sub) use ($costCentreId) {
                    if ($costCentreId) {
                        $sub->where('cost_centre_id', $costCentreId);
                    }
                })->orWhere(function ($sub) {
                    $sub->whereNull('account_id')->whereNull('cost_centre_id');
                });
            })
            ->get();

        if ($controls->isEmpty()) {
            return [
                'action' => 'ALLOW',
                'message' => 'No active budget controls applied.',
                'utilization' => 0,
                'threshold' => 100,
            ];
        }

        // Find active budget for current fiscal year
        $activeBudget = Budget::where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->first();

        if (!$activeBudget) {
            return [
                'action' => 'ALLOW',
                'message' => 'No active budget in effect.',
                'utilization' => 0,
                'threshold' => 100,
            ];
        }

        // Budget line amount for account
        $budgetLineAmount = (float) BudgetLine::where('budget_id', $activeBudget->id)
            ->where('account_id', $accountId)
            ->when($costCentreId, fn($q) => $q->where('cost_centre_id', $costCentreId))
            ->sum('amount');

        if ($budgetLineAmount <= 0) {
            return [
                'action' => 'ALLOW',
                'message' => 'No budget limit configured for this account.',
                'utilization' => 0,
                'threshold' => 100,
            ];
        }

        // Actual spent
        $actualSpent = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($companyId, $activeBudget) {
            $q->where('company_id', $companyId)
                ->where('status', 'POSTED')
                ->where('fiscal_year_id', $activeBudget->fiscal_year_id);
        })->where('account_id', $accountId)
        ->when($costCentreId, fn($q) => $q->where('cost_centre_id', $costCentreId))
        ->sum(DB::raw('debit - credit'));

        $projectedTotal = $actualSpent + $additionalAmount;
        $projectedUtilization = round(($projectedTotal / $budgetLineAmount) * 100, 2);

        foreach ($controls as $ctrl) {
            $threshold = (float) $ctrl->threshold_percentage;
            if ($projectedUtilization >= $threshold) {
                return [
                    'action' => $ctrl->control_action, // ALLOW, WARNING, APPROVAL_REQUIRED, BLOCK
                    'message' => "Budget limit exceeded: projected utilization is {$projectedUtilization}% (threshold: {$threshold}%).",
                    'utilization' => $projectedUtilization,
                    'threshold' => $threshold,
                    'control_id' => $ctrl->id,
                ];
            }
        }

        return [
            'action' => 'ALLOW',
            'message' => "Within budget. Projected utilization: {$projectedUtilization}%.",
            'utilization' => $projectedUtilization,
            'threshold' => 100,
        ];
    }
}
