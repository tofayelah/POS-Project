import React, { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  breadcrumbs = [],
  title,
  subtitle,
  badge,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="min-w-0 flex-1">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {crumb.to && !isLast ? (
                    <Link
                      to={crumb.to}
                      className="hover:text-indigo-600 transition-colors truncate max-w-[140px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-slate-800 font-semibold truncate max-w-[160px]' : 'truncate max-w-[140px]'}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          {badge}
        </div>

        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 leading-normal">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
