import React from 'react';
import { Info, ArrowLeft, Barcode, Layers, Tag } from 'lucide-react';
import { useNavigate } from 'react-router';

export const ItemInformation: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/products')}
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Info className="w-6 h-6 text-indigo-600" />
            Item Master Information
          </h1>
          <p className="text-sm text-slate-500">Detailed overview of product attributes, stock, and history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="w-full h-48 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-400">
            <Tag className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Standard Retail Item</h2>
          <p className="text-xs text-slate-500">SKU: SKU-1001</p>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Retail Price:</span> <span className="font-semibold">$49.99</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Cost Price:</span> <span className="font-semibold">$25.00</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Tax Rate:</span> <span className="font-semibold">5%</span></div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Inventory Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase">Total Stock</span>
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">120 Units</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Reorder Level</span>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">15 Units</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
