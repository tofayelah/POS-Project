import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  FileText,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Award,
  RefreshCw,
  ShoppingBag,
  Sliders,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { getProcurementDashboard } from '../../api/procurement';
import { ProcurementDashboardData } from '../../types/procurement';

export const ProcurementDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProcurementDashboardData | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await getProcurementDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load procurement dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-indigo-400" />
            {t('procurement.dashboard.title', 'Procurement Intelligence Dashboard')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('procurement.dashboard.subtitle', 'Automated replenishment, supplier scorecards, 3-way matching, and spend controls.')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </button>
          <Link
            to="/procurement/planning"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm shadow transition"
          >
            <Sliders className="w-4 h-4" />
            {t('procurement.planReplenishment', 'Plan Replenishment')}
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/procurement/requisitions"
          className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-slate-700 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              {t('procurement.kpi.openRequisitions', 'Open Requisitions')}
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {data?.kpis.open_requisitions ?? 0}
            </span>
            {data?.kpis.pending_approval_requisitions ? (
              <span className="text-xs font-medium text-amber-400">
                ({data.kpis.pending_approval_requisitions} {t('procurement.pendingApproval', 'pending')})
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex items-center text-xs text-indigo-400 font-medium group-hover:underline">
            {t('common.viewDetails', 'View Requisitions')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/procurement/rfqs"
          className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-slate-700 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              {t('procurement.kpi.openRfqs', 'Active RFQs & Quotes')}
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-100">{data?.kpis.open_rfqs ?? 0}</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-purple-400 font-medium group-hover:underline">
            {t('common.viewDetails', 'Manage RFQs')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/procurement/planning"
          className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-slate-700 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              {t('procurement.kpi.reorderAlerts', 'Items Needing Reorder')}
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-400">
              {data?.kpis.items_needing_reorder ?? 0}
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-amber-400 font-medium group-hover:underline">
            {t('procurement.action.reorderNow', 'Review Shortfalls')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/procurement/matching"
          className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-slate-700 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              {t('procurement.kpi.matchingAudit', '3-Way Match & PPV')}
            </span>
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${
              data?.ppv_summary.status === 'UNFAVORABLE' ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              ৳{Math.abs(data?.ppv_summary.net_ppv ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {data?.ppv_summary.status ?? 'NEUTRAL'}
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-teal-400 font-medium group-hover:underline">
            {t('common.viewDetails', 'Match Exceptions')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>
      </div>

      {/* Main Grid: Top Suppliers & Expiring Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Suppliers Leaderboard */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-slate-200">
                {t('procurement.dashboard.topSuppliers', 'Top Suppliers by Performance & Reliability')}
              </h2>
            </div>
            <Link
              to="/procurement/supplier-performance"
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              {t('procurement.viewAllScorecards', 'All Scorecards')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">{t('procurement.supplier', 'Supplier')}</th>
                  <th className="px-4 py-3 text-center">{t('procurement.score', 'Reliability')}</th>
                  <th className="px-4 py-3 text-center">{t('procurement.otdRate', 'On-Time (OTD)')}</th>
                  <th className="px-4 py-3 text-center">{t('procurement.fillRate', 'Fill Rate')}</th>
                  <th className="px-4 py-3 text-right">{t('procurement.totalSpend', 'Spend (৳)')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data?.top_suppliers && data.top_suppliers.length > 0 ? (
                  data.top_suppliers.map((sup, idx) => (
                    <tr key={sup.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          {sup.name}
                        </div>
                        <span className="text-xs text-slate-500 font-mono">{sup.code}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          sup.score >= 85
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : sup.score >= 70
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {sup.score}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-mono">{sup.otd_rate}%</td>
                      <td className="px-4 py-3 text-center text-xs font-mono">{sup.fill_rate}%</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-200">
                        ৳{Number(sup.total_spend).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-xs">
                      {t('common.noData', 'No supplier performance records found.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expiring Contracts Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-semibold text-slate-200">
                {t('procurement.expiringContracts', 'Expiring Contracts')}
              </h2>
            </div>
            <Link
              to="/procurement/contracts"
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              {t('common.manage', 'Manage')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <p className="text-xs text-slate-400">
            {t('procurement.expiringNotice', 'Agreements terminating within 30 days requiring renewal or renegotiation.')}
          </p>

          <div className="space-y-3">
            {data?.expiring_contracts && data.expiring_contracts.length > 0 ? (
              data.expiring_contracts.map((cnt) => (
                <div
                  key={cnt.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">{cnt.contract_number}</span>
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      Expires {cnt.end_date}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 truncate">{cnt.title}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {cnt.supplier?.name} • ৳{Number(cnt.contract_value).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded-lg border border-slate-800/60">
                {t('procurement.noExpiringContracts', 'No active contracts expiring in next 30 days.')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
