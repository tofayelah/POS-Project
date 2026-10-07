import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  CheckCircle,
  FileText,
  Clock,
  Send,
  AlertCircle,
  X,
  Filter
} from 'lucide-react';
import { taxApi } from '../../api/tax';
import { TaxAdjustment, TaxPeriod } from '../../types/tax';

export const TaxAdjustmentManagement: React.FC = () => {
  const [adjustments, setAdjustments] = useState<TaxAdjustment[]>([]);
  const [periods, setPeriods] = useState<TaxPeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<{
    tax_period_id: number;
    adjustment_type: TaxAdjustment['adjustment_type'];
    reason: string;
    amount: number;
    tax_amount: number;
    legal_reference: string;
  }>({
    tax_period_id: 0,
    adjustment_type: 'OUTPUT_VAT_INCREASE',
    reason: '',
    amount: 0,
    tax_amount: 0,
    legal_reference: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [adjRes, periodsRes] = await Promise.all([
        taxApi.getAdjustments(),
        taxApi.getPeriods(),
      ]);

      if (adjRes.data.success) {
        setAdjustments(adjRes.data.data);
      }
      if (periodsRes.data.success && periodsRes.data.data.length > 0) {
        setPeriods(periodsRes.data.data);
        setFormData((prev) => ({ ...prev, tax_period_id: periodsRes.data.data[0].id }));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load adjustments data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      const res = await taxApi.createAdjustment(formData);
      if (res.data.success) {
        setSuccessMessage('Tax adjustment draft created successfully');
        setIsModalOpen(false);
        fetchInitialData();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create adjustment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await taxApi.approveAdjustment(id);
      if (res.data.success) {
        setSuccessMessage('Adjustment approved successfully');
        fetchInitialData();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePost = async (id: number) => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await taxApi.postAdjustment(id);
      if (res.data.success) {
        setSuccessMessage('Adjustment successfully posted to General Ledger and subledger');
        fetchInitialData();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Posting failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: number | undefined | null) => {
    const num = Number(val || 0);
    return `৳${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredAdjustments = adjustments.filter((adj) => {
    if (statusFilter === 'ALL') return true;
    return adj.status === statusFilter;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tax Adjustments</h1>
            <p className="text-sm text-gray-500">
              Manage Debit/Credit notes, increasing and decreasing adjustments under NBR VAT guidelines
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          New Adjustment Draft
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and stats */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filter by Status:</span>
          {['ALL', 'DRAFT', 'APPROVED', 'POSTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">Showing {filteredAdjustments.length} adjustment records</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading tax adjustments...</div>
        ) : filteredAdjustments.length === 0 ? (
          <div className="p-12 text-center">
            <SlidersHorizontal className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">No adjustments found</p>
            <p className="text-xs text-gray-400 mt-1">Create an adjustment to record tax amendments or debit/credit notes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5 text-left">Adjustment #</th>
                  <th className="px-5 py-3.5 text-left">Period</th>
                  <th className="px-5 py-3.5 text-left">Type</th>
                  <th className="px-5 py-3.5 text-left">Reason / Ref</th>
                  <th className="px-5 py-3.5 text-right">Tax Amount</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-mono font-medium text-gray-900">{adj.adjustment_number}</td>
                    <td className="px-5 py-4 text-gray-600">
                      {adj.period?.period_name || `Period #${adj.tax_period_id}`}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                        {adj.adjustment_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-gray-900 font-medium">{adj.reason}</div>
                      {adj.legal_reference && (
                        <div className="text-xs text-gray-400 mt-0.5">Ref: {adj.legal_reference}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-gray-900">
                      {formatCurrency(adj.tax_amount)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          adj.status === 'POSTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : adj.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : adj.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {adj.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      {adj.status === 'DRAFT' && (
                        <button
                          onClick={() => handleApprove(adj.id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-medium"
                        >
                          Approve
                        </button>
                      )}
                      {adj.status === 'APPROVED' && (
                        <button
                          onClick={() => handlePost(adj.id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-medium"
                        >
                          Post to GL
                        </button>
                      )}
                      {adj.status === 'POSTED' && (
                        <span className="text-xs text-gray-400 italic">Posted (Locked)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Create Tax Adjustment Draft</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Tax Period *
                </label>
                <select
                  value={formData.tax_period_id}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_period_id: Number(e.target.value) })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.period_name} ({p.period_start} to {p.period_end})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Adjustment Type *
                </label>
                <select
                  value={formData.adjustment_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      adjustment_type: e.target.value as TaxAdjustment['adjustment_type'],
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="OUTPUT_VAT_INCREASE">Output VAT Increase (Under-reported sales)</option>
                  <option value="OUTPUT_VAT_DECREASE">Output VAT Decrease (Sales return / credit note)</option>
                  <option value="INPUT_VAT_INCREASE">Input VAT Increase (Omitted purchase credit)</option>
                  <option value="INPUT_VAT_DECREASE">Input VAT Decrease (Purchase return / debit note)</option>
                  <option value="CREDIT_NOTE">Credit Note (Mushak 6.7)</option>
                  <option value="DEBIT_NOTE">Debit Note (Mushak 6.8)</option>
                  <option value="ROUNDING">Rounding Adjustment</option>
                  <option value="OTHER">Other Compliance Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Reason / Compliance Justification *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  rows={2}
                  placeholder="e.g. Credit Note issued under Mushak 6.7 for damaged goods return"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Taxable Amount (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Adjustment Tax Amount (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tax_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Legal Reference / Document Ref
                </label>
                <input
                  type="text"
                  value={formData.legal_reference}
                  onChange={(e) => setFormData({ ...formData, legal_reference: e.target.value })}
                  placeholder="e.g. Mushak 6.7 Ref CN-2026-0042"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  {actionLoading ? 'Saving...' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxAdjustmentManagement;
