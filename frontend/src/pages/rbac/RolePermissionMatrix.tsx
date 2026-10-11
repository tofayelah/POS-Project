import React from 'react';
import { Lock } from 'lucide-react';

export default function RolePermissionMatrix() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <Lock className="w-7 h-7 text-indigo-600" />
        Role Permission Matrix
      </h1>
      <div className="bg-white dark:bg-slate-800 rounded-xl border p-4">
        <p className="text-sm text-slate-500 mb-4">Fine-grained RBAC matrix per module and endpoint</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900">
                <th className="p-3 border">Module</th>
                <th className="p-3 border">Permission</th>
                <th className="p-3 border text-center">Admin</th>
                <th className="p-3 border text-center">Manager</th>
                <th className="p-3 border text-center">Cashier</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border font-medium">Inventory</td>
                <td className="p-3 border">Adjust Stock</td>
                <td className="p-3 border text-center">✓</td>
                <td className="p-3 border text-center">✓</td>
                <td className="p-3 border text-center text-rose-500">✗</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
