import React from 'react';
import { DashboardSummary } from './types';

interface LowStockTableProps {
  lowStockDetails: DashboardSummary['low_stock_details'];
}

export function LowStockTable({ lowStockDetails }: LowStockTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900">Low Stock Alert</h3>
          <p className="text-sm text-slate-500 font-medium">Items near or below reorder level</p>
        </div>
      </div>
      <div className="overflow-x-auto flex-1">
        {lowStockDetails.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-slate-400 text-sm font-medium">No low stock items.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                <th className="py-3 font-semibold pr-4">Product</th>
                <th className="py-3 font-semibold px-4">SKU</th>
                <th className="py-3 font-semibold px-4">Warehouse</th>
                <th className="py-3 font-semibold px-4 text-right">Available</th>
                <th className="py-3 font-semibold pl-4 text-right">Reorder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lowStockDetails.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 font-bold text-slate-900 pr-4">{item.product}</td>
                  <td className="py-3 text-slate-600 px-4">{item.sku}</td>
                  <td className="py-3 text-slate-600 px-4">{item.warehouse}</td>
                  <td className="py-3 text-right px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      Number(item.available_quantity) <= 0 
                        ? 'bg-rose-100 text-rose-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {Number(item.available_quantity)}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500 text-right pl-4">{Number(item.reorder_level)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
