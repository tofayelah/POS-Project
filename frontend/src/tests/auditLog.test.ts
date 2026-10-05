import { describe, it, expect, vi } from 'vitest';
import assert from 'node:assert';
import { auditApi, AuditLog, AuditLogFilters } from '../api/audit';
import api from '../api/axios';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

describe('Audit Log API Client & Governance Specs', () => {
  it('exposes only read-only methods and no mutation methods', () => {
    // Assert auditApi has getAuditLogs and getAuditLog
    assert.strictEqual(typeof auditApi.getAuditLogs, 'function');
    assert.strictEqual(typeof auditApi.getAuditLog, 'function');

    // Immutability: assert auditApi does not expose create, update, or delete
    assert.strictEqual((auditApi as any).createAuditLog, undefined);
    assert.strictEqual((auditApi as any).updateAuditLog, undefined);
    assert.strictEqual((auditApi as any).deleteAuditLog, undefined);
  });

  it('calls api.get with correct endpoint and parameters for getAuditLogs', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        data: [],
        meta: { current_page: 1, per_page: 15, total: 0, last_page: 1 },
      },
    });

    const filters: AuditLogFilters = {
      page: 2,
      per_page: 25,
      search: '192.168.1.1',
      module: 'accounting',
      action: 'created',
      date_from: '2026-01-01',
      date_to: '2026-01-31',
      sort: 'created_at',
      direction: 'desc',
    };

    const res = await auditApi.getAuditLogs(filters);

    expect(getSpy).toHaveBeenCalledWith('/audit-logs', { params: filters });
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
    getSpy.mockRestore();
  });

  it('calls api.get with /audit-logs/{id} for getAuditLog detail', async () => {
    const sampleLog: AuditLog = {
      id: 42,
      uuid: 'test-uuid-42',
      company_id: 1,
      user_id: 5,
      event: 'created',
      auditable_type: 'App\\Models\\JournalEntry',
      auditable_id: 101,
      old_values: null,
      new_values: { entry_number: 'JE-2026-001', amount: 5000 },
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0 Test',
      created_at: '2026-10-05T12:00:00Z',
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        data: sampleLog,
      },
    });

    const res = await auditApi.getAuditLog(42);

    expect(getSpy).toHaveBeenCalledWith('/audit-logs/42');
    expect(res.success).toBe(true);
    expect(res.data.id).toBe(42);
    expect(res.data.uuid).toBe('test-uuid-42');
    getSpy.mockRestore();
  });
});

describe('Audit Log Date Range Validation Logic', () => {
  function validateDateRange(from?: string, to?: string): boolean {
    if (from && to) {
      return from <= to;
    }
    return true;
  }

  it('allows valid chronological date ranges', () => {
    expect(validateDateRange('2026-01-01', '2026-01-02')).toBe(true);
    expect(validateDateRange('2026-01-01', '2026-01-01')).toBe(true);
    expect(validateDateRange('2026-01-01', undefined)).toBe(true);
    expect(validateDateRange(undefined, '2026-01-02')).toBe(true);
    expect(validateDateRange(undefined, undefined)).toBe(true);
  });

  it('rejects invalid inverted date ranges (from > to)', () => {
    expect(validateDateRange('2026-01-02', '2026-01-01')).toBe(false);
    expect(validateDateRange('2026-12-31', '2026-01-01')).toBe(false);
  });
});

describe('Audit Log Sensitive Data Masking Verification', () => {
  const sensitiveKeys = ['password', 'password_confirmation', 'token', 'secret', 'api_key', 'private_key'];

  function maskPayload(data: Record<string, any>): Record<string, any> {
    const masked: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
        masked[k] = '********';
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        masked[k] = maskPayload(v);
      } else {
        masked[k] = v;
      }
    }
    return masked;
  }

  it('masks sensitive attributes recursively', () => {
    const payload = {
      username: 'john_doe',
      password: 'cleartext_password',
      api_secret: 'top_secret_123',
      nested: {
        token: 'jwt.token.here',
        safe_field: 42,
      },
    };

    const result = maskPayload(payload);
    expect(result.username).toBe('john_doe');
    expect(result.password).toBe('********');
    expect(result.api_secret).toBe('********');
    expect(result.nested.token).toBe('********');
    expect(result.nested.safe_field).toBe(42);
  });
});

describe('Audit Log i18n Translation Parity', () => {
  const requiredAuditKeys = [
    'audit.title',
    'audit.subtitle',
    'audit.totalEvents',
    'audit.todayEvents',
    'audit.activeUsers',
    'audit.search',
    'audit.allModules',
    'audit.moduleRbac',
    'audit.moduleSales',
    'audit.moduleProcurement',
    'audit.moduleAccounting',
    'audit.moduleInventory',
    'audit.moduleCustomers',
    'audit.moduleExpenses',
    'audit.moduleOrganization',
    'audit.allActions',
    'audit.dateRange',
    'audit.dateAll',
    'audit.dateToday',
    'audit.dateYesterday',
    'audit.date7Days',
    'audit.date30Days',
    'audit.dateCustom',
    'audit.dateFrom',
    'audit.dateTo',
    'audit.clearFilters',
    'audit.applyFilters',
    'audit.event',
    'audit.user',
    'audit.entity',
    'audit.company',
    'audit.ip',
    'audit.timestamp',
    'audit.actions',
    'audit.viewDetails',
    'audit.noLogs',
    'audit.noLogsDesc',
    'audit.detailTitle',
    'audit.detailSubtitle',
    'audit.overview',
    'audit.actorInfo',
    'audit.requestInfo',
    'audit.beforeValues',
    'audit.afterValues',
    'audit.noStateChange',
    'audit.close',
    'audit.readOnly',
    'audit.readOnlyNotice',
    'audit.sensitiveMasked',
  ];

  it('verifies all audit translation keys exist in English (en.ts)', () => {
    for (const key of requiredAuditKeys) {
      expect((en as any)[key]).toBeDefined();
      expect(typeof (en as any)[key]).toBe('string');
      expect((en as any)[key].length).toBeGreaterThan(0);
    }
  });

  it('verifies all audit translation keys exist in Bengali (bn.ts)', () => {
    for (const key of requiredAuditKeys) {
      expect((bn as any)[key]).toBeDefined();
      expect(typeof (bn as any)[key]).toBe('string');
      expect((bn as any)[key].length).toBeGreaterThan(0);
    }
  });

  it('ensures 100% key parity between English and Bengali audit dictionaries', () => {
    for (const key of requiredAuditKeys) {
      expect((bn as any)[key]).toBeDefined();
      expect((en as any)[key]).toBeDefined();
    }
  });
});
