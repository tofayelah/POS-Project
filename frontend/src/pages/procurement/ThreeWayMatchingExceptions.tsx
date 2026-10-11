import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ThreeWayMatchingExceptions: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <AlertTriangle className="w-7 h-7 text-amber-500" />
        3-Way Matching Exceptions (PO vs GRN vs Invoice)
      </h1>
      <div className="bg-white dark:bg-slate-800 rounded-xl border p-4">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">PO #</th>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Discrepancy</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-4 py-3 font-mono text-indigo-600">PO-2026-001</td>
              <td className="px-4 py-3 font-mono">PINV-9012</td>
              <td className="px-4 py-3 text-rose-600 font-medium">Unit Price Mismatch (+ $5.00/unit)</td>
              <td className="px-4 py-3"><span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Under Review</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
