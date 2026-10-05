import api from './axios';

export interface AuditLogUser {
  id: number;
  name: string;
  email: string;
}

export interface AuditLogCompany {
  id: number;
  name: string;
  code: string;
}

export interface AuditLog {
  id: number;
  uuid: string;
  company_id: number | null;
  user_id: number | null;
  event: string;
  auditable_type: string | null;
  auditable_id: number | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at?: string;
  user?: AuditLogUser | null;
  company?: AuditLogCompany | null;
}

export interface AuditLogFilters {
  page?: number;
  per_page?: number;
  search?: string;
  action?: string;
  event?: string;
  module?: string;
  user_id?: number;
  entity_type?: string;
  entity_id?: number;
  date_from?: string;
  date_to?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  company_id?: number;
}

export interface AuditLogPaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface AuditLogListResponse {
  success: boolean;
  data: AuditLog[];
  meta: AuditLogPaginationMeta;
}

export interface AuditLogDetailResponse {
  success: boolean;
  data: AuditLog;
}

export const auditApi = {
  getAuditLogs: async (filters: AuditLogFilters = {}): Promise<AuditLogListResponse> => {
    const res = await api.get('/audit-logs', { params: filters });
    return res.data;
  },

  getAuditLog: async (id: number): Promise<AuditLogDetailResponse> => {
    const res = await api.get(`/audit-logs/${id}`);
    return res.data;
  },
};
