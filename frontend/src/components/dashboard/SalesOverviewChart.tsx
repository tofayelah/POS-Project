import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { DashboardSummary } from './types';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../i18n';

interface SalesOverviewChartProps {
  salesTrend: DashboardSummary['sales_trend'];
}

export function SalesOverviewChart({ salesTrend }: SalesOverviewChartProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
      <div className="mb-6">
        <h3 className="font-extrabold text-lg text-slate-900">
          {t('dashboard.salesOverview', 'Sales Overview')}
        </h3>
        <p className="text-sm text-slate-500 font-medium">
          {t('dashboard.dailySalesTrend', 'Daily net sales trend')}
        </p>
      </div>
      <div className="flex-1 min-h-[300px] w-full">
        {salesTrend.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-400 text-sm font-medium">
              {t('dashboard.noSalesData', 'No sales data available for this period.')}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="sale_date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                dy={10}
                tickFormatter={(str) => {
                  const d = new Date(str);
                  return isNaN(d.getTime()) ? str : format(d, 'MMM d');
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                dx={-10}
                tickFormatter={(val) => `৳ ${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
              />
              <RechartsTooltip
                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ color: '#0f172a', fontWeight: 700 }}
                labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '13px' }}
                formatter={(value: any) => [formatCurrency(Number(value)), t('common.sales', 'Sales')]}
              />
              <Area type="monotone" dataKey="total" name="Sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
