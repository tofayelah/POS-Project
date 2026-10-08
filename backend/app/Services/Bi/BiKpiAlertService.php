<?php

namespace App\Services\Bi;

use App\Models\BiAlert;
use App\Models\User;
use Carbon\Carbon;

class BiKpiAlertService
{
    public function __construct(
        protected BiAnalyticsService $biAnalytics
    ) {}

    /**
     * Evaluate alert conditions and synchronize active alerts.
     */
    public function evaluateAlerts(int $companyId): array
    {
        $dashboard = $this->biAnalytics->getExecutiveDashboard($companyId);
        $inventory = $this->biAnalytics->getInventoryBi($companyId);
        $customer = $this->biAnalytics->getCustomerBi($companyId);
        $finance = $this->biAnalytics->getFinanceBi($companyId);

        $now = Carbon::now();
        $generatedAlerts = [];

        // 1. Gross Margin % Check
        $grossMargin = (float) ($dashboard['primary_kpis']['gross_margin_pct'] ?? 0);
        if ($dashboard['primary_kpis']['revenue'] > 0) {
            if ($grossMargin < 5.0) {
                $generatedAlerts[] = $this->upsertAlert($companyId, [
                    'code' => 'CRIT_LOW_GROSS_MARGIN',
                    'title' => 'Critical: Low Gross Margin',
                    'metric' => 'gross_margin_pct',
                    'severity' => 'CRITICAL',
                    'threshold_type' => 'MIN',
                    'threshold_value' => 5.0,
                    'current_value' => $grossMargin,
                    'message' => "Gross margin has dropped to {$grossMargin}%, which is below the 5% critical threshold.",
                ]);
            } elseif ($grossMargin < 15.0) {
                $generatedAlerts[] = $this->upsertAlert($companyId, [
                    'code' => 'WARN_LOW_GROSS_MARGIN',
                    'title' => 'Warning: Sub-optimal Gross Margin',
                    'metric' => 'gross_margin_pct',
                    'severity' => 'WARNING',
                    'threshold_type' => 'MIN',
                    'threshold_value' => 15.0,
                    'current_value' => $grossMargin,
                    'message' => "Gross margin is currently {$grossMargin}%, below the recommended 15% target.",
                ]);
            }
        }

        // 2. Dead Stock Value Check
        $totalInvVal = (float) ($inventory['summary']['total_valuation'] ?? 0);
        $deadStockVal = (float) ($inventory['summary']['dead_stock_value'] ?? 0);
        $deadStockPct = $totalInvVal > 0 ? round(($deadStockVal / $totalInvVal) * 100, 2) : 0.0;
        if ($deadStockPct > 10.0) {
            $generatedAlerts[] = $this->upsertAlert($companyId, [
                'code' => 'WARN_DEAD_STOCK_SPIKE',
                'title' => 'Warning: High Dead Stock Volume',
                'metric' => 'dead_stock_pct',
                'severity' => 'WARNING',
                'threshold_type' => 'MAX',
                'threshold_value' => 10.0,
                'current_value' => $deadStockPct,
                'message' => "Dead stock represents {$deadStockPct}% of total inventory value (৳{$deadStockVal}).",
            ]);
        }

        // 3. Low Stock / Stockout Count Check
        $lowStockCount = (int) ($inventory['summary']['low_stock_items'] ?? 0);
        if ($lowStockCount > 0) {
            $generatedAlerts[] = $this->upsertAlert($companyId, [
                'code' => 'WARN_LOW_STOCK_ITEMS',
                'title' => 'Attention: Items Below Reorder Point',
                'metric' => 'low_stock_items',
                'severity' => 'WARNING',
                'threshold_type' => 'MAX',
                'threshold_value' => 0,
                'current_value' => $lowStockCount,
                'message' => "{$lowStockCount} product(s) are currently at or below their reorder threshold.",
            ]);
        }

        // 4. Overdue AR Check
        $totalAr = (float) ($customer['ar_aging']['total_ar'] ?? 0);
        $overdueAr = (float) (($customer['ar_aging']['61_90'] ?? 0) + ($customer['ar_aging']['91_plus'] ?? 0));
        $overdueArPct = $totalAr > 0 ? round(($overdueAr / $totalAr) * 100, 2) : 0.0;
        if ($overdueArPct > 25.0) {
            $generatedAlerts[] = $this->upsertAlert($companyId, [
                'code' => 'WARN_OVERDUE_RECEIVABLES',
                'title' => 'Warning: High Overdue Accounts Receivable',
                'metric' => 'overdue_ar_pct',
                'severity' => 'WARNING',
                'threshold_type' => 'MAX',
                'threshold_value' => 25.0,
                'current_value' => $overdueArPct,
                'message' => "Overdue receivables (>60 days) account for {$overdueArPct}% of outstanding AR (৳{$overdueAr}).",
            ]);
        }

        // 5. Cash Runway Check
        $cashRunwayDays = (float) ($finance['telemetry']['cash_runway_days'] ?? 0);
        if ($cashRunwayDays > 0 && $cashRunwayDays < 30.0) {
            $generatedAlerts[] = $this->upsertAlert($companyId, [
                'code' => 'CRIT_CASH_RUNWAY_SHORT',
                'title' => 'Critical: Short Cash Runway',
                'metric' => 'cash_runway_days',
                'severity' => 'CRITICAL',
                'threshold_type' => 'MIN',
                'threshold_value' => 30.0,
                'current_value' => $cashRunwayDays,
                'message' => "Estimated cash runway is {$cashRunwayDays} days, falling below safety reserves.",
            ]);
        }

        return $this->getActiveAlerts($companyId);
    }

    /**
     * Upsert an alert without overwriting ACKNOWLEDGED status unless resolved.
     */
    protected function upsertAlert(int $companyId, array $data): BiAlert
    {
        $existing = BiAlert::where('company_id', $companyId)
            ->where('code', $data['code'])
            ->where('status', '!=', 'RESOLVED')
            ->first();

        if ($existing) {
            $existing->update([
                'current_value' => $data['current_value'],
                'message' => $data['message'],
                'severity' => $data['severity'],
            ]);
            return $existing;
        }

        return BiAlert::create(array_merge($data, [
            'company_id' => $companyId,
            'status' => 'ACTIVE',
        ]));
    }

    /**
     * Get list of alerts for company.
     */
    public function getActiveAlerts(int $companyId, ?string $severity = null): array
    {
        $query = BiAlert::where('company_id', $companyId)
            ->where('status', '!=', 'RESOLVED')
            ->orderByRaw("CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END")
            ->orderByDesc('created_at');

        if ($severity) {
            $query->where('severity', strtoupper($severity));
        }

        return $query->get()->toArray();
    }

    /**
     * Acknowledge an alert.
     */
    public function acknowledgeAlert(int $companyId, int $alertId, ?int $userId = null): BiAlert
    {
        $alert = BiAlert::where('company_id', $companyId)->findOrFail($alertId);
        $alert->update([
            'status' => 'ACKNOWLEDGED',
            'acknowledged_at' => Carbon::now(),
            'acknowledged_by' => $userId,
        ]);

        return $alert;
    }

    /**
     * Resolve an alert.
     */
    public function resolveAlert(int $companyId, int $alertId): BiAlert
    {
        $alert = BiAlert::where('company_id', $companyId)->findOrFail($alertId);
        $alert->update([
            'status' => 'RESOLVED',
            'resolved_at' => Carbon::now(),
        ]);

        return $alert;
    }
}
