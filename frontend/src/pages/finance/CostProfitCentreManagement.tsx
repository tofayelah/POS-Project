import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { financeApi } from '../../api/finance';
import { CostCentre, ProfitCentre } from '../../types/finance';
import {
  Building2,
  TrendingUp,
  Plus,
  RefreshCw,
  FolderTree,
  DollarSign,
  PieChart,
  BarChart3,
  Layers,
  ChevronRight
} from 'lucide-react';

export const CostProfitCentreManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'cost' | 'profit'>('cost');
  const [loading, setLoading] = useState<boolean>(true);
  const [costCentres, setCostCentres] = useState<CostCentre[]>([]);
  const [profitCentres, setProfitCentres] = useState<ProfitCentre[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Selected centre report
  const [selectedCostCentre, setSelectedCostCentre] = useState<any>(null);
  const [costExpenseReport, setCostExpenseReport] = useState<any>(null);
  const [selectedProfitCentre, setSelectedProfitCentre] = useState<any>(null);
  const [profitabilityReport, setProfitabilityReport] = useState<any>(null);

  // Cost Centre Modal
  const [showCostModal, setShowCostModal] = useState<boolean>(false);
  const [costCode, setCostCode] = useState('');
  const [costName, setCostName] = useState('');
  const [costManager, setCostManager] = useState('');
  const [costBudgetLimit, setCostBudgetLimit] = useState<number>(100000);
  const [costParentId, setCostParentId] = useState<string>('');

  // Profit Centre Modal
  const [showProfitModal, setShowProfitModal] = useState<boolean>(false);
  const [profitCode, setProfitCode] = useState('');
  const [profitName, setProfitName] = useState('');
  const [profitTargetRev, setProfitTargetRev] = useState<number>(1000000);
  const [profitTargetMargin, setProfitTargetMargin] = useState<number>(25);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ccRes, pcRes] = await Promise.all([
        financeApi.getCostCentres(),
        financeApi.getProfitCentres(),
      ]);
      setCostCentres(ccRes.data.data);
      setProfitCentres(pcRes.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error loading cost and profit centres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCostCentre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.createCostCentre({
        code: costCode,
        name: costName,
        manager_name: costManager,
        budget_limit: costBudgetLimit,
        parent_id: costParentId ? Number(costParentId) : null,
        status: 'ACTIVE',
      });
      setShowCostModal(false);
      setActionSuccess('Cost centre registered successfully');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create cost centre');
    }
  };

  const handleCreateProfitCentre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.createProfitCentre({
        code: profitCode,
        name: profitName,
        target_revenue: profitTargetRev,
        target_margin_pct: profitTargetMargin,
        status: 'ACTIVE',
      });
      setShowProfitModal(false);
      setActionSuccess('Profit centre registered successfully');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create profit centre');
    }
  };

  const handleViewCostReport = async (cc: CostCentre) => {
    try {
      setSelectedCostCentre(cc);
      const res = await financeApi.getCostCentreExpenseReport(cc.id);
      setCostExpenseReport(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load expense report');
    }
  };

  const handleViewProfitReport = async (pc: ProfitCentre) => {
    try {
      setSelectedProfitCentre(pc);
      const res = await financeApi.getProfitCentreReport(pc.id);
      setProfitabilityReport(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load profitability report');
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
            {t('finance.centresTitle', 'Cost & Profit Centre Architecture')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('finance.centresSubtitle', 'Departmental Expense Attribution, Contribution Margins & Operating Profitability')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'cost' ? (
            <button
              onClick={() => setShowCostModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Cost Centre
            </button>
          ) : (
            <button
              onClick={() => setShowProfitModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Profit Centre
            </button>
          )}
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

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setActiveTab('cost');
            setSelectedCostCentre(null);
          }}
          className={`py-3 px-6 text-sm font-semibold border-b-2 flex items-center gap-2 ${
            activeTab === 'cost'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 className="w-4 h-4" /> Cost Centres ({costCentres.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('profit');
            setSelectedProfitCentre(null);
          }}
          className={`py-3 px-6 text-sm font-semibold border-b-2 flex items-center gap-2 ${
            activeTab === 'profit'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Profit Centres ({profitCentres.length})
        </button>
      </div>

      {/* COST CENTRES TAB */}
      {activeTab === 'cost' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Cost Centre Name</th>
                    <th className="px-6 py-3">Manager</th>
                    <th className="px-6 py-3">Parent Centre</th>
                    <th className="px-6 py-3 text-right">Budget Limit</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Reports</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {costCentres.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                        No cost centres configured yet.
                      </td>
                    </tr>
                  ) : (
                    costCentres.map((cc) => (
                      <tr key={cc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900 dark:text-white">
                          {cc.code}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                          {cc.name}
                        </td>
                        <td className="px-6 py-4 text-xs">{cc.manager_name || '—'}</td>
                        <td className="px-6 py-4 text-xs">{cc.parent?.name || 'Top-Level'}</td>
                        <td className="px-6 py-4 text-right font-medium">
                          {formatBDT(cc.budget_limit)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            cc.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {cc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleViewCostReport(cc)}
                            className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-medium"
                          >
                            Expense Report
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost Centre Expense Breakdown Details */}
          {selectedCostCentre && costExpenseReport && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Cost Centre Expenses: {selectedCostCentre.name} ({selectedCostCentre.code})
                </h3>
                <span className="text-sm font-bold text-rose-600">
                  Total Expenses: {formatBDT(costExpenseReport.total_expenses)}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase font-bold">Authorized Budget Ceiling</span>
                  <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatBDT(selectedCostCentre.budget_limit)}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase font-bold">Remaining Spending Headroom</span>
                  <div className={`text-xl font-bold mt-1 ${
                    (selectedCostCentre.budget_limit - costExpenseReport.total_expenses) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatBDT((selectedCostCentre.budget_limit || 0) - (costExpenseReport.total_expenses || 0))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROFIT CENTRES TAB */}
      {activeTab === 'profit' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Profit Centre Name</th>
                    <th className="px-6 py-3 text-right">Target Revenue</th>
                    <th className="px-6 py-3 text-right">Target Margin %</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Reports</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {profitCentres.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        No profit centres configured yet.
                      </td>
                    </tr>
                  ) : (
                    profitCentres.map((pc) => (
                      <tr key={pc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900 dark:text-white">
                          {pc.code}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                          {pc.name}
                        </td>
                        <td className="px-6 py-4 text-right font-medium">
                          {formatBDT(pc.target_revenue)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium">
                          {pc.target_margin_pct}%
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            pc.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {pc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleViewProfitReport(pc)}
                            className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-medium"
                          >
                            Profitability Report
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Profit Centre Details */}
          {selectedProfitCentre && profitabilityReport && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Operating Profitability: {selectedProfitCentre.name} ({selectedProfitCentre.code})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase font-bold">Attributed Revenue</span>
                  <div className="text-xl font-bold text-emerald-600 mt-1">
                    {formatBDT(profitabilityReport.revenue)}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase font-bold">Direct Costs</span>
                  <div className="text-xl font-bold text-rose-600 mt-1">
                    {formatBDT(profitabilityReport.direct_costs)}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase font-bold">Contribution Margin</span>
                  <div className="text-xl font-bold text-indigo-600 mt-1">
                    {formatBDT(profitabilityReport.contribution_margin)}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase font-bold">Operating Margin %</span>
                  <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {profitabilityReport.margin_pct}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Cost Centre Modal */}
      {showCostModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Create Cost Centre
            </h3>
            <form onSubmit={handleCreateCostCentre} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Centre Code *</label>
                <input
                  type="text"
                  required
                  value={costCode}
                  onChange={(e) => setCostCode(e.target.value)}
                  placeholder="CC-MKT-01"
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Centre Name *</label>
                <input
                  type="text"
                  required
                  value={costName}
                  onChange={(e) => setCostName(e.target.value)}
                  placeholder="Marketing & Brand Activation"
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Manager</label>
                  <input
                    type="text"
                    value={costManager}
                    onChange={(e) => setCostManager(e.target.value)}
                    placeholder="Manager Name"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Budget Limit (BDT)</label>
                  <input
                    type="number"
                    value={costBudgetLimit}
                    onChange={(e) => setCostBudgetLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Parent Cost Centre</label>
                <select
                  value={costParentId}
                  onChange={(e) => setCostParentId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">None (Top-Level Centre)</option>
                  {costCentres.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCostModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Register Cost Centre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Profit Centre Modal */}
      {showProfitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Create Profit Centre
            </h3>
            <form onSubmit={handleCreateProfitCentre} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Centre Code *</label>
                <input
                  type="text"
                  required
                  value={profitCode}
                  onChange={(e) => setProfitCode(e.target.value)}
                  placeholder="PC-ONLINE-01"
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Profit Centre Name *</label>
                <input
                  type="text"
                  required
                  value={profitName}
                  onChange={(e) => setProfitName(e.target.value)}
                  placeholder="E-Commerce & Digital Channels"
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Target Revenue (BDT)</label>
                  <input
                    type="number"
                    value={profitTargetRev}
                    onChange={(e) => setProfitTargetRev(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Target Margin %</label>
                  <input
                    type="number"
                    value={profitTargetMargin}
                    onChange={(e) => setProfitTargetMargin(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfitModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Register Profit Centre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
