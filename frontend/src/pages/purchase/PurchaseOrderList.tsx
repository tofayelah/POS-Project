import React from 'react';
import { ShoppingCart, Plus } from 'lucide-react';
import { Link } from 'react-router';

export const PurchaseOrderList: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-indigo-600" />
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-500">Track and issue POs to suppliers</p>
        </div>
        <Link to="/purchase/orders/new" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Create PO
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">PO Number</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            <tr>
              <td className="px-4 py-3 font-mono font-medium text-indigo-600">PO-2026-001</td>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">Apex Wholesale</td>
              <td className="px-4 py-3 text-slate-500">2026-10-10</td>
              <td className="px-4 py-3 font-semibold">$3,450.00</td>
              <td className="px-4 py-3"><span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Pending Approval</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
