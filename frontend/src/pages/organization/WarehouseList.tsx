import React, { useState, useEffect } from 'react';
import { 
  Warehouse as WarehouseIcon, 
  Building2,
  Store,
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Network,
  MapPin,
  Boxes
} from 'lucide-react';
import { Warehouse, BusinessUnit, Branch, WarehouseType } from '../../types/organization';
import { 
  getWarehouses, 
  getBusinessUnits, 
  getBranches, 
  createWarehouse, 
  updateWarehouse, 
  deleteWarehouse 
} from '../../api/organization';

// 2 Types: Main Warehouse & Branch Warehouse
const WAREHOUSE_TYPES = [
  { 
    label: 'Main Warehouse', 
    value: 'MAIN' as WarehouseType, 
    color: 'bg-blue-50 text-blue-800 border-blue-200', 
    badgeColor: 'bg-blue-600',
    icon: Building2,
    description: 'Central distribution warehouse serving the company or business unit' 
  },
  { 
    label: 'Branch Warehouse', 
    value: 'BRANCH' as WarehouseType, 
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200', 
    badgeColor: 'bg-emerald-600',
    icon: Store,
    description: 'Outlet inventory storage directly linked to a specific retail branch' 
  },
];

const isMainWarehouse = (type?: string) => type === 'MAIN' || type === 'CENTRAL';
const isBranchWarehouse = (type?: string) => type === 'BRANCH';

export function WarehouseList() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MAIN' | 'BRANCH'>('ALL');
  const [buFilter, setBuFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formBuId, setFormBuId] = useState<number | ''>('');
  const [formBranchId, setFormBranchId] = useState<number | ''>('');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formType, setFormType] = useState<WarehouseType>('MAIN');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Dialog State
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [whRes, buRes, brRes] = await Promise.all([
        getWarehouses(),
        getBusinessUnits().catch(() => ({ data: [] })),
        getBranches().catch(() => ({ data: [] })),
      ]);
      setWarehouses(whRes.data || []);
      setBusinessUnits(buRes.data || []);
      setBranches(brRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load warehouses.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormBuId(warehouse.business_unit_id);
      setFormBranchId(warehouse.branch_id || '');
      setFormName(warehouse.name);
      setFormCode(warehouse.code);
      setFormAddress(warehouse.address || '');
      setFormType(isBranchWarehouse(warehouse.warehouse_type) ? 'BRANCH' : 'MAIN');
      setFormStatus(warehouse.status || 'active');
    } else {
      setEditingWarehouse(null);
      const defaultBuId = businessUnits.length > 0 ? businessUnits[0].id : '';
      setFormBuId(defaultBuId);
      setFormBranchId('');
      setFormName('');
      setFormCode('');
      setFormAddress('');
      setFormType('MAIN');
      setFormStatus('active');
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBuId) {
      setModalError('Please select a Business Unit.');
      return;
    }
    if (!formName.trim()) {
      setModalError('Warehouse Name is required.');
      return;
    }
    if (!formCode.trim()) {
      setModalError('Warehouse Code is required.');
      return;
    }
    if (formType === 'BRANCH' && !formBranchId) {
      setModalError('Please select the Associated Branch for this Branch Warehouse.');
      return;
    }

    setSaving(true);
    setModalError(null);

    const payload = {
      business_unit_id: Number(formBuId),
      branch_id: formType === 'BRANCH' && formBranchId ? Number(formBranchId) : null,
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      address: formAddress.trim() || null,
      warehouse_type: formType,
      status: formStatus,
    };

    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, payload);
        setFeedbackMessage('Warehouse updated successfully.');
      } else {
        await createWarehouse(payload);
        setFeedbackMessage('Warehouse created successfully.');
      }
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save warehouse.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingWarehouse) return;
    setDeleting(true);
    try {
      await deleteWarehouse(deletingWarehouse.id);
      setFeedbackMessage('Warehouse deleted successfully.');
      setDeletingWarehouse(null);
      loadData();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete warehouse. It may have inventory batches or stock.');
      setDeletingWarehouse(null);
    } finally {
      setDeleting(false);
    }
  };

  // Filter branches available for the selected BU in the modal
  const availableBranchesForForm = formBuId
    ? branches.filter((b) => b.business_unit_id === Number(formBuId))
    : branches;

  const filteredWarehouses = warehouses.filter((wh) => {
    const matchesSearch = 
      wh.name.toLowerCase().includes(search.toLowerCase()) ||
      wh.code.toLowerCase().includes(search.toLowerCase()) ||
      (wh.address && wh.address.toLowerCase().includes(search.toLowerCase())) ||
      (wh.business_unit?.name && wh.business_unit.name.toLowerCase().includes(search.toLowerCase())) ||
      (wh.branch?.name && wh.branch.name.toLowerCase().includes(search.toLowerCase()));

    const matchesType = 
      typeFilter === 'ALL' || 
      (typeFilter === 'MAIN' && isMainWarehouse(wh.warehouse_type)) ||
      (typeFilter === 'BRANCH' && isBranchWarehouse(wh.warehouse_type));

    const matchesBu = buFilter === 'ALL' || wh.business_unit_id === Number(buFilter);
    const matchesStatus = statusFilter === 'all' || wh.status === statusFilter;

    return matchesSearch && matchesType && matchesBu && matchesStatus;
  });

  const mainWarehousesCount = warehouses.filter(w => isMainWarehouse(w.warehouse_type)).length;
  const branchWarehousesCount = warehouses.filter(w => isBranchWarehouse(w.warehouse_type)).length;

  return (
    <div id="warehouses-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6 text-indigo-600" />
            <h1 id="warehouses-page-title" className="text-2xl font-bold text-slate-900 tracking-tight">Warehouses</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your inventory warehouses — categorized into <strong>Main Warehouse</strong> and <strong>Branch Warehouse</strong>.
          </p>
        </div>
        <button
          id="btn-add-warehouse"
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Warehouse</span>
        </button>
      </div>

      {/* Warehouse Type Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          id="card-total-warehouses"
          onClick={() => setTypeFilter('ALL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            typeFilter === 'ALL' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${typeFilter === 'ALL' ? 'text-slate-400' : 'text-slate-500'}`}>
              All Warehouses
            </span>
            <Boxes className={`w-5 h-5 ${typeFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'}`} />
          </div>
          <p className="text-2xl font-bold mt-2">{warehouses.length}</p>
          <p className={`text-xs mt-1 ${typeFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
            Total inventory storage facilities
          </p>
        </div>

        <div 
          id="card-main-warehouses"
          onClick={() => setTypeFilter('MAIN')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            typeFilter === 'MAIN' 
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
              : 'bg-white text-slate-900 border-slate-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${typeFilter === 'MAIN' ? 'text-blue-100' : 'text-blue-600'}`}>
              Main Warehouse
            </span>
            <Building2 className={`w-5 h-5 ${typeFilter === 'MAIN' ? 'text-blue-100' : 'text-blue-500'}`} />
          </div>
          <p className="text-2xl font-bold mt-2">{mainWarehousesCount}</p>
          <p className={`text-xs mt-1 ${typeFilter === 'MAIN' ? 'text-blue-100' : 'text-slate-500'}`}>
            Central / hub distribution locations
          </p>
        </div>

        <div 
          id="card-branch-warehouses"
          onClick={() => setTypeFilter('BRANCH')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            typeFilter === 'BRANCH' 
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
              : 'bg-white text-slate-900 border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${typeFilter === 'BRANCH' ? 'text-emerald-100' : 'text-emerald-600'}`}>
              Branch Warehouse
            </span>
            <Store className={`w-5 h-5 ${typeFilter === 'BRANCH' ? 'text-emerald-100' : 'text-emerald-500'}`} />
          </div>
          <p className="text-2xl font-bold mt-2">{branchWarehousesCount}</p>
          <p className={`text-xs mt-1 ${typeFilter === 'BRANCH' ? 'text-emerald-100' : 'text-slate-500'}`}>
            Linked store & retail outlet depots
          </p>
        </div>
      </div>

      {/* Feedback Messages */}
      {feedbackMessage && (
        <div id="wh-success-alert" className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {error && (
        <div id="wh-error-alert" className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="wh-search-input"
            type="text"
            placeholder="Search warehouses, codes, locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Warehouse Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Type:</span>
            <select
              id="wh-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'MAIN' | 'BRANCH')}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-700"
            >
              <option value="ALL">All Warehouse Types</option>
              <option value="MAIN">Main Warehouse</option>
              <option value="BRANCH">Branch Warehouse</option>
            </select>
          </div>

          {/* Business Unit Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">BU:</span>
            <select
              id="wh-bu-filter"
              value={buFilter}
              onChange={(e) => setBuFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-700"
            >
              <option value="ALL">All Business Units</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
            <select
              id="wh-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-700"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warehouses Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div id="warehouses-loading" className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-slate-500 font-medium">Loading warehouses...</span>
            </div>
          </div>
        ) : filteredWarehouses.length === 0 ? (
          <div id="warehouses-empty-state" className="p-12 text-center">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No warehouses found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {search || typeFilter !== 'ALL' || buFilter !== 'ALL' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'Create your first Main Warehouse or Branch Warehouse.'}
            </p>
            {!search && typeFilter === 'ALL' && buFilter === 'ALL' && (
              <button
                id="btn-empty-add-warehouse"
                type="button"
                onClick={() => handleOpenModal()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Warehouse</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="warehouses-table" className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-3.5">Warehouse Name</th>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Warehouse Type</th>
                  <th className="px-6 py-3.5">Business Unit</th>
                  <th className="px-6 py-3.5">Branch Attachment</th>
                  <th className="px-6 py-3.5">Location Address</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredWarehouses.map((wh) => {
                  const isBranch = isBranchWarehouse(wh.warehouse_type);
                  return (
                    <tr key={wh.id} id={`wh-row-${wh.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isBranch ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {isBranch ? <Store className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="block">{wh.name}</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {isBranch ? 'Branch Outlet Stock' : 'Central Main Stock'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">
                        <span className="bg-slate-100 px-2 py-1 rounded font-semibold border border-slate-200">
                          {wh.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isBranch ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Branch Warehouse
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Main Warehouse
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700 text-xs">
                        <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 px-2 py-0.5 rounded border border-sky-100 font-medium">
                          <Network className="w-3 h-3 text-sky-600" />
                          {wh.business_unit?.name || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 text-xs">
                        {wh.branch ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100 font-medium">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            {wh.branch.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Central Hub (No Branch)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                        {wh.address || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          id={`wh-status-${wh.id}`}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            wh.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {wh.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          id={`btn-edit-wh-${wh.id}`}
                          type="button"
                          onClick={() => handleOpenModal(wh)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                          title="Edit Warehouse"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-wh-${wh.id}`}
                          type="button"
                          onClick={() => setDeletingWarehouse(wh)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Warehouse"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div id="modal-warehouse-form" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 id="modal-warehouse-title" className="text-base font-bold text-slate-900">
                {editingWarehouse ? 'Edit Warehouse' : 'New Warehouse'}
              </h2>
              <button
                id="btn-close-wh-modal"
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWarehouse} className="p-6 space-y-4">
              {modalError && (
                <div id="modal-wh-error" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Warehouse Type Selector: Main Warehouse vs Branch Warehouse */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Warehouse Type (Classification) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-select-type-main"
                    type="button"
                    onClick={() => {
                      setFormType('MAIN');
                      setFormBranchId('');
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                      formType === 'MAIN'
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-md shrink-0 ${formType === 'MAIN' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-900">Main Warehouse</div>
                      <div className="text-xs text-slate-500 mt-0.5">Central distribution hub for the business unit</div>
                    </div>
                  </button>

                  <button
                    id="btn-select-type-branch"
                    type="button"
                    onClick={() => setFormType('BRANCH')}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                      formType === 'BRANCH'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-md shrink-0 ${formType === 'BRANCH' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-900">Branch Warehouse</div>
                      <div className="text-xs text-slate-500 mt-0.5">Linked to a specific branch outlet</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Hierarchy Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wh-form-bu" className="block text-xs font-semibold text-slate-700 mb-1">
                    Parent Business Unit *
                  </label>
                  <select
                    id="wh-form-bu"
                    required
                    value={formBuId}
                    onChange={(e) => {
                      setFormBuId(Number(e.target.value));
                      setFormBranchId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 bg-white"
                  >
                    <option value="" disabled>Select Business Unit</option>
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.name} ({bu.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="wh-form-branch" className="block text-xs font-semibold text-slate-700 mb-1">
                    {formType === 'BRANCH' ? 'Associated Branch *' : 'Associated Branch (Optional)'}
                  </label>
                  <select
                    id="wh-form-branch"
                    disabled={formType === 'MAIN'}
                    required={formType === 'BRANCH'}
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value ? Number(e.target.value) : '')}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 ${
                      formType === 'MAIN' 
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    {formType === 'MAIN' ? (
                      <option value="">N/A (Main Warehouse is Central)</option>
                    ) : (
                      <>
                        <option value="">Select Branch...</option>
                        {availableBranchesForForm.map((br) => (
                          <option key={br.id} value={br.id}>
                            {br.name} ({br.code})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {formType === 'BRANCH' && availableBranchesForForm.length === 0 && (
                    <span className="text-[11px] text-amber-600 mt-1 block">
                      No branches found for selected BU. Create a branch first.
                    </span>
                  )}
                </div>
              </div>

              {/* Warehouse Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wh-form-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Warehouse Name *
                  </label>
                  <input
                    id="wh-form-name"
                    type="text"
                    required
                    placeholder={formType === 'MAIN' ? 'e.g. Central Main Warehouse' : 'e.g. Dhanmondi Store Depot'}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="wh-form-code" className="block text-xs font-semibold text-slate-700 mb-1">
                    Warehouse Code *
                  </label>
                  <input
                    id="wh-form-code"
                    type="text"
                    required
                    placeholder={formType === 'MAIN' ? 'e.g. WH-MAIN-01' : 'e.g. WH-BR-DHN'}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wh-form-status" className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    id="wh-form-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="wh-form-address" className="block text-xs font-semibold text-slate-700 mb-1">
                    Address / Physical Location
                  </label>
                  <input
                    id="wh-form-address"
                    type="text"
                    placeholder="e.g. Plot 12, Tejgaon I/A, Dhaka"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  id="btn-cancel-wh-form"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-wh-form"
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  {saving ? 'Saving...' : editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingWarehouse && (
        <div id="modal-delete-warehouse" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Warehouse?</h3>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete <span className="font-semibold text-slate-800">{deletingWarehouse.name}</span> ({deletingWarehouse.code})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                id="btn-cancel-delete-wh"
                type="button"
                onClick={() => setDeletingWarehouse(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-wh"
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
