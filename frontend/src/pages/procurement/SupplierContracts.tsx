import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Calculator,
  Calendar,
  DollarSign,
  Tag,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import {
  getSupplierContracts,
  createSupplierContract,
  getSupplierPriceAgreements,
  createSupplierPriceAgreement,
  resolveProcurementPrice,
} from '../../api/procurement';
import { getSuppliers } from '../../api/suppliers';
import { getProducts } from '../../api/products';
import { SupplierContract, SupplierPriceAgreement } from '../../types/procurement';
import { Supplier } from '../../types/supplier';

export const SupplierContracts: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'contracts' | 'agreements' | 'resolver'>('contracts');
  const [loading, setLoading] = useState(true);

  const [contracts, setContracts] = useState<SupplierContract[]>([]);
  const [agreements, setAgreements] = useState<SupplierPriceAgreement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Modals
  const [showContractModal, setShowContractModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  // Forms
  const [contractForm, setContractForm] = useState({
    supplier_id: '',
    contract_number: `CNT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
    title: '',
    status: 'ACTIVE',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    contract_value: 0,
    payment_terms: 'Net 30',
  });

  const [agreementForm, setAgreementForm] = useState({
    supplier_id: '',
    product_id: '',
    product_variant_id: '',
    agreed_unit_price: 0,
    min_order_quantity: 1,
    effective_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  // Price Resolver state
  const [testSupplierId, setTestSupplierId] = useState('');
  const [testVariantId, setTestVariantId] = useState('');
  const [testQty, setTestQty] = useState(1);
  const [resolvedPriceResult, setResolvedPriceResult] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cntRes, agrRes, supRes, prdRes] = await Promise.all([
        getSupplierContracts({}),
        getSupplierPriceAgreements({}),
        getSuppliers({ all: true }),
        getProducts({ all: true }),
      ]);
      if (cntRes.data) setContracts(cntRes.data.data || cntRes.data);
      if (agrRes.data) setAgreements(agrRes.data.data || agrRes.data);
      if (supRes.data) setSuppliers(supRes.data.data || supRes.data);
      if (prdRes.data) setProducts(prdRes.data.data || prdRes.data);
    } catch (err) {
      console.error('Failed to load contract data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSupplierContract({
        ...contractForm,
        supplier_id: Number(contractForm.supplier_id),
        contract_value: Number(contractForm.contract_value),
      });
      setShowContractModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create contract');
    }
  };

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSupplierPriceAgreement({
        ...agreementForm,
        supplier_id: Number(agreementForm.supplier_id),
        product_id: Number(agreementForm.product_id),
        product_variant_id: Number(agreementForm.product_variant_id),
        agreed_unit_price: Number(agreementForm.agreed_unit_price),
        min_order_quantity: Number(agreementForm.min_order_quantity),
      });
      setShowAgreementModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create price agreement');
    }
  };

  const handleTestResolve = async () => {
    if (!testSupplierId || !testVariantId) return;
    try {
      const res = await resolveProcurementPrice(Number(testSupplierId), Number(testVariantId), testQty);
      setResolvedPriceResult(res);
    } catch (err) {
      alert('Price resolution error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-400" />
            {t('procurement.contracts.title', 'Supplier Contracts & Price Agreements')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('procurement.contracts.subtitle', 'Manage commercial frameworks, agreed price catalogs, and authoritative price resolution.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'contracts' && (
            <button
              onClick={() => setShowContractModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm shadow transition"
            >
              <Plus className="w-4 h-4" /> New Contract
            </button>
          )}
          {activeTab === 'agreements' && (
            <button
              onClick={() => setShowAgreementModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm shadow transition"
            >
              <Plus className="w-4 h-4" /> New Price Agreement
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('contracts')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'contracts'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Master Contracts ({contracts.length})
        </button>
        <button
          onClick={() => setActiveTab('agreements')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'agreements'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Agreed Product Prices ({agreements.length})
        </button>
        <button
          onClick={() => setActiveTab('resolver')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'resolver'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" /> Price Priority Resolver
        </button>
      </div>

      {/* Tab 1: Contracts Table */}
      {activeTab === 'contracts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
              <tr>
                <th className="p-3.5">Contract No</th>
                <th className="p-3.5">Title</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5 text-center">Period</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Commitment (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-mono font-semibold text-slate-100">{c.contract_number}</td>
                  <td className="p-3.5 text-slate-200">{c.title}</td>
                  <td className="p-3.5 text-slate-300">{c.supplier?.name}</td>
                  <td className="p-3.5 text-center text-xs text-slate-400">
                    {c.start_date} → {c.end_date}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-medium text-slate-100 font-mono">
                    ৳{Number(c.contract_value).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Agreements Table */}
      {activeTab === 'agreements' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
              <tr>
                <th className="p-3.5">Product & SKU</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5 text-right">Agreed Price (৳)</th>
                <th className="p-3.5 text-center">MOQ</th>
                <th className="p-3.5 text-center">Lead Time</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {agreements.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-100">{a.product?.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{a.variant?.sku}</div>
                  </td>
                  <td className="p-3.5 text-slate-300">{a.supplier?.name}</td>
                  <td className="p-3.5 text-right font-bold text-emerald-400 font-mono">
                    ৳{Number(a.agreed_unit_price).toLocaleString()}
                  </td>
                  <td className="p-3.5 text-center font-mono">{a.min_order_quantity}</td>
                  <td className="p-3.5 text-center font-mono">{a.lead_time_days} days</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Interactive Price Resolver */}
      {activeTab === 'resolver' && (
        <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-slate-100 flex items-center gap-2 text-base">
            <Calculator className="w-5 h-5 text-indigo-400" />
            Live Price Priority Resolution Engine
          </h3>
          <p className="text-xs text-slate-400">
            Test how the ERP resolves purchase unit prices (Priority: 1. Price Agreement → 2. Awarded Quotation → 3. Previous PO → 4. Base Variant Cost).
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Supplier</label>
              <select
                value={testSupplierId}
                onChange={(e) => setTestSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium">Product Variant</label>
              <select
                value={testVariantId}
                onChange={(e) => setTestVariantId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              >
                <option value="">-- Select Variant --</option>
                {products.flatMap((p) => p.variants || []).map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.name || v.sku} (SKU: {v.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium">Order Quantity</label>
              <input
                type="number"
                min="1"
                value={testQty}
                onChange={(e) => setTestQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              />
            </div>

            <button
              onClick={handleTestResolve}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs transition"
            >
              Resolve Authoritative Unit Price
            </button>
          </div>

          {resolvedPriceResult && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Resolved Unit Cost:</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  ৳{Number(resolvedPriceResult.unit_price).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Resolution Source:</span>
                <span className="font-semibold text-indigo-400">{resolvedPriceResult.source}</span>
              </div>
              <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-2">
                {resolvedPriceResult.description}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
