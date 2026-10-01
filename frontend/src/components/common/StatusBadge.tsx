import React from 'react';
import { useLanguage } from '../../i18n';

export type StatusType =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PENDING'
  | 'COMPLETED'
  | 'POSTED'
  | 'CANCELLED'
  | 'DRAFT'
  | 'PAID'
  | 'PARTIAL'
  | 'DUE'
  | 'OPEN'
  | 'CLOSED'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  customLabel?: string;
  className?: string;
}

export function StatusBadge({ status, customLabel, className = '' }: StatusBadgeProps) {
  const { t } = useLanguage();
  const normalized = (status || '').toUpperCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let defaultKey = `status.${normalized.toLowerCase()}`;

  switch (normalized) {
    case 'ACTIVE':
    case 'COMPLETED':
    case 'POSTED':
    case 'PAID':
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'PENDING':
    case 'PARTIAL':
    case 'OPEN':
      styles = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'INACTIVE':
    case 'CANCELLED':
    case 'CLOSED':
    case 'DUE':
      styles = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'DRAFT':
      styles = 'bg-slate-100 text-slate-600 border-slate-200';
      break;
    default:
      styles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
  }

  const label = customLabel || t(defaultKey, normalized);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase font-mono ${styles} ${className}`}>
      {label}
    </span>
  );
}
