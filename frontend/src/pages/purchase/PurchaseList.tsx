import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Link } from 'react-router';

export const PurchaseList: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600" />
            Purchase Invoices & Bills
          </h1>
          <p className="text-sm text-slate-500">Record supplier invoices and accounting entries</p>
        </div>
        <Link to="/purchase/invoices/new" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> New Purchase Invoice
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Grand Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            <tr>
              <td className="px-4 py-3 font-mono font-medium text-indigo-600">PINV-9012</td>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">Apex Wholesale</td>
              <td className="px-4 py-3 text-slate-500">2026-10-10</td>
              <td className="px-4 py-3 font-semibold">$1,250.00</td>
              <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Unpaid</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
