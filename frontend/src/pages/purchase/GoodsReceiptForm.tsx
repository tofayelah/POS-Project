import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export const GoodsReceiptForm: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto bg-slate-50 min-h-full">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/purchases/goods-receipts')}
          className="p-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">New Goods Receipt (GRN)</h1>
      </div>
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">PO Reference</label>
            <input
              type="text"
              placeholder="e.g. PO-2026-001"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Supplier</label>
            <input
              type="text"
              placeholder="Apex Wholesale Distributors"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/purchases/goods-receipts')}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => navigate('/purchases/goods-receipts')}
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            Post GRN
          </button>
        </div>
      </div>
    </div>
  );
};
