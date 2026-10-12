import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  getV2Capabilities,
  getV2Health,
  getV2Status,
  V2CapabilitiesData,
  V2HealthData,
  V2StatusData,
} from '../api/v2System';

export type V2ConnectionState = 'loading' | 'online' | 'degraded' | 'offline' | 'error';

export interface V2SystemContextType {
  health: V2HealthData | null;
  status: V2StatusData | null;
  capabilities: V2CapabilitiesData | null;
  loading: boolean;
  connectionState: V2ConnectionState;
  isLive: boolean;
  error: string | null;
  lastChecked: Date | null;
  refreshV2System: () => Promise<void>;
  isFeatureEnabled: (featureKey: string) => boolean;
}

const V2SystemContext = createContext<V2SystemContextType | undefined>(undefined);

// Baseline feature flags for graceful UI preservation
const BASELINE_CAPABILITIES: Record<string, boolean> = {
  product_master_v2: true,
  pos_workflow_v2: true,
  multi_tenant_rbac: true,
  immutable_inventory_ledger: true,
  double_entry_accounting: true,
  procurement_matching_3way: true,
  bi_analytics_dashboard: true,
  unified_light_theme: true,
};

export const V2SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [health, setHealth] = useState<V2HealthData | null>(null);
  const [status, setStatus] = useState<V2StatusData | null>(null);
  const [capabilities, setCapabilities] = useState<V2CapabilitiesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionState, setConnectionState] = useState<V2ConnectionState>('loading');
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const isMountedRef = useRef(true);

  const refreshV2System = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [hRes, sRes, cRes] = await Promise.all([
        getV2Health(),
        getV2Status(),
        getV2Capabilities(),
      ]);

      if (!isMountedRef.current) return;

      setLastChecked(new Date());

      // Evaluate Health
      if (hRes.data) {
        setHealth(hRes.data);
        setIsLive(hRes.isLive);
        if (hRes.data.status === 'degraded' || hRes.data.database === 'disconnected') {
          setConnectionState('degraded');
          setError('Database connectivity degraded');
        } else {
          setConnectionState('online');
        }
      } else {
        setHealth(null);
        setIsLive(false);
        setConnectionState('offline');
        setError(hRes.error || 'V2 health endpoint unreachable');
      }

      // Evaluate Status
      if (sRes.data) {
        setStatus(sRes.data);
      } else {
        setStatus(null);
      }

      // Evaluate Capabilities
      if (cRes.data) {
        setCapabilities(cRes.data);
      } else {
        setCapabilities(null);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.warn('V2 System check caught non-fatal exception:', err);
      setIsLive(false);
      setConnectionState('error');
      setError(err?.message || 'Unexpected connection error');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refreshV2System();

    return () => {
      isMountedRef.current = false;
    };
  }, [refreshV2System]);

  const isFeatureEnabled = useCallback((featureKey: string): boolean => {
    if (capabilities?.capabilities && typeof capabilities.capabilities[featureKey] === 'boolean') {
      return capabilities.capabilities[featureKey];
    }
    return BASELINE_CAPABILITIES[featureKey] ?? true;
  }, [capabilities]);

  return (
    <V2SystemContext.Provider
      value={{
        health,
        status,
        capabilities,
        loading,
        connectionState,
        isLive,
        error,
        lastChecked,
        refreshV2System,
        isFeatureEnabled,
      }}
    >
      {children}
    </V2SystemContext.Provider>
  );
};

export const useV2System = () => {
  const context = useContext(V2SystemContext);
  if (!context) {
    throw new Error('useV2System must be used within a V2SystemProvider');
  }
  return context;
};
