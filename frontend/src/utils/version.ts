export const FRONTEND_BUILD_INFO = {
  shortCommit: 'v2.0.0',
  commitHash: 'v2.0.0-release',
  buildTimestamp: new Date().toISOString(),
};

export function getComparisonBadge(status?: string): { label: string; color: string } {
  if (status === 'synced' || status === 'up_to_date') {
    return { label: 'Up to date', color: 'bg-emerald-100 text-emerald-800' };
  }
  if (status === 'behind') {
    return { label: 'Update available', color: 'bg-amber-100 text-amber-800' };
  }
  return { label: 'Operational', color: 'bg-blue-100 text-blue-800' };
}

export function formatShortCommit(commitHash?: string): string {
  if (!commitHash) return 'v2.0.0';
  return commitHash.substring(0, 7);
}
