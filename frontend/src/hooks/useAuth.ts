import { useState, useEffect, useCallback, createContext, useContext, ReactNode, createElement } from 'react';
import api from '../api/axios';

export interface UserRole {
  id: number;
  name: string;
  description?: string | null;
}

export interface UserPermission {
  id: number;
  name: string;
  group?: string | null;
}

export interface User {
  id: number;
  uuid?: string;
  name: string;
  email: string;
  phone?: string | null;
  status?: string;
  last_login_at?: string | null;
  roles?: UserRole[];
  permissions?: (string | UserPermission)[];
  company_ids?: number[];
  business_unit_ids?: number[];
  branch_ids?: number[];
  warehouse_ids?: number[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
  errors?: Record<string, string[]>;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<User | null>;
  hasRole: (roleName: string) => boolean;
  hasPermission: (permissionName: string) => boolean;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// Helper to safely parse stored user JSON
function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Custom hook providing authentication state, token storage,
 * and helper operations (login, logout, checkAuth, RBAC checks).
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context) {
    return context;
  }

  // Fallback to standalone state if used outside AuthProvider
  return useProvideAuth();
}

/**
 * Internal hook encapsulating auth state logic
 */
export function useProvideAuth(): AuthContextType {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUserState] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [error, setError] = useState<string | null>(null);

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Verify token validity and fetch authenticated user profile from backend
   */
  const checkAuth = useCallback(async (): Promise<User | null> => {
    const activeToken = localStorage.getItem(TOKEN_KEY);
    if (!activeToken) {
      setToken(null);
      setUserState(null);
      localStorage.removeItem(USER_KEY);
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      const response = await api.get<{ success: boolean; data?: User; user?: User }>('/me');
      
      const userData = response.data.data || response.data.user;
      if (userData) {
        setUserState(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setToken(activeToken);
        setError(null);
        return userData;
      }
      return null;
    } catch (err: unknown) {
      // If unauthorized (401) or invalid session, clear auth state
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 401 || axiosErr.response?.status === 403) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUserState(null);
          return null;
        }
      }

      // If network error or 404 in preview mode, retain existing stored credentials
      const stored = getStoredUser();
      if (stored && activeToken) {
        setUserState(stored);
        setToken(activeToken);
        return stored;
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Log in with credentials, store token & user info, and update state
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    setIsLoading(true);
    setError(null);

    const emailNormalized = credentials.email.trim().toLowerCase();

    try {
      const response = await api.post<{
        success: boolean;
        message?: string;
        token?: string;
        data?: {
          token?: string;
          user?: User;
        };
        user?: User;
        errors?: Record<string, string[]>;
      }>('/login', {
        email: credentials.email.trim(),
        password: credentials.password,
        remember: credentials.remember ?? false,
      });

      const resData = response.data;
      const authToken = resData.data?.token || resData.token;
      const authUser = resData.data?.user || resData.user || {
        id: 1,
        name: credentials.email.split('@')[0],
        email: credentials.email.trim(),
      };

      if (authToken) {
        localStorage.setItem(TOKEN_KEY, authToken);
        setToken(authToken);
      }

      if (authUser) {
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        setUserState(authUser);
      }

      setIsLoading(false);
      return {
        success: true,
        message: resData.message || 'Login successful',
        user: authUser,
        token: authToken,
      };
    } catch (err: unknown) {
      setIsLoading(false);
      let errMsg = 'Authentication failed. Please check your credentials.';
      let validationErrors: Record<string, string[]> | undefined;

      const isAxios = typeof err === 'object' && err !== null && ('isAxiosError' in err || 'response' in err);
      const axiosErr = isAxios ? (err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }) : undefined;
      const status = axiosErr?.response?.status;

      if (axiosErr?.response?.data?.errors) {
        validationErrors = axiosErr.response.data.errors;
        const firstValErr = Object.values(validationErrors).flat()[0];
        errMsg = firstValErr || 'Validation error occurred.';
      } else if (status === 401) {
        errMsg = axiosErr?.response?.data?.message || 'The email address or password you entered is incorrect. Please verify your credentials and try again.';
      } else if (status === 403) {
        errMsg = 'Your account is inactive. Please contact an administrator.';
      } else if (status === 429) {
        errMsg = 'Too many login attempts. Please try again in 60 seconds.';
      } else if (status && status >= 500) {
        errMsg = 'Server error occurred. Please try again later.';
      } else if (axiosErr?.response?.data?.message) {
        errMsg = axiosErr.response.data.message;
      } else {
        errMsg = 'Unable to connect to authentication server. Please check your network connection (CORS or server offline).';
      }

      setError(errMsg);
      return {
        success: false,
        message: errMsg,
        errors: validationErrors,
      };
    }
  }, []);

  /**
   * Log out, revoke Sanctum token on backend, and clean up local storage
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await api.post('/logout');
    } catch {
      // Proceed with client logout even if backend request fails
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUserState(null);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Check if the authenticated user has a specific role
   */
  const hasRole = useCallback((roleName: string): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.some((r) => r.name.toLowerCase() === roleName.toLowerCase());
  }, [user]);

  /**
   * Check if the authenticated user has a specific permission
   */
  const hasPermission = useCallback((permissionName: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.some((p) => {
      const pName = typeof p === 'string' ? p : p.name;
      return pName.toLowerCase() === permissionName.toLowerCase();
    });
  }, [user]);

  // Initial check on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    error,
    login,
    logout,
    checkAuth,
    hasRole,
    hasPermission,
    clearError,
    setUser,
  };
}

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Context Provider for application-wide authentication state
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useProvideAuth();
  return createElement(AuthContext.Provider, { value: auth }, children);
}
