import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { taxApi } from '../../api/tax';
import { VatSummaryReport, TaxPeriod, TaxProfile } from '../../types/tax';
import { 
  Building2 as BuildingLibraryIcon, 
  FileText as DocumentChartBarIcon, 
  Scale as ScaleIcon, 
  Calendar as CalendarIcon, 
  CheckCircle as CheckCircleIcon,
  AlertTriangle as ExclamationTriangleIcon,
  RefreshCw as ArrowPathIcon
} from 'lucide-react';

export const TaxDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<TaxProfile | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<TaxPeriod | null>(null);
  const [summary, setSummary] = useState<VatSummaryReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [profRes, periodRes] = await Promise.all([
        taxApi.getProfile(),
        taxApi.getCurrentPeriod(),
      ]);

      setProfile(profRes.data.data);
      setCurrentPeriod(periodRes.data.data);

      const periodId = periodRes.data.data?.id;
      const sumRes = await taxApi.getVatSummary({ tax_period_id: periodId });
      setSummary(sumRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('common.errorLoadingData', 'Error loading dashboard metrics'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('tax.dashboardTitle', 'Bangladesh VAT & Tax Compliance Dashboard')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('tax.dashboardSubtitle', 'NBR Statutory Position, Mushak Foundation & General Ledger Reconciliation')}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh', 'Refresh')}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Taxpayer Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
            <BuildingLibraryIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('tax.taxpayerProfile', 'Taxpayer Profile')}
            </h3>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              {profile?.trade_name || t('tax.unconfigured', 'Not Configured')}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              BIN: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{profile?.bin || '—'}</span>
            </p>
            <p className="text-xs text-gray-500">
              TIN: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{profile?.tin || '—'}</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/40 rounded-lg text-purple-600 dark:text-purple-400">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('tax.activeTaxPeriod', 'Active Tax Period')}
            </h3>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              {currentPeriod?.period_name || t('tax.noOpenPeriod', 'No Active Period')}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Status:{' '}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                currentPeriod?.status === 'OPEN' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
              }`}>
                {currentPeriod?.status || 'N/A'}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Dates: {currentPeriod ? `${currentPeriod.period_start} to ${currentPeriod.period_end}` : '—'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400">
            <ScaleIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('tax.netPayableRefundable', 'Net VAT Position')}
            </h3>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
              ৳ {summary?.net_vat_payable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {summary && summary.closing_vat_refundable > 0 ? (
                <span className="text-emerald-600 font-semibold">
                  Refundable Credit: ৳ {summary.closing_vat_refundable.toFixed(2)}
                </span>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">
                  Total Treasury Paid: ৳ {summary?.total_settlements.toFixed(2) ?? '0.00'}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Primary KPI Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">{t('tax.outputVat', 'Output VAT (Sales)')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            ৳ {summary?.net_output_vat.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}
          </p>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Gross VAT: ৳ {summary?.total_output_vat.toFixed(2) ?? '0.00'}</span>
            <span>Returns: ৳ {summary?.total_return_reversals.toFixed(2) ?? '0.00'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">{t('tax.inputVat', 'Input VAT (Purchases)')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            ৳ {summary?.total_input_vat.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}
          </p>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Taxable Purchases: ৳ {summary?.total_purchase_taxable.toFixed(2) ?? '0.00'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">{t('tax.supplementaryDuty', 'Supplementary Duty (SD)')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            ৳ {summary?.total_output_sd.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}
          </p>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Input SD: ৳ {summary?.total_input_sd.toFixed(2) ?? '0.00'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">{t('tax.adjustments', 'Net Adjustments')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            ৳ {summary?.total_adjustments.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}
          </p>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Transactions: {summary?.transaction_count ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Compliance Notice Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-start space-x-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-800 dark:text-amber-300">
          <span className="font-bold">Bangladesh VAT & Supplementary Duty Act 2012 Foundation:</span> All VAT & SD rates, exemptions, and withholding percentages are dynamic and effective-dated. Calculations and subledger entries reconcile against canonical General Ledger accounts.
        </div>
      </div>
    </div>
  );
};
