import React, { useEffect, useState } from 'react';
import {
  Truck,
  Building,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { SupplierBiData } from '../../types/bi';
import { formatCurrency, formatNumber } from '../../utils/format';

export const SupplierBI: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<SupplierBiData | null>(null);

  useEffect(() => {
    loadSupplierBi();
  }, []);

  const loadSupplierBi = async () => {
    setLoading(true);
    try {
      const resp = await biApi.getSupplierBi();
      setData(resp.data.data);
    } catch (err) {
      console.error('Failed to load Supplier BI', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const resp = await biApi.exportReport({
        dataset: 'supplier',
        dimensions: ['supplier'],
        metrics: ['invoices_count', 'total_spend'],
        format: 'csv',
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `supplier_bi_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  const summary = data?.summary;
  const ap = data?.ap_aging;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-8 h-8 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              {t('bi.supplierBi')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {t('bi.subtitle')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadSupplierBi}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200:bg-gray-600 text-gray-700 text-sm font-medium rounded-lg transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {t('bi.exportCsv')}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('bi.totalSuppliers')}
              </span>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(summary?.total_suppliers || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {summary?.active_suppliers || 0} active with transactions
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('bi.totalSpend')}
              </span>
              <div className="text-2xl font-bold text-teal-600 mt-1">
                {formatCurrency(summary?.total_spend || 0)}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('bi.averageSpend')}
              </span>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(summary?.average_spend || 0)}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('bi.accountsPayable')}
              </span>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {formatCurrency(ap?.total_ap || 0)}
              </div>
            </div>
          </div>

          {/* AP Aging Grid */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              {t('bi.apAging')} (Outstanding Payables)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-xs text-gray-500 font-medium">0 - 30 Days</span>
                <div className="text-xl font-bold text-gray-900 mt-1">
                  {formatCurrency(ap?.['0_30'] || 0)}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-xs text-gray-500 font-medium">31 - 60 Days</span>
                <div className="text-xl font-bold text-blue-600 mt-1">
                  {formatCurrency(ap?.['31_60'] || 0)}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-xs text-amber-600 font-medium">61 - 90 Days</span>
                <div className="text-xl font-bold text-amber-600 mt-1">
                  {formatCurrency(ap?.['61_90'] || 0)}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <span className="text-xs text-red-600 font-medium">91+ Days (Overdue)</span>
                <div className="text-xl font-bold text-red-600 mt-1">
                  {formatCurrency(ap?.['91_plus'] || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Rankings Table */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-teal-500" />
              {t('bi.supplierScorecard')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">{t('bi.supplier')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t('common.invoices')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t('bi.totalSpend')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.rankings && data.rankings.length > 0 ? (
                    data.rankings.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{s.name}</td>
                        <td className="py-2.5 px-3 text-right">{formatNumber(s.purchases_count)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-teal-600">
                          {formatCurrency(s.total_spend)}
                        </td>
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
        </>
      )}
    </div>
  );
};
