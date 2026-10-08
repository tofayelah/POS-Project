import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { financeApi } from '../../api/finance';
import { TreasuryPosition, CashFlowForecast } from '../../types/finance';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Clock,
  Landmark,
  Coins,
  RefreshCw,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

export const CashTreasuryManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [treasury, setTreasury] = useState<TreasuryPosition | null>(null);
  const [forecastHorizon, setForecastHorizon] = useState<number>(30);
  const [forecast, setForecast] = useState<CashFlowForecast | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTreasuryAndForecast = async (horizon: number) => {
    try {
      setLoading(true);
      setError(null);
      const [treasRes, foreRes] = await Promise.all([
        financeApi.getTreasuryPositions(),
        financeApi.getCashForecast({ horizon_days: horizon }),
      ]);
      setTreasury(treasRes.data.data);
      setForecast(foreRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error loading treasury & cash forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasuryAndForecast(forecastHorizon);
  }, [forecastHorizon]);

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
            {t('finance.treasuryTitle', 'Cash & Treasury Management')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('finance.treasurySubtitle', 'Authoritative Cash Positions, Liquidity Burn Rate & Deterministic Projections')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={forecastHorizon}
            onChange={(e) => setForecastHorizon(Number(e.target.value))}
            className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 font-medium"
          >
            <option value={7}>7-Day Forecast</option>
            <option value={30}>30-Day Forecast</option>
            <option value={60}>60-Day Forecast</option>
            <option value={90}>90-Day Forecast</option>
          </select>
          <button
            onClick={() => fetchTreasuryAndForecast(forecastHorizon)}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Top Treasury KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('finance.liquidCash', 'Total Liquid Cash')}
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/40 rounded-lg text-emerald-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {formatBDT(treasury?.total_liquid_cash)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Instant liquid availability</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('finance.monthlyBurnRate', 'Monthly Burn Rate')}
            </span>
            <div className="p-2 bg-rose-50 dark:bg-rose-900/40 rounded-lg text-rose-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {formatBDT(treasury?.key_metrics?.monthly_burn_rate)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Operating expense outflow / mo</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('finance.cashRunway', 'Cash Runway')}
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {treasury?.key_metrics?.cash_runway_days ?? 0} {t('finance.days', 'Days')}
          </div>
          <p className="text-xs text-gray-500 mt-1">Based on current liquid reserves</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {forecastHorizon}-Day Net Flow
            </span>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/40 rounded-lg text-purple-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-bold mt-2 ${
            (forecast?.forecast_breakdown?.net_cash_flow ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatBDT(forecast?.forecast_breakdown?.net_cash_flow)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Proj. Closing: {formatBDT(forecast?.forecast_breakdown?.projected_closing_balance)}
          </p>
        </div>
      </div>

      {/* Account Balance Breakdown: Cash Vaults vs Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Physical Cash Vaults */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t('finance.cashVaults', 'Cash on Hand & Register Vaults')}
            </h3>
          </div>
          <div className="space-y-3">
            {!treasury?.breakdown?.cash_accounts || treasury.breakdown.cash_accounts.length === 0 ? (
              <p className="text-xs text-gray-400">No petty cash / cash accounts registered in GL.</p>
            ) : (
              treasury.breakdown.cash_accounts.map((c) => (
                <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{c.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{c.code}</div>
                  </div>
                  <div className="text-sm font-bold text-emerald-600">
                    {formatBDT(c.balance)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Commercial Bank Accounts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="w-5 h-5 text-blue-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t('finance.bankBalances', 'Commercial Bank Accounts')}
            </h3>
          </div>
          <div className="space-y-3">
            {!treasury?.breakdown?.bank_accounts || treasury.breakdown.bank_accounts.length === 0 ? (
              <p className="text-xs text-gray-400">No bank accounts configured.</p>
            ) : (
              treasury.breakdown.bank_accounts.map((b) => (
                <div key={b.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{b.bank_name}</div>
                    <div className="text-xs text-gray-500">{b.account_name} ({b.account_number})</div>
                  </div>
                  <div className="text-sm font-bold text-blue-600">
                    {formatBDT(b.balance)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cash Flow Forecast Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {forecastHorizon}-Day Cash Flow Forecast Schedule
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Deterministic daily inflows (AR due) and outflows (AP due & payroll)
            </p>
          </div>
          <div className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
            Opening Balance: {formatBDT(forecast?.opening_liquid_cash)}
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400 sticky top-0">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right text-emerald-600">Projected Inflow (AR)</th>
                <th className="px-6 py-3 text-right text-rose-600">Projected Outflow (AP/Pay)</th>
                <th className="px-6 py-3 text-right">Net Daily</th>
                <th className="px-6 py-3 text-right">Cumulative Liquid Cash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {!forecast?.daily_schedule || forecast.daily_schedule.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No scheduled cash flows for selected horizon.
                  </td>
                </tr>
              ) : (
                forecast.daily_schedule.map((day, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-3 font-mono text-xs">{day.date}</td>
                    <td className="px-6 py-3 text-right font-medium text-emerald-600">
                      {day.inflow > 0 ? formatBDT(day.inflow) : '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-rose-600">
                      {day.outflow > 0 ? formatBDT(day.outflow) : '—'}
                    </td>
                    <td className={`px-6 py-3 text-right font-bold ${
                      day.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {formatBDT(day.net)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-gray-900 dark:text-white">
                      {formatBDT(day.cumulative_balance)}
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
