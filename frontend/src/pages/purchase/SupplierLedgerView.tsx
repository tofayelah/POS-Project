import React from 'react';
import { BookOpen } from 'lucide-react';

export const SupplierLedgerView: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <BookOpen className="w-7 h-7 text-indigo-600" />
        Supplier General Ledger
      </h1>
      <div className="bg-white dark:bg-slate-800 rounded-xl border p-4">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Transaction</th>
              <th className="px-4 py-3">Debit</th>
              <th className="px-4 py-3">Credit</th>
              <th className="px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-4 py-3">2026-10-10</td>
              <td className="px-4 py-3">Invoice PINV-9012</td>
              <td className="px-4 py-3">$0.00</td>
              <td className="px-4 py-3">$1,250.00</td>
              <td className="px-4 py-3 font-semibold">$1,250.00 Cr</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
