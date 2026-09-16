import React from 'react';
import { DashboardSummary } from './types';
import { formatCurrency } from '../../utils/currency';

interface TopProductsListProps {
  products: DashboardSummary['top_products'];
}

export function TopProductsList({ products }: TopProductsListProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
      <div className="mb-6">
        <h3 className="font-extrabold text-lg text-slate-900">Top Selling Products</h3>
        <p className="text-sm text-slate-500 font-medium">By sales amount</p>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 space-y-5">
        {products.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-400 text-sm font-medium">No product sales data available.</p>
          </div>
        ) : (
          products.map((p, idx) => {
            const maxVal = Math.max(...products.map(tp => Number(tp.total)));
            const percent = maxVal > 0 ? (Number(p.total) / maxVal) * 100 : 0;
            return (
              <div key={idx} className="relative">
                <div className="flex justify-between items-end mb-2 relative z-10">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">SKU: {p.sku} • {Number(p.qty)} sold</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(p.total)}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1 overflow-hidden">
                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
