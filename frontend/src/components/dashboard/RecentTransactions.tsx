import React from 'react';
import { DashboardSummary } from './types';
import { formatCurrency } from '../../utils/currency';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface RecentTransactionsProps {
  recentSales: DashboardSummary['recent_sales'];
  recentPurchases: DashboardSummary['recent_purchases'];
}

export function RecentTransactions({ recentSales, recentPurchases }: RecentTransactionsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Sales */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-extrabold text-lg text-slate-900">Recent Sales</h3>
        </div>
        <div className="overflow-x-auto">
          {recentSales.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm font-medium">No recent sales.</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="py-3 font-semibold pr-4">Invoice</th>
                  <th className="py-3 font-semibold px-4">Date</th>
                  <th className="py-3 font-semibold px-4">Customer</th>
                  <th className="py-3 font-semibold pl-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map((sale, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-medium text-slate-900 pr-4">{sale.invoice}</td>
                    <td className="py-3 text-slate-500 px-4">
                      {sale.date ? format(new Date(sale.date), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="py-3 text-slate-700 px-4">{sale.customer || 'Walk-in Customer'}</td>
                    <td className="py-3 font-bold text-emerald-600 text-right pl-4">
                      <div className="flex items-center justify-end gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        {formatCurrency(sale.amount)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-extrabold text-lg text-slate-900">Recent Purchases</h3>
        </div>
        <div className="overflow-x-auto">
          {recentPurchases.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm font-medium">No recent purchases.</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="py-3 font-semibold pr-4">Invoice</th>
                  <th className="py-3 font-semibold px-4">Date</th>
                  <th className="py-3 font-semibold px-4">Supplier</th>
                  <th className="py-3 font-semibold pl-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPurchases.map((purchase, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-medium text-slate-900 pr-4">{purchase.invoice}</td>
                    <td className="py-3 text-slate-500 px-4">
                      {purchase.date ? format(new Date(purchase.date), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="py-3 text-slate-700 px-4">{purchase.supplier || 'Unknown Supplier'}</td>
                    <td className="py-3 font-bold text-rose-600 text-right pl-4">
                      <div className="flex items-center justify-end gap-1">
                        <ArrowDownRight className="w-3 h-3" />
                        {formatCurrency(purchase.amount)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
