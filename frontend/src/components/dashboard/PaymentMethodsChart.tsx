import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { DashboardSummary } from './types';
import { formatCurrency } from '../../utils/currency';

interface PaymentMethodsChartProps {
  paymentMethods: DashboardSummary['payment_methods'];
}

export function PaymentMethodsChart({ paymentMethods }: PaymentMethodsChartProps) {
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#64748b'];

  const data = paymentMethods.map(p => ({
    name: p.payment_method || 'Unknown',
    value: Number(p.total)
  }));

  const totalAmount = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
      <div className="mb-2">
        <h3 className="font-extrabold text-lg text-slate-900">Payment Methods</h3>
        <p className="text-sm text-slate-500 font-medium">Breakdown of received payments</p>
      </div>
      <div className="flex-1 min-h-[250px] w-full flex items-center justify-center relative">
        {data.length === 0 ? (
          <p className="text-slate-400 text-sm font-medium">No payment data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ color: '#0f172a', fontWeight: 700 }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                formatter={(value, entry: any) => {
                   const item = data.find(d => d.name === value);
                   const percent = item && totalAmount > 0 ? ((item.value / totalAmount) * 100).toFixed(1) : 0;
                   return <span className="text-slate-700 font-medium text-sm ml-1">{value} ({percent}%)</span>;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
