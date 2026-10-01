import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: string; isPositive: boolean } | null;
  subtitle?: string;
  badgeText?: string;
  color?: 'emerald' | 'blue' | 'orange' | 'purple' | 'indigo' | 'rose' | 'amber' | 'slate' | 'teal';
  id?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  badgeText,
  color = 'indigo',
  id
}: KpiCardProps) {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500 text-white',
      border: 'border-emerald-100',
      pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      accent: 'border-t-4 border-t-emerald-500',
      subtleBg: 'bg-emerald-50/40',
    },
    blue: {
      bg: 'bg-blue-600 text-white',
      border: 'border-blue-100',
      pill: 'bg-blue-50 text-blue-700 border-blue-200',
      accent: 'border-t-4 border-t-blue-600',
      subtleBg: 'bg-blue-50/40',
    },
    orange: {
      bg: 'bg-amber-500 text-white',
      border: 'border-amber-100',
      pill: 'bg-amber-50 text-amber-700 border-amber-200',
      accent: 'border-t-4 border-t-amber-500',
      subtleBg: 'bg-amber-50/40',
    },
    purple: {
      bg: 'bg-purple-600 text-white',
      border: 'border-purple-100',
      pill: 'bg-purple-50 text-purple-700 border-purple-200',
      accent: 'border-t-4 border-t-purple-600',
      subtleBg: 'bg-purple-50/40',
    },
    indigo: {
      bg: 'bg-indigo-600 text-white',
      border: 'border-indigo-100',
      pill: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      accent: 'border-t-4 border-t-indigo-600',
      subtleBg: 'bg-indigo-50/40',
    },
    rose: {
      bg: 'bg-rose-500 text-white',
      border: 'border-rose-100',
      pill: 'bg-rose-50 text-rose-700 border-rose-200',
      accent: 'border-t-4 border-t-rose-500',
      subtleBg: 'bg-rose-50/40',
    },
    amber: {
      bg: 'bg-amber-500 text-white',
      border: 'border-amber-100',
      pill: 'bg-amber-50 text-amber-700 border-amber-200',
      accent: 'border-t-4 border-t-amber-500',
      subtleBg: 'bg-amber-50/40',
    },
    slate: {
      bg: 'bg-slate-700 text-white',
      border: 'border-slate-100',
      pill: 'bg-slate-100 text-slate-700 border-slate-200',
      accent: 'border-t-4 border-t-slate-600',
      subtleBg: 'bg-slate-50/40',
    },
    teal: {
      bg: 'bg-teal-600 text-white',
      border: 'border-teal-100',
      pill: 'bg-teal-50 text-teal-700 border-teal-200',
      accent: 'border-t-4 border-t-teal-600',
      subtleBg: 'bg-teal-50/40',
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div
      id={id}
      className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between h-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${scheme.accent}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${scheme.bg}`}>
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex flex-col items-end gap-1">
          {badgeText && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scheme.pill}`}>
              {badgeText}
            </span>
          )}
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
              trend.isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
            }`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</h3>
        <p className="text-2xl font-extrabold text-slate-900 tracking-tight truncate">{value}</p>
        {subtitle && (
          <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
