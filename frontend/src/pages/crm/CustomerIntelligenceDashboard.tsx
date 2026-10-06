import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Award,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  UserCheck,
  ShieldAlert,
  Phone,
  ArrowRight,
  PieChart,
  Users,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import crmApi from '../../api/crm';
import {
  CompanyRfmDistribution,
  AtRiskCustomerRow,
} from '../../types/crm';

export const CustomerIntelligenceDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [rfmSummary, setRfmSummary] = useState<CompanyRfmDistribution | null>(null);
  const [atRiskCustomers, setAtRiskCustomers] = useState<AtRiskCustomerRow[]>([]);
  const [daysThreshold, setDaysThreshold] = useState<number>(60);

  useEffect(() => {
    fetchIntelligenceData();
  }, [daysThreshold]);

  const fetchIntelligenceData = async () => {
    setLoading(true);
    try {
      const [dist, atRisk] = await Promise.all([
        crmApi.getRfmSummary(),
        crmApi.getAtRiskCustomers(daysThreshold),
      ]);
      setRfmSummary(dist);
      setAtRiskCustomers(atRisk);
    } catch (err) {
      console.error('Failed to load customer intelligence data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await crmApi.recalculateRfm();
      await fetchIntelligenceData();
    } catch (err) {
      console.error('Failed to recalculate RFM', err);
    } finally {
      setRecalculating(false);
    }
  };

  const segments = rfmSummary?.segments || {};

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-7 h-7 text-purple-400" />
            {t('crm.intelligence.title', 'Customer Intelligence & RFM Scoring')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('crm.intelligence.subtitle', 'Deterministic Recency-Frequency-Monetary scoring, automated segmentation, and churn risk detection.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculating...' : t('crm.intelligence.recalculateBtn', 'Recalculate RFM Scores')}
          </button>
        </div>
      </div>

      {/* Top Segment Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Total Scored Customers</span>
          <div className="text-2xl font-bold text-white">{rfmSummary?.total_scored_customers || 0}</div>
        </div>
        <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-4">
          <span className="text-xs text-emerald-400 block mb-1">Champions</span>
          <div className="text-2xl font-bold text-emerald-400">{segments['CHAMPIONS'] || 0}</div>
        </div>
        <div className="bg-slate-900 border border-indigo-900/40 rounded-xl p-4">
          <span className="text-xs text-indigo-400 block mb-1">Loyal Customers</span>
          <div className="text-2xl font-bold text-indigo-400">{segments['LOYAL'] || 0}</div>
        </div>
        <div className="bg-slate-900 border border-amber-900/40 rounded-xl p-4">
          <span className="text-xs text-amber-400 block mb-1">At Risk</span>
          <div className="text-2xl font-bold text-amber-400">{segments['AT_RISK'] || 0}</div>
        </div>
        <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-4">
          <span className="text-xs text-rose-400 block mb-1">Lost / Inactive</span>
          <div className="text-2xl font-bold text-rose-400">{segments['LOST'] || 0}</div>
        </div>
      </div>

      {/* RFM Segment Matrix Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-400" />
          {t('crm.intelligence.rfmSegments', 'Customer RFM Segments Breakdown')}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
          {[
            { key: 'CHAMPIONS', name: 'Champions', desc: 'Bought recently, buy often & spend heavily', color: 'emerald' },
            { key: 'LOYAL', name: 'Loyal Customers', desc: 'Good spenders and responsive', color: 'indigo' },
            { key: 'POTENTIAL_LOYAL', name: 'Potential Loyalists', desc: 'Recent customers with good spend', color: 'blue' },
            { key: 'NEW_CUSTOMERS', name: 'New Customers', desc: 'Bought most recently, low frequency', color: 'teal' },
            { key: 'PROMISING', name: 'Promising', desc: 'Recent shoppers with moderate spend', color: 'cyan' },
            { key: 'NEEDS_ATTENTION', name: 'Needs Attention', desc: 'Above average recency & frequency', color: 'amber' },
            { key: 'AT_RISK', name: 'At Risk', desc: 'Spent big money, but haven’t bought recently', color: 'rose' },
            { key: 'CANNOT_LOSE', name: 'Cannot Lose Them', desc: 'Made biggest purchases, no recent activity', color: 'red' },
            { key: 'HIBERNATING', name: 'Hibernating', desc: 'Last purchase was long ago, low spend', color: 'slate' },
            { key: 'LOST', name: 'Lost / Inactive', desc: 'Lowest recency, frequency and monetary', color: 'zinc' },
          ].map((seg) => (
            <div key={seg.key} className="bg-slate-800/50 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-xs">{seg.name}</span>
                  <span className="font-mono font-bold text-purple-400 text-sm">
                    {segments[seg.key] || 0}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">{seg.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* At-Risk & Churn Prevention Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              {t('crm.intelligence.atRiskTab', 'At-Risk & Churn Prevention')}
            </h2>
            <p className="text-xs text-slate-400">
              Customers with prior purchasing history who have become inactive. Target them with retention campaigns.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Inactive Threshold:</span>
            {[30, 60, 90, 180].map((days) => (
              <button
                key={days}
                onClick={() => setDaysThreshold(days)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  daysThreshold === days
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {days}d+
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Mobile Contact</th>
                <th className="p-3">RFM Segment</th>
                <th className="p-3 text-center">Last Purchase</th>
                <th className="p-3 text-center">Days Inactive</th>
                <th className="p-3 text-right">Lifetime Spend</th>
                <th className="p-3 text-center">Credit Hold</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" />
                    Loading at-risk customers...
                  </td>
                </tr>
              ) : atRiskCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No customers found inactive for over {daysThreshold} days.
                  </td>
                </tr>
              ) : (
                atRiskCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-semibold text-white">{cust.name}</div>
                      <div className="text-[10px] font-mono text-emerald-400">{cust.customer_code}</div>
                    </td>
                    <td className="p-3 text-slate-300">
                      {cust.mobile ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" /> {cust.mobile}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-purple-400 border border-slate-700">
                        {cust.rfm_segment || 'LOST'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-400">{cust.last_purchase_date || '-'}</td>
                    <td className="p-3 text-center font-bold text-amber-400">{cust.days_inactive} days</td>
                    <td className="p-3 text-right font-bold text-white">
                      ৳{Number(cust.total_spent).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      {cust.credit_hold ? (
                        <span className="text-[10px] font-bold text-rose-400">BLOCKED</span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-400">ACTIVE</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        to={`/crm/customer-360?id=${cust.id}`}
                        className="px-2.5 py-1 bg-purple-600/80 hover:bg-purple-500 text-white rounded text-[11px] font-medium inline-flex items-center gap-1"
                      >
                        Profile 360 <ArrowRight className="w-3 h-3" />
                      </Link>
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

export default CustomerIntelligenceDashboard;
