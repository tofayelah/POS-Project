import React, { useEffect, useState } from 'react';
import {
  Award,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Sliders,
  DollarSign,
  Package,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import {
  getSupplierRankings,
  getSupplierPerformance,
  recalculateSupplierScore,
  updateSupplierQualification,
} from '../../api/procurement';
import { getSuppliers } from '../../api/suppliers';
import { SupplierPerformanceScorecard, QualificationStatus } from '../../types/procurement';
import { Supplier } from '../../types/supplier';

export const SupplierPerformance: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [scorecard, setScorecard] = useState<SupplierPerformanceScorecard | null>(null);

  // Status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<QualificationStatus>('QUALIFIED');
  const [statusReason, setStatusReason] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [supRes, rankRes] = await Promise.all([
        getSuppliers({ all: true }),
        getSupplierRankings(),
      ]);
      if (supRes.data) {
        const list = supRes.data.data || supRes.data;
        setSuppliers(list);
        if (list.length > 0 && !selectedSupplierId) {
          setSelectedSupplierId(list[0].id);
        }
      }
      if (rankRes) {
        setRankings(rankRes);
      }
    } catch (err) {
      console.error('Failed to load supplier performance data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScorecard = async (id: number) => {
    try {
      const res = await getSupplierPerformance(id);
      if (res.success) {
        setScorecard(res.data);
      }
    } catch (err) {
      console.error('Failed to load scorecard', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      fetchScorecard(selectedSupplierId);
    }
  }, [selectedSupplierId]);

  const handleRecalculate = async () => {
    if (!selectedSupplierId) return;
    try {
      await recalculateSupplierScore(selectedSupplierId);
      await fetchScorecard(selectedSupplierId);
      const updatedRanks = await getSupplierRankings();
      setRankings(updatedRanks);
    } catch (err) {
      alert('Failed to recalculate score');
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;
    try {
      await updateSupplierQualification(selectedSupplierId, newStatus, statusReason, statusNotes);
      setShowStatusModal(false);
      setStatusReason('');
      setStatusNotes('');
      await fetchScorecard(selectedSupplierId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update qualification status');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Award className="w-7 h-7 text-amber-400" />
            {t('procurement.performance.title', 'Supplier Performance & Reliability Scorecards')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('procurement.performance.subtitle', 'Deterministic KPI evaluation, on-time delivery metrics, quality fill rates, and qualification lifecycle.')}
          </p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Supplier Selector & Scorecard */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <label className="text-xs font-semibold uppercase text-slate-400 block mb-2">
              Select Supplier
            </label>
            <select
              value={selectedSupplierId || ''}
              onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.supplier_code})
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Scorecard */}
          {scorecard && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-lg">{scorecard.supplier_name}</h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{scorecard.supplier_code}</div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                    scorecard.qualification_status === 'QUALIFIED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : scorecard.qualification_status === 'BLOCKED'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {scorecard.qualification_status}
                  </span>
                  <button
                    onClick={() => {
                      setNewStatus(scorecard.qualification_status);
                      setShowStatusModal(true);
                    }}
                    className="block text-[11px] text-indigo-400 hover:underline mt-1"
                  >
                    Change Status
                  </button>
                </div>
              </div>

              {/* Score Dial */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Reliability Score</span>
                  <div className="text-3xl font-extrabold text-slate-100 mt-1">
                    {scorecard.metrics.composite_score}
                    <span className="text-base font-normal text-slate-500"> / 100</span>
                  </div>
                </div>
                <button
                  onClick={handleRecalculate}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 transition"
                  title="Recalculate composite reliability score"
                >
                  <RefreshCw className="w-4 h-4 text-indigo-400" />
                </button>
              </div>

              {/* Metrics Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block">On-Time Delivery</span>
                  <span className="font-bold text-slate-200 text-sm mt-0.5 block font-mono">
                    {scorecard.metrics.on_time_delivery_rate}%
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block">Fill Rate</span>
                  <span className="font-bold text-slate-200 text-sm mt-0.5 block font-mono">
                    {scorecard.metrics.fill_rate}%
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block">Avg Lead Time</span>
                  <span className="font-bold text-slate-200 text-sm mt-0.5 block font-mono">
                    {scorecard.metrics.average_actual_lead_time_days} days
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block">Total POs</span>
                  <span className="font-bold text-slate-200 text-sm mt-0.5 block font-mono">
                    {scorecard.metrics.total_orders_count}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">Total Spend (৳)</span>
                  <span className="font-bold text-slate-100">
                    ৳{Number(scorecard.metrics.total_spend).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Outstanding AP (৳)</span>
                  <span className="font-bold text-rose-400">
                    ৳{Number(scorecard.metrics.outstanding_balance).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Full Company Rankings Leaderboard */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Company Supplier Reliability Leaderboard
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Rank & Supplier</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-center">OTD</th>
                  <th className="px-4 py-3 text-center">Fill Rate</th>
                  <th className="px-4 py-3 text-right">Spend (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rankings.map((r, idx) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedSupplierId(r.id)}
                    className={`cursor-pointer transition ${
                      selectedSupplierId === r.id ? 'bg-indigo-950/20' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        {r.name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">{r.code}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {r.qualification_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        r.score >= 85
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : r.score >= 70
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {r.score}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-mono">{r.otd_rate}%</td>
                    <td className="px-4 py-3 text-center text-xs font-mono">{r.fill_rate}%</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-200">
                      ৳{Number(r.total_spend).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Qualification Status Changer Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Update Qualification Status</h3>
            <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as QualificationStatus)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                >
                  <option value="QUALIFIED">QUALIFIED</option>
                  <option value="CONDITIONAL">CONDITIONAL</option>
                  <option value="PENDING_REVIEW">PENDING REVIEW</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>

              {['BLOCKED', 'REJECTED', 'SUSPENDED'].includes(newStatus) && (
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Justification Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Failed safety audit, commercial dispute"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Notes / Reviewer Comments</label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
