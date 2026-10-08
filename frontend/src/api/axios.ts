import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Multi-Tenant Isolation Headers
  const activeCompanyId = localStorage.getItem('active_company_id') || '1';
  config.headers['X-Company-ID'] = activeCompanyId;

  // Subdomain detection or storage
  let activeSubdomain = localStorage.getItem('active_subdomain');
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
