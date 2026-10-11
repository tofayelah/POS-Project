export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | string;
  database: boolean;
  redis: boolean;
  version?: string;
  uptime_seconds?: number;
}

export interface SystemAuditLog {
  id: number | string;
  user_id?: number | string;
  action: string;
  details?: string;
  ip_address?: string;
  created_at?: string;
}

export interface SystemStatusData {
  github?: any;
  ai_studio?: any;
  live?: any;
  comparison?: any;
  environment?: string;
  checked_at?: string;
}

export interface SystemStatusResponse {
  success?: boolean;
  data: SystemStatusData;
}
