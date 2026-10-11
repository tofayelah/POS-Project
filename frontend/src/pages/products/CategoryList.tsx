import React from 'react';
import { Layers, Plus, Search } from 'lucide-react';

export const CategoryList: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600" />
            Product Categories
          </h1>
          <p className="text-sm text-slate-500">Organize catalog hierarchy and tax groups</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">Category Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Products Count</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            <tr>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">Electronics</td>
              <td className="px-4 py-3 text-slate-500 font-mono text-xs">electronics</td>
              <td className="px-4 py-3 font-semibold">45 Items</td>
              <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Active</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
