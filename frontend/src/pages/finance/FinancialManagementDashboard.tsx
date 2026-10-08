import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useTranslation } from '../../i18n';
import { financeApi } from '../../api/finance';
import { ExecutiveTelemetry, TreasuryPosition } from '../../types/finance';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Scale,
  Building,
  Landmark,
  FileCheck2,
  CalendarCheck,
  Percent,
  RefreshCw,
  Coins,
  ChevronRight
} from 'lucide-react';

export const FinancialManagementDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [telemetry, setTelemetry] = useState<ExecutiveTelemetry | null>(null);
  const [treasury, setTreasury] = useState<TreasuryPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [telRes, treasRes] = await Promise.all([
        financeApi.getExecutiveTelemetry(),
        financeApi.getTreasuryPositions(),
      ]);

      setTelemetry(telRes.data.data);
      setTreasury(treasRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('common.errorLoadingData', 'Error loading financial dashboard metrics'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatBDT = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '৳0.00';
    return `৳${Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('finance.dashboardTitle', 'Advanced Financial Management Dashboard')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('finance.dashboardSubtitle', 'Executive Telemetry, Treasury, Budget Control & Period Governance')}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh', 'Refresh')}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Liquid Cash */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('finance.liquidCash', 'Total Liquid Cash')}
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatBDT(telemetry?.liquid_cash ?? treasury?.total_liquid_cash)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.vaultAndBank', 'Authoritative Cash & Bank Balances')}
            </p>
          </div>
        </div>

        {/* Cash Runway & Burn Rate */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('finance.cashRunway', 'Cash Runway')}
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {telemetry?.cash_runway_days ?? 0} {t('finance.days', 'Days')}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.monthlyBurn', 'Burn Rate')}: {formatBDT(telemetry?.burn_rate)} / mo
            </p>
          </div>
        </div>

        {/* Working Capital (AR - AP) */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('finance.workingCapital', 'Working Capital')}
            </span>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/40 rounded-lg text-purple-600 dark:text-purple-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatBDT(telemetry?.net_working_capital)}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>AR: {formatBDT(telemetry?.total_receivables)}</span>
              <span>AP: {formatBDT(telemetry?.total_payables)}</span>
            </div>
          </div>
        </div>

        {/* Current & Quick Ratio */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('finance.liquidityRatios', 'Liquidity Health')}
            </span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              CR: {Number(telemetry?.current_ratio ?? 0).toFixed(2)}x
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Quick Ratio: {Number(telemetry?.quick_ratio ?? 0).toFixed(2)}x | Net Margin: {Number(telemetry?.net_margin_pct ?? 0).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Operational Modules Navigation Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('finance.managementModules', 'Financial Management & Governance Modules')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Budgets & Variance */}
          <Link
            to="/finance/budgets"
            className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition">
                <Percent className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4">
              {t('finance.budgetManagement', 'Budget & Variance Analysis')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.budgetDesc', 'Cost-centre budget revisions, warning thresholds, hard stops & variance reporting.')}
            </p>
          </Link>

          {/* 2. Cash & Treasury */}
          <Link
            to="/finance/treasury"
            className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition">
                <Wallet className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4">
              {t('finance.treasuryManagement', 'Cash & Treasury Management')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.treasuryDesc', 'Deterministic 7/30/60/90-day cash flow forecast, burn rate & liquid vault positions.')}
            </p>
          </Link>

          {/* 3. Bank Accounts & Import */}
          <Link
            to="/finance/banks"
            className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-105 transition">
                <Landmark className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4">
              {t('finance.bankAccounts', 'Bank Accounts & Statement Import')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.bankDesc', 'Corporate bank accounts, electronic statement CSV parser & opening balance tracking.')}
            </p>
          </Link>

          {/* 4. Bank Reconciliation */}
          <Link
            to="/finance/bank-reconciliation"
            className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-cyan-500 dark:hover:border-cyan-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 bg-cyan-50 dark:bg-cyan-900/40 rounded-lg text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4">
              {t('finance.bankReconciliation', 'Bank Reconciliation Engine')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.reconDesc', 'Automated exact, reference, and date-window matching with statement line audit.')}
            </p>
          </Link>

          {/* 5. Period Soft-Lock & Year-End Close */}
          <Link
            to="/finance/periods"
            className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-amber-500 dark:hover:border-amber-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400 group-hover:scale-105 transition">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4">
              {t('finance.periodClosing', 'Period Close & Year-End Closing')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.periodDesc', 'Period soft-lock, pre-close validation, retained earnings clearing & privileged reopen.')}
            </p>
          </Link>

          {/* 6. Cost & Profit Centres */}
          <Link
            to="/finance/centres"
            className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 bg-violet-50 dark:bg-violet-900/40 rounded-lg text-violet-600 dark:text-violet-400 group-hover:scale-105 transition">
                <Building className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4">
              {t('finance.costProfitCentres', 'Cost & Profit Centres')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.centresDesc', 'Department hierarchies, contribution margins, and business unit profitability.')}
            </p>
          </Link>

          {/* 7. Advanced AR Aging */}
          <Link
            to="/finance/ar"
            className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-teal-500 dark:hover:border-teal-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 bg-teal-50 dark:bg-teal-900/40 rounded-lg text-teal-600 dark:text-teal-400 group-hover:scale-105 transition">
                <ArrowDownRight className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4">
              {t('finance.advancedAr', 'Advanced AR & Collections')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.arDesc', 'Multi-tier aging buckets, collection priority scoring & GL subledger reconciliation.')}
            </p>
          </Link>

          {/* 8. Advanced AP Management */}
          <Link
            to="/finance/ap"
            className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-rose-500 dark:hover:border-rose-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 bg-rose-50 dark:bg-rose-900/40 rounded-lg text-rose-600 dark:text-rose-400 group-hover:scale-105 transition">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4">
              {t('finance.advancedAp', 'Advanced AP & Payment Scheduling')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.apDesc', 'Supplier payables aging, cash outflow forecast schedules & trade payables control.')}
            </p>
          </Link>

          {/* 9. Fixed Assets */}
          <Link
            to="/finance/fixed-assets"
            className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-orange-500 dark:hover:border-orange-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/40 rounded-lg text-orange-600 dark:text-orange-400 group-hover:scale-105 transition">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4">
              {t('finance.fixedAssets', 'Fixed Assets & Depreciation')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.assetsDesc', 'Straight-line monthly depreciation runs, net book value & asset disposal gain/loss.')}
            </p>
          </Link>

          {/* 10. Financial Reports & Ratios */}
          <Link
            to="/finance/analytics"
            className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-pink-500 dark:hover:border-pink-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 bg-pink-50 dark:bg-pink-900/40 rounded-lg text-pink-600 dark:text-pink-400 group-hover:scale-105 transition">
                <Scale className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4">
              {t('finance.financialRatios', 'Financial Ratios & DuPont Analysis')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('finance.ratiosDesc', 'Profitability, liquidity, leverage, efficiency & deterministic 12-month projections.')}
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};
