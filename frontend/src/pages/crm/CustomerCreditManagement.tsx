import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  User,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import crmApi from '../../api/crm';
import { CustomerCreditRequest } from '../../types/crm';
import { customersApi } from '../../api/customers';
import { Customer } from '../../types/customer';

export const CustomerCreditManagement: React.FC = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<CustomerCreditRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Customer search & direct hold management
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Approval / Rejection modal state
  const [activeRequest, setActiveRequest] = useState<CustomerCreditRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchRequests();
    fetchCustomers();
  }, [filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus === 'ALL' ? undefined : filterStatus;
      const data = await crmApi.getCreditRequests(statusParam);
      setRequests(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (err) {
      console.error('Failed to load credit requests', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await customersApi.getCustomers({ page: 1 });
      setCustomers((res.data?.data || []) as unknown as Customer[]);
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  };

  const handleAction = async () => {
    if (!activeRequest || !actionType) return;
    setSubmitting(true);
    try {
      if (actionType === 'APPROVE') {
        await crmApi.approveCreditRequest(activeRequest.id, notes);
      } else {
        await crmApi.rejectCreditRequest(activeRequest.id, notes);
      }
      setActiveRequest(null);
      setActionType(null);
      setNotes('');
      fetchRequests();
    } catch (err) {
      console.error(`Failed to ${actionType} credit request`, err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleHold = async (customerId: number, currentHold: boolean) => {
    const reason = !currentHold ? 'Manager placed credit hold' : 'Manager lifted credit hold';
    try {
      await crmApi.toggleCreditHold(customerId, !currentHold, reason);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to toggle credit hold', err);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.mobile && c.mobile.includes(searchQuery))
  );

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-indigo-400" />
            {t('crm.credit.title', 'Customer Credit & Limit Governance')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('crm.credit.subtitle', 'Monitor credit exposure, process credit limit adjustment requests, and toggle credit hold status.')}
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors self-start md:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Credit Requests Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase">Status Filter:</span>
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterStatus === st
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">
            Total Requests: <strong>{requests.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Requested By</th>
                <th className="p-3 text-right">Current Limit</th>
                <th className="p-3 text-right">Requested Limit</th>
                <th className="p-3 text-center">Credit Days</th>
                <th className="p-3">Reason</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No credit adjustment requests found matching filter.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-semibold text-white">{req.customer?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{req.customer?.customer_code}</div>
                    </td>
                    <td className="p-3 text-slate-300">{req.requester?.name || 'Staff'}</td>
                    <td className="p-3 text-right font-medium text-slate-300">
                      ৳{Number(req.current_credit_limit).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-bold text-indigo-400">
                      ৳{Number(req.requested_credit_limit).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-slate-400">{req.current_credit_days}d</span> →{' '}
                      <span className="font-semibold text-white">{req.requested_credit_days}d</span>
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-300" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setActiveRequest(req);
                              setActionType('APPROVE');
                              setNotes('');
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => {
                              setActiveRequest(req);
                              setActionType('REJECT');
                              setNotes('');
                            }}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          {req.approver ? `Actioned by ${req.approver.name}` : 'Completed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Credit Hold & Exposure Search Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Customer Credit Exposure & Hold Enforcement
            </h2>
            <p className="text-xs text-slate-400">
              Quickly lookup customer limits and manually enforce or release credit holds.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, name, mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Mobile</th>
                <th className="p-3 text-right">Credit Limit</th>
                <th className="p-3 text-right">Current Balance</th>
                <th className="p-3 text-center">Credit Status</th>
                <th className="p-3 text-right">Toggle Hold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredCustomers.slice(0, 15).map((cust: any) => (
                <tr key={cust.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-emerald-400">{cust.customer_code}</td>
                  <td className="p-3 font-medium text-white">{cust.name}</td>
                  <td className="p-3 text-slate-400">{cust.mobile || '-'}</td>
                  <td className="p-3 text-right font-bold text-slate-200">
                    ৳{Number(cust.credit_limit || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-bold text-rose-400">
                    ৳{Number(cust.current_balance || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    {cust.credit_hold ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1 justify-center">
                        <ShieldAlert className="w-3 h-3" /> BLOCKED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 justify-center">
                        <ShieldCheck className="w-3 h-3" /> ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleToggleHold(cust.id, cust.credit_hold)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                        cust.credit_hold
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      {cust.credit_hold ? 'Release Hold' : 'Block Credit'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve / Reject Modal */}
      {activeRequest && actionType && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              {actionType === 'APPROVE' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400" />
              )}
              {actionType === 'APPROVE' ? 'Approve Credit Request' : 'Reject Credit Request'}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Customer: <strong>{activeRequest.customer?.name}</strong> | Requested Limit:{' '}
              <strong className="text-indigo-400">৳{Number(activeRequest.requested_credit_limit).toLocaleString()}</strong>
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">
                  {actionType === 'APPROVE' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  rows={3}
                  required={actionType === 'REJECT'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    actionType === 'APPROVE'
                      ? 'Approved per customer payment reliability...'
                      : 'State reason for rejecting limit adjustment...'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRequest(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  disabled={submitting || (actionType === 'REJECT' && !notes.trim())}
                  className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 text-white ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submitting ? 'Processing...' : actionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCreditManagement;
