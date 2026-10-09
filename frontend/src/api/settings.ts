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

export interface BackupItem {
  id: number;
  filename: string;
  database_driver: string;
  database_name: string;
  file_size: number;
  file_size_human: string;
  checksum: string | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  created_by: string;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface MaintenanceOverviewData {
  database: {
    driver: string;
    name: string;
    version: string;
  };
  environment: {
    app_env: string;
    is_production: boolean;
    allow_destructive_reset: boolean;
    allow_demo_in_production: boolean;
  };
  backups: {
    total_count: number;
    last_backup: BackupItem | null;
    recent: BackupItem[];
  };
  demo: {
    has_demo: boolean;
    total_records: number;
    latest_batch: string | null;
  };
  permissions: {
    can_backup: boolean;
    can_reset: boolean;
    can_demo: boolean;
    can_demo_remove: boolean;
  };
}

export interface ResetPreviewData {
  mode: string;
  total_records_to_remove: number;
  breakdown: Record<string, number>;
  preserved: Record<string, number>;
  environment: string;
  safety_backup_required: boolean;
}

export interface ResetExecuteResult {
  operation_id: string;
  backup_id: number;
  backup_filename: string;
  mode: string;
  total_deleted: number;
  deleted_counts: Record<string, number>;
  preserved: Record<string, number>;
  duration_seconds: number;
  status: string;
  integrity_check: {
    status: string;
    details: Record<string, string>;
  };
  safety_backup?: {
    id: number;
    filename: string;
    status: string;
  };
  post_reset_integrity?: {
    passed: boolean;
    status: string;
    details?: Record<string, string>;
    active_companies?: number;
    active_users?: number;
    transactional_sales_count?: number;
  };
}

export interface DemoPreviewData {
  size: string;
  expected_counts: Record<string, number>;
  is_demo_present: boolean;
  existing_demo_count: number;
  currency: string;
  business_profile: string;
}

export interface DemoExecuteResult {
  success: boolean;
  batch_id?: string;
  total_records?: number;
  breakdown?: Record<string, number>;
  message: string;
  already_exists?: boolean;
}

export const maintenanceApi = {
  getOverview: async (): Promise<MaintenanceOverviewData> => {
    const res = await api.get('/settings/maintenance');
    return res.data?.data;
  },

  createBackup: async (note?: string): Promise<any> => {
    const res = await api.post('/settings/maintenance/backup', { note });
    return res.data;
  },

  listBackups: async (): Promise<BackupItem[]> => {
    const res = await api.get('/settings/maintenance/backups');
    return res.data?.data || [];
  },

  downloadBackup: async (id: number): Promise<void> => {
    const response = await api.get(`/settings/maintenance/backups/${id}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `retailcore_backup_${id}.dump`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  previewReset: async (): Promise<ResetPreviewData> => {
    const res = await api.post('/settings/maintenance/reset/preview');
    return res.data?.data;
  },

  executeReset: async (data: { confirmation_text: string; mode?: string; password?: string }): Promise<ResetExecuteResult> => {
    const res = await api.post('/settings/maintenance/reset', data);
    return res.data?.data;
  },

  previewDemo: async (size = 'small'): Promise<DemoPreviewData> => {
    const res = await api.post('/settings/maintenance/demo/preview', { size });
    return res.data?.data;
  },

  insertDemo: async (size = 'small'): Promise<DemoExecuteResult> => {
    const res = await api.post('/settings/maintenance/demo', { size });
    return res.data;
  },

  removeDemo: async (): Promise<any> => {
    const res = await api.post('/settings/maintenance/demo/remove');
    return res.data;
  },
};

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

  maintenance: maintenanceApi,
};

