import React from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router';

export const PurchaseOrderForm: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchase/orders')} className="p-2 border rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Create Purchase Order</h1>
          <p className="text-sm text-slate-500">Draft PO for items and suppliers</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">PO Number</label>
            <input type="text" defaultValue="PO-2026-002" className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Supplier</label>
            <select className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900">
              <option>Apex Wholesale Distributors</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={() => navigate('/purchase/orders')} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button onClick={() => navigate('/purchase/orders')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Save Order</button>
        </div>
      </div>
    </div>
  );
};
