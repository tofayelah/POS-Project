import React from 'react';
import { DollarSign } from 'lucide-react';

export const SupplierPayables: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-indigo-600" />
            Supplier Account Payables
          </h1>
          <p className="text-sm text-slate-500">Track outstanding balances owed to vendors</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border p-4">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">Supplier Name</th>
              <th className="px-4 py-3">Outstanding Balance</th>
              <th className="px-4 py-3">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            <tr>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">Apex Wholesale</td>
              <td className="px-4 py-3 font-semibold text-rose-600">$1,250.00</td>
              <td className="px-4 py-3 text-slate-500">2026-10-30</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
