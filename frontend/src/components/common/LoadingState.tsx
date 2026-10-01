import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface LoadingStateProps {
  message?: string;
  rows?: number;
  type?: 'spinner' | 'skeleton';
  className?: string;
}

export function LoadingState({
  message,
  rows = 5,
  type = 'spinner',
  className = '',
}: LoadingStateProps) {
  const { t } = useLanguage();

  if (type === 'skeleton') {
    return (
      <div className={`space-y-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs animate-pulse ${className}`}>
        <div className="h-6 bg-slate-200 rounded-lg w-1/4 mb-4"></div>
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="h-10 bg-slate-100 rounded-lg flex-1"></div>
            <div className="h-10 bg-slate-100 rounded-lg w-28"></div>
            <div className="h-10 bg-slate-100 rounded-lg w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
      <p className="text-xs sm:text-sm font-semibold text-slate-600">
        {message || t('common.loading', 'Loading...')}
      </p>
    </div>
  );
}
