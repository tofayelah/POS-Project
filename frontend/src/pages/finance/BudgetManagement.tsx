import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useTranslation } from '../../i18n';
import { financeApi } from '../../api/finance';
import { Budget, BudgetControl, CostCentre } from '../../types/finance';
import {
  Percent,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileText,
  Sliders,
  History,
  ArrowRight,
  ShieldAlert,
  Edit2
} from 'lucide-react';

export const BudgetManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [controls, setControls] = useState<BudgetControl[]>([]);
  const [costCentres, setCostCentres] = useState<CostCentre[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create Budget Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newFiscalYearId, setNewFiscalYearId] = useState<number>(1);
  const [newCostCentreId, setNewCostCentreId] = useState<string>('');
  const [newPeriodType, setNewPeriodType] = useState<'ANNUAL' | 'QUARTERLY' | 'MONTHLY'>('ANNUAL');
  const [newLines, setNewLines] = useState<Array<{ account_id: number; allocated_amount: number }>>([
    { account_id: 1, allocated_amount: 500000 },
  ]);

  // Create Control Modal state
  const [showControlModal, setShowControlModal] = useState<boolean>(false);
  const [controlLevel, setControlLevel] = useState<'ALLOW' | 'WARNING' | 'APPROVAL_REQUIRED' | 'BLOCK'>('WARNING');
  const [warningThreshold, setWarningThreshold] = useState<number>(85);
  const [hardStopThreshold, setHardStopThreshold] = useState<number>(100);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [budRes, ctrlRes, ccRes] = await Promise.all([
        financeApi.getBudgets(),
        financeApi.getBudgetControls(),
        financeApi.getCostCentres(),
      ]);
      setBudgets(budRes.data.data);
      setControls(ctrlRes.data.data);
      setCostCentres(ccRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('common.errorLoadingData', 'Error loading budgets'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: newBudgetName,
        fiscal_year_id: newFiscalYearId,
        cost_centre_id: newCostCentreId ? Number(newCostCentreId) : null,
        period_type: newPeriodType,
        lines: newLines,
      };
      await financeApi.createBudget(payload);
      setShowCreateModal(false);
      setActionSuccess(t('finance.budgetCreated', 'Budget created successfully'));
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create budget');
    }
  };

  const handleCreateControl = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.createBudgetControl({
        control_level: controlLevel,
        warning_threshold_pct: warningThreshold,
        hard_stop_threshold_pct: hardStopThreshold,
        is_active: true,
      });
      setShowControlModal(false);
      setActionSuccess(t('finance.controlCreated', 'Budget control policy saved'));
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save control policy');
    }
  };

  const handleBudgetLifecycle = async (id: number, action: 'submit' | 'approve' | 'activate' | 'revise') => {
    try {
      if (action === 'submit') await financeApi.submitBudget(id);
      if (action === 'approve') await financeApi.approveBudget(id);
      if (action === 'activate') await financeApi.activateBudget(id);
      if (action === 'revise') await financeApi.createRevision(id);
      setActionSuccess(`Budget ${action} completed successfully`);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${action} budget`);
    }
  };

  const formatBDT = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '৳0.00';
    return `৳${Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('finance.budgetsTitle', 'Budget Management & Controls')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('finance.budgetsSubtitle', 'Operational Budgets, Versioning, Approval Lifecycle & Control Rules')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowControlModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Sliders className="w-4 h-4 mr-2" />
            {t('finance.controlRules', 'Control Rules')}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('finance.newBudget', 'New Budget')}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500 rounded text-emerald-700 dark:text-emerald-300 text-sm flex justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Budgets List Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {t('finance.budgetsList', 'Active & Historical Budgets')}
          </h2>
          <span className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-medium">
            {budgets.length} {t('finance.records', 'Budgets')}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">{t('finance.budgetName', 'Budget Name')}</th>
                <th className="px-6 py-3">{t('finance.costCentre', 'Cost Centre')}</th>
                <th className="px-6 py-3">{t('finance.periodType', 'Period')}</th>
                <th className="px-6 py-3">{t('finance.version', 'Version')}</th>
                <th className="px-6 py-3 text-right">{t('finance.allocatedAmount', 'Allocated Budget')}</th>
                <th className="px-6 py-3 text-center">{t('common.status', 'Status')}</th>
                <th className="px-6 py-3 text-center">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    {t('finance.noBudgetsFound', 'No budgets configured yet.')}
                  </td>
                </tr>
              ) : (
                budgets.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      {b.name}
                    </td>
                    <td className="px-6 py-4">
                      {b.cost_centre?.name || 'All Company'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                        {b.period_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium">
                      v{b.version}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                      {formatBDT(b.total_budgeted_amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          b.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : b.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'
                            : b.status === 'SUBMITTED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400'
                            : b.status === 'REVISED'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {b.status === 'DRAFT' && (
                          <button
                            onClick={() => handleBudgetLifecycle(b.id, 'submit')}
                            className="px-2 py-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 rounded"
                          >
                            Submit
                          </button>
                        )}
                        {b.status === 'SUBMITTED' && (
                          <button
                            onClick={() => handleBudgetLifecycle(b.id, 'approve')}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
                          >
                            Approve
                          </button>
                        )}
                        {b.status === 'APPROVED' && (
                          <button
                            onClick={() => handleBudgetLifecycle(b.id, 'activate')}
                            className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded"
                          >
                            Activate
                          </button>
                        )}
                        {b.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleBudgetLifecycle(b.id, 'revise')}
                            className="px-2 py-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 rounded flex items-center"
                          >
                            <History className="w-3 h-3 mr-1" /> Revise
                          </button>
                        )}
                        <Link
                          to={`/finance/budgets/${b.id}/variance`}
                          className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded flex items-center"
                        >
                          Variance <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Budget Controls Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t('finance.activeControlRules', 'Active Spending Control Policies')}
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {controls.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-3">No active hard controls registered. Standard policies apply.</p>
          ) : (
            controls.map((c) => (
              <div key={c.id} className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                    Control: {c.control_level}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                    {c.is_active ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <div className="mt-2 text-xs space-y-1 text-gray-600 dark:text-gray-400">
                  <div>Warning Threshold: <span className="font-bold text-amber-600">{c.warning_threshold_pct}%</span></div>
                  <div>Hard Stop Threshold: <span className="font-bold text-rose-600">{c.hard_stop_threshold_pct}%</span></div>
                  <div>Cost Centre: {c.cost_centre?.name || 'Company Wide'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Budget Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('finance.createBudgetTitle', 'Create Financial Budget')}
            </h3>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Budget Name *
                </label>
                <input
                  type="text"
                  required
                  value={newBudgetName}
                  onChange={(e) => setNewBudgetName(e.target.value)}
                  placeholder="e.g. FY 2026-2027 Operations Budget"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Period Frequency
                  </label>
                  <select
                    value={newPeriodType}
                    onChange={(e: any) => setNewPeriodType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="ANNUAL">Annual</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cost Centre
                  </label>
                  <select
                    value={newCostCentreId}
                    onChange={(e) => setNewCostCentreId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Company Wide</option>
                    {costCentres.map((cc) => (
                      <option key={cc.id} value={cc.id}>{cc.name} ({cc.code})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Allocated Amount (BDT) *
                </label>
                <input
                  type="number"
                  required
                  value={newLines[0].allocated_amount}
                  onChange={(e) => setNewLines([{ account_id: 1, allocated_amount: Number(e.target.value) }])}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Create Draft Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Control Policy Modal */}
      {showControlModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Configure Spending Control Policy
            </h3>
            <form onSubmit={handleCreateControl} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enforcement Level
                </label>
                <select
                  value={controlLevel}
                  onChange={(e: any) => setControlLevel(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="ALLOW">ALLOW (Log Only)</option>
                  <option value="WARNING">WARNING (Alert user)</option>
                  <option value="APPROVAL_REQUIRED">APPROVAL_REQUIRED (Supervisor Overrule)</option>
                  <option value="BLOCK">BLOCK (Hard Stop)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Warning Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hard Stop Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={hardStopThreshold}
                    onChange={(e) => setHardStopThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowControlModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
