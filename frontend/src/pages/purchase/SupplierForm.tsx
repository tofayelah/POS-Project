import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  FileText, 
  Hash, 
  RotateCcw,
  RotateCw,
  Lock,
  Check
} from 'lucide-react';
import { createSupplier, getSupplier, updateSupplier, getNextSupplierCode } from '../../api/suppliers';
import { getBusinessUnits } from '../../api/organization';
import { BusinessUnit } from '../../types/organization';
import { SupplierPayload } from '../../types/supplier';

const STANDARD_PAYMENT_TERMS = [
  'Immediate / COD',
  'Net 7 Days',
  'Net 15 Days',
  'Net 30 Days',
  'Net 45 Days',
  'Net 60 Days',
];

export function SupplierForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  // Business Units list for linking
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  // Form Fields
  const [name, setName] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [businessUnitId, setBusinessUnitId] = useState<number | ''>('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Contact
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');

  // Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Bangladesh');

  // Financial & Terms
  const [taxNumber, setTaxNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
  const [creditLimit, setCreditLimit] = useState<number | ''>(0);
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [customTerms, setCustomTerms] = useState(false);

  // Notes
  const [notes, setNotes] = useState('');

  // UI State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBusinessUnits();
    if (isEdit && id) {
      loadSupplierData(Number(id));
    } else {
      fetchNextCode();
    }
  }, [id, isEdit]);

  const loadBusinessUnits = async () => {
    try {
      const res = await getBusinessUnits();
      setBusinessUnits(res.data || []);
    } catch {
      // Non-blocking if BUs fail to load
    }
  };

  const fetchNextCode = async () => {
    setCodeLoading(true);
    try {
      const res = await getNextSupplierCode();
      if (res?.data?.supplier_code) {
        setSupplierCode(res.data.supplier_code);
      } else {
        // Fallback default format if backend response structure differs
        setSupplierCode((prev) => prev || 'SUP-0001');
      }
    } catch {
      // Fallback unique candidate on network error
      setSupplierCode((prev) => prev || `SUP-${Math.floor(1000 + Math.random() * 9000)}`);
    } finally {
      setCodeLoading(false);
    }
  };

  const loadSupplierData = async (supplierId: number) => {
    setInitialLoading(true);
    setError(null);
    try {
      const res = await getSupplier(supplierId);
      const s = res.data;
      setName(s.name || '');
      setSupplierCode(s.supplier_code || '');
      setBusinessUnitId(s.business_unit_id || '');
      setStatus(s.status || 'ACTIVE');
      setContactPerson(s.contact_person || '');
      setMobile(s.mobile || '');
      setAlternateMobile(s.alternate_mobile || '');
      setEmail(s.email || '');
      setAddress(s.address || '');
      setCity(s.city || '');
      setCountry(s.country || 'Bangladesh');
      setTaxNumber(s.tax_number || '');
      setOpeningBalance(Number(s.opening_balance) || 0);
      setCreditLimit(Number(s.credit_limit) || 0);

      const terms = s.payment_terms || 'Net 30 Days';
      setPaymentTerms(terms);
      if (!STANDARD_PAYMENT_TERMS.includes(terms)) {
        setCustomTerms(true);
      }
      setNotes(s.notes || '');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load supplier details.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, stayOnPage = false) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Supplier name is required.');
      return;
    }

    if (!supplierCode.trim()) {
      setError('Supplier code is required. Please click refresh to auto-generate a unique code.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: SupplierPayload = {
      name: name.trim(),
      supplier_code: supplierCode.trim(),
      business_unit_id: businessUnitId ? Number(businessUnitId) : null,
      status,
      contact_person: contactPerson.trim() || null,
      mobile: mobile.trim() || null,
      alternate_mobile: alternateMobile.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      tax_number: taxNumber.trim() || null,
      opening_balance: openingBalance === '' ? 0 : Number(openingBalance),
      credit_limit: creditLimit === '' ? 0 : Number(creditLimit),
      payment_terms: paymentTerms.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (isEdit && id) {
        await updateSupplier(Number(id), payload);
        setSuccessMessage('Supplier updated successfully.');
        setTimeout(() => {
          navigate('/purchases/suppliers');
        }, 1200);
      } else {
        const res = await createSupplier(payload);
        const assignedCode = res.data?.supplier_code || supplierCode;
        setSuccessMessage(`Supplier "${res.data.name}" registered successfully with Code [${assignedCode}].`);
        if (stayOnPage) {
          // Reset form for next entry and fetch new unique code
          setName('');
          setContactPerson('');
          setMobile('');
          setAlternateMobile('');
          setEmail('');
          setAddress('');
          setCity('');
          setOpeningBalance(0);
          setCreditLimit(0);
          setNotes('');
          fetchNextCode();
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          setTimeout(() => {
            navigate('/purchases/suppliers');
          }, 1200);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save supplier. Please verify inputs.');
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div id="supplier-form-loading" className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading supplier information...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="supplier-form-page" className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <Link to="/purchases/suppliers" className="hover:text-indigo-600 transition-colors">
              Suppliers
            </Link>
            <span>/</span>
            <span className="text-slate-900">{isEdit ? 'Edit Supplier' : 'New Supplier Entry'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/purchases/suppliers"
              id="btn-back-to-suppliers"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Back to Supplier List"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 id="supplier-form-title" className="text-2xl font-bold text-slate-900 tracking-tight">
              {isEdit ? `Edit Supplier: ${name || 'Details'}` : 'Supplier Entry Form'}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/purchases/suppliers"
            id="btn-cancel-top"
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          {!isEdit && (
            <button
              id="btn-save-another-top"
              type="button"
              disabled={saving}
              onClick={(e) => handleSubmit(e, true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Save & Add Another</span>
            </button>
          )}
          <button
            id="btn-save-top"
            type="button"
            disabled={saving}
            onClick={(e) => handleSubmit(e, false)}
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : isEdit ? 'Update Supplier' : 'Save Supplier'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div id="supplier-form-success" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div id="supplier-form-error" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id="supplier-main-form" onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Section 1: Basic Company & Identification */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Basic & Corporate Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Supplier Name */}
            <div className="md:col-span-2">
              <label htmlFor="supplier-name-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Supplier / Vendor Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="supplier-name-input"
                type="text"
                required
                placeholder="e.g. Rahim Textile Mills Ltd. / Apex Leather Corp."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-900"
              />
            </div>

            {/* Supplier Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="supplier-code-input" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>Supplier Code</span>
                  <span className="text-rose-500">*</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Lock className="w-2.5 h-2.5 text-indigo-500" />
                    Auto by System (Unique)
                  </span>
                </label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={fetchNextCode}
                    disabled={codeLoading}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer disabled:opacity-50"
                    title="Generate fresh unique code from system sequence"
                  >
                    <RotateCw className={`w-3 h-3 ${codeLoading ? 'animate-spin' : ''}`} />
                    <span>{codeLoading ? 'Generating...' : 'Refresh'}</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  id="supplier-code-input"
                  type="text"
                  required
                  readOnly={!isEdit}
                  placeholder={codeLoading ? 'Generating unique code...' : 'e.g. SUP-0001'}
                  value={supplierCode}
                  onChange={(e) => setSupplierCode(e.target.value.toUpperCase())}
                  className={`w-full pl-9 pr-24 py-2 border rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                    !isEdit ? 'bg-slate-50 text-slate-800 font-semibold border-slate-300' : 'bg-white text-slate-900 border-slate-300'
                  }`}
                />
                {!isEdit && (
                  <button
                    type="button"
                    onClick={fetchNextCode}
                    disabled={codeLoading}
                    className="absolute inset-y-1 right-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <RotateCw className={`w-3 h-3 text-indigo-500 ${codeLoading ? 'animate-spin' : ''}`} />
                    <span>Auto</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Required unique identifier generated automatically by the system with zero duplicate collision.
              </p>
            </div>

            {/* Parent Business Unit */}
            <div>
              <label htmlFor="supplier-bu-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assigned Business Unit
              </label>
              <select
                id="supplier-bu-select"
                value={businessUnitId}
                onChange={(e) => setBusinessUnitId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 bg-white"
              >
                <option value="">All Business Units (Company-wide)</option>
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.name} ({bu.code})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Leave unselected if this supplier serves all operating divisions.
              </p>
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Operational Status
              </label>
              <div className="flex items-center gap-4 pt-1">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    id="supplier-status-active"
                    type="radio"
                    name="supplier-status"
                    checked={status === 'ACTIVE'}
                    onChange={() => setStatus('ACTIVE')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Active (Ready for POs & Invoicing)
                  </span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    id="supplier-status-inactive"
                    type="radio"
                    name="supplier-status"
                    checked={status === 'INACTIVE'}
                    onChange={() => setStatus('INACTIVE')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Inactive / Suspended
                  </span>
                </label>
              </div>
            </div>

            {/* Tax / BIN Number */}
            <div>
              <label htmlFor="supplier-tax-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tax Number / BIN / VAT Reg
              </label>
              <input
                id="supplier-tax-input"
                type="text"
                placeholder="e.g. BIN-0012938475-01"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Communication */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Phone className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Key Contact & Communication</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Contact Person */}
            <div>
              <label htmlFor="supplier-contact-person" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Primary Contact Person
              </label>
              <input
                id="supplier-contact-person"
                type="text"
                placeholder="e.g. Tanvir Ahmed (Key Account Manager)"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
              />
            </div>

            {/* Mobile / Phone */}
            <div>
              <label htmlFor="supplier-mobile" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Primary Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="supplier-mobile"
                  type="text"
                  placeholder="e.g. +880 1711-000000"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
                />
              </div>
            </div>

            {/* Alternate Phone */}
            <div>
              <label htmlFor="supplier-alt-mobile" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alternate Phone / Landline
              </label>
              <input
                id="supplier-alt-mobile"
                type="text"
                placeholder="e.g. +880 2 9887766"
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
              />
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="supplier-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="supplier-email"
                  type="email"
                  placeholder="e.g. orders@supplierdomain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Physical Address & Location */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Physical Address & Dispatch Center</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="sm:col-span-3">
              <label htmlFor="supplier-address" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Street Address / Warehouse Location
              </label>
              <textarea
                id="supplier-address"
                rows={2}
                placeholder="e.g. Plot #14, Road #3, Sector #7, Uttara Commercial Area"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="supplier-city" className="block text-xs font-semibold text-slate-700 mb-1.5">
                City / District
              </label>
              <input
                id="supplier-city"
                type="text"
                placeholder="e.g. Dhaka, Chittagong, Gazipur"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="supplier-country" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Country
              </label>
              <input
                id="supplier-country"
                type="text"
                placeholder="e.g. Bangladesh"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Financial Terms & Credit */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Financial Terms & Credit Limits</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Opening Balance */}
            <div>
              <label htmlFor="supplier-opening-balance" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Opening Balance (BDT Payable)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">৳</span>
                <input
                  id="supplier-opening-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isEdit}
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                    isEdit ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-white text-slate-900 border-slate-300'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {isEdit 
                  ? 'Opening balance cannot be modified directly after creation (managed via ledger journal).'
                  : 'Previous payable dues brought forward into the system.'}
              </p>
            </div>

            {/* Credit Limit */}
            <div>
              <label htmlFor="supplier-credit-limit" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Credit Limit (BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">৳</span>
                <input
                  id="supplier-credit-limit"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Maximum allowable outstanding purchase balance before system warning.
              </p>
            </div>

            {/* Payment Terms */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Agreed Payment Terms
                </label>
                <button
                  type="button"
                  onClick={() => setCustomTerms(!customTerms)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  {customTerms ? 'Choose from standard terms' : 'Type custom terms'}
                </button>
              </div>

              {!customTerms ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {STANDARD_PAYMENT_TERMS.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setPaymentTerms(term)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        paymentTerms === term
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  id="supplier-payment-terms-input"
                  type="text"
                  placeholder="e.g. 50% Advance, 50% upon delivery / 90 Days LC"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
                />
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Notes & Additional Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Additional Notes & Banking Info</h2>
          </div>

          <div>
            <label htmlFor="supplier-notes" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Internal Notes / Bank Account Details
            </label>
            <textarea
              id="supplier-notes"
              rows={3}
              placeholder="e.g. Bank Name: Eastern Bank Ltd., A/C: 104-XXXX-XXXX, Branch: Gulshan. Preferred delivery window: Mon-Wed 10am-4pm."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
            />
          </div>
        </div>

        {/* Bottom Form Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <Link
            to="/purchases/suppliers"
            id="btn-bottom-cancel"
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 text-center transition-colors"
          >
            Cancel and Return
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {!isEdit && (
              <button
                id="btn-bottom-save-another"
                type="button"
                disabled={saving}
                onClick={(e) => handleSubmit(e, true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Save & Add Another</span>
              </button>
            )}

            <button
              id="btn-bottom-save"
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Supplier...' : isEdit ? 'Update Supplier' : 'Save Supplier'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
