import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import {
  UserCheck,
  CreditCard,
  Clock,
  Award,
  DollarSign,
  ShoppingBag,
  Activity,
  AlertTriangle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  FileText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import crmApi from '../../api/crm';
import { customersApi } from '../../api/customers';
import { Customer360Profile, CustomerStatement } from '../../types/crm';
import { Customer } from '../../types/customer';

export const Customer360: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [profile, setProfile] = useState<Customer360Profile | null>(null);

  // Statement modal state
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);
  const [statementLoading, setStatementLoading] = useState<boolean>(false);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [statementFromDate, setStatementFromDate] = useState<string>(
    new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
  );
  const [statementToDate, setStatementToDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Credit Request modal state
  const [showCreditModal, setShowCreditModal] = useState<boolean>(false);
  const [requestedLimit, setRequestedLimit] = useState<number>(0);
  const [requestedDays, setRequestedDays] = useState<number>(30);
  const [creditReason, setCreditReason] = useState<string>('');
  const [creditSubmitting, setCreditSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await customersApi.getCustomers({ page: 1 });
      const list = (res.data?.data || []) as unknown as Customer[];
      setCustomers(list);

      const urlId = searchParams.get('id');
      if (urlId) {
        const idNum = parseInt(urlId, 10);
        setSelectedCustomerId(idNum);
      } else if (list.length > 0) {
        setSelectedCustomerId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomer360(selectedCustomerId);
      setSearchParams({ id: selectedCustomerId.toString() });
    }
  }, [selectedCustomerId]);

  const fetchCustomer360 = async (id: number) => {
    setLoading(true);
    try {
      const data = await crmApi.getCustomer360(id);
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch Customer 360', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHold = async () => {
    if (!profile) return;
    const newHold = !profile.credit.credit_hold;
    const reason = newHold ? 'Manual hold placed by manager' : 'Hold released by manager';
    try {
      await crmApi.toggleCreditHold(profile.customer.id, newHold, reason);
      fetchCustomer360(profile.customer.id);
    } catch (err) {
      console.error('Failed to toggle credit hold', err);
    }
  };

  const handleOpenStatement = async () => {
    if (!profile) return;
    setShowStatementModal(true);
    setStatementLoading(true);
    try {
      const stmt = await crmApi.getCustomerStatement(profile.customer.id, statementFromDate, statementToDate);
      setStatement(stmt);
    } catch (err) {
      console.error('Failed to fetch statement', err);
    } finally {
      setStatementLoading(false);
    }
  };

  const handleRefreshStatement = async () => {
    if (!profile) return;
    setStatementLoading(true);
    try {
      const stmt = await crmApi.getCustomerStatement(profile.customer.id, statementFromDate, statementToDate);
      setStatement(stmt);
    } catch (err) {
      console.error('Failed to refresh statement', err);
    } finally {
      setStatementLoading(false);
    }
  };

  const handleSubmitCreditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !creditReason) return;
    setCreditSubmitting(true);
    try {
      await crmApi.requestCredit(profile.customer.id, {
        requested_credit_limit: requestedLimit,
        requested_credit_days: requestedDays,
        reason: creditReason,
      });
      setShowCreditModal(false);
      setCreditReason('');
      fetchCustomer360(profile.customer.id);
    } catch (err) {
      console.error('Failed to submit credit request', err);
    } finally {
      setCreditSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Top Header & Customer Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-emerald-400" />
            {t('crm.customer360.title', 'Customer 360 View')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('crm.customer360.subtitle', 'Unified customer profile, credit health, aging exposure, deterministic RFM score, and comprehensive purchase analytics.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">{t('crm.customer360.selectCustomer', 'Select Customer')}:</label>
          <select
            value={selectedCustomerId || ''}
            onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_code} - {c.name} {c.mobile ? `(${c.mobile})` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => selectedCustomerId && fetchCustomer360(selectedCustomerId)}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !profile && (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mr-3 text-emerald-400" />
          Loading Customer 360 Diagnostic Data...
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          {/* Quick Header Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold bg-slate-800 text-emerald-400 px-2.5 py-1 rounded">
                    {profile.customer.customer_code}
                  </span>
                  <h2 className="text-xl font-bold text-white">{profile.customer.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-300">
                    {profile.customer.customer_type}
                  </span>
                  {profile.customer.group && (
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                      {profile.customer.group.name}
                    </span>
                  )}
                  {profile.credit.credit_hold ? (
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> {t('crm.customer360.creditHoldActive', 'Credit Blocked')}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> {t('crm.customer360.creditNormal', 'Credit Active')}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                  {profile.customer.contact_person && (
                    <span>{t('crm.customer360.contactPerson', 'Contact')}: <strong className="text-slate-300">{profile.customer.contact_person}</strong></span>
                  )}
                  {profile.customer.mobile && (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-500" /> {profile.customer.mobile}</span>
                  )}
                  {profile.customer.email && (
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-500" /> {profile.customer.email}</span>
                  )}
                  {profile.customer.bin_number && (
                    <span>{t('crm.customer360.bin', 'BIN')}: <strong className="text-slate-300">{profile.customer.bin_number}</strong></span>
                  )}
                  {profile.customer.tin_number && (
                    <span>{t('crm.customer360.tin', 'TIN')}: <strong className="text-slate-300">{profile.customer.tin_number}</strong></span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleToggleHold}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    profile.credit.credit_hold
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {profile.credit.credit_hold ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  {profile.credit.credit_hold ? 'Release Hold' : 'Block Credit'}
                </button>
                <button
                  onClick={() => {
                    setRequestedLimit(profile.credit.credit_limit);
                    setRequestedDays(profile.credit.credit_days);
                    setShowCreditModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  {t('crm.customer360.requestLimit', 'Request Limit Adjustment')}
                </button>
                <button
                  onClick={handleOpenStatement}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  {t('crm.customer360.viewStatement', 'Generate Statement')}
                </button>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Credit Health */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium flex items-center gap-1">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  {t('crm.customer360.creditOverview', 'Credit & Balance')}
                </span>
                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  profile.credit.status === 'SAFE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  profile.credit.status === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  {profile.credit.status}
                </span>
              </div>
              <div className="text-xl font-bold text-white mb-1">
                ৳{profile.credit.current_balance.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 flex justify-between mb-2">
                <span>Limit: ৳{profile.credit.credit_limit.toLocaleString()}</span>
                <span>Avail: ৳{profile.credit.available_credit.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${
                    profile.credit.credit_utilization_pct > 90 ? 'bg-rose-500' :
                    profile.credit.credit_utilization_pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, profile.credit.credit_utilization_pct)}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
                <span>Utilization: {profile.credit.credit_utilization_pct}%</span>
                <span>Allowed Days: {profile.credit.credit_days}d</span>
              </div>
            </div>

            {/* AR Aging */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium flex items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-400" />
                  {t('crm.customer360.agingOverview', 'AR Aging Breakdown')}
                </span>
                <span className="text-xs font-semibold text-rose-400">
                  {profile.credit.overdue_amount > 0 ? `৳${profile.credit.overdue_amount.toLocaleString()} Overdue` : 'Zero Overdue'}
                </span>
              </div>
              <div className="text-xl font-bold text-white mb-2">
                ৳{profile.ar_aging.total_outstanding.toLocaleString()}
              </div>
              <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
                <div className="bg-slate-800/60 p-1 rounded">
                  <div className="text-slate-400">Cur</div>
                  <div className="font-semibold text-emerald-400">৳{Math.round(profile.ar_aging.buckets.current)}</div>
                </div>
                <div className="bg-slate-800/60 p-1 rounded">
                  <div className="text-slate-400">1-30</div>
                  <div className="font-semibold text-amber-400">৳{Math.round(profile.ar_aging.buckets.days_1_30)}</div>
                </div>
                <div className="bg-slate-800/60 p-1 rounded">
                  <div className="text-slate-400">31-60</div>
                  <div className="font-semibold text-amber-500">৳{Math.round(profile.ar_aging.buckets.days_31_60)}</div>
                </div>
                <div className="bg-slate-800/60 p-1 rounded">
                  <div className="text-slate-400">61-90</div>
                  <div className="font-semibold text-rose-400">৳{Math.round(profile.ar_aging.buckets.days_61_90)}</div>
                </div>
                <div className="bg-slate-800/60 p-1 rounded">
                  <div className="text-slate-400">90+</div>
                  <div className="font-semibold text-rose-500">৳{Math.round(profile.ar_aging.buckets.days_90_plus)}</div>
                </div>
              </div>
            </div>

            {/* RFM Intelligence */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium flex items-center gap-1">
                  <Award className="w-4 h-4 text-purple-400" />
                  {t('crm.customer360.rfmOverview', 'RFM Segment')}
                </span>
                <span className="font-mono text-xs font-bold bg-purple-950/80 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800/50">
                  {profile.rfm.composite_score}
                </span>
              </div>
              <div className="text-lg font-bold text-emerald-400 mb-2">
                {profile.rfm.segment}
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px] text-center mb-2">
                <div className="bg-slate-800/50 p-1 rounded">
                  <div className="text-slate-400">Recency</div>
                  <div className="font-bold text-slate-200">{profile.rfm.recency_days}d (S:{profile.rfm.recency_score})</div>
                </div>
                <div className="bg-slate-800/50 p-1 rounded">
                  <div className="text-slate-400">Frequency</div>
                  <div className="font-bold text-slate-200">{profile.rfm.frequency_orders} (S:{profile.rfm.frequency_score})</div>
                </div>
                <div className="bg-slate-800/50 p-1 rounded">
                  <div className="text-slate-400">Monetary</div>
                  <div className="font-bold text-slate-200">S:{profile.rfm.monetary_score}</div>
                </div>
              </div>
            </div>

            {/* CLV & Profitability */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  {t('crm.customer360.clvOverview', 'CLV & Profitability')}
                </span>
                <span className="text-xs text-slate-400">
                  {profile.clv.total_orders} Orders
                </span>
              </div>
              <div className="text-xl font-bold text-white mb-1">
                ৳{profile.clv.total_spent.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 flex justify-between mb-1">
                <span>Profit: <strong className="text-emerald-400">৳{profile.clv.gross_profit.toLocaleString()}</strong></span>
                <span>Margin: <strong className="text-emerald-400">{profile.clv.gross_margin_pct}%</strong></span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>AOV: ৳{profile.clv.average_order_value.toLocaleString()}</span>
                <span>Points: <strong className="text-amber-400">{profile.balances.points}</strong></span>
              </div>
            </div>
          </div>

          {/* Details Row: Top Products & Preferred Branch / Balances */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Purchased Products */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                {t('crm.customer360.topProducts', 'Top Purchased Products')}
              </h3>
              {profile.top_products.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">No purchased items on record.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/70 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Product Name</th>
                        <th className="p-2 text-right">Total Qty</th>
                        <th className="p-2 text-right">Total Spend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {profile.top_products.map((tp, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2 font-mono text-emerald-400">{tp.sku_snapshot}</td>
                          <td className="p-2 font-medium text-slate-200">{tp.product_name_snapshot}</td>
                          <td className="p-2 text-right">{tp.total_qty}</td>
                          <td className="p-2 text-right font-bold text-white">৳{tp.total_spend.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Engagement & Store Credit */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Channel & Service Snapshot
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2.5 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">{t('crm.customer360.preferredBranch', 'Preferred Branch')}</span>
                  <span className="font-semibold text-slate-200">
                    {profile.preferred_branch ? profile.preferred_branch.name : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">{t('crm.customer360.storeCreditBalance', 'Store Credit')}</span>
                  <span className="font-bold text-emerald-400">
                    ৳{profile.balances.storeCredit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Open Service Complaints</span>
                  <span className="font-bold text-rose-400">{profile.counts.open_complaints}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Open CRM Activities</span>
                  <span className="font-bold text-amber-400">{profile.counts.open_activities}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Timeline Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-emerald-400" />
              {t('crm.customer360.timeline', 'Activity & Transaction Timeline')}
            </h3>
            {profile.timeline.length === 0 ? (
              <div className="text-xs text-slate-500 py-6 text-center">No timeline events recorded.</div>
            ) : (
              <div className="space-y-3">
                {profile.timeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800/40 border border-slate-800 rounded-lg">
                    <div className="mt-0.5">
                      {item.type === 'SALE' && <ShoppingBag className="w-4 h-4 text-emerald-400" />}
                      {item.type === 'ACTIVITY' && <Phone className="w-4 h-4 text-indigo-400" />}
                      {item.type === 'COMPLAINT' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                      {item.type === 'OPPORTUNITY' && <DollarSign className="w-4 h-4 text-amber-400" />}
                      {item.type === 'CREDIT_REQUEST' && <CreditCard className="w-4 h-4 text-purple-400" />}
                      {item.type === 'CREDIT_OVERRIDE' && <ShieldAlert className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{item.title}</span>
                        <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      {item.description && <p className="text-slate-400 mt-1">{item.description}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                        {item.status && <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-medium">{item.status}</span>}
                        {item.user_name && <span>By: {item.user_name}</span>}
                        {item.amount !== undefined && <span className="font-bold text-emerald-400">৳{item.amount.toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statement Modal */}
      {showStatementModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Customer Account Statement
              </h2>
              <button
                onClick={() => setShowStatementModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <label className="text-slate-400">{t('crm.arAging.dateFrom', 'From Date')}:</label>
                <input
                  type="date"
                  value={statementFromDate}
                  onChange={(e) => setStatementFromDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1"
                />
                <label className="text-slate-400 ml-2">{t('crm.arAging.dateTo', 'To Date')}:</label>
                <input
                  type="date"
                  value={statementToDate}
                  onChange={(e) => setStatementToDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1"
                />
                <button
                  onClick={handleRefreshStatement}
                  disabled={statementLoading}
                  className="ml-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium"
                >
                  Filter
                </button>
              </div>

              {statement && (
                <div className="flex items-center gap-4 text-slate-300">
                  <span>Opening: <strong>৳{statement.opening_balance.toLocaleString()}</strong></span>
                  <span>Debits: <strong className="text-rose-400">৳{statement.total_debit.toLocaleString()}</strong></span>
                  <span>Credits: <strong className="text-emerald-400">৳{statement.total_credit.toLocaleString()}</strong></span>
                  <span>Closing: <strong className="text-white">৳{statement.closing_balance.toLocaleString()}</strong></span>
                </div>
              )}
            </div>

            {/* Statement Body */}
            <div className="p-4 overflow-y-auto flex-1 text-xs">
              {statementLoading ? (
                <div className="py-12 text-center text-slate-400">Loading statement transactions...</div>
              ) : statement && statement.transactions.length > 0 ? (
                <table className="w-full text-left text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Reference</th>
                      <th className="p-2">Notes</th>
                      <th className="p-2 text-right">Debit</th>
                      <th className="p-2 text-right">Credit</th>
                      <th className="p-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {statement.transactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2 text-slate-400">{tx.date}</td>
                        <td className="p-2 font-semibold text-slate-200">{tx.type}</td>
                        <td className="p-2 font-mono text-emerald-400">{tx.reference_number || '-'}</td>
                        <td className="p-2 text-slate-400">{tx.notes || '-'}</td>
                        <td className="p-2 text-right text-rose-400">{tx.debit > 0 ? `৳${tx.debit.toLocaleString()}` : '-'}</td>
                        <td className="p-2 text-right text-emerald-400">{tx.credit > 0 ? `৳${tx.credit.toLocaleString()}` : '-'}</td>
                        <td className="p-2 text-right font-bold text-white">৳{tx.running_balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-500">No transactions in selected period.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Credit Limit Request Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              {t('crm.credit.requestIncrease', 'New Credit Limit Request')}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Submit an authoritative credit limit change for customer {profile?.customer.name}.
            </p>

            <form onSubmit={handleSubmitCreditRequest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">{t('crm.credit.requestedLimit', 'Requested Limit')} (BDT)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={requestedLimit}
                  onChange={(e) => setRequestedLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('crm.credit.requestedDays', 'Requested Credit Days')}</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="365"
                  value={requestedDays}
                  onChange={(e) => setRequestedDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('crm.credit.reason', 'Justification / Reason')}</label>
                <textarea
                  required
                  rows={3}
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="Explain why this customer requires credit adjustment..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creditSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  {creditSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customer360;
