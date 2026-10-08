import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Scale,
  RefreshCw,
  FileSpreadsheet,
  PieChart,
  BarChart3,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { FinanceBiData } from '../../types/bi';
import { formatCurrency, formatNumber } from '../../utils/format';

export const FinanceBI: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<FinanceBiData | null>(null);

  useEffect(() => {
    loadFinanceBi();
  }, []);

  const loadFinanceBi = async () => {
    setLoading(true);
    try {
      const resp = await biApi.getFinanceBi();
      setData(resp.data.data);
    } catch (err) {
      console.error('Failed to load Finance BI', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const resp = await biApi.exportReport({
        dataset: 'finance',
        dimensions: ['account_name'],
        metrics: ['debit_total', 'credit_total', 'net_balance'],
        format: 'csv',
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `finance_bi_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  const telem = data?.telemetry;
  const dupont = data?.dupont_analysis;
  const cf = data?.cash_flow_summary;
  const bva = data?.budget_vs_actual;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bi.financeBi')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('bi.subtitle')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadFinanceBi}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {t('bi.exportCsv')}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* Executive Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.cashBalance')} & Bank
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(telem?.cash_and_bank || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Runway: <span className="font-semibold text-gray-900 dark:text-white">{telem?.cash_runway_days || 0} days</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.workingCapital')}
              </span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(telem?.net_working_capital || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.currentRatio')}
              </span>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {telem?.current_ratio || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Quick Ratio: <span className="font-semibold text-gray-900 dark:text-white">{telem?.quick_ratio || 0}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('bi.netProfit')}
              </span>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                {formatCurrency(telem?.net_profit || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Net Margin: <span className="font-semibold text-gray-900 dark:text-white">{telem?.net_margin_pct || 0}%</span>
              </div>
            </div>
          </div>

          {/* DuPont Analysis & Cash Flow Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DuPont 3-Stage Model */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                DuPont ROE Decomposition (3-Stage)
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Return on Equity (ROE) = Net Profit Margin × Asset Turnover × Financial Leverage
              </p>

              <div className="grid grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-750 p-4 rounded-xl text-center border border-gray-100 dark:border-gray-700">
                <div>
                  <div className="text-xs text-gray-500 font-medium">Net Profit Margin</div>
                  <div className="text-lg font-bold text-indigo-600 mt-1">
                    {dupont?.net_profit_margin_pct || 0}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Asset Turnover</div>
                  <div className="text-lg font-bold text-blue-600 mt-1">
                    {dupont?.asset_turnover || 0}x
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Equity Multiplier</div>
                  <div className="text-lg font-bold text-purple-600 mt-1">
                    {dupont?.equity_multiplier || 0}x
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Comprehensive Return on Equity (ROE)
                </span>
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {dupont?.roe_pct || 0}%
                </span>
              </div>
            </div>

            {/* Cash Flow Summary */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Cash Flow Statement Summary
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Authoritative cash movement across operating, investing, and financing activities.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-750">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Operating Activities</span>
                  <span className={`text-sm font-bold ${cf?.operating_cash_flow && cf.operating_cash_flow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(cf?.operating_cash_flow || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-750">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Investing Activities</span>
                  <span className={`text-sm font-bold ${cf?.investing_cash_flow && cf.investing_cash_flow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(cf?.investing_cash_flow || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-750">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Financing Activities</span>
                  <span className={`text-sm font-bold ${cf?.financing_cash_flow && cf.financing_cash_flow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(cf?.financing_cash_flow || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Net Cash Flow</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(cf?.net_cash_flow || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Budget vs Actual & Forecast */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget vs Actual */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Budget vs Actual Performance
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Total Budgeted Expense:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(bva?.total_budgeted || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Actual Realized Expense:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(bva?.total_actual || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Variance:</span>
                  <span className={`font-bold ${bva?.favorable ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(bva?.variance || 0)} ({bva?.variance_pct || 0}%)
                    <span className="ml-1 text-xs">[{bva?.favorable ? 'Favorable' : 'Unfavorable'}]</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 6-Month Rolling Forecast */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-500" />
                6-Month Rolling Revenue Forecast
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">{t('common.month')}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actual Sales</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Forecast Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data?.forecast && data.forecast.length > 0 ? (
                      data.forecast.map((f, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{f.month}</td>
                          <td className="py-2.5 px-3 text-right">{f.actual_sales ? formatCurrency(f.actual_sales) : '-'}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-indigo-600">{formatCurrency(f.forecast_sales)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-gray-500">
                          {t('common.noData')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
