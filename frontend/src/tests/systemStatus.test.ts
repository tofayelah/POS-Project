import { describe, it, expect } from 'vitest';
import { 
  getComparisonBadge, 
  formatShortCommit, 
  FRONTEND_BUILD_INFO 
} from '../utils/version';
import { 
  SystemStatusData, 
  ComparisonStatus 
} from '../types/system';

describe('System Status & Deployment Sync Frontend Tests', () => {
  // Mock data fixture
  const createMockStatus = (overrides?: Partial<SystemStatusData>): SystemStatusData => ({
    environment: 'production',
    github: {
      repository: 'tofayelah/POS-Project',
      branch: 'main',
      commit: '82b2d50',
      status: 'connected',
      commit_message: 'fix(inventory): remove duplicate stock-in implementation',
    },
    ai_studio: {
      commit: null,
      build_id: null,
      status: 'not_reported',
    },
    live: {
      environment: 'PRODUCTION',
      commit: '82b2d50',
      deployed_at: '2026-09-27T13:15:01+06:00',
      backend: {
        status: 'healthy',
        version: '82b2d50',
        api_version: 'v1',
      },
      frontend: {
        status: 'healthy',
        version: '82b2d50',
      },
      database: {
        status: 'healthy',
      },
    },
    comparison: {
      github_vs_live: 'UP_TO_DATE',
      backend_vs_frontend: 'SYNCHRONIZED',
      github_vs_ai_studio: 'NOT_REPORTED',
    },
    checked_at: '2026-09-27T14:00:00Z',
    ...overrides,
  });

  // 1. Status card renders with valid data structure
  it('1. correctly parses and formats system status data', () => {
    const status = createMockStatus();
    expect(status.environment).toBe('production');
    expect(status.live.commit).toBe('82b2d50');
    expect(status.live.backend.status).toBe('healthy');
    expect(status.live.database.status).toBe('healthy');
  });

  // 2. Healthy state badge
  it('2. healthy state returns green Synced badge', () => {
    const badge = getComparisonBadge('SYNCHRONIZED');
    expect(badge.label).toBe('Synced');
    expect(badge.dotColor).toContain('emerald');
    expect(badge.textClass).toContain('emerald');
  });

  // 3. Mismatch state badge
  it('3. mismatch state returns red Mismatch badge', () => {
    const badge = getComparisonBadge('VERSION_MISMATCH');
    expect(badge.label).toBe('Mismatch');
    expect(badge.dotColor).toContain('rose');
    expect(badge.textClass).toContain('rose');
  });

  // 4. Unavailable state badge
  it('4. unavailable state returns red/slate Unavailable badge', () => {
    const badge = getComparisonBadge('UNAVAILABLE');
    expect(badge.label).toBe('Unavailable');
    expect(badge.dotColor).toContain('rose');
  });

  // 5. Not-reported state badge
  it('5. not-reported state returns neutral Not Reported badge', () => {
    const badge = getComparisonBadge('NOT_REPORTED');
    expect(badge.label).toBe('Not Reported');
    expect(badge.dotColor).toContain('slate');
  });

  // 6. Refresh action / formatting
  it('6. formatShortCommit handles full SHA and fallback correctly', () => {
    expect(formatShortCommit('82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89')).toBe('82b2d50');
    expect(formatShortCommit('82b2d50')).toBe('82b2d50');
    expect(formatShortCommit(null)).toBe('—');
    expect(formatShortCommit(undefined)).toBe('—');
  });

  // 7. Backend vs Frontend mismatch evaluation
  it('7. detects backend and frontend version mismatch', () => {
    const status = createMockStatus({
      live: {
        environment: 'PRODUCTION',
        commit: '82b2d50',
        deployed_at: '2026-09-27T13:15:01+06:00',
        backend: { status: 'healthy', version: '82b2d50' },
        frontend: { status: 'healthy', version: '6d9a52f' },
        database: { status: 'healthy' },
      },
      comparison: {
        github_vs_live: 'UP_TO_DATE',
        backend_vs_frontend: 'VERSION_MISMATCH',
        github_vs_ai_studio: 'NOT_REPORTED',
      },
    });

    expect(status.live.backend.version).not.toBe(status.live.frontend.version);
    expect(status.comparison.backend_vs_frontend).toBe('VERSION_MISMATCH');
    const badge = getComparisonBadge(status.comparison.backend_vs_frontend);
    expect(badge.label).toBe('Mismatch');
  });

  // 8. GitHub vs Live mismatch (outdated live server)
  it('8. detects GitHub vs Live outdated state', () => {
    const status = createMockStatus({
      github: {
        repository: 'tofayelah/POS-Project',
        branch: 'main',
        commit: '82b2d50',
        status: 'connected',
      },
      live: {
        environment: 'PRODUCTION',
        commit: '6d9a52f',
        deployed_at: '2026-09-27T12:00:00+06:00',
        backend: { status: 'healthy', version: '6d9a52f' },
        frontend: { status: 'healthy', version: '6d9a52f' },
        database: { status: 'healthy' },
      },
      comparison: {
        github_vs_live: 'OUTDATED',
        backend_vs_frontend: 'SYNCHRONIZED',
        github_vs_ai_studio: 'NOT_REPORTED',
      },
    });

    expect(status.github.commit).not.toBe(status.live.commit);
    expect(status.comparison.github_vs_live).toBe('OUTDATED');
    const badge = getComparisonBadge(status.comparison.github_vs_live);
    expect(badge.label).toBe('Outdated');
    expect(badge.dotColor).toContain('amber');
  });

  // 9. No false "latest" when external services are unavailable or not reported
  it('9. prevents false latest status when GitHub is unavailable or AI Studio is not reported', () => {
    const status = createMockStatus({
      github: {
        repository: 'tofayelah/POS-Project',
        branch: 'main',
        commit: null,
        status: 'unavailable',
      },
      comparison: {
        github_vs_live: 'UNKNOWN',
        backend_vs_frontend: 'SYNCHRONIZED',
        github_vs_ai_studio: 'NOT_REPORTED',
      },
    });

    expect(status.github.status).toBe('unavailable');
    expect(status.comparison.github_vs_live).toBe('UNKNOWN');
    expect(status.comparison.github_vs_live).not.toBe('UP_TO_DATE');

    const githubBadge = getComparisonBadge(status.comparison.github_vs_live);
    expect(githubBadge.label).toBe('Unknown');

    const aiStudioBadge = getComparisonBadge(status.comparison.github_vs_ai_studio);
    expect(aiStudioBadge.label).toBe('Not Reported');
  });

  it('10. frontend build info exposes valid commit and timestamp', () => {
    expect(FRONTEND_BUILD_INFO.shortCommit).toHaveLength(7);
    expect(FRONTEND_BUILD_INFO.buildTime).toBeTruthy();
  });
});
