import api from './axios';

export interface V2HealthData {
  system: string;
  version: string;
  api_version: string;
  status: 'healthy' | 'degraded' | string;
  database: 'connected' | 'disconnected' | string;
  architecture: {
    framework: string;
    tenant_isolation: string;
    rbac_engine: string;
    accounting_engine: string;
    inventory_engine: string;
  };
  timestamp: string;
}

export interface V2StatusData {
  environment: string;
  v2_foundation: {
    step: number;
    name: string;
    status: string;
    installed_at: string;
  };
  github: {
    repository: string;
    branch: string;
    commit: string;
    commit_full: string;
    status: string;
  };
  live: {
    environment: string;
    commit: string;
    backend: {
      status: string;
      version: string;
      api_version: string;
    };
    frontend: {
      status: string;
      version: string;
    };
    database: {
      status: string;
    };
  };
  comparison: {
    github_vs_live: string;
    backend_vs_frontend: string;
  };
  checked_at: string;
}

export interface V2CapabilitiesData {
  v2_spec: string;
  capabilities: Record<string, boolean>;
  modules: string[];
}

export interface V2ApiResponse<T> {
  success: boolean;
  data: T | null;
  isLive: boolean;
  error: string | null;
}

export const getV2Health = async (): Promise<V2ApiResponse<V2HealthData>> => {
  try {
    const res = await api.get<{ success: boolean; data: V2HealthData }>('/v2/health', {
      timeout: 5000,
    });
    return {
      success: res.data?.success ?? true,
      data: res.data?.data ?? null,
      isLive: true,
      error: null,
    };
  } catch (err: any) {
    // If backend responded with 503 degraded payload, extract data without faking success
    if (err?.response?.data?.data) {
      return {
        success: false,
        data: err.response.data.data,
        isLive: true,
        error: 'System degraded',
      };
    }

    const errorMessage = err?.response?.data?.error || err?.message || 'Health check unavailable';
    return {
      success: false,
      data: null,
      isLive: false,
      error: errorMessage,
    };
  }
};

export const getV2Status = async (): Promise<V2ApiResponse<V2StatusData>> => {
  try {
    const res = await api.get<{ success: boolean; data: V2StatusData }>('/v2/system/status', {
      timeout: 5000,
    });
    return {
      success: res.data?.success ?? true,
      data: res.data?.data ?? null,
      isLive: true,
      error: null,
    };
  } catch (err: any) {
    const errorMessage = err?.response?.data?.error || err?.message || 'Status check unavailable';
    return {
      success: false,
      data: null,
      isLive: false,
      error: errorMessage,
    };
  }
};

export const getV2Capabilities = async (): Promise<V2ApiResponse<V2CapabilitiesData>> => {
  try {
    const res = await api.get<{ success: boolean; data: V2CapabilitiesData }>('/v2/system/capabilities', {
      timeout: 5000,
    });
    return {
      success: res.data?.success ?? true,
      data: res.data?.data ?? null,
      isLive: true,
      error: null,
    };
  } catch (err: any) {
    const errorMessage = err?.response?.data?.error || err?.message || 'Capabilities check unavailable';
    return {
      success: false,
      data: null,
      isLive: false,
      error: errorMessage,
    };
  }
};
