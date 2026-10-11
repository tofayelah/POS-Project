import React from 'react';
import { Truck, Plus, Search } from 'lucide-react';
import { Link } from 'react-router';

export const SupplierList: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-indigo-600" />
            Suppliers & Vendors
          </h1>
          <p className="text-sm text-slate-500">Manage supplier directories, contacts, and account payables</p>
        </div>
        <Link
          to="/purchase/suppliers/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Add Supplier
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">Supplier Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Payables</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            <tr>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">Apex Wholesale Distributors</td>
              <td className="px-4 py-3 text-xs font-mono text-slate-500">SUP-001</td>
              <td className="px-4 py-3 text-slate-500">orders@apexdist.com</td>
              <td className="px-4 py-3 text-slate-500">+1 800 555 0199</td>
              <td className="px-4 py-3 font-semibold text-rose-600">$1,250.00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
