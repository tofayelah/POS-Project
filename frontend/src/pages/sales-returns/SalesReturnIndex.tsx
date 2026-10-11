import React from 'react';
import { RotateCcw, Plus } from 'lucide-react';
import { Link } from 'react-router';

export default function SalesReturnIndex() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-indigo-600" />
            Sales Returns & Exchanges
          </h1>
          <p className="text-sm text-slate-500">Manage customer returns, store credits, and refund requests</p>
        </div>
        <Link to="/sales-returns/new" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Process Return
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border p-4">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">Return #</th>
              <th className="px-4 py-3">Original Sale</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Refund Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            <tr>
              <td className="px-4 py-3 font-mono font-medium text-indigo-600">RET-101</td>
              <td className="px-4 py-3 font-mono text-xs">SALE-5001</td>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">John Doe</td>
              <td className="px-4 py-3 font-semibold text-rose-600">$49.99</td>
              <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Completed</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
