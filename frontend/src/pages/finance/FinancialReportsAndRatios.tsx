import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { financeApi } from '../../api/finance';
import { FinancialRatios } from '../../types/finance';
import {
  Scale,
  RefreshCw,
  TrendingUp,
  Percent,
  Coins,
  ShieldAlert,
  BarChart2,
  PieChart,
  Activity,
  Layers
} from 'lucide-react';

export const FinancialReportsAndRatios: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [ratios, setRatios] = useState<FinancialRatios | null>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ratRes, foreRes] = await Promise.all([
        financeApi.getFinancialRatios(),
        financeApi.getFinancialForecasting(),
      ]);
      setRatios(ratRes.data.data);
      setForecast(foreRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error loading financial ratios & forecasting');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatBDT = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '৳0.00';
    return `৳${Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('finance.analyticsTitle', 'Financial Analytics, DuPont Model & Forecasting')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('finance.analyticsSubtitle', 'Executive Health Ratios, DuPont ROE Decomposition & 12-Month Deterministic Trends')}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
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

      {/* 1. DuPont Analysis 3-Factor Decomposition Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-xl p-6 shadow-md">
        <div className="flex items-center justify-between border-b border-indigo-700/50 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-300" />
            <h2 className="text-base font-bold tracking-wide">
              DuPont Analysis (ROE 3-Factor Decomposition)
            </h2>
          </div>
          <span className="text-xs bg-indigo-700/60 px-3 py-1 rounded-full font-mono">
            Return on Equity (ROE): {Number(ratios?.dupont_analysis?.roe_pct ?? 0).toFixed(2)}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
            <span className="text-xs font-semibold text-indigo-200 uppercase">1. Profitability Factor</span>
            <div className="text-2xl font-bold mt-2 font-mono">
              {Number(ratios?.dupont_analysis?.net_profit_margin_pct ?? 0).toFixed(2)}%
            </div>
            <p className="text-xs text-indigo-200 mt-1">Net Profit Margin (Profitability)</p>
          </div>

          <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
            <span className="text-xs font-semibold text-indigo-200 uppercase">2. Efficiency Factor</span>
            <div className="text-2xl font-bold mt-2 font-mono">
              {Number(ratios?.dupont_analysis?.asset_turnover ?? 0).toFixed(2)}x
            </div>
            <p className="text-xs text-indigo-200 mt-1">Asset Turnover (Asset Efficiency)</p>
          </div>

          <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
            <span className="text-xs font-semibold text-indigo-200 uppercase">3. Financial Leverage</span>
            <div className="text-2xl font-bold mt-2 font-mono">
              {Number(ratios?.dupont_analysis?.equity_multiplier ?? 1).toFixed(2)}x
            </div>
            <p className="text-xs text-indigo-200 mt-1">Equity Multiplier (Financial Gearing)</p>
          </div>
        </div>
      </div>

      {/* Ratio Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Profitability */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <TrendingUp className="w-4 h-4" />
            <h3>Profitability Margins</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Gross Margin:</span>
              <span className="font-bold text-gray-900 dark:text-white">{Number(ratios?.profitability?.gross_profit_margin_pct ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Operating Margin:</span>
              <span className="font-bold text-gray-900 dark:text-white">{Number(ratios?.profitability?.operating_profit_margin_pct ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Net Profit Margin:</span>
              <span className="font-bold text-emerald-600">{Number(ratios?.profitability?.net_profit_margin_pct ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Return on Assets (ROA):</span>
              <span className="font-bold text-gray-900 dark:text-white">{Number(ratios?.profitability?.return_on_assets_pct ?? 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Liquidity */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
            <Coins className="w-4 h-4" />
            <h3>Liquidity Ratios</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Current Ratio:</span>
              <span className="font-bold text-gray-900 dark:text-white">{Number(ratios?.liquidity?.current_ratio ?? 0).toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Quick Ratio (Acid-Test):</span>
              <span className="font-bold text-gray-900 dark:text-white">{Number(ratios?.liquidity?.quick_ratio ?? 0).toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cash Ratio:</span>
              <span className="font-bold text-blue-600">{Number(ratios?.liquidity?.cash_ratio ?? 0).toFixed(2)}x</span>
            </div>
          </div>
        </div>

        {/* Leverage */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
            <Scale className="w-4 h-4" />
            <h3>Solvency & Leverage</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Debt to Equity (D/E):</span>
              <span className="font-bold text-gray-900 dark:text-white">{Number(ratios?.leverage?.debt_to_equity ?? 0).toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Debt to Assets:</span>
              <span className="font-bold text-gray-900 dark:text-white">{Number(ratios?.leverage?.debt_to_assets ?? 0).toFixed(2)}x</span>
            </div>
          </div>
        </div>

        {/* Efficiency */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <Activity className="w-4 h-4" />
            <h3>Working Capital Turnover</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Receivables Turnover:</span>
              <span className="font-bold text-gray-900 dark:text-white">{Number(ratios?.efficiency?.receivables_turnover ?? 0).toFixed(1)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Days Sales Outstanding (DSO):</span>
              <span className="font-bold text-amber-600">{Number(ratios?.efficiency?.days_sales_outstanding ?? 0).toFixed(0)} Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* 12-Month Deterministic Financial Forecast Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              12-Month Deterministic Financial Projections
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Linear trend growth forecast based on trailing sales, margins and historical burn rates
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Projected Revenue</th>
                <th className="px-4 py-3 text-right">Projected Expenses</th>
                <th className="px-4 py-3 text-right">Operating Profit</th>
                <th className="px-4 py-3 text-right">Projected Cash Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {!forecast?.months || forecast.months.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-gray-400">
                    No historical trend data available to project future periods.
                  </td>
                </tr>
              ) : (
                forecast.months.map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white font-mono text-xs">
                      {m.period_name || `Month +${idx + 1}`}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600 font-mono text-xs">
                      {formatBDT(m.projected_revenue)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-rose-600 font-mono text-xs">
                      {formatBDT(m.projected_expense)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600 font-mono text-xs">
                      {formatBDT(m.projected_operating_profit)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white font-mono text-xs">
                      {formatBDT(m.projected_closing_cash)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
