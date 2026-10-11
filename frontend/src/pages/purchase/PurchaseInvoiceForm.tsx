import React from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router';

export const PurchaseInvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchase/invoices')} className="p-2 border rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Record Purchase Invoice</h1>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm mb-1 font-medium">Invoice Number</label><input type="text" className="w-full p-2 border rounded" placeholder="INV-001" /></div>
          <div><label className="block text-sm mb-1 font-medium">Supplier</label><input type="text" className="w-full p-2 border rounded" placeholder="Supplier Name" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button onClick={() => navigate('/purchase/invoices')} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={() => navigate('/purchase/invoices')} className="px-4 py-2 bg-indigo-600 text-white rounded font-medium">Save Invoice</button>
        </div>
      </div>
    </div>
  );
};
