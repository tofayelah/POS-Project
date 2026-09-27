import { ComparisonStatus } from '../types/system';

const RAW_COMMIT = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GIT_COMMIT || import.meta.env?.VITE_APP_VERSION)) || '82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89';

export const FRONTEND_BUILD_INFO = {
  commit: RAW_COMMIT,
  shortCommit: RAW_COMMIT.slice(0, 7),
  buildTime: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUILD_TIME) || '2026-09-27T13:15:01+06:00',
  environment: (typeof import.meta !== 'undefined' && import.meta.env?.MODE) || 'production',
};

export interface BadgeConfig {
  label: string;
  dotColor: string;
  badgeClass: string;
  textClass: string;
}

export function getComparisonBadge(status: ComparisonStatus): BadgeConfig {
  switch (status) {
    case 'UP_TO_DATE':
    case 'SYNCHRONIZED':
      return {
        label: 'Synced',
        dotColor: 'bg-emerald-500',
        badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        textClass: 'text-emerald-700',
      };
    case 'OUTDATED':
      return {
        label: 'Outdated',
        dotColor: 'bg-amber-500',
        badgeClass: 'bg-amber-50 border-amber-200 text-amber-700',
        textClass: 'text-amber-700',
      };
    case 'VERSION_MISMATCH':
      return {
        label: 'Mismatch',
        dotColor: 'bg-rose-500',
        badgeClass: 'bg-rose-50 border-rose-200 text-rose-700',
        textClass: 'text-rose-700',
      };
    case 'UNAVAILABLE':
      return {
        label: 'Unavailable',
        dotColor: 'bg-rose-500',
        badgeClass: 'bg-rose-50 border-rose-200 text-rose-700',
        textClass: 'text-rose-700',
      };
    case 'NOT_REPORTED':
      return {
        label: 'Not Reported',
        dotColor: 'bg-slate-400',
        badgeClass: 'bg-slate-50 border-slate-200 text-slate-600',
        textClass: 'text-slate-600',
      };
    case 'UNKNOWN':
    default:
      return {
        label: 'Unknown',
        dotColor: 'bg-slate-400',
        badgeClass: 'bg-slate-50 border-slate-200 text-slate-600',
        textClass: 'text-slate-600',
      };
  }
}

export function formatShortCommit(sha: string | null | undefined): string {
  if (!sha) return '—';
  return sha.slice(0, 7);
}
