import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../i18n';

interface CategorySalesChartProps {
  categorySales?: Array<{ category: string; total: string | number }>;
}

const COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Ocean Blue
  '#f59e0b', // Amber / Orange
  '#8b5cf6', // Violet / Purple
  '#ec4899', // Pink / Rose
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

export function CategorySalesChart({ categorySales = [] }: CategorySalesChartProps) {
  const { t } = useLanguage();

  const formattedData = useMemo(() => {
    return categorySales
      .map(item => ({
        name: item.category || 'Uncategorized',
        value: Number(item.total) || 0,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categorySales]);

  const totalSales = useMemo(() => {
    return formattedData.reduce((acc, curr) => acc + curr.value, 0);
  }, [formattedData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900">
            {t('dashboard.salesByCategory', 'Sales by Category')}
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            {t('dashboard.categoryDistribution', 'Product category revenue breakdown')}
          </p>
        </div>
        {totalSales > 0 && (
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">
              {t('common.total', 'Total')}
            </span>
            <span className="text-sm font-extrabold text-slate-900">
              {formatCurrency(totalSales)}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[280px] w-full flex items-center justify-center">
        {formattedData.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm font-medium">
              {t('dashboard.noCategoryData', 'No category sales recorded for this period.')}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={formattedData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
              >
                {formattedData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(val: any) => [
                  `${formatCurrency(Number(val))} (${((Number(val) / (totalSales || 1)) * 100).toFixed(1)}%)`,
                  t('common.sales', 'Sales')
                ]}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-slate-700 font-medium px-1">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
