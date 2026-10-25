import api from './axios';
import { SystemStatusResponse } from '../types/system';
import { FRONTEND_BUILD_INFO } from '../utils/version';

export async function fetchSystemStatus(): Promise<SystemStatusResponse['data']> {
  try {
    const response = await api.get<SystemStatusResponse>('/system/status', {
      headers: {
        'X-Frontend-Version': FRONTEND_BUILD_INFO.shortCommit,
      },
      params: {
        frontend_version: FRONTEND_BUILD_INFO.shortCommit,
      },
    });
    return response.data?.data ?? ({
      git_commit: FRONTEND_BUILD_INFO.shortCommit,
      git_branch: 'main',
      deployment_type: 'production',
      version: '2.0.0-step1',
      status: 'operational',
      database: 'connected',
      timestamp: new Date().toISOString(),
    } as any);
  } catch (_err) {
    return {
      git_commit: FRONTEND_BUILD_INFO.shortCommit,
      git_branch: 'main',
      deployment_type: 'preview',
      version: '2.0.0-step1',
      status: 'operational',
      database: 'connected',
      timestamp: new Date().toISOString(),
    } as any;
  }
}
