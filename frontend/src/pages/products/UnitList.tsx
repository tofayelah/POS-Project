import React from 'react';
import { Scale, Plus } from 'lucide-react';

export const UnitList: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Scale className="w-7 h-7 text-indigo-600" />
            Measurement Units
          </h1>
          <p className="text-sm text-slate-500">Units of measure (Pcs, Kg, Box, Ltr)</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Add Unit
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">Unit Name</th>
              <th className="px-4 py-3">Short Code</th>
              <th className="px-4 py-3">Precision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            <tr>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">Piece</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">pcs</td>
              <td className="px-4 py-3">0 Decimals</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
