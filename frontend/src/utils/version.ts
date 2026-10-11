export const FRONTEND_BUILD_INFO = {
  shortCommit: 'v2.0.0',
  commitHash: 'v2.0.0-release',
  buildTimestamp: new Date().toISOString(),
};

export interface BadgeInfo {
  label: string;
  color: string;
  dotColor: string;
  badgeClass: string;
}

export function getComparisonBadge(status?: string): BadgeInfo {
  if (status === 'synced' || status === 'up_to_date' || status === 'UP_TO_DATE' || status === 'SYNCHRONIZED') {
    return {
      label: 'Up to date',
      color: 'bg-emerald-100 text-emerald-800',
      dotColor: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    };
  }
  if (status === 'behind' || status === 'OUTDATED') {
    return {
      label: 'Update available',
      color: 'bg-amber-100 text-amber-800',
      dotColor: 'bg-amber-500',
      badgeClass: 'bg-amber-50 border-amber-200 text-amber-700',
    };
  }
  return {
    label: 'Operational',
    color: 'bg-blue-100 text-blue-800',
    dotColor: 'bg-blue-500',
    badgeClass: 'bg-blue-50 border-blue-200 text-blue-700',
  };
}

export function formatShortCommit(commitHash?: string): string {
  if (!commitHash) return 'v2.0.0';
  return commitHash.substring(0, 7);
}
