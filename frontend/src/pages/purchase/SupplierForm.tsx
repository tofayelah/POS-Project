import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import {
  ArrowLeft,
  Building2,
  UserCheck,
  Wallet,
  Save,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  CornerDownLeft,
} from 'lucide-react';
import {
  getSupplier,
  getNextSupplierCode,
  createSupplier,
  updateSupplier,
  getSupplierBalance,
} from '../../api/suppliers';
import { SupplierFormData, SupplierStatus } from '../../types/supplier';
import { generateSupplierShortName, formatBDT } from '../../utils/supplierUtils';

export const SupplierForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // Form State
  const [formData, setFormData] = useState<SupplierFormData>({
    supplier_code: isEditMode ? '' : 'SUP-0004',
    name: '',
    short_name: '',
    mobile: '',
    address: '',
    contact_person: '',
    contact_designation: '',
    contact_phone: '',
    status: 'ACTIVE',
  });

  // Track whether short name was manually edited by the user
  const isShortNameManuallyEdited = useRef<boolean>(false);

  // Balance and Code states
  const [currentBalance, setCurrentBalance] = useState<number | null>(0);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // General Loading & Feedback states
  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [saving, setSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savedSupplierCode, setSavedSupplierCode] = useState<string | null>(null);

  // Load Initial Data (Next Code in Add mode, Supplier in Edit mode)
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setErrors({});
      setGeneralError(null);

      if (isEditMode && id) {
        setLoading(true);
        try {
          const supplierRes = await getSupplier(Number(id));
          if (!isMounted) return;

          if (supplierRes?.data) {
            const sup = supplierRes.data;
            setFormData({
              supplier_code: sup.supplier_code || `SUP-${String(id).padStart(4, '0')}`,
              name: sup.name || '',
              short_name: sup.short_name || '',
              mobile: sup.mobile || '',
              address: sup.address || '',
              contact_person: sup.contact_person || '',
              contact_designation: sup.contact_designation || '',
              contact_phone: sup.contact_phone || sup.alternate_mobile || '',
              status: (sup.status?.toUpperCase() as SupplierStatus) || 'ACTIVE',
            });
            // In Edit mode, treat existing short name as user-provided
            isShortNameManuallyEdited.current = Boolean(sup.short_name);
          }

          // Fetch authoritative balance
          fetchBalance(Number(id));
        } catch (err: any) {
          if (!isMounted) return;
          console.error('Failed to load supplier details:', err);
          setGeneralError(err?.response?.data?.message || err?.message || 'Failed to load supplier details.');
        } finally {
          if (isMounted) setLoading(false);
        }
      } else {
        // Add Mode: fetch preview next code immediately
        try {
          const codeRes = await getNextSupplierCode();
          if (isMounted && codeRes?.data?.supplier_code) {
            setFormData((prev) => ({
              ...prev,
              supplier_code: codeRes.data.supplier_code,
            }));
          }
        } catch {
          // fallback remains default SUP-0004
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  // Fetch Authoritative Supplier Balance
  const fetchBalance = async (supplierId: number) => {
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const balanceRes = await getSupplierBalance(supplierId);
      if (balanceRes?.data) {
        setCurrentBalance(balanceRes.data.balance ?? 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch supplier balance:', err);
      setBalanceError('Unable to retrieve current balance');
      setCurrentBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Keyboard Navigation: Enter key moves focus to next column / field
  const handleFieldKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    nextElementId: string
  ) => {
    if (e.key === 'Enter') {
      // Allow Shift+Enter for newline in Address textarea
      if (e.shiftKey && (e.target as HTMLElement).tagName.toLowerCase() === 'textarea') {
        return;
      }
      e.preventDefault();
      const nextEl = document.getElementById(nextElementId);
      if (nextEl) {
        nextEl.focus();
        if ('select' in nextEl && typeof (nextEl as any).select === 'function') {
          (nextEl as any).select();
        }
      }
    }
  };

  // Handle Supplier Name Change with Automatic Short Name Suggestion
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData((prev) => {
      const nextShortName = isShortNameManuallyEdited.current
        ? prev.short_name
        : generateSupplierShortName(newName);
      return {
        ...prev,
        name: newName,
        short_name: nextShortName,
      };
    });

    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: '' }));
    }
  };

  // Handle Short Name Manual Input
  const handleShortNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    isShortNameManuallyEdited.current = val.trim().length > 0;
    setFormData((prev) => ({
      ...prev,
      short_name: val,
    }));
  };

  // Validate Form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier Name is required.';
    } else if (formData.name.trim().length > 255) {
      newErrors.name = 'Supplier Name cannot exceed 255 characters.';
    }

    if (formData.short_name && formData.short_name.length > 50) {
      newErrors.short_name = 'Short name cannot exceed 50 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save / Submit Form
  const handleSubmit = async (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setGeneralError(null);
    setSuccessMessage(null);

    const payload = {
      name: formData.name.trim(),
      short_name: formData.short_name.trim() || undefined,
      mobile: formData.mobile.trim() || undefined,
      address: formData.address.trim() || undefined,
      contact_person: formData.contact_person.trim() || undefined,
      contact_designation: formData.contact_designation.trim() || undefined,
      contact_phone: formData.contact_phone.trim() || undefined,
      status: formData.status,
    };

    try {
      if (isEditMode && id) {
        const updateRes = await updateSupplier(Number(id), payload);
        const savedData = updateRes?.data;
        const code = savedData?.supplier_code || formData.supplier_code || `SUP-${String(id).padStart(4, '0')}`;
        setSavedSupplierCode(code);
        setSuccessMessage(`Supplier "${formData.name.trim()}" updated successfully (ID: ${code}).`);

        // Refresh balance after update
        fetchBalance(Number(id));

        setTimeout(() => {
          navigate('/purchases/suppliers', {
            state: {
              justSavedId: Number(id),
              justSavedCode: code,
              justSavedName: formData.name.trim(),
            },
          });
        }, 1100);
      } else {
        const createRes = await createSupplier(payload);
        const createdSupplier = createRes?.data;
        const assignedCode = createdSupplier?.supplier_code || formData.supplier_code || 'SUP-0004';
        setSavedSupplierCode(assignedCode);
        setFormData((prev) => ({ ...prev, supplier_code: assignedCode }));
        setSuccessMessage(`Supplier "${formData.name.trim()}" saved successfully with ID: ${assignedCode}`);

        if (addAnother) {
          // Reset form for next entry
          isShortNameManuallyEdited.current = false;
          let nextPreviewCode = 'SUP-0005';
          try {
            const nextCodeRes = await getNextSupplierCode();
            if (nextCodeRes?.data?.supplier_code) {
              nextPreviewCode = nextCodeRes.data.supplier_code;
            }
          } catch {
            // ignore
          }

          setFormData({
            supplier_code: nextPreviewCode,
            name: '',
            short_name: '',
            mobile: '',
            address: '',
            contact_person: '',
            contact_designation: '',
            contact_phone: '',
            status: 'ACTIVE',
          });

          // Focus next entry immediately
          setTimeout(() => {
            document.getElementById('supplier_name_input')?.focus();
          }, 80);
        } else {
          setTimeout(() => {
            navigate('/purchases/suppliers', {
              state: {
                justSavedId: createdSupplier?.id,
                justSavedCode: assignedCode,
                justSavedName: formData.name.trim(),
              },
            });
          }, 1200);
        }
      }
    } catch (err: any) {
      console.error('Error saving supplier:', err);
      const serverMsg = err?.response?.data?.message || err?.message || 'Failed to save supplier.';
      setGeneralError(serverMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading supplier profile...</p>
      </div>
    );
  }

  const currentDisplayCode = formData.supplier_code || (isEditMode ? 'SUP-0001' : 'SUP-0004');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header & Breadcrumb */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Link to="/purchases/suppliers" className="hover:text-indigo-600 transition-colors">
            Procurement
          </Link>
          <span>/</span>
          <Link to="/purchases/suppliers" className="hover:text-indigo-600 transition-colors">
            Suppliers & Vendors
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold">{isEditMode ? 'Edit Supplier' : 'Add Supplier'}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/purchases/suppliers')}
              className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Return to Supplier List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {isEditMode ? 'Edit Supplier' : 'Add Supplier'}
                </h1>
                <span className="font-mono text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                  Supplier ID: {currentDisplayCode}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Manage supplier details, contact information, short codes and account status.
              </p>
            </div>
          </div>

          {/* Quick Keyboard navigation guide */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-800 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-indigo-200 rounded text-[11px] font-mono font-bold shadow-2xs">
              <CornerDownLeft className="w-3 h-3 text-indigo-600" /> Enter
            </span>
            <span>Moves to next column / field</span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">{successMessage}</p>
            {savedSupplierCode && (
              <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                Assigned Supplier Code: <span className="font-mono font-bold">{savedSupplierCode}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* General Error Notification */}
      {generalError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Error Processing Supplier</p>
            <p className="text-xs text-rose-700 mt-0.5 font-medium">{generalError}</p>
          </div>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* SECTION 1: Supplier Information */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                1. Supplier Information
              </h2>
            </div>
            <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {currentDisplayCode}
            </span>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Supplier ID (Read-only, clearly displayed) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>Supplier ID</span>
                    <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      {currentDisplayCode}
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 normal-case bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Auto-Generated System ID
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={currentDisplayCode}
                    id="supplier_id_input"
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-extrabold text-indigo-950 cursor-not-allowed select-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    READ ONLY
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Unique tenant-scoped identifier: <strong className="font-mono text-indigo-700">{currentDisplayCode}</strong>
                </p>
              </div>

              {/* 2. Supplier Name (Required) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>
                    Supplier Name <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">Enter ↵ next field</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleNameChange}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'supplier_short_name_input')}
                  id="supplier_name_input"
                  placeholder="e.g. TM International"
                  className={`w-full px-3.5 py-2.5 bg-white border ${
                    errors.name ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-indigo-500'
                  } rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-3 focus:ring-indigo-100 transition-all`}
                />
                {errors.name ? (
                  <p className="text-xs text-rose-600 font-semibold mt-1">{errors.name}</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Full legal or trade business name.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 3. Supplier Short Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Supplier Short Name</span>
                  <span className="text-[10px] font-semibold text-indigo-600 normal-case bg-indigo-50 px-2 py-0.5 rounded">
                    Auto-Suggested
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.short_name}
                    onChange={handleShortNameChange}
                    onKeyDown={(e) => handleFieldKeyDown(e, 'supplier_phone_input')}
                    id="supplier_short_name_input"
                    placeholder="e.g. TMI"
                    maxLength={50}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold tracking-wider text-slate-800 uppercase focus:outline-hidden focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  Auto-suggested initials (e.g. TM International → TMI). Editable by user.
                </p>
              </div>

              {/* 5. Mobile / Phone No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Mobile / Phone No</span>
                  <span className="text-[10px] font-semibold text-slate-400">Enter ↵ next field</span>
                </label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'supplier_address_input')}
                  id="supplier_phone_input"
                  placeholder="e.g. 01711000000 or +8801711000000"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                />
                <p className="text-xs text-slate-400 mt-1">Primary phone number for vendor communication.</p>
              </div>
            </div>

            {/* 4. Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Address</span>
                <span className="text-[10px] font-semibold text-slate-400">Enter ↵ next field (Shift+Enter for newline)</span>
              </label>
              <textarea
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                onKeyDown={(e) => handleFieldKeyDown(e, 'contact_person_name_input')}
                id="supplier_address_input"
                placeholder="Street address, building, city, postal code..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Contact Person */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              2. Contact Person
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 6. Contact Person Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Contact Person Name</span>
                  <span className="text-[10px] font-semibold text-slate-400">Enter ↵ next field</span>
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'contact_designation_input')}
                  id="contact_person_name_input"
                  placeholder="e.g. Tariq Mahmood"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* 7. Designation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Designation</span>
                  <span className="text-[10px] font-semibold text-slate-400">Enter ↵ next field</span>
                </label>
                <input
                  type="text"
                  value={formData.contact_designation}
                  onChange={(e) => setFormData({ ...formData, contact_designation: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'contact_phone_input')}
                  id="contact_designation_input"
                  placeholder="e.g. Sales Manager, Owner"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* 8. Contact Person Phone / Mobile */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Contact Phone / Mobile</span>
                  <span className="text-[10px] font-semibold text-slate-400">Enter ↵ next field</span>
                </label>
                <input
                  type="text"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'supplier_status_active_btn')}
                  id="contact_phone_input"
                  placeholder="e.g. 01811000000"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Account Summary & Status */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              3. Account Summary & Status
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* 9. Current Balance — Automatic & Read-only */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Current Balance
                  </label>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => id && fetchBalance(Number(id))}
                      disabled={balanceLoading}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 cursor-pointer"
                      title="Refresh Balance"
                    >
                      <RefreshCw className={`w-3 h-3 ${balanceLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  {balanceLoading ? (
                    <span className="text-sm text-slate-500 font-semibold flex items-center gap-1">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> Fetching ledger balance...
                    </span>
                  ) : balanceError ? (
                    <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold">
                      <AlertCircle className="w-4 h-4" />
                      <span>{balanceError}</span>
                    </div>
                  ) : (
                    <span
                      id="display_current_balance"
                      className={`text-2xl font-black font-mono tracking-tight ${
                        (currentBalance || 0) > 0
                          ? 'text-rose-600'
                          : (currentBalance || 0) < 0
                          ? 'text-emerald-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {formatBDT(currentBalance)}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 font-medium">
                  {isEditMode
                    ? 'Authoritative payable balance sourced directly from the double-entry supplier subledger.'
                    : 'Initial payable balance is set to ৳0.00 upon supplier registration.'}
                </p>
              </div>

              {/* 10. Supplier Status (Active / Inactive) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Supplier Status
                </label>

                <div className="grid grid-cols-2 gap-3" id="supplier_status_group">
                  <button
                    type="button"
                    id="supplier_status_active_btn"
                    onClick={() => setFormData({ ...formData, status: 'ACTIVE' })}
                    onKeyDown={(e) => handleFieldKeyDown(e, 'btn_submit_supplier')}
                    className={`py-3 px-4 rounded-xl border text-center font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      formData.status === 'ACTIVE'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        formData.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    Active
                  </button>

                  <button
                    type="button"
                    id="supplier_status_inactive_btn"
                    onClick={() => setFormData({ ...formData, status: 'INACTIVE' })}
                    onKeyDown={(e) => handleFieldKeyDown(e, 'btn_submit_supplier')}
                    className={`py-3 px-4 rounded-xl border text-center font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      formData.status === 'INACTIVE'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        formData.status === 'INACTIVE' ? 'bg-rose-500' : 'bg-slate-300'
                      }`}
                    />
                    Inactive
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  {formData.status === 'ACTIVE'
                    ? 'Active suppliers can be selected for new purchase orders and GRN receipts.'
                    : 'Inactive suppliers cannot be selected for new purchases. Historical ledgers remain intact.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            disabled={saving}
            onClick={() => navigate('/purchases/suppliers')}
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          {!isEditMode && (
            <button
              type="button"
              disabled={saving}
              id="btn_save_and_add_another"
              onClick={(e) => handleSubmit(e, true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Save & Add Another
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            id="btn_submit_supplier"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xs hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditMode ? 'Update Supplier' : 'Save Supplier'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
