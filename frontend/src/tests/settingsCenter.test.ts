import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsApi } from '../api/settings';
import api from '../api/axios';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe('SettingsCenter & Configuration Center (Frontend)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('settingsApi client methods', () => {
    it('getGroups calls /settings/groups and returns group metadata', async () => {
      const mockGroups = {
        general: { name: 'General Settings', bn_name: 'সাধারণ সেটিংস', description: 'General defaults', permission: 'settings.general' },
        pos: { name: 'POS Settings', bn_name: 'পিওএস সেটিংস', description: 'POS defaults', permission: 'settings.pos' },
      };
      (api.get as any).mockResolvedValueOnce({ data: { success: true, data: mockGroups } });

      const result = await settingsApi.getGroups();
      expect(api.get).toHaveBeenCalledWith('/settings/groups');
      expect(result).toEqual(mockGroups);
    });

    it('getGroupSettings calls /settings/:group and returns data', async () => {
      const mockData = {
        group: 'pos',
        settings: {
          receipt_size: { value: '80mm', type: 'string' },
          allow_price_override: { value: false, type: 'boolean' },
        },
      };
      (api.get as any).mockResolvedValueOnce({ data: { success: true, data: mockData } });

      const result = await settingsApi.getGroupSettings('pos');
      expect(api.get).toHaveBeenCalledWith('/settings/pos');
      expect(result).toEqual(mockData);
    });

    it('updateGroupSettings calls PUT /settings/:group with payload', async () => {
      const payload = { receipt_size: '58mm', allow_price_override: true };
      (api.put as any).mockResolvedValueOnce({
        data: { success: true, message: 'Settings updated successfully' },
      });

      const result = await settingsApi.updateGroupSettings('pos', payload);
      expect(api.put).toHaveBeenCalledWith('/settings/pos', { settings: payload });
      expect(result.success).toBe(true);
    });

    it('previewNumbering calls POST /settings/numbering/preview', async () => {
      (api.post as any).mockResolvedValueOnce({
        data: { success: true, data: { preview: 'INV-000042' } },
      });

      const preview = await settingsApi.previewNumbering('sales_invoice');
      expect(api.post).toHaveBeenCalledWith('/settings/numbering/preview', { type: 'sales_invoice' });
      expect(preview).toBe('INV-000042');
    });

    it('getSystemInfo calls /settings/system-info', async () => {
      const mockSys = {
        system_name: 'RetailCore POS/ERP',
        system_version: '2.4.0-enterprise',
        api_version: 'v1',
        laravel_version: '12.0',
        php_version: '8.3',
        database: 'pgsql',
        cache_driver: 'redis',
        queue_driver: 'database',
        server_time: '2026-10-08T22:00:00Z',
        timezone: 'Asia/Dhaka',
        environment: 'production',
      };
      (api.get as any).mockResolvedValueOnce({ data: { success: true, data: mockSys } });

      const sys = await settingsApi.getSystemInfo();
      expect(api.get).toHaveBeenCalledWith('/settings/system-info');
      expect(sys.system_name).toBe('RetailCore POS/ERP');
    });
  });

  describe('Internationalization (i18n) Parity', () => {
    const requiredSettingsKeys = [
      'settings.title',
      'settings.subtitle',
      'settings.saveChanges',
      'settings.saving',
      'settings.reset',
      'settings.unsavedChanges',
      'settings.unsavedWarning',
      'settings.saveSuccess',
      'settings.saveError',
      'settings.dangerousNotice',
      'settings.group.general',
      'settings.group.company',
      'settings.group.security',
      'settings.group.pos',
      'settings.group.sales',
      'settings.group.purchase',
      'settings.group.inventory',
      'settings.group.accounting',
      'settings.group.vat',
      'settings.group.payments',
      'settings.group.crm',
      'settings.group.hr',
      'settings.group.ecommerce',
      'settings.group.notifications',
      'settings.group.numbering',
      'settings.group.bi',
      'settings.group.maintenance',
      'settings.group.localization',
      'settings.group.audit',
      'settings.group.system',
      'settings.numbering.livePreview',
      'settings.numbering.previewResult',
      'settings.system.runtime',
      'settings.system.database',
      'settings.system.cache',
      'settings.system.queue',
      'settings.system.serverTime',
    ];

    it('all settings keys exist in English translation dictionary', () => {
      requiredSettingsKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect((en as any)[key]).toBeTruthy();
      });
    });

    it('all settings keys exist in Bengali translation dictionary', () => {
      requiredSettingsKeys.forEach((key) => {
        expect(bn).toHaveProperty(key);
        expect((bn as any)[key]).toBeTruthy();
      });
    });
  });
});
