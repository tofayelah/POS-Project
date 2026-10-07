import React, { useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Eye,
  Award,
  Send,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  UserPlus,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import {
  getRfqs,
  createRfq,
  inviteRfqSuppliers,
  recordRfqQuotation,
  compareRfqQuotations,
  awardRfqQuotation,
} from '../../api/procurement';
import { getSuppliers } from '../../api/suppliers';
import { getProducts } from '../../api/products';
import { Rfq, RfqComparisonMatrix } from '../../types/procurement';
import { Supplier } from '../../types/supplier';

export const RfqManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [selectedRfq, setSelectedRfq] = useState<Rfq | null>(null);
  const [comparisonMatrix, setComparisonMatrix] = useState<RfqComparisonMatrix | null>(null);

  // Form states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [createForm, setCreateForm] = useState({
    title: '',
    issue_date: new Date().toISOString().split('T')[0],
    deadline_date: '',
    notes: '',
    invited_supplier_ids: [] as number[],
    items: [{ product_id: '', product_variant_id: '', requested_quantity: 1, target_unit_price: '' }],
  });

  const [quoteForm, setQuoteForm] = useState({
    supplier_id: '',
    quotation_number: '',
    lead_time_days: 7,
    payment_terms: 'Net 30',
    items: [] as any[],
  });

  const [inviteSupplierIds, setInviteSupplierIds] = useState<number[]>([]);

  const fetchRfqs = async () => {
    setLoading(true);
    try {
      const res = await getRfqs({ status: statusFilter, search });
      if (res.success) {
        setRfqs(res.data.data || res.data);
      }
    } catch (err) {
      console.error('Failed to load RFQs', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [supRes, prdRes] = await Promise.all([
        getSuppliers({ all: true }),
        getProducts({ all: true }),
      ]);
      if (supRes?.data) setSuppliers(Array.isArray(supRes.data) ? supRes.data : (supRes.data as any).data || []);
      if (prdRes?.data) setProducts(Array.isArray(prdRes.data) ? prdRes.data : (prdRes.data as any).data || []);
    } catch (err) {
      console.error('Failed to load dropdowns', err);
    }
  };

  useEffect(() => {
    fetchRfqs();
  }, [statusFilter, search]);

  useEffect(() => {
    loadDropdowns();
  }, []);

  const handleOpenQuoteModal = (rfq: Rfq) => {
    setSelectedRfq(rfq);
    const initialItems = (rfq.items || []).map((it) => ({
      rfq_item_id: it.id,
      product_id: it.product_id,
      product_variant_id: it.product_variant_id,
      product_name: it.product?.name,
      quantity: Number(it.requested_quantity),
      unit_price: Number(it.target_unit_price || 0),
    }));
    setQuoteForm({
      supplier_id: '',
      quotation_number: `QT-${Date.now().toString().slice(-6)}`,
      lead_time_days: 7,
      payment_terms: 'Net 30',
      items: initialItems,
    });
    setShowQuoteModal(true);
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfq || !quoteForm.supplier_id) return;
    try {
      await recordRfqQuotation(selectedRfq.id, {
        supplier_id: Number(quoteForm.supplier_id),
        quotation_number: quoteForm.quotation_number,
        lead_time_days: Number(quoteForm.lead_time_days),
        payment_terms: quoteForm.payment_terms,
        items: quoteForm.items,
      });
      setShowQuoteModal(false);
      fetchRfqs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record quotation');
    }
  };

  const handleOpenCompare = async (rfq: Rfq) => {
    setSelectedRfq(rfq);
    try {
      const res = await compareRfqQuotations(rfq.id);
      if (res.success) {
        setComparisonMatrix(res.data);
        setShowCompareModal(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to compare quotations');
    }
  };

  const handleAwardQuote = async (quotationId: number) => {
    if (!selectedRfq) return;
    if (!confirm('Award this quotation? This will automatically create an approved draft Purchase Order.')) return;
    try {
      const res = await awardRfqQuotation(selectedRfq.id, quotationId, 'Awarded based on lowest cost and verified reliability.');
      if (res.success) {
        alert(`Quotation awarded! Purchase Order #${res.data.purchase_order?.po_number} generated.`);
        setShowCompareModal(false);
        fetchRfqs();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to award quotation');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-7 h-7 text-purple-400" />
            {t('procurement.rfq.title', 'Requests for Quotation (RFQ) & Tenders')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('procurement.rfq.subtitle', 'Publish tender RFQs, collect supplier bids, compare matrix rankings, and award contracts.')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg text-sm shadow transition"
        >
          <Plus className="w-4 h-4" />
          {t('procurement.rfq.newRfq', 'Create New RFQ')}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('common.search', 'Search RFQ number or title...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">{t('common.allStatuses', 'All Statuses')}</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="UNDER_EVALUATION">UNDER EVALUATION</option>
            <option value="AWARDED">AWARDED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
      </div>

      {/* RFQ List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">{t('procurement.rfqNumber', 'RFQ Number')}</th>
                <th className="px-4 py-3">{t('procurement.title', 'Title')}</th>
                <th className="px-4 py-3 text-center">{t('procurement.deadline', 'Deadline')}</th>
                <th className="px-4 py-3 text-center">{t('procurement.bids', 'Quotations')}</th>
                <th className="px-4 py-3 text-center">{t('procurement.status', 'Status')}</th>
                <th className="px-4 py-3 text-center">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    {t('common.loading', 'Loading RFQs...')}
                  </td>
                </tr>
              ) : rfqs.length > 0 ? (
                rfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-semibold text-slate-100 font-mono">
                      {rfq.rfq_number}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      <div>{rfq.title}</div>
                      <div className="text-xs text-slate-500">{rfq.items?.length || 0} line items</div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400">
                      {rfq.deadline_date || 'None'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-slate-200 bg-slate-800 px-2.5 py-0.5 rounded-full text-xs">
                        {rfq.quotations?.length || 0} Bids
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        rfq.status === 'AWARDED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : rfq.status === 'UNDER_EVALUATION'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : rfq.status === 'SENT'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {rfq.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {rfq.status !== 'AWARDED' && (
                          <button
                            onClick={() => handleOpenQuoteModal(rfq)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition flex items-center gap-1"
                            title="Submit Supplier Quote"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Bid
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenCompare(rfq)}
                          className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs rounded transition flex items-center gap-1"
                          title="Compare Quotes & Advisory Rankings"
                        >
                          <TrendingUp className="w-3.5 h-3.5" /> Compare Matrix
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    {t('common.noData', 'No RFQs found.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-Side Quotation Comparison & Advisory Modal */}
      {showCompareModal && comparisonMatrix && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Quotation Comparison & Advisory Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  RFQ: {comparisonMatrix.rfq_number} ({comparisonMatrix.quotations_count} bids submitted)
                </p>
              </div>
              <button onClick={() => setShowCompareModal(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Advisory Recommendation Banner */}
              <div className="p-4 bg-purple-950/30 border border-purple-800/40 rounded-xl flex items-start gap-3">
                <Award className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-purple-300">
                    Deterministic Advisory Recommendation
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">{comparisonMatrix.advisory_notes}</p>
                </div>
              </div>

              {/* Side-by-side Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase">
                    <tr>
                      <th className="p-3">Supplier</th>
                      <th className="p-3 text-center">Score</th>
                      <th className="p-3 text-center">Lead Time</th>
                      <th className="p-3 text-right">Grand Total (৳)</th>
                      <th className="p-3 text-center">Advisory Rank</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {comparisonMatrix.comparison.map((q) => {
                      const isRecommended = q.quotation_id === comparisonMatrix.recommended_quotation_id;
                      return (
                        <tr
                          key={q.quotation_id}
                          className={`${isRecommended ? 'bg-purple-950/15' : 'hover:bg-slate-800/40'} transition`}
                        >
                          <td className="p-3">
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              {q.supplier_name}
                              {isRecommended && (
                                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                                  BEST
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Quote #{q.quotation_number} • Terms: {q.payment_terms || 'Standard'}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-slate-200">{q.supplier_score}%</span>
                          </td>
                          <td className="p-3 text-center font-mono">{q.lead_time_days} days</td>
                          <td className="p-3 text-right font-bold text-emerald-400 font-mono text-sm">
                            ৳{Number(q.grand_total).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-800 text-slate-200">
                              {q.advisory_rank_score} pts
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {q.is_awarded ? (
                              <span className="text-emerald-400 font-bold text-xs flex items-center justify-center gap-1">
                                <CheckCircle className="w-4 h-4" /> Awarded
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAwardQuote(q.quotation_id)}
                                className={`px-3 py-1.5 rounded text-xs font-semibold shadow transition ${
                                  isRecommended
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                }`}
                              >
                                Award & PO
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Quotation Modal */}
      {showQuoteModal && selectedRfq && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Record Supplier Quotation
            </h3>
            <form onSubmit={handleQuoteSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Bidding Supplier *</label>
                  <select
                    required
                    value={quoteForm.supplier_id}
                    onChange={(e) => setQuoteForm({ ...quoteForm, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.supplier_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Quoted Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={quoteForm.lead_time_days}
                    onChange={(e) => setQuoteForm({ ...quoteForm, lead_time_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>
              </div>

              {/* Items Price Entry */}
              <div className="space-y-2">
                <label className="text-slate-300 block font-medium uppercase text-[11px]">Quoted Line Prices</label>
                {quoteForm.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="flex-1">
                      <span className="font-semibold text-slate-200">{it.product_name}</span>
                      <span className="text-slate-500 block text-[11px]">Qty: {it.quantity}</span>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Unit Price"
                        value={it.unit_price}
                        onChange={(e) => {
                          const updated = [...quoteForm.items];
                          updated[idx].unit_price = Number(e.target.value);
                          setQuoteForm({ ...quoteForm, items: updated });
                        }}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                >
                  Save Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
