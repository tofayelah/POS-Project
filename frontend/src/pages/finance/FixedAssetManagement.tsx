import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { financeApi } from '../../api/finance';
import { FixedAsset, FixedAssetCategory, FinancialPeriodExtended } from '../../types/finance';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Zap,
  TrendingDown,
  Trash2,
  Calendar,
  DollarSign,
  Tag
} from 'lucide-react';

export const FixedAssetManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<FixedAssetCategory[]>([]);
  const [periods, setPeriods] = useState<FinancialPeriodExtended[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Asset Modal
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetCode, setAssetCode] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseCost, setPurchaseCost] = useState<number>(120000);
  const [salvageValue, setSalvageValue] = useState<number>(0);
  const [usefulLifeMonths, setUsefulLifeMonths] = useState<number>(36);
  const [location, setLocation] = useState('Head Office');

  // Depreciation Run Modal
  const [showDeprecModal, setShowDeprecModal] = useState(false);
  const [deprecPeriodId, setDeprecPeriodId] = useState<number>(1);
  const [deprecDate, setDeprecDate] = useState(new Date().toISOString().split('T')[0]);

  // Asset Disposal Modal
  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [disposalType, setDisposalType] = useState<'SALE' | 'SCRAP' | 'WRITE_OFF'>('SALE');
  const [proceedsAmount, setProceedsAmount] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [astRes, catRes, perRes] = await Promise.all([
        financeApi.getAssets(),
        financeApi.getAssetCategories(),
        financeApi.getFinancialPeriods(),
      ]);
      setAssets(astRes.data.data);
      setCategories(catRes.data.data);
      setPeriods(perRes.data.data);
      if (catRes.data.data.length > 0) setCategoryId(catRes.data.data[0].id);
      if (perRes.data.data.length > 0) setDeprecPeriodId(perRes.data.data[0].id);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error loading fixed assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.createAsset({
        name: assetName,
        asset_code: assetCode,
        category_id: categoryId,
        purchase_date: purchaseDate,
        purchase_cost: purchaseCost,
        salvage_value: salvageValue,
        useful_life_months: usefulLifeMonths,
        location,
        depreciation_method: 'STRAIGHT_LINE',
      });
      setShowAssetModal(false);
      setActionSuccess('Fixed asset registered successfully');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create fixed asset');
    }
  };

  const handleRunDepreciation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await financeApi.runDepreciation({
        period_id: deprecPeriodId,
        depreciation_date: deprecDate,
      });
      setShowDeprecModal(false);
      setActionSuccess(`Depreciation run complete: ${res.data.data?.assets_processed || 0} assets processed`);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Depreciation run failed');
    }
  };

  const handleDisposeAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await financeApi.disposeAsset(selectedAsset.id, {
        disposal_date: disposalDate,
        disposal_type: disposalType,
        proceeds_amount: proceedsAmount,
      });
      setShowDisposeModal(false);
      setActionSuccess('Asset disposed and gain/loss posted to General Ledger');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to dispose asset');
    }
  };

  const formatBDT = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '৳0.00';
    return `৳${Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalCost = assets.reduce((sum, a) => sum + Number(a.purchase_cost || 0), 0);
  const totalAccum = assets.reduce((sum, a) => sum + Number(a.accumulated_depreciation || 0), 0);
  const totalBookValue = assets.reduce((sum, a) => sum + Number(a.current_book_value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('finance.assetsTitle', 'Fixed Asset Register & Depreciation Management')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('finance.assetsSubtitle', 'Straight-Line Depreciation Runs, Asset Disposal & Net Book Value Schedules')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDeprecModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Zap className="w-4 h-4 mr-2 text-amber-500" />
            Run Depreciation
          </button>
          <button
            onClick={() => setShowAssetModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Asset
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

      {/* Asset Valuation KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Fixed Asset Cost
          </span>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {formatBDT(totalCost)}
          </div>
          <p className="text-xs text-gray-400 mt-1">Historical acquisition value</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Accumulated Depreciation
          </span>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {formatBDT(totalAccum)}
          </div>
          <p className="text-xs text-gray-400 mt-1">Total recognized depreciation to date</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Current Net Book Value (NBV)
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {formatBDT(totalBookValue)}
          </div>
          <p className="text-xs text-gray-400 mt-1">Carrying balance in Balance Sheet</p>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Fixed Assets Schedule
          </h2>
          <span className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-medium">
            {assets.length} Registered Assets
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">Asset Code & Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Purchase Date</th>
                <th className="px-6 py-3 text-right">Cost</th>
                <th className="px-6 py-3 text-right">Accum Deprec</th>
                <th className="px-6 py-3 text-right">Net Book Value</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                    No fixed assets registered yet.
                  </td>
                </tr>
              ) : (
                assets.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{a.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{a.asset_code}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">{a.category?.name || 'General Asset'}</td>
                    <td className="px-6 py-4 font-mono text-xs">{a.purchase_date}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatBDT(a.purchase_cost)}</td>
                    <td className="px-6 py-4 text-right text-rose-600 font-medium">{formatBDT(a.accumulated_depreciation)}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatBDT(a.current_book_value)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        a.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {a.status === 'ACTIVE' && (
                        <button
                          onClick={() => {
                            setSelectedAsset(a);
                            setShowDisposeModal(true);
                          }}
                          className="px-2.5 py-1 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 rounded font-medium"
                        >
                          Dispose
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Register New Fixed Asset
            </h3>
            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Asset Code *</label>
                  <input
                    type="text"
                    required
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    placeholder="AST-SRV-001"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Asset Name *</label>
                  <input
                    type="text"
                    required
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="Dell PowerEdge Server"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Asset Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.default_rate_pct}% / yr)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Purchase Cost (BDT) *</label>
                  <input
                    type="number"
                    required
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Salvage Value</label>
                  <input
                    type="number"
                    value={salvageValue}
                    onChange={(e) => setSalvageValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Useful Life (Mo)</label>
                  <input
                    type="number"
                    value={usefulLifeMonths}
                    onChange={(e) => setUsefulLifeMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Run Depreciation Modal */}
      {showDeprecModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Straight-Line Monthly Depreciation Run
            </h3>
            <p className="text-xs text-gray-500">
              Posts balanced automated GL journal: DR Depreciation Expense, CR Accumulated Depreciation for all active assets.
            </p>
            <form onSubmit={handleRunDepreciation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Accounting Period *</label>
                <select
                  value={deprecPeriodId}
                  onChange={(e) => setDeprecPeriodId(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.start_date} to {p.end_date})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Depreciation Run Date</label>
                <input
                  type="date"
                  value={deprecDate}
                  onChange={(e) => setDeprecDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeprecModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Post Monthly Depreciation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Disposal Modal */}
      {showDisposeModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Dispose Fixed Asset: {selectedAsset.name}
            </h3>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Net Book Value at Disposal:</span>
                <span className="font-bold">{formatBDT(selectedAsset.current_book_value)}</span>
              </div>
              <div className="flex justify-between">
                <span>Proceeds from Disposal:</span>
                <span className="font-bold text-emerald-600">{formatBDT(proceedsAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>Projected Gain / (Loss):</span>
                <span className={proceedsAmount - selectedAsset.current_book_value >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {formatBDT(proceedsAmount - selectedAsset.current_book_value)}
                </span>
              </div>
            </div>
            <form onSubmit={handleDisposeAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Disposal Type</label>
                  <select
                    value={disposalType}
                    onChange={(e: any) => setDisposalType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="SALE">SALE (With Proceeds)</option>
                    <option value="SCRAP">SCRAP</option>
                    <option value="WRITE_OFF">WRITE_OFF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Proceeds Amount (BDT)</label>
                  <input
                    type="number"
                    value={proceedsAmount}
                    onChange={(e) => setProceedsAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisposeModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  Post Asset Disposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
