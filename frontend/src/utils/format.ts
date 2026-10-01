import { format } from 'date-fns';
import { formatCurrency as formatCurrencyBase } from './currency';

export const formatCurrency = formatCurrencyBase;

export function formatDate(
  date: string | number | Date | null | undefined,
  formatStr = 'dd MMM yyyy'
): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return format(d, formatStr);
}

export function formatDateTime(
  date: string | number | Date | null | undefined,
  formatStr = 'dd MMM yyyy, hh:mm a'
): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return format(d, formatStr);
}

export function formatNumber(value: number | string | null | undefined): string {
  const num = Number(value || 0);
  return num.toLocaleString();
}
