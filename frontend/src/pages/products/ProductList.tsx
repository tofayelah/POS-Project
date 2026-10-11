import React, { useState } from 'react';
import { Package, Plus, Search, Filter, RefreshCw, Barcode } from 'lucide-react';
import { Link } from 'react-router';

export const ProductList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-600" />
            Product Catalog
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your store items, SKUs, pricing, and master product records
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">SKU / Barcode</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center font-bold">
                    P
                  </div>
                  Standard Retail Item
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">SKU-1001 / 89012345</td>
                <td className="px-4 py-3">General Electronics</td>
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">$49.99</td>
                <td className="px-4 py-3"><span className="text-emerald-600 font-medium">120 in stock</span></td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium">
                    Active
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to="/products/1/edit" className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3">
                    Edit
                  </Link>
                  <Link to="/products/item-information" className="text-slate-600 hover:text-slate-800 text-xs font-medium">
                    View
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
