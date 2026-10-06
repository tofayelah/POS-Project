import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Sliders,
  AlertTriangle,
  ShoppingBag,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  DollarSign,
  Package,
  Layers,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import {
  getReplenishmentRecommendations,
  createRequisitionFromRecommendations,
} from '../../api/procurement';
import { getWarehouses } from '../../api/organization';
import { ReplenishmentRecommendation } from '../../types/procurement';

export const ProcurementRecommendations: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [lookbackDays, setLookbackDays] = useState(30);
  const [coverageDays, setCoverageDays] = useState(30);

  const [recommendations, setRecommendations] = useState<ReplenishmentRecommendation[]>([]);
  const [summary, setSummary] = useState<any | null>(null);

  // Checkbox selection
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);

  const loadWarehouses = async () => {
    try {
      const res = await getWarehouses();
      if (res.data) {
        const list = res.data.data || res.data;
        setWarehouses(list);
        if (list.length > 0) {
          setSelectedWarehouseId(String(list[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load warehouses', err);
    }
  };

  const fetchRecommendations = async () => {
    if (!selectedWarehouseId) return;
    setLoading(true);
    try {
      const res = await getReplenishmentRecommendations({
        warehouse_id: Number(selectedWarehouseId),
        lookback_days: lookbackDays,
        coverage_days: coverageDays,
      });
      if (res.success) {
        setRecommendations(res.data.recommendations || []);
        setSummary(res.data.summary);
        // Pre-select all recommendations
        setSelectedVariants((res.data.recommendations || []).map((r) => r.product_variant_id));
      }
    } catch (err) {
      console.error('Failed to load replenishment recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouseId) {
      fetchRecommendations();
    }
  }, [selectedWarehouseId, lookbackDays, coverageDays]);

  const toggleSelect = (variantId: number) => {
    if (selectedVariants.includes(variantId)) {
      setSelectedVariants(selectedVariants.filter((id) => id !== variantId));
    } else {
      setSelectedVariants([...selectedVariants, variantId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedVariants.length === recommendations.length) {
      setSelectedVariants([]);
    } else {
      setSelectedVariants(recommendations.map((r) => r.product_variant_id));
    }
  };

  const handleGenerateRequisition = async () => {
    const selectedItems = recommendations.filter((r) =>
      selectedVariants.includes(r.product_variant_id)
    );
    if (selectedItems.length === 0) {
      alert('Please select at least one item to generate requisition.');
      return;
    }

    try {
      const res = await createRequisitionFromRecommendations({
        warehouse_id: Number(selectedWarehouseId),
        title: `Automated Replenishment (${new Date().toISOString().split('T')[0]})`,
        items: selectedItems,
      });
      if (res.success) {
        alert(`Purchase Requisition #${res.data.requisition_no} created successfully!`);
        navigate('/procurement/requisitions');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create requisition');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-7 h-7 text-indigo-400" />
            {t('procurement.planning.title', 'Procurement Planning & Replenishment Intelligence')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('procurement.planning.subtitle', 'Deterministic replenishment recommendations based on sales velocity, lead times, safety stocks, and MOQs.')}
          </p>
        </div>
        <button
          onClick={handleGenerateRequisition}
          disabled={selectedVariants.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm shadow transition disabled:opacity-50"
        >
          <ShoppingBag className="w-4 h-4" />
          Generate Requisition ({selectedVariants.length})
        </button>
      </div>

      {/* Filter Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs">
        <div>
          <label className="text-slate-400 block mb-1 font-semibold uppercase">Warehouse</label>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-semibold uppercase">Sales Lookback</label>
          <select
            value={lookbackDays}
            onChange={(e) => setLookbackDays(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
          >
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-semibold uppercase">Target Coverage</label>
          <select
            value={coverageDays}
            onChange={(e) => setCoverageDays(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
          >
            <option value={15}>15 Days of Stock</option>
            <option value={30}>30 Days of Stock</option>
            <option value={45}>45 Days of Stock</option>
            <option value={60}>60 Days of Stock</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={fetchRecommendations}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-calculate
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 uppercase font-semibold">Variants Analyzed</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {summary?.total_items_analyzed ?? 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 uppercase font-semibold">Shortfall / Reorder Needed</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {summary?.items_needing_reorder ?? 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 uppercase font-semibold">Estimated Reorder Spend</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            ৳{Number(summary?.total_estimated_spend ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
            <tr>
              <th className="p-3 text-center">
                <input
                  type="checkbox"
                  checked={selectedVariants.length === recommendations.length && recommendations.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600"
                />
              </th>
              <th className="p-3">Item / SKU</th>
              <th className="p-3 text-center">Urgency</th>
              <th className="p-3 text-center">On Hand</th>
              <th className="p-3 text-center">In PO</th>
              <th className="p-3 text-center">Daily Run Rate</th>
              <th className="p-3 text-center">ROP</th>
              <th className="p-3 text-center font-bold text-indigo-400">Suggested Qty</th>
              <th className="p-3 text-right">Unit Cost</th>
              <th className="p-3 text-right">Line Total</th>
              <th className="p-3">Preferred Supplier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-500">
                  Calculating replenishment parameters...
                </td>
              </tr>
            ) : recommendations.length > 0 ? (
              recommendations.map((r) => {
                const isSelected = selectedVariants.includes(r.product_variant_id);
                return (
                  <tr
                    key={r.product_variant_id}
                    className={`hover:bg-slate-800/40 transition ${
                      isSelected ? 'bg-indigo-950/15' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(r.product_variant_id)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600"
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-100">{r.product_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{r.variant_sku}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1" title={r.reason}>
                        {r.reason}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.urgency === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : r.urgency === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {r.urgency}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">{r.stock_on_hand}</td>
                    <td className="p-3 text-center font-mono text-slate-400">+{r.incoming_po_quantity}</td>
                    <td className="p-3 text-center font-mono">{r.daily_sales_velocity} /day</td>
                    <td className="p-3 text-center font-mono font-semibold text-slate-300">{r.reorder_point}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-400 text-sm">
                      {r.recommended_quantity}
                    </td>
                    <td className="p-3 text-right font-mono">৳{Number(r.unit_cost).toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-slate-100 font-mono">
                      ৳{Number(r.estimated_line_cost).toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-300 truncate max-w-[140px]">
                      {r.preferred_supplier_name}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-500">
                  All inventory levels are optimal. No replenishment reorders needed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
