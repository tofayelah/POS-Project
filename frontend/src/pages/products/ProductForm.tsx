import React from 'react';
import { Package, ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router';

export const ProductForm: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/products')}
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Add / Edit Product</h1>
          <p className="text-sm text-slate-500">Configure product master details, pricing, and category</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Wireless Mouse"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SKU / Code *</label>
            <input
              type="text"
              placeholder="e.g. SKU-1002"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price ($) *</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cost Price ($)</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Product
          </button>
        </div>
      </div>
    </div>
  );
};
