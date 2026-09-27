import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Company } from '../types/organization';
import { 
  getCompany, 
  getCompanies, 
  updateCompany, 
  getActiveTenantId, 
  setActiveTenantCompany,
  getActiveCompanyFromStorage
} from '../api/organization';

export interface CompanyContextType {
  company: Company | null;
  companies: Company[];
  companyId: number;
  loading: boolean;
  error: string | null;
  switchCompany: (companyOrId: Company | number) => Promise<void>;
  updateCompanyProfile: (data: Partial<Company>) => Promise<Company>;
  refreshCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeCompanyId, setActiveCompanyId] = useState<number>(() => getActiveTenantId());
  const [localCompany, setLocalCompany] = useState<Company | null>(() => getActiveCompanyFromStorage());

  // React Query for authoritative active company profile
  const { 
    data: companyData, 
    isLoading: isCompanyLoading, 
    error: companyError,
    refetch: refetchCompany
  } = useQuery({
    queryKey: ['company-profile', activeCompanyId],
    queryFn: async () => {
      const res = await getCompany(activeCompanyId);
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: 1,
  });

  // React Query for available companies list
  const { 
    data: companiesList = []
  } = useQuery({
    queryKey: ['available-companies'],
    queryFn: async () => {
      const res = await getCompanies();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  // Effective company profile (prioritizes remote query, falls back to local storage)
  const currentCompany = companyData || localCompany;

  useEffect(() => {
    if (companyData) {
      setLocalCompany(companyData);
    }
  }, [companyData]);

  // Listen for tenant switch events across the window
  useEffect(() => {
    const handleTenantEvent = (e: any) => {
      const newComp = e.detail as Company | undefined;
      if (newComp && newComp.id) {
        if (newComp.id !== activeCompanyId) {
          setActiveCompanyId(newComp.id);
        }
        setLocalCompany(newComp);
      }
    };

    window.addEventListener('retailcore_tenant_changed', handleTenantEvent);
    return () => window.removeEventListener('retailcore_tenant_changed', handleTenantEvent);
  }, [activeCompanyId]);

  // Switch company handler
  const switchCompany = useCallback(async (companyOrId: Company | number) => {
    const targetId = typeof companyOrId === 'number' ? companyOrId : companyOrId.id;
    setActiveCompanyId(targetId);

    if (typeof companyOrId === 'object') {
      setActiveTenantCompany(companyOrId);
      setLocalCompany(companyOrId);
    } else {
      const found = companiesList.find((c) => c.id === targetId);
      if (found) {
        setActiveTenantCompany(found);
        setLocalCompany(found);
      } else {
        localStorage.setItem('active_company_id', String(targetId));
      }
    }

    // Invalidate company-scoped queries
    await queryClient.invalidateQueries({ queryKey: ['company-profile'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    await queryClient.invalidateQueries({ queryKey: ['reports'] });
    await queryClient.invalidateQueries({ queryKey: ['purchases'] });
    await queryClient.invalidateQueries({ queryKey: ['inventory'] });
    await queryClient.invalidateQueries({ queryKey: ['suppliers'] });

    // Refetch the new company profile
    const updated = await refetchCompany();
    if (updated.data) {
      setActiveTenantCompany(updated.data);
      setLocalCompany(updated.data);
    }
  }, [companiesList, queryClient, refetchCompany]);

  // Update company profile handler
  const updateCompanyProfile = useCallback(async (data: Partial<Company>): Promise<Company> => {
    const res = await updateCompany({ ...data, id: activeCompanyId });
    const updated = res.data;

    // Update query cache and local state immediately
    queryClient.setQueryData(['company-profile', activeCompanyId], updated);
    setLocalCompany(updated);
    setActiveTenantCompany(updated);

    // Invalidate dashboard/reports so any company identity on them refreshes
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });

    return updated;
  }, [activeCompanyId, queryClient]);

  const refreshCompany = useCallback(async () => {
    await refetchCompany();
  }, [refetchCompany]);

  const value: CompanyContextType = {
    company: currentCompany,
    companies: companiesList,
    companyId: activeCompanyId,
    loading: isCompanyLoading && !currentCompany,
    error: companyError ? (companyError as Error).message : null,
    switchCompany,
    updateCompanyProfile,
    refreshCompany,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextType {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
