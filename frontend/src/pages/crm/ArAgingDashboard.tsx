import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingDown,
  RefreshCw,
  Phone,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import crmApi from '../../api/crm';
import {
  CompanyAgingSummary,
  CollectionPriorityItem,
  CustomerStatement,
} from '../../types/crm';

export const ArAgingDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [agingSummary, setAgingSummary] = useState<CompanyAgingSummary | null>(null);
  const [priorities, setPriorities] = useState<CollectionPriorityItem[]>([]);

  // Statement modal state
  const [statementCustomer, setStatementCustomer] = useState<{ id: number; name: string } | null>(null);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<string>(
    new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetchAgingData();
  }, []);

  const fetchAgingData = async () => {
    setLoading(true);
    try {
      const [agingRes, prioritiesRes] = await Promise.all([
        crmApi.getCompanyAging(),
        crmApi.getCollectionPriorities(),
      ]);
      setAgingSummary(agingRes);
      setPriorities(prioritiesRes);
    } catch (err) {
      console.error('Failed to load aging data', err);
    } finally {
      setLoading(false);
    }
  };

  const openStatement = async (customerId: number, customerName: string) => {
    setStatementCustomer({ id: customerId, name: customerName });
    setStatementLoading(true);
    try {
      const data = await crmApi.getCustomerStatement(customerId, fromDate, toDate);
      setStatement(data);
    } catch (err) {
      console.error('Failed to fetch statement', err);
    } finally {
      setStatementLoading(false);
    }
  };

  const refreshStatement = async () => {
    if (!statementCustomer) return;
    setStatementLoading(true);
    try {
      const data = await crmApi.getCustomerStatement(statementCustomer.id, fromDate, toDate);
      setStatement(data);
    } catch (err) {
      console.error('Failed to refresh statement', err);
    } finally {
      setStatementLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-7 h-7 text-amber-400" />
            {t('crm.arAging.title', 'Accounts Receivable Aging & Collections')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('crm.arAging.subtitle', 'Track customer debt maturity buckets (Current, 1-30, 31-60, 61-90, 90+ days) and prioritize collection efforts.')}
          </p>
        </div>

        <button
          onClick={fetchAgingData}
          disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors self-start md:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Aging Metric Buckets */}
      {agingSummary && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Total Receivables */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 lg:col-span-1">
              <span className="text-xs text-slate-400 block mb-1">
                {t('crm.arAging.totalReceivable', 'Total Receivables')}
              </span>
              <div className="text-xl font-bold text-white">
                ৳{agingSummary.total_receivable.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Across {agingSummary.customer_count} debtors
              </span>
            </div>

            {/* Current */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span>{t('crm.arAging.bucketCurrent', 'Current (0-30d)')}</span>
                <span className="text-emerald-400 font-semibold">{agingSummary.bucket_percentages.current}%</span>
              </div>
              <div className="text-lg font-bold text-emerald-400">
                ৳{agingSummary.buckets.current.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Not yet overdue</span>
            </div>

            {/* 1 - 30 Days Overdue */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span>{t('crm.arAging.bucket1To30', '1 - 30 Days')}</span>
                <span className="text-amber-400 font-semibold">{agingSummary.bucket_percentages.days_1_30}%</span>
              </div>
              <div className="text-lg font-bold text-amber-400">
                ৳{agingSummary.buckets.days_1_30.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Early follow-up</span>
            </div>

            {/* 31 - 60 Days Overdue */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span>{t('crm.arAging.bucket31To60', '31 - 60 Days')}</span>
                <span className="text-amber-500 font-semibold">{agingSummary.bucket_percentages.days_31_60}%</span>
              </div>
              <div className="text-lg font-bold text-amber-500">
                ৳{agingSummary.buckets.days_31_60.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Action recommended</span>
            </div>

            {/* 61 - 90 Days Overdue */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span>{t('crm.arAging.bucket61To90', '61 - 90 Days')}</span>
                <span className="text-rose-400 font-semibold">{agingSummary.bucket_percentages.days_61_90}%</span>
              </div>
              <div className="text-lg font-bold text-rose-400">
                ৳{agingSummary.buckets.days_61_90.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Escalated risk</span>
            </div>

            {/* 90+ Days Overdue */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span>{t('crm.arAging.bucket90Plus', '90+ Days')}</span>
                <span className="text-rose-500 font-semibold">{agingSummary.bucket_percentages.days_90_plus}%</span>
              </div>
              <div className="text-lg font-bold text-rose-500">
                ৳{agingSummary.buckets.days_90_plus.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Critical default</span>
            </div>
          </div>
        </div>
      )}

      {/* Collection Priorities Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            {t('crm.arAging.collectionPriorities', 'High-Risk Collection Priorities')}
          </h2>
          <span className="text-xs text-slate-400">
            {priorities.length} accounts require collection action
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Mobile Contact</th>
                <th className="p-3 text-right">Total Outstanding</th>
                <th className="p-3 text-right">Overdue Amount</th>
                <th className="p-3 text-center">Max Overdue Days</th>
                <th className="p-3 text-center">Risk Level</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                    Loading aging and collection priorities...
                  </td>
                </tr>
              ) : priorities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No overdue accounts found. All collections up to date!
                  </td>
                </tr>
              ) : (
                priorities.map((item) => (
                  <tr key={item.customer_id} className="hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-[10px] font-mono text-emerald-400">{item.customer_code}</div>
                    </td>
                    <td className="p-3 text-slate-300">
                      {item.mobile ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" /> {item.mobile}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 text-right font-medium text-slate-200">
                      ৳{Number(item.total_due).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-bold text-rose-400">
                      ৳{Number(item.overdue_amount).toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-200">
                      {item.days_overdue} days
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.risk_level === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : item.risk_level === 'HIGH'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : item.risk_level === 'MEDIUM'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-900'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {item.risk_level}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/crm/customer-360?id=${item.customer_id}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition-colors"
                        >
                          Customer 360
                        </Link>
                        <button
                          onClick={() => openStatement(item.customer_id, item.name)}
                          className="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-500 text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3 h-3" /> Statement
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Statement Modal */}
      {statementCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Customer Account Statement: {statementCustomer.name}
              </h2>
              <button
                onClick={() => setStatementCustomer(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Date Filters & Summary */}
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <label className="text-slate-400">From:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1"
                />
                <label className="text-slate-400 ml-2">To:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1"
                />
                <button
                  onClick={refreshStatement}
                  disabled={statementLoading}
                  className="ml-2 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium"
                >
                  Apply
                </button>
              </div>

              {statement && (
                <div className="flex items-center gap-4 text-slate-300 font-medium">
                  <span>Opening: <strong>৳{(statement.opening_balance ?? 0).toLocaleString()}</strong></span>
                  <span>Debits: <strong className="text-rose-400">৳{(statement.total_debit ?? 0).toLocaleString()}</strong></span>
                  <span>Credits: <strong className="text-emerald-400">৳{(statement.total_credit ?? 0).toLocaleString()}</strong></span>
                  <span>Closing: <strong className="text-white">৳{(statement.closing_balance ?? 0).toLocaleString()}</strong></span>
                </div>
              )}
            </div>

            {/* Transactions Table */}
            <div className="p-4 overflow-y-auto flex-1 text-xs">
              {statementLoading ? (
                <div className="py-12 text-center text-slate-400">Loading statement...</div>
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
                        <td className="p-2 text-right text-rose-400">{Number(tx.debit) > 0 ? `৳${Number(tx.debit).toLocaleString()}` : '-'}</td>
                        <td className="p-2 text-right text-emerald-400">{Number(tx.credit) > 0 ? `৳${Number(tx.credit).toLocaleString()}` : '-'}</td>
                        <td className="p-2 text-right font-bold text-white">৳{(Number(tx.running_balance) || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-500">No transactions recorded for this period.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArAgingDashboard;
