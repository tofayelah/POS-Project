import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { taxApi } from '../../api/tax';
import { TaxPeriod } from '../../types/tax';
import { 
  Calendar as CalendarIcon, 
  Lock as LockClosedIcon, 
  FileCheck as DocumentCheckIcon, 
  Plus as PlusIcon,
  Award as CheckBadgeIcon
} from 'lucide-react';

export const TaxPeriodManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [periods, setPeriods] = useState<TaxPeriod[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showFileModal, setShowFileModal] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TaxPeriod | null>(null);
  const [filingRef, setFilingRef] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<Partial<TaxPeriod>>({
    period_name: '',
    period_start: new Date().toISOString().slice(0, 7) + '-01',
    period_end: new Date().toISOString().slice(0, 10),
    status: 'OPEN',
  });

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const res = await taxApi.getPeriods();
      setPeriods(res.data.data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error loading tax periods' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await taxApi.createPeriod(formData);
      setShowCreateModal(false);
      fetchPeriods();
      setMessage({ type: 'success', text: 'Tax period created successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error creating period' });
    } finally {
      setSaving(false);
    }
  };

  const handleLock = async (id: number) => {
    if (!window.confirm('Lock and finalize this tax period? Normal transaction postings will be blocked.')) return;
    try {
      await taxApi.lockPeriod(id);
      fetchPeriods();
      setMessage({ type: 'success', text: 'Tax period locked/finalized.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error locking period' });
    }
  };

  const handleFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriod) return;
    try {
      setSaving(true);
      await taxApi.filePeriod(selectedPeriod.id, filingRef);
      setShowFileModal(false);
      setFilingRef('');
      setSelectedPeriod(null);
      fetchPeriods();
      setMessage({ type: 'success', text: 'Tax return marked as FILED.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error filing period' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (id: number) => {
    if (!window.confirm('Close this tax period permanently?')) return;
    try {
      await taxApi.closePeriod(id);
      fetchPeriods();
      setMessage({ type: 'success', text: 'Tax period CLOSED.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error closing period' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('tax.periodsTitle', 'Tax Audit & Return Periods')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('tax.periodsSubtitle', 'Manage Monthly VAT Periods, Lock Cut-Off Dates & Filing Records')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
        >
          <PlusIcon className="w-5 h-5 mr-1" />
          {t('tax.createPeriod', 'Open New Period')}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm border-l-4 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-500' 
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-500'
        }`}>
          {message.text}
        </div>
      )}

      {/* Periods Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-700 dark:text-gray-300 uppercase">
              <tr>
                <th className="px-4 py-3">Period Name</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Locked / Finalized</th>
                <th className="px-4 py-3">Filing Reference</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No tax periods configured.
                  </td>
                </tr>
              ) : (
                periods.map((p) => {
                  const isLocked = ['FINALIZED', 'FILED', 'CLOSED'].includes(p.status);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2 text-indigo-500" />
                        {p.period_name}
                      </td>
                      <td className="px-4 py-3">{p.period_start}</td>
                      <td className="px-4 py-3">{p.period_end}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          p.status === 'OPEN'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : p.status === 'FINALIZED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : p.status === 'FILED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.locked_at ? (
                          <span className="flex items-center text-amber-600">
                            <LockClosedIcon className="w-3.5 h-3.5 mr-1" />
                            {new Date(p.locked_at).toLocaleDateString()}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.filing_reference || '—'}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {p.status === 'OPEN' && (
                          <button
                            onClick={() => handleLock(p.id)}
                            className="text-xs px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded"
                          >
                            Lock Period
                          </button>
                        )}
                        {p.status === 'FINALIZED' && (
                          <button
                            onClick={() => {
                              setSelectedPeriod(p);
                              setShowFileModal(true);
                            }}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
                          >
                            Mark Filed
                          </button>
                        )}
                        {p.status === 'FILED' && (
                          <button
                            onClick={() => handleClose(p.id)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Open Tax Period</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Period Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.period_name || ''}
                  onChange={(e) => setFormData({ ...formData, period_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. 2026-10 (October 2026)"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.period_start || ''}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.period_end || ''}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700"
                >
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Modal */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Record NBR Filing</h3>
            <p className="text-xs text-gray-500 mb-4">
              Enter the NBR return filing token / acknowledgement receipt number.
            </p>
            <form onSubmit={handleFile} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  NBR Filing Reference *
                </label>
                <input
                  type="text"
                  required
                  value={filingRef}
                  onChange={(e) => setFilingRef(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white font-mono"
                  placeholder="e.g. NBR-VAT-202610-9842"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowFileModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Confirm Filing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
