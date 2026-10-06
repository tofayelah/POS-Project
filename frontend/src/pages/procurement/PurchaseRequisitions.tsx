import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  ArrowRight,
  Send,
  Check,
  Ban,
  ShoppingBag,
  Layers,
  Trash2,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import {
  getRequisitions,
  createRequisition,
  submitRequisition,
  reviewRequisition,
  approveRequisition,
  rejectRequisition,
  cancelRequisition,
  convertRequisitionToPo,
  convertRequisitionToRfq,
  getRequisitionNextNumber,
} from '../../api/procurement';
import { getSuppliers } from '../../api/suppliers';
import { getProducts } from '../../api/products';
import { getWarehouses } from '../../api/organization';
import { PurchaseRequisition, RequisitionStatus, RequisitionPriority } from '../../types/procurement';
import { Supplier } from '../../types/supplier';

export const PurchaseRequisitions: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<PurchaseRequisition | null>(null);
  const [showConvertPoModal, setShowConvertPoModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Dropdown options
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Create form state
  const [formData, setFormData] = useState({
    warehouse_id: '',
    title: '',
    priority: 'MEDIUM' as RequisitionPriority,
    required_date: '',
    notes: '',
    items: [
      { product_id: '', product_variant_id: '', requested_quantity: 1, estimated_unit_cost: 0, preferred_supplier_id: '' },
    ],
  });

  // Convert to PO state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await getRequisitions({
        status: statusFilter,
        priority: priorityFilter,
        search,
      });
      if (res.success) {
        setRequisitions(res.data.data || res.data);
      }
    } catch (err) {
      console.error('Failed to fetch requisitions', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [whRes, supRes, prdRes] = await Promise.all([
        getWarehouses(),
        getSuppliers({ all: true }),
        getProducts({ all: true }),
      ]);
      if (whRes.data) setWarehouses(whRes.data.data || whRes.data);
      if (supRes.data) setSuppliers(supRes.data.data || supRes.data);
      if (prdRes.data) setProducts(prdRes.data.data || prdRes.data);
    } catch (err) {
      console.error('Failed to load dropdowns', err);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => {
    loadDropdowns();
  }, []);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { product_id: '', product_variant_id: '', requested_quantity: 1, estimated_unit_cost: 0, preferred_supplier_id: '' },
      ],
    });
  };

  const handleRemoveItem = (idx: number) => {
    const updated = [...formData.items];
    updated.splice(idx, 1);
    setFormData({ ...formData, items: updated });
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const updated = [...formData.items];
    updated[idx] = { ...updated[idx], [field]: val };

    if (field === 'product_id') {
      const prod = products.find((p) => p.id === Number(val));
      if (prod && prod.variants && prod.variants.length > 0) {
        updated[idx].product_variant_id = prod.variants[0].id;
        updated[idx].estimated_unit_cost = prod.variants[0].purchase_cost || prod.variants[0].cost_price || 0;
      }
    } else if (field === 'product_variant_id') {
      const prod = products.find((p) => p.id === Number(updated[idx].product_id));
      if (prod && prod.variants) {
        const variant = prod.variants.find((v: any) => v.id === Number(val));
        if (variant) {
          updated[idx].estimated_unit_cost = variant.purchase_cost || variant.cost_price || 0;
        }
      }
    }

    setFormData({ ...formData, items: updated });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.warehouse_id) return;

    try {
      const payload = {
        warehouse_id: Number(formData.warehouse_id),
        title: formData.title,
        priority: formData.priority,
        required_date: formData.required_date || null,
        notes: formData.notes,
        items: formData.items.map((it) => ({
          product_id: Number(it.product_id),
          product_variant_id: Number(it.product_variant_id),
          requested_quantity: Number(it.requested_quantity),
          estimated_unit_cost: Number(it.estimated_unit_cost),
          preferred_supplier_id: it.preferred_supplier_id ? Number(it.preferred_supplier_id) : null,
        })),
      };

      const res = await createRequisition(payload);
      if (res.success) {
        setShowCreateModal(false);
        fetchRequisitions();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create requisition');
    }
  };

  const handleAction = async (action: 'submit' | 'review' | 'approve' | 'cancel') => {
    if (!selectedReq) return;
    try {
      if (action === 'submit') await submitRequisition(selectedReq.id);
      if (action === 'review') await reviewRequisition(selectedReq.id);
      if (action === 'approve') await approveRequisition(selectedReq.id);
      if (action === 'cancel') await cancelRequisition(selectedReq.id);

      setSelectedReq(null);
      fetchRequisitions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedReq || !rejectionReason) return;
    try {
      await rejectRequisition(selectedReq.id, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedReq(null);
      fetchRequisitions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rejection failed');
    }
  };

  const handleConvertToPoSubmit = async () => {
    if (!selectedReq || !selectedSupplierId) return;
    try {
      await convertRequisitionToPo(selectedReq.id, Number(selectedSupplierId));
      setShowConvertPoModal(false);
      setSelectedSupplierId('');
      setSelectedReq(null);
      fetchRequisitions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert to PO');
    }
  };

  const handleConvertToRfq = async () => {
    if (!selectedReq) return;
    if (!confirm('Convert this requisition into a tender RFQ?')) return;
    try {
      await convertRequisitionToRfq(selectedReq.id);
      setSelectedReq(null);
      fetchRequisitions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert to RFQ');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-400" />
            {t('procurement.requisitions.title', 'Purchase Requisitions')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('procurement.requisitions.subtitle', 'Departmental purchase requests, multi-tier approvals, and conversion to PO or RFQ.')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm shadow transition"
        >
          <Plus className="w-4 h-4" />
          {t('procurement.requisitions.newRequisition', 'New Requisition')}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('common.search', 'Search requisition no or title...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">{t('common.allStatuses', 'All Statuses')}</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="CONVERTED">CONVERTED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">{t('common.allPriorities', 'All Priorities')}</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>
      </div>

      {/* Requisitions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">{t('procurement.requisitionNo', 'Req Number')}</th>
                <th className="px-4 py-3">{t('procurement.title', 'Title')}</th>
                <th className="px-4 py-3">{t('procurement.warehouse', 'Warehouse')}</th>
                <th className="px-4 py-3 text-center">{t('procurement.priority', 'Priority')}</th>
                <th className="px-4 py-3 text-center">{t('procurement.status', 'Status')}</th>
                <th className="px-4 py-3 text-right">{t('procurement.estimatedTotal', 'Estimated (৳)')}</th>
                <th className="px-4 py-3 text-center">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                    {t('common.loading', 'Loading requisitions...')}
                  </td>
                </tr>
              ) : requisitions.length > 0 ? (
                requisitions.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-semibold text-slate-100 font-mono">
                      {req.requisition_no}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      <div>{req.title || 'Untitled Requisition'}</div>
                      <div className="text-xs text-slate-500">{req.items?.length || 0} items</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {req.warehouse?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        req.priority === 'URGENT'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : req.priority === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : req.status === 'CONVERTED'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : req.status === 'UNDER_REVIEW'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : req.status === 'SUBMITTED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-200">
                      ৳{Number(req.estimated_total_cost).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedReq(req)}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 rounded transition"
                        title="View & Process"
                      >
                        <Eye className="w-4 h-4 text-indigo-400" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                    {t('common.noData', 'No purchase requisitions found.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail & Action Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  {selectedReq.requisition_no}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedReq.title}</p>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm text-slate-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase">Status</span>
                  <div className="font-semibold text-slate-200">{selectedReq.status}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase">Priority</span>
                  <div className="font-semibold text-slate-200">{selectedReq.priority}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase">Warehouse</span>
                  <div className="font-semibold text-slate-200">{selectedReq.warehouse?.name}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase">Estimated Spend</span>
                  <div className="font-semibold text-emerald-400">
                    ৳{Number(selectedReq.estimated_total_cost).toLocaleString()}
                  </div>
                </div>
              </div>

              {selectedReq.notes && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-400 font-semibold">Notes:</span>
                  <p className="text-slate-300 mt-1 whitespace-pre-line">{selectedReq.notes}</p>
                </div>
              )}

              {selectedReq.rejection_reason && (
                <div className="bg-rose-950/20 p-3 rounded-lg border border-rose-800/40 text-xs text-rose-300">
                  <span className="font-semibold text-rose-400">Rejection Reason:</span>
                  <p className="mt-1">{selectedReq.rejection_reason}</p>
                </div>
              )}

              {/* Items List */}
              <div>
                <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2">Requisition Items</h4>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Est. Unit (৳)</th>
                        <th className="p-2.5 text-right">Total (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedReq.items?.map((it) => (
                        <tr key={it.id}>
                          <td className="p-2.5">
                            <div className="font-medium text-slate-200">{it.product?.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{it.variant?.sku}</div>
                          </td>
                          <td className="p-2.5 text-center font-mono">{Number(it.requested_quantity)}</td>
                          <td className="p-2.5 text-right font-mono">৳{Number(it.estimated_unit_cost).toLocaleString()}</td>
                          <td className="p-2.5 text-right font-medium text-slate-100 font-mono">
                            ৳{Number(it.estimated_total_cost).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950">
              <div className="flex items-center gap-2">
                {selectedReq.status === 'DRAFT' && (
                  <button
                    onClick={() => handleAction('submit')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit for Approval
                  </button>
                )}
                {selectedReq.status === 'SUBMITTED' && (
                  <>
                    <button
                      onClick={() => handleAction('review')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold"
                    >
                      Mark Under Review
                    </button>
                    <button
                      onClick={() => handleAction('approve')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold"
                    >
                      <Ban className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}
                {selectedReq.status === 'UNDER_REVIEW' && (
                  <>
                    <button
                      onClick={() => handleAction('approve')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold"
                    >
                      <Ban className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}
                {selectedReq.status === 'APPROVED' && (
                  <>
                    <button
                      onClick={() => setShowConvertPoModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Convert to Purchase Order
                    </button>
                    <button
                      onClick={handleConvertToRfq}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold"
                    >
                      <Layers className="w-3.5 h-3.5" /> Convert to RFQ
                    </button>
                  </>
                )}
              </div>

              {!['CONVERTED', 'CANCELLED', 'REJECTED'].includes(selectedReq.status) && (
                <button
                  onClick={() => handleAction('cancel')}
                  className="text-xs text-slate-500 hover:text-rose-400"
                >
                  Cancel Requisition
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert to PO Modal */}
      {showConvertPoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              Convert to Purchase Order
            </h3>
            <p className="text-xs text-slate-400">
              Select the qualified supplier to fulfill this requisition. Unit prices will resolve authoritatively via contracts/agreements.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Target Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.supplier_code})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConvertPoModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!selectedSupplierId}
                onClick={handleConvertToPoSubmit}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold disabled:opacity-50"
              >
                Create PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-400" />
              Reject Requisition
            </h3>
            <textarea
              placeholder="State clear justification for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!rejectionReason.trim()}
                onClick={handleRejectSubmit}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Requisition Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Create Purchase Requisition
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Target Warehouse *</label>
                  <select
                    required
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  >
                    <option value="">-- Choose Warehouse --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as RequisitionPriority })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Required Date</label>
                  <input
                    type="date"
                    value={formData.required_date}
                    onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Title / Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Warehouse Consumables"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              {/* Dynamic Items */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-slate-400">Requisition Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-lg items-center"
                    >
                      <div className="col-span-5">
                        <select
                          required
                          value={it.product_id}
                          onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                        >
                          <option value="">-- Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="Qty"
                          value={it.requested_quantity}
                          onChange={(e) => handleItemChange(idx, 'requested_quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Est. Cost"
                          value={it.estimated_unit_cost}
                          onChange={(e) => handleItemChange(idx, 'estimated_unit_cost', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional context or department request details..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold shadow"
                >
                  Save Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
