import React, { ReactNode } from 'react';
import { PackageOpen, LucideIcon } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  const { t } = useLanguage();

  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">
        {title || t('common.noData', 'No records found')}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-4">
        {description || t('common.noRecordsDesc', 'There are currently no items to display in this list.')}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
