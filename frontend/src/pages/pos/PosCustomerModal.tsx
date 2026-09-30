import React, { useState, useEffect, useRef } from 'react';
import { User, Search, Plus, X, Phone, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { Customer, customersApi } from '../../api/customers';

interface PosCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomerId?: number | null;
}

export const PosCustomerModal: React.FC<PosCustomerModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  selectedCustomerId,
}) => {
  const [tab, setTab] = useState<'search' | 'create'>('search');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // New Customer Form
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTab('search');
      setQuery('');
      setErrorMessage(null);
      setName('');
      setMobile('');
      setAddress('');
      setCreditLimit('');
      loadCustomers('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (tab === 'create') {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [tab]);

  const loadCustomers = async (searchQuery: string) => {
    try {
      setLoading(true);
      const res = await customersApi.getCustomers({ search: searchQuery });
      if (res.success && res.data) {
        setCustomers(res.data.data || []);
        setSelectedIndex(0);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setQuery(val);
    loadCustomers(val);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Customer name is required');
      return;
    }
    if (!mobile.trim()) {
      setErrorMessage('Mobile number is required');
      return;
    }

    try {
      setCreateLoading(true);
      setErrorMessage(null);
      const res = await customersApi.createCustomer({
        name: name.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        credit_limit: creditLimit ? parseFloat(creditLimit) : 0,
        status: 'ACTIVE',
      });

      if (res.success && res.data) {
        onSelectCustomer(res.data);
        onClose();
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      const validationErrors = err.response?.data?.errors;
      let firstError = serverMsg;
      if (validationErrors && typeof validationErrors === 'object') {
        const firstKey = Object.keys(validationErrors)[0];
        if (firstKey && Array.isArray(validationErrors[firstKey]) && validationErrors[firstKey][0]) {
          firstError = validationErrors[firstKey][0];
        }
      }
      setErrorMessage(firstError || 'Failed to create customer');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (tab === 'search') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < customers.length ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex === 0) {
          // Walk-in Customer
          onSelectCustomer(null);
          onClose();
        } else if (customers[selectedIndex - 1]) {
          onSelectCustomer(customers[selectedIndex - 1]);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] border border-slate-300"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-sm tracking-wide">Client & Customer Directory [F8]</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('search')}
            className={`py-2 px-4 rounded-t-md border-t border-x transition-colors flex items-center gap-1.5 ${
              tab === 'search'
                ? 'bg-white border-slate-300 text-slate-900 -mb-px font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Select Customer
          </button>
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`py-2 px-4 rounded-t-md border-t border-x transition-colors flex items-center gap-1.5 ${
              tab === 'create'
                ? 'bg-white border-slate-300 text-slate-900 -mb-px font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            + Quick Add Customer
          </button>
        </div>

        {tab === 'search' ? (
          <>
            {/* Search Input */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by Name, Mobile No, or Customer Code..."
                  className="w-full pl-11 pr-4 py-2 bg-white border border-slate-300 rounded-md font-medium text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {/* Option 0: Walk-in Customer */}
              <div
                onClick={() => {
                  onSelectCustomer(null);
                  onClose();
                }}
                className={`p-3 border-b border-slate-200 cursor-pointer flex items-center justify-between transition-colors ${
                  selectedIndex === 0 || !selectedCustomerId
                    ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-500'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                    W
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">Walk-in Customer (Default)</h3>
                    <p className="text-[11px] text-slate-500">Standard counter retail customer (No ledger account)</p>
                  </div>
                </div>
                {!selectedCustomerId && (
                  <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Selected
                  </span>
                )}
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading customers...</div>
              ) : (
                customers.map((c, index) => {
                  const itemIndex = index + 1;
                  const isSelected = selectedIndex === itemIndex;
                  const isCurrent = selectedCustomerId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer(c);
                        onClose();
                      }}
                      className={`p-3 border-b border-slate-200 cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-blue-100 font-semibold ring-1 ring-blue-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-xs text-slate-900">{c.name}</h3>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {c.customer_code}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            {c.mobile && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {c.mobile}
                              </span>
                            )}
                            {c.address && (
                              <span className="flex items-center gap-1 truncate max-w-xs">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {c.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-[11px]">
                        <div>
                          <span className="text-slate-500">Balance: </span>
                          <span className={`font-mono font-bold ${(c.current_balance ?? 0) > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                            ৳ {Number(c.current_balance ?? 0).toFixed(2)}
                          </span>
                        </div>
                        {c.points_balance !== undefined && Number(c.points_balance) > 0 && (
                          <div className="text-[10px] text-amber-700 font-bold flex items-center justify-end gap-1">
                            <span>⭐ {Number(c.points_balance)} pts</span>
                          </div>
                        )}
                        {c.credit_limit && (
                          <div className="text-[10px] text-slate-500">
                            Limit: ৳ {Number(c.credit_limit).toFixed(2)}
                          </div>
                        )}
                        {isCurrent && (
                          <span className="text-emerald-700 font-bold text-[10px] flex items-center justify-end gap-0.5 mt-0.5">
                            <CheckCircle className="w-3 h-3" /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* Quick Add Customer Form */
          <form onSubmit={handleCreateCustomer} className="p-5 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-700 text-xs rounded flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mohammad Rahim"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Limit (Tk)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address / Location
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Mirpur, Dhaka"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTab('search')}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700"
              >
                Back to Search
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                {createLoading ? 'Saving...' : 'Save & Select Customer'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-300 flex justify-between items-center text-[11px] text-slate-600">
          <span>Keyboard shortcut: Enter selects highlighted customer</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded"
          >
            Cancel (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
