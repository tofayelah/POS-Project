import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { taxApi } from '../../api/tax';
import { TaxProfile, TaxRegistration } from '../../types/tax';
import { 
  Building2 as BuildingLibraryIcon, 
  Plus as PlusIcon, 
  Trash2 as TrashIcon, 
  CheckCircle as CheckCircleIcon,
  CreditCard as IdentificationIcon 
} from 'lucide-react';

export const TaxProfileManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [profile, setProfile] = useState<Partial<TaxProfile>>({});
  const [registrations, setRegistrations] = useState<TaxRegistration[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Registration Modal State
  const [showRegModal, setShowRegModal] = useState<boolean>(false);
  const [newReg, setNewReg] = useState<Partial<TaxRegistration>>({
    registration_type: 'VAT',
    registration_number: '',
    issuing_authority: 'National Board of Revenue (NBR)',
    issue_date: new Date().toISOString().split('T')[0],
    effective_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profRes, regRes] = await Promise.all([
        taxApi.getProfile(),
        taxApi.getRegistrations(),
      ]);
      if (profRes.data.data) {
        setProfile(profRes.data.data);
      }
      setRegistrations(regRes.data.data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error fetching tax profile' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await taxApi.updateProfile(profile);
      setProfile(res.data.data);
      setMessage({ type: 'success', text: t('tax.profileUpdated', 'Tax profile updated successfully.') });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error updating tax profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await taxApi.createRegistration(newReg);
      setShowRegModal(false);
      setNewReg({
        registration_type: 'VAT',
        registration_number: '',
        issuing_authority: 'National Board of Revenue (NBR)',
        issue_date: new Date().toISOString().split('T')[0],
        effective_date: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
      });
      fetchData();
      setMessage({ type: 'success', text: t('tax.regCreated', 'Registration added successfully.') });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error adding registration' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRegistration = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this statutory registration?')) return;
    try {
      await taxApi.deleteRegistration(id);
      fetchData();
      setMessage({ type: 'success', text: 'Registration removed.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Error deleting registration' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('tax.profileTitle', 'Tax Profile & Statutory Registrations')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('tax.profileSubtitle', 'Manage NBR Business Identification Number (BIN), TIN, Commissionerate & Circle Details')}
        </p>
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

      {/* Profile Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <BuildingLibraryIcon className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
          {t('tax.businessProfile', 'NBR Taxpayer Profile')}
        </h2>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Legal Entity Name *
              </label>
              <input
                type="text"
                required
                value={profile.legal_name || ''}
                onChange={(e) => setProfile({ ...profile, legal_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="e.g. RetailCore Superstores Ltd."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Trade Name *
              </label>
              <input
                type="text"
                required
                value={profile.trade_name || ''}
                onChange={(e) => setProfile({ ...profile, trade_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="e.g. RetailCore Mart"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Business Identification No. (BIN) *
              </label>
              <input
                type="text"
                required
                value={profile.bin || ''}
                onChange={(e) => setProfile({ ...profile, bin: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="e.g. 001234567-0101"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Taxpayer Identification No. (TIN) *
              </label>
              <input
                type="text"
                required
                value={profile.tin || ''}
                onChange={(e) => setProfile({ ...profile, tin: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="e.g. 123456789012"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Taxpayer Type
              </label>
              <select
                value={profile.taxpayer_type || 'VAT_REGISTERED'}
                onChange={(e: any) => setProfile({ ...profile, taxpayer_type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="VAT_REGISTERED">Standard VAT Registered (15%)</option>
                <option value="TURNOVER_TAX">Turnover Tax Enrolled (4%)</option>
                <option value="EXEMPT">Statutory Exempt</option>
                <option value="NON_REGISTERED">Non-Registered</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Commissionerate
              </label>
              <input
                type="text"
                value={profile.commissionerate || ''}
                onChange={(e) => setProfile({ ...profile, commissionerate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="e.g. Dhaka South"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Tax Zone
              </label>
              <input
                type="text"
                value={profile.tax_zone || ''}
                onChange={(e) => setProfile({ ...profile, tax_zone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="e.g. Zone 05"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Tax Circle
              </label>
              <input
                type="text"
                value={profile.tax_circle || ''}
                onChange={(e) => setProfile({ ...profile, tax_circle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="e.g. Circle 12"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Registered Tax Office Address
            </label>
            <textarea
              rows={2}
              value={profile.address || ''}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="e.g. Plot 12, Gulshan Avenue, Dhaka-1212"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
            >
              {saving ? t('common.saving', 'Saving...') : t('common.saveChanges', 'Save Profile')}
            </button>
          </div>
        </form>
      </div>

      {/* Statutory Registrations Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <IdentificationIcon className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
            Statutory Registration Certificates
          </h2>
          <button
            onClick={() => setShowRegModal(true)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Registration
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-700 dark:text-gray-300 uppercase">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reg. Number</th>
                <th className="px-4 py-3">Issuing Authority</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Effective Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    No statutory registrations found. Click &quot;Add Registration&quot; to configure.
                  </td>
                </tr>
              ) : (
                registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{reg.registration_type}</td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-800 dark:text-gray-200">{reg.registration_number}</td>
                    <td className="px-4 py-3">{reg.issuing_authority}</td>
                    <td className="px-4 py-3">{reg.issue_date}</td>
                    <td className="px-4 py-3">{reg.effective_date}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteRegistration(reg.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Statutory Certificate</h3>
            <form onSubmit={handleCreateRegistration} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={newReg.registration_type}
                  onChange={(e: any) => setNewReg({ ...newReg, registration_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white"
                >
                  <option value="VAT">VAT / Mushak Certificate</option>
                  <option value="INCOME_TAX">Income Tax / e-TIN Certificate</option>
                  <option value="TURNOVER_TAX">Turnover Tax Certificate</option>
                  <option value="CUSTOMS_BIN">Customs Import BIN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Certificate / Reg Number *
                </label>
                <input
                  type="text"
                  required
                  value={newReg.registration_number || ''}
                  onChange={(e) => setNewReg({ ...newReg, registration_number: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white font-mono"
                  placeholder="e.g. 001234567-0101"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newReg.issue_date || ''}
                    onChange={(e) => setNewReg({ ...newReg, issue_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newReg.effective_date || ''}
                    onChange={(e) => setNewReg({ ...newReg, effective_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs text-white bg-emerald-600 rounded hover:bg-emerald-700"
                >
                  Save Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
