import api from './axios';

export interface SettingGroupMeta {
  name: string;
  bn_name: string;
  description: string;
  permission: string;
}

export interface SettingField {
  value: any;
  type: 'string' | 'integer' | 'decimal' | 'boolean' | 'json';
  description?: string;
  is_system?: boolean;
  sensitive?: boolean;
}

export type GroupSettingsMap = Record<string, SettingField>;

export interface SystemInfoData {
  system_name: string;
  system_version: string;
  api_version: string;
  laravel_version: string;
  php_version: string;
  database: string;
  cache_driver: string;
  queue_driver: string;
  server_time: string;
  timezone: string;
  environment: string;
}

export const settingsApi = {
  getGroups: async (): Promise<Record<string, SettingGroupMeta>> => {
    const res = await api.get('/settings/groups');
    return res.data?.data || {};
  },

  getAllSettings: async (): Promise<{
    groups: Record<string, SettingGroupMeta>;
    settings: Record<string, GroupSettingsMap>;
  }> => {
    const res = await api.get('/settings');
    return res.data?.data || { groups: {}, settings: {} };
  },

  getGroupSettings: async (group: string): Promise<{
    group: string;
    meta?: SettingGroupMeta;
    settings: GroupSettingsMap;
  }> => {
    const res = await api.get(`/settings/${group}`);
    return res.data?.data || { group, settings: {} };
  },

  updateGroupSettings: async (group: string, settings: Record<string, any>): Promise<any> => {
    const res = await api.put(`/settings/${group}`, { settings });
    return res.data;
  },

  updateSingleSetting: async (group: string, key: string, value: any): Promise<any> => {
    const res = await api.put(`/settings/${group}/${key}`, { value });
    return res.data;
  },

  previewNumbering: async (type: string): Promise<string> => {
    const res = await api.post('/settings/numbering/preview', { type });
    return res.data?.data?.preview || '';
  },

  getSystemInfo: async (): Promise<SystemInfoData> => {
    const res = await api.get('/settings/system-info');
    return res.data?.data || ({} as SystemInfoData);
  },
};
