import React from 'react';
import { ShieldCheck, Plus } from 'lucide-react';

export default function RoleList() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500">Configure access control levels and user permission groups</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Add Custom Role
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border p-4">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">Role Name</th>
              <th className="px-4 py-3">Permissions Assigned</th>
              <th className="px-4 py-3">Users</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            <tr>
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Super Admin</td>
              <td className="px-4 py-3 text-emerald-600 font-medium">All System Permissions</td>
              <td className="px-4 py-3 font-medium">2 Users</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Cashier / POS Operator</td>
              <td className="px-4 py-3 text-slate-500">POS Sales, Receipts, Returns</td>
              <td className="px-4 py-3 font-medium">5 Users</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
