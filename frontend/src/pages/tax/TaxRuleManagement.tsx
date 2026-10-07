import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { taxApi } from '../../api/tax';
import { TaxRule, TaxCategory } from '../../types/tax';
import { Plus as PlusIcon, CheckCircle as CheckCircleIcon, XCircle as XCircleIcon, Tag as TagIcon } from 'lucide-react';

export const TaxRuleManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [categories, setCategories] = useState<TaxCategory[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<Partial<TaxRule>>({
    code: '',
    name: '',
    tax_category_id: 1,
    rate: 15,
    calculation_method: 'PERCENTAGE',
    base_method: 'NET_AMOUNT',
    inclusive_allowed: true,
    exclusive_allowed: true,
    effective_from: new Date().toISOString().split('T')[0],
    legal_reference: 'VAT and SD Act 2012, Sec 15(3)',
    status: 'ACTIVE',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, catRes] = await Promise.all([
        taxApi.getRules(),
        taxApi.getCategories(),
      ]);
      setRules(rulesRes.data.data);
      setCategories(catRes.data.data);
      if (catRes.data.data.length > 0 && !formData.tax_category_id) {
        setFormData((prev) => ({ ...prev, tax_category_id: catRes.data.data[0].id }));
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error loading tax rules' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (rule: TaxRule) => {
    const nextStatus = rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await taxApi.toggleRuleStatus(rule.id, nextStatus);
      fetchData();
      setMessage({ type: 'success', text: `Tax rule ${rule.code} set to ${nextStatus}.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error updating status' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await taxApi.createRule(formData);
      setShowModal(false);
      fetchData();
      setMessage({ type: 'success', text: 'Tax rule created successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error creating tax rule' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('tax.rulesTitle', 'Dynamic Tax Rules & Rates')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('tax.rulesSubtitle', 'Effective-Dated VAT, Supplementary Duty & Statutory Exemption Rules')}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
        >
          <PlusIcon className="w-5 h-5 mr-1" />
          {t('tax.createRule', 'Create Tax Rule')}
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

      {/* Rules Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-700 dark:text-gray-300 uppercase">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Rule Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Rate (%)</th>
                <th className="px-4 py-3">Effective Range</th>
                <th className="px-4 py-3">Legal Reference</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No tax rules configured. Click &quot;Create Tax Rule&quot; to configure standard rates.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">{rule.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{rule.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {rule.category?.name || 'Standard'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 dark:text-white">
                      {Number(rule.rate).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {rule.effective_from} {rule.effective_to ? `to ${rule.effective_to}` : '(Indefinite)'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={rule.legal_reference || ''}>
                      {rule.legal_reference || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        rule.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {rule.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleStatus(rule)}
                        className={`text-xs px-2.5 py-1 rounded font-medium ${
                          rule.status === 'ACTIVE'
                            ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300'
                        }`}
                      >
                        {rule.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Configure Effective Tax Rule</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Rule Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm font-mono border rounded dark:bg-gray-700 dark:text-white"
                    placeholder="e.g. VAT-15-STD"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Tax Category
                  </label>
                  <select
                    value={formData.tax_category_id}
                    onChange={(e) => setFormData({ ...formData, tax_category_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. Standard VAT 15%"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Tax Rate (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.rate ?? 0}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm font-mono border rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.effective_from || ''}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Statutory / Legal Reference
                </label>
                <input
                  type="text"
                  value={formData.legal_reference || ''}
                  onChange={(e) => setFormData({ ...formData, legal_reference: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. VAT and Supplementary Duty Act 2012, Sec 15(3)"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700"
                >
                  Save Tax Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
