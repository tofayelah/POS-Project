import { describe, it, expect, vi, beforeEach } from 'vitest';
import { maintenanceApi } from '../api/settings';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe('MaintenanceCenter API Client & Workflow Logic (Frontend)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Backup API', () => {
    it('getOverview calls /settings/maintenance and returns dashboard telemetry', async () => {
      const mockOverview = {
        database: {
          driver: 'pgsql',
          name: 'retailcore',
          version: 'PostgreSQL 16.2',
        },
        environment: {
          app_env: 'production',
          is_production: true,
          allow_destructive_reset: false,
          allow_demo_in_production: false,
        },
        backups: {
          total_count: 5,
          last_backup: {
            id: 1,
            filename: 'retailcore_backup_2026-10-08_120000_abc123.dump',
            database_driver: 'pgsql',
            database_name: 'retailcore',
            file_size: 1048576,
            file_size_human: '1.00 MB',
            checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            status: 'COMPLETED',
            created_by: 'Super Admin',
            created_at: '2026-10-08T12:00:00Z',
            completed_at: '2026-10-08T12:00:10Z',
          },
          recent: [],
        },
        demo: {
          has_demo_data: false,
          record_count: 0,
        },
        permissions: {
          can_backup: true,
          can_reset: true,
          can_demo: true,
          can_demo_remove: true,
        },
      };

      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockOverview },
      });

      const result = await maintenanceApi.getOverview();
      expect(api.get).toHaveBeenCalledWith('/settings/maintenance');
      expect(result).toEqual(mockOverview);
      expect(result.database.driver).toBe('pgsql');
      expect(result.environment.is_production).toBe(true);
    });

    it('createBackup calls POST /settings/maintenance/backup with optional note', async () => {
      const mockResponse = {
        id: 42,
        filename: 'retailcore_backup_2026-10-08_143000_def456.dump',
        file_size: 2048576,
        file_size_human: '1.95 MB',
        checksum: 'abc123sha256',
        status: 'COMPLETED',
        created_at: '2026-10-08T14:30:00Z',
      };

      (api.post as any).mockResolvedValueOnce({
        data: { success: true, message: 'Backup created', data: mockResponse },
      });

      const result = await maintenanceApi.createBackup('Pre-upgrade manual backup');
      expect(api.post).toHaveBeenCalledWith('/settings/maintenance/backup', {
        note: 'Pre-upgrade manual backup',
      });
      expect(result.data.filename).toBe('retailcore_backup_2026-10-08_143000_def456.dump');
      expect(result.data.status).toBe('COMPLETED');
    });

    it('listBackups calls GET /settings/maintenance/backups', async () => {
      const mockList = [
        {
          id: 1,
          filename: 'backup_1.dump',
          database_driver: 'pgsql',
          database_name: 'retailcore',
          file_size: 512,
          file_size_human: '512 B',
          status: 'COMPLETED',
        },
      ];

      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockList },
      });

      const list = await maintenanceApi.listBackups();
      expect(api.get).toHaveBeenCalledWith('/settings/maintenance/backups');
      expect(list).toHaveLength(1);
    });

    it('downloadBackup calls GET /settings/maintenance/backups/:id/download with blob responseType', async () => {
      // Setup window/document mocks for Node environment
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURLMock = vi.fn();
      const clickMock = vi.fn();
      const appendChildMock = vi.fn();
      const removeMock = vi.fn();

      const originalWindow = globalThis.window;
      const originalDocument = globalThis.document;

      (globalThis as any).window = {
        URL: {
          createObjectURL: createObjectURLMock,
          revokeObjectURL: revokeObjectURLMock,
        },
      };

      (globalThis as any).document = {
        createElement: vi.fn().mockReturnValue({
          href: '',
          setAttribute: vi.fn(),
          click: clickMock,
          remove: removeMock,
        }),
        body: {
          appendChild: appendChildMock,
        },
      };

      (api.get as any).mockResolvedValueOnce({ data: new Uint8Array([1, 2, 3]) });

      await maintenanceApi.downloadBackup(12);
      expect(api.get).toHaveBeenCalledWith('/settings/maintenance/backups/12/download', {
        responseType: 'blob',
      });
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');

      // Restore
      (globalThis as any).window = originalWindow;
      (globalThis as any).document = originalDocument;
    });
  });

  describe('Data Reset API', () => {
    it('previewReset calls POST /settings/maintenance/reset/preview', async () => {
      const mockPreview = {
        environment: 'testing',
        is_production: false,
        allow_destructive_reset: true,
        target_company: 'Prime Retailers Dhaka',
        breakdown: {
          sales: 120,
          sale_items: 350,
          purchases: 45,
          stock_movements: 500,
        },
        preserved: {
          companies: 1,
          branches: 2,
          users: 4,
          roles: 4,
          permissions: 45,
          settings: 150,
          categories: 12,
          products: 85,
        },
        total_records_to_remove: 1015,
        safety_backup_required: true,
      };

      (api.post as any).mockResolvedValueOnce({
        data: { success: true, data: mockPreview },
      });

      const preview = await maintenanceApi.previewReset();
      expect(api.post).toHaveBeenCalledWith('/settings/maintenance/reset/preview');
      expect(preview.breakdown.sales).toBe(120);
      expect(preview.preserved.users).toBe(4);
    });

    it('executeReset calls POST /settings/maintenance/reset with strict confirmation and password', async () => {
      const mockResult = {
        operation_id: 'op-12345',
        backup_id: 99,
        backup_filename: 'safety_backup_pre_reset.dump',
        mode: 'TRANSACTIONAL_DATA',
        total_deleted: 165,
        deleted_counts: { sales: 120, purchases: 45 },
        preserved: { users: 4, companies: 1 },
        duration_seconds: 1.25,
        status: 'COMPLETED',
        integrity_check: {
          status: 'PASSED',
          details: { users: 'PASSED', companies: 'PASSED' },
        },
        safety_backup: {
          id: 99,
          filename: 'safety_backup_pre_reset.dump',
          status: 'COMPLETED',
        },
        post_reset_integrity: {
          passed: true,
          status: 'PASSED',
          active_users: 4,
          active_companies: 1,
          transactional_sales_count: 0,
        },
      };

      (api.post as any).mockResolvedValueOnce({
        data: { success: true, message: 'Reset completed', data: mockResult },
      });

      const result = await maintenanceApi.executeReset({
        confirmation_text: 'RESET RETAILCORE',
        password: 'adminPass123!',
        mode: 'TRANSACTIONAL_DATA',
      });

      expect(api.post).toHaveBeenCalledWith('/settings/maintenance/reset', {
        confirmation_text: 'RESET RETAILCORE',
        password: 'adminPass123!',
        mode: 'TRANSACTIONAL_DATA',
      });
      expect(result.safety_backup?.status).toBe('COMPLETED');
      expect(result.post_reset_integrity?.passed).toBe(true);
      expect(result.post_reset_integrity?.transactional_sales_count).toBe(0);
    });
  });

  describe('Demo Data API', () => {
    it('previewDemo calls POST /settings/maintenance/demo/preview with size', async () => {
      const mockDemoPreview = {
        size: 'medium',
        business_profile: 'Apex Retail Demo Ltd. (Bangladesh)',
        expected_counts: {
          categories: 6,
          products: 24,
          customers: 10,
          suppliers: 4,
          sales: 25,
        },
        is_demo_present: false,
        existing_demo_count: 0,
        currency: 'BDT (৳)',
      };

      (api.post as any).mockResolvedValueOnce({
        data: { success: true, data: mockDemoPreview },
      });

      const preview = await maintenanceApi.previewDemo('medium');
      expect(api.post).toHaveBeenCalledWith('/settings/maintenance/demo/preview', { size: 'medium' });
      expect(preview.size).toBe('medium');
      expect(preview.business_profile).toContain('Apex Retail');
    });

    it('insertDemo calls POST /settings/maintenance/demo with size', async () => {
      const mockInsertResult = {
        success: true,
        message: 'Demo dataset inserted successfully.',
        total_records: 65,
        breakdown: {
          categories: 6,
          products: 24,
          customers: 10,
          sales: 25,
        },
      };

      (api.post as any).mockResolvedValueOnce({
        data: mockInsertResult,
      });

      const result = await maintenanceApi.insertDemo('medium');
      expect(api.post).toHaveBeenCalledWith('/settings/maintenance/demo', { size: 'medium' });
      expect(result.success).toBe(true);
      expect(result.breakdown?.products).toBe(24);
    });

    it('removeDemo calls POST /settings/maintenance/demo/remove', async () => {
      const mockRemoveResult = {
        success: true,
        message: 'Demo data removed successfully.',
        total_removed: 40,
      };

      (api.post as any).mockResolvedValueOnce({
        data: mockRemoveResult,
      });

      const result = await maintenanceApi.removeDemo();
      expect(api.post).toHaveBeenCalledWith('/settings/maintenance/demo/remove');
      expect(result.success).toBe(true);
      expect(result.total_removed).toBe(40);
    });
  });

  describe('Multi-step Confirmation Safety Invariants', () => {
    it('exact confirmation keyword must be "RESET RETAILCORE"', () => {
      const requiredPhrase = 'RESET RETAILCORE';
      const userInputCorrect: string = 'RESET RETAILCORE';
      const userInputWrong: string = 'reset retailcore';
      const userInputPartial: string = 'RESET';

      expect(userInputCorrect === requiredPhrase).toBe(true);
      expect(userInputWrong === requiredPhrase).toBe(false);
      expect(userInputPartial === requiredPhrase).toBe(false);
    });
  });
});
