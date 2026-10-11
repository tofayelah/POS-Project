import React from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router';

export const SupplierForm: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchase/suppliers')} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Add / Edit Supplier</h1>
          <p className="text-sm text-slate-500">Configure vendor contact and financial information</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name *</label>
            <input type="text" placeholder="e.g. Apex Wholesale" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Supplier Code *</label>
            <input type="text" placeholder="e.g. SUP-001" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={() => navigate('/purchase/suppliers')} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button onClick={() => navigate('/purchase/suppliers')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Save Supplier</button>
        </div>
      </div>
    </div>
  );
};
