/**
 * RetailCore ERP — Environment & API Fallback Safety Module
 */

export interface ApiErrorResult {
  message: string;
  statusCode?: number;
  isNetworkError: boolean;
  isAuthError: boolean;
  isForbiddenError: boolean;
  isNotFoundError: boolean;
  isValidationError: boolean;
}

/**
 * Determines whether the current execution context is in Demo / Preview / Dev / Test mode.
 */
export function isDemoOrPreviewMode(): boolean {
  if (typeof process !== 'undefined' && process.env?.RETAILCORE_DEMO_MODE === 'false') {
    return false;
  }
  if (typeof process !== 'undefined' && process.env?.RETAILCORE_DEMO_MODE === 'true') {
    return true;
  }

  if (typeof localStorage !== 'undefined') {
    const demoFlag = localStorage.getItem('retailcore_demo_mode');
    if (demoFlag === 'false') return false;
    if (demoFlag === 'true') return true;
  }

  // Strict Production Build Gate: In production builds, default to FALSE unless explicitly forced.
  const isViteProd = (import.meta as any)?.env?.PROD === true || (import.meta as any)?.env?.MODE === 'production';
  const isNodeProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  if (isViteProd || isNodeProd) {
    return (import.meta as any)?.env?.VITE_DEMO_MODE === 'true';
  }

  // Environment mode checks for non-production environments
  const mode = (import.meta as any)?.env?.MODE || (typeof process !== 'undefined' ? process.env?.NODE_ENV : '');
  const isDev = (import.meta as any)?.env?.DEV || mode === 'development' || mode === 'test' || mode === 'dev';
  const isDemoEnv = (import.meta as any)?.env?.VITE_DEMO_MODE === 'true';

  // Domain checks (only evaluated in non-production builds)
  const hostname = typeof window !== 'undefined' ? window.location?.hostname || '' : 'localhost';
  const isDevDomain =
    hostname.includes('ais-dev') ||
    hostname.includes('ais-pre') ||
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1');

  return Boolean(isDev || isDemoEnv || isDevDomain);
}

/**
 * Returns true if explicitly in Production environment without demo override.
 */
export function isProductionMode(): boolean {
  return !isDemoOrPreviewMode();
}

/**
 * Extract structured error details from Axios or network errors.
 */
export function extractApiError(err: any): ApiErrorResult {
  if (err?.response) {
    const statusCode = err.response.status;
    const message =
      err.response.data?.message ||
      err.response.data?.error ||
      (statusCode === 401
        ? 'Authentication failed (401). Please log in again.'
        : statusCode === 403
        ? 'Access forbidden (403). You do not have permissions for this action.'
        : statusCode === 404
        ? 'Resource not found (404).'
        : statusCode === 422
        ? 'Validation error (422). Please verify the submitted data.'
        : statusCode === 500
        ? 'Backend internal server error (500).'
        : `Server error (HTTP ${statusCode})`);

    return {
      message,
      statusCode,
      isNetworkError: false,
      isAuthError: statusCode === 401,
      isForbiddenError: statusCode === 403,
      isNotFoundError: statusCode === 404,
      isValidationError: statusCode === 422,
    };
  }

  return {
    message: err?.message || 'Network Error. Could not connect to backend server.',
    statusCode: undefined,
    isNetworkError: true,
    isAuthError: false,
    isForbiddenError: false,
    isNotFoundError: false,
    isValidationError: false,
  };
}
