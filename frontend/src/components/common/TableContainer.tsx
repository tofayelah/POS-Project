import React, { ReactNode } from 'react';

interface TableContainerProps {
  children: ReactNode;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  className?: string;
  id?: string;
}

export function TableContainer({
  children,
  headerContent,
  footerContent,
  className = '',
  id,
}: TableContainerProps) {
  return (
    <div
      id={id}
      className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col ${className}`}
    >
      {headerContent && (
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {headerContent}
        </div>
      )}

      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
        {children}
      </div>

      {footerContent && (
        <div className="p-3.5 sm:p-4 border-t border-slate-200/80 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 font-medium">
          {footerContent}
        </div>
      )}
    </div>
  );
}
