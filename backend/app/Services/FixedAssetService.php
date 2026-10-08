<?php

namespace App\Services;

use App\Models\FixedAsset;
use App\Models\FixedAssetCategory;
use App\Models\AssetDepreciationEntry;
use App\Models\AssetDisposal;
use App\Models\AccountingPeriod;
use App\Models\Account;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Carbon\Carbon;

class FixedAssetService
{
    protected AccountingService $accountingService;

    public function __construct(AccountingService $accountingService)
    {
        $this->accountingService = $accountingService;
    }

    public function createCategory(int $companyId, array $data): FixedAssetCategory
    {
        $existing = FixedAssetCategory::where('company_id', $companyId)->where('code', $data['code'])->first();
        if ($existing) {
            throw new ConflictHttpException("Asset category with code {$data['code']} already exists.");
        }

        return FixedAssetCategory::create([
            'company_id' => $companyId,
            'code' => $data['code'],
            'name' => $data['name'],
            'depreciation_method' => $data['depreciation_method'] ?? 'STRAIGHT_LINE',
            'useful_life_months' => $data['useful_life_months'] ?? 60,
            'asset_account_id' => $data['asset_account_id'],
            'accumulated_depreciation_account_id' => $data['accumulated_depreciation_account_id'],
            'depreciation_expense_account_id' => $data['depreciation_expense_account_id'],
            'status' => 'ACTIVE',
        ]);
    }

    public function registerAsset(int $companyId, array $data, int $userId): FixedAsset
    {
        $existing = FixedAsset::where('company_id', $companyId)->where('asset_code', $data['asset_code'])->first();
        if ($existing) {
            throw new ConflictHttpException("Asset with code {$data['asset_code']} already exists.");
        }

        $category = FixedAssetCategory::where('company_id', $companyId)->findOrFail($data['category_id']);

        $asset = FixedAsset::create([
            'company_id' => $companyId,
            'category_id' => $category->id,
            'asset_code' => $data['asset_code'],
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'purchase_date' => $data['purchase_date'],
            'purchase_cost' => (float) $data['purchase_cost'],
            'residual_value' => (float) ($data['residual_value'] ?? 0),
            'useful_life_months' => (int) ($data['useful_life_months'] ?? $category->useful_life_months),
            'depreciation_method' => $data['depreciation_method'] ?? $category->depreciation_method,
            'location' => $data['location'] ?? null,
            'custodian' => $data['custodian'] ?? null,
            'asset_account_id' => $data['asset_account_id'] ?? $category->asset_account_id,
            'accumulated_depreciation_account_id' => $data['accumulated_depreciation_account_id'] ?? $category->accumulated_depreciation_account_id,
            'depreciation_expense_account_id' => $data['depreciation_expense_account_id'] ?? $category->depreciation_expense_account_id,
            'cost_centre_id' => $data['cost_centre_id'] ?? null,
            'status' => 'ACTIVE',
            'created_by' => $userId,
        ]);

        AuditLog::log($companyId, $userId, 'FIXED_ASSET_REGISTERED', $asset->id, 'FixedAsset', "Registered asset {$asset->asset_code} - {$asset->name}");

        return $asset->load('category', 'assetAccount', 'accumulatedDepreciationAccount', 'depreciationExpenseAccount', 'costCentre');
    }

    public function runDepreciation(int $companyId, ?int $periodId, string $depreciationDate, int $userId): array
    {
        return DB::transaction(function () use ($companyId, $periodId, $depreciationDate, $userId) {
            // Check period if provided
            if ($periodId) {
                $period = AccountingPeriod::where('company_id', $companyId)->findOrFail($periodId);
                if ($period->status !== 'OPEN') {
                    throw new ConflictHttpException("Cannot run depreciation in {$period->status} period.");
                }
            }

            $assets = FixedAsset::where('company_id', $companyId)
                ->whereIn('status', ['ACTIVE', 'DEPRECIATING'])
                ->where('purchase_date', '<=', $depreciationDate)
                ->get();

            $processedEntries = [];
            $totalDepreciationRun = 0;

            foreach ($assets as $asset) {
                $cost = (float) $asset->purchase_cost;
                $residual = (float) $asset->residual_value;
                $usefulMonths = (int) $asset->useful_life_months;

                if ($usefulMonths <= 0 || $cost <= $residual) {
                    continue;
                }

                $accumBefore = (float) $asset->depreciationEntries()->sum('depreciation_amount');
                $maxDepreciable = $cost - $residual;
                $remainingDepreciable = max(0, $maxDepreciable - $accumBefore);

                if ($remainingDepreciable <= 0.01) {
                    $asset->status = 'FULLY_DEPRECIATED';
                    $asset->save();
                    continue;
                }

                // Monthly straight-line amount
                $monthlyDepreciation = round($maxDepreciable / $usefulMonths, 4);
                $depreciationAmount = min($monthlyDepreciation, $remainingDepreciable);

                if ($depreciationAmount <= 0) continue;

                $accumAfter = $accumBefore + $depreciationAmount;
                $bookValueAfter = $cost - $accumAfter;

                // Post balanced depreciation journal via canonical accounting service
                $journalData = [
                    'journal_date' => $depreciationDate,
                    'description' => "Depreciation for Asset {$asset->asset_code}: {$asset->name}",
                    'reference_type' => 'FIXED_ASSET_DEPRECIATION',
                    'reference_id' => $asset->id,
                    'source' => 'SYSTEM',
                    'idempotency_key' => "DEPR-{$asset->id}-{$depreciationDate}",
                    'lines' => [
                        [
                            'account_id' => $asset->depreciation_expense_account_id,
                            'debit' => $depreciationAmount,
                            'credit' => 0,
                            'cost_centre_id' => $asset->cost_centre_id,
                            'description' => "Depreciation Expense: {$asset->name}",
                        ],
                        [
                            'account_id' => $asset->accumulated_depreciation_account_id,
                            'debit' => 0,
                            'credit' => $depreciationAmount,
                            'cost_centre_id' => $asset->cost_centre_id,
                            'description' => "Accumulated Depreciation: {$asset->name}",
                        ],
                    ],
                ];

                $journal = $this->accountingService->postAutomatedJournal($companyId, $journalData, $userId);

                $entry = AssetDepreciationEntry::create([
                    'company_id' => $companyId,
                    'fixed_asset_id' => $asset->id,
                    'accounting_period_id' => $periodId,
                    'depreciation_date' => $depreciationDate,
                    'depreciation_amount' => $depreciationAmount,
                    'accumulated_depreciation_before' => $accumBefore,
                    'accumulated_depreciation_after' => $accumAfter,
                    'book_value_after' => $bookValueAfter,
                    'journal_entry_id' => $journal->id,
                    'posted_by' => $userId,
                ]);

                if ($bookValueAfter <= $residual + 0.01) {
                    $asset->status = 'FULLY_DEPRECIATED';
                } else {
                    $asset->status = 'DEPRECIATING';
                }
                $asset->save();

                $totalDepreciationRun += $depreciationAmount;
                $processedEntries[] = [
                    'asset_id' => $asset->id,
                    'asset_code' => $asset->asset_code,
                    'depreciation_amount' => round($depreciationAmount, 2),
                    'accumulated_depreciation' => round($accumAfter, 2),
                    'book_value' => round($bookValueAfter, 2),
                    'journal_id' => $journal->id,
                ];
            }

            AuditLog::log($companyId, $userId, 'DEPRECIATION_RUN', null, 'FixedAsset', "Executed depreciation run on {$depreciationDate}. Total: {$totalDepreciationRun}");

            return [
                'depreciation_date' => $depreciationDate,
                'total_depreciation' => round($totalDepreciationRun, 2),
                'processed_assets_count' => count($processedEntries),
                'entries' => $processedEntries,
            ];
        });
    }

    public function disposeAsset(int $companyId, int $assetId, array $data, int $userId): AssetDisposal
    {
        return DB::transaction(function () use ($companyId, $assetId, $data, $userId) {
            $asset = FixedAsset::where('company_id', $companyId)->lockForUpdate()->findOrFail($assetId);

            if ($asset->status === 'DISPOSED') {
                throw new ConflictHttpException("Asset {$asset->asset_code} is already disposed.");
            }

            $cost = (float) $asset->purchase_cost;
            $accum = (float) $asset->depreciationEntries()->sum('depreciation_amount');
            $bookValue = max(0, $cost - $accum);
            $proceeds = (float) ($data['sale_proceeds'] ?? 0);
            $disposalDate = $data['disposal_date'] ?? date('Y-m-d');
            $gainLoss = $proceeds - $bookValue; // Positive = Gain, Negative = Loss

            // Find or use provided settlement Cash/Bank account and Gain/Loss account
            $settlementAccountId = $data['settlement_account_id'] ?? null;
            if (!$settlementAccountId && $proceeds > 0) {
                $cashAcc = Account::where('company_id', $companyId)->where('account_code', '1010')->first();
                $settlementAccountId = $cashAcc ? $cashAcc->id : null;
            }

            // Construct Balanced Disposal Journal
            // Lines:
            // 1. DR Accumulated Depreciation ($accum)
            // 2. CR Asset Cost Account ($cost)
            // 3. DR Cash/Bank if proceeds > 0
            // 4. DR Loss on Disposal (if gainLoss < 0) OR CR Gain on Disposal (if gainLoss > 0)
            $disposalLines = [];

            if ($accum > 0) {
                $disposalLines[] = [
                    'account_id' => $asset->accumulated_depreciation_account_id,
                    'debit' => $accum,
                    'credit' => 0,
                    'description' => "Clear Accumulated Depreciation for {$asset->name}",
                ];
            }

            $disposalLines[] = [
                'account_id' => $asset->asset_account_id,
                'debit' => 0,
                'credit' => $cost,
                'description' => "Remove Fixed Asset Cost for {$asset->name}",
            ];

            if ($proceeds > 0 && $settlementAccountId) {
                $disposalLines[] = [
                    'account_id' => $settlementAccountId,
                    'debit' => $proceeds,
                    'credit' => 0,
                    'description' => "Proceeds from disposal of {$asset->name}",
                ];
            }

            if (abs($gainLoss) > 0.0001) {
                // Find or use Gain / Loss account
                if ($gainLoss > 0) {
                    $gainAcc = Account::where('company_id', $companyId)
                        ->where(function ($q) {
                            $q->where('account_code', '4900')
                              ->orWhere('account_name', 'ilike', '%gain on asset%')
                              ->orWhere('account_type', 'REVENUE');
                        })->first();
                    $gainAccId = $data['gain_loss_account_id'] ?? ($gainAcc ? $gainAcc->id : $asset->depreciation_expense_account_id);

                    $disposalLines[] = [
                        'account_id' => $gainAccId,
                        'debit' => 0,
                        'credit' => $gainLoss,
                        'description' => "Gain on Disposal of {$asset->name}",
                    ];
                } else {
                    $lossAcc = Account::where('company_id', $companyId)
                        ->where(function ($q) {
                            $q->where('account_code', '5900')
                              ->orWhere('account_name', 'ilike', '%loss on asset%')
                              ->orWhere('account_type', 'EXPENSE');
                        })->first();
                    $lossAccId = $data['gain_loss_account_id'] ?? ($lossAcc ? $lossAcc->id : $asset->depreciation_expense_account_id);

                    $disposalLines[] = [
                        'account_id' => $lossAccId,
                        'debit' => abs($gainLoss),
                        'credit' => 0,
                        'description' => "Loss on Disposal of {$asset->name}",
                    ];
                }
            }

            $journal = null;
            if (count($disposalLines) >= 2) {
                $journalData = [
                    'journal_date' => $disposalDate,
                    'description' => "Disposal of Asset {$asset->asset_code}: {$asset->name}",
                    'reference_type' => 'FIXED_ASSET_DISPOSAL',
                    'reference_id' => $asset->id,
                    'source' => 'SYSTEM',
                    'idempotency_key' => "DISP-{$asset->id}-" . time(),
                    'lines' => $disposalLines,
                ];

                $journal = $this->accountingService->postAutomatedJournal($companyId, $journalData, $userId);
            }

            $asset->status = 'DISPOSED';
            $asset->save();

            $disposal = AssetDisposal::create([
                'company_id' => $companyId,
                'fixed_asset_id' => $asset->id,
                'disposal_date' => $disposalDate,
                'asset_cost' => $cost,
                'accumulated_depreciation' => $accum,
                'book_value' => $bookValue,
                'sale_proceeds' => $proceeds,
                'gain_loss_amount' => $gainLoss,
                'journal_entry_id' => $journal ? $journal->id : null,
                'notes' => $data['notes'] ?? null,
                'disposed_by' => $userId,
            ]);

            AuditLog::log($companyId, $userId, 'FIXED_ASSET_DISPOSED', $disposal->id, 'AssetDisposal', "Disposed asset {$asset->asset_code}. Proceeds: {$proceeds}, Gain/Loss: {$gainLoss}");

            return $disposal->load('fixedAsset', 'journalEntry.lines');
        });
    }
}
