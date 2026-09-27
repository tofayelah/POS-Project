import api from './axios';
import { SystemStatusResponse } from '../types/system';
import { FRONTEND_BUILD_INFO } from '../utils/version';

export async function fetchSystemStatus(): Promise<SystemStatusResponse['data']> {
  const response = await api.get<SystemStatusResponse>('/system/status', {
    headers: {
      'X-Frontend-Version': FRONTEND_BUILD_INFO.shortCommit,
    },
    params: {
      frontend_version: FRONTEND_BUILD_INFO.shortCommit,
    },
  });
  return response.data.data;
}
