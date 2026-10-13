import axios from 'axios';

const defaultBaseUrl =
  typeof window !== 'undefined'
    ? ((import.meta as any).env?.VITE_API_URL || '/api/v1')
    : (process.env?.NODE_ENV_API_URL || 'http://127.0.0.1:3000/api/v1');

const api = axios.create({
  baseURL: defaultBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Multi-Tenant Isolation Headers
  const activeCompanyId = typeof localStorage !== 'undefined' ? (localStorage.getItem('active_company_id') || '1') : '1';
  config.headers['X-Company-ID'] = activeCompanyId;

  // Subdomain detection or storage
  let activeSubdomain = typeof localStorage !== 'undefined' ? localStorage.getItem('active_subdomain') : null;
  if (!activeSubdomain && typeof window !== 'undefined') {
    const hostParts = window.location.hostname.split('.');
    if (hostParts.length > 2 && hostParts[0] !== 'www') {
      activeSubdomain = hostParts[0];
    }
  }
  if (activeSubdomain) {
    config.headers['X-Tenant-Subdomain'] = activeSubdomain;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/login');
      if (!isLoginRequest) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
