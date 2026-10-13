import React from 'react';
import { PackageCheck, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

export const GoodsReceiptList: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-7 h-7 text-indigo-700" />
            Goods Receipt Notes (GRN)
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Record incoming stock shipments from suppliers</p>
        </div>
        <Link
          to="/purchases/goods-receipts/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Receive Goods
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <table className="w-full text-left text-sm text-slate-800">
          <thead className="bg-slate-100 uppercase text-xs font-bold text-slate-800 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3.5">GRN #</th>
              <th className="px-4 py-3.5">PO Reference</th>
              <th className="px-4 py-3.5">Supplier</th>
              <th className="px-4 py-3.5">Received Date</th>
              <th className="px-4 py-3.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3.5 font-mono font-bold text-indigo-700">GRN-8080</td>
              <td className="px-4 py-3.5 font-mono text-xs text-slate-600">PO-2026-001</td>
              <td className="px-4 py-3.5 font-bold text-slate-900">Apex Wholesale Distributors</td>
              <td className="px-4 py-3.5 text-slate-600 text-xs font-medium">2026-10-10</td>
              <td className="px-4 py-3.5 text-center">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold uppercase">
                  Verified
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
