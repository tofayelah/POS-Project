import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: string; isPositive: boolean } | null;
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue' | 'slate' | 'teal' | 'orange';
}

export function KpiCard({ title, value, icon: Icon, trend, color = 'indigo' }: KpiCardProps) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-full transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
            trend.isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
          }`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-500 mb-1">{title}</h3>
        <p className="text-2xl font-extrabold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}
