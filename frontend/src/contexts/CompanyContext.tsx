import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Company, Branch } from '../types/organization';
import { 
  getCompany, 
  getCompanies, 
  updateCompany, 
  getActiveTenantId, 
  setActiveTenantCompany,
  getActiveCompanyFromStorage,
  getBranches,
  DEFAULT_BRANCHES
} from '../api/organization';
import { ensureDemoDataSeeded } from '../api/demoData';

export const ACTIVE_BRANCH_STORAGE_KEY = 'retailcore_active_branch_id';

export interface CompanyContextType {
  // One Company Architecture
  company: Company | null;
  companies: Company[];
  companyId: number;
  loading: boolean;
  error: string | null;
  switchCompany: (companyOrId: Company | number) => Promise<void>;
  updateCompanyProfile: (data: Partial<Company>) => Promise<Company>;
  refreshCompany: () => Promise<void>;

  // Multi-Branch Architecture
  branches: Branch[];
  activeBranchId: number | 'all';
  activeBranch: Branch | null;
  isAllBranches: boolean;
  switchBranch: (branchId: number | 'all') => void;
  refreshBranches: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const getInitialBranchId = (): number | 'all' => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
    if (saved === 'all') return 'all';
    if (saved && !isNaN(Number(saved))) return Number(saved);
  }
  return 1; // Default to Dhaka Head Office Branch (ID: 1)
};

export function CompanyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeCompanyId, setActiveCompanyId] = useState<number>(() => getActiveTenantId());
  const [localCompany, setLocalCompany] = useState<Company | null>(() => getActiveCompanyFromStorage());
  const [activeBranchId, setActiveBranchId] = useState<number | 'all'>(getInitialBranchId);

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

  // React Query for branches in this enterprise company
  const {
    data: branchesList = DEFAULT_BRANCHES,
    refetch: refetchBranchesQuery
  } = useQuery({
    queryKey: ['company-branches', activeCompanyId],
    queryFn: async () => {
      try {
        const res = await getBranches();
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          return res.data;
        }
      } catch {}
      return DEFAULT_BRANCHES;
    },
    staleTime: 1000 * 60 * 5,
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
          setActiveCompanyId(Number(newComp.id));
        }
        setLocalCompany(newComp);
      }
    };

    window.addEventListener('retailcore_tenant_changed', handleTenantEvent);
    return () => window.removeEventListener('retailcore_tenant_changed', handleTenantEvent);
  }, [activeCompanyId]);

  // Ensure initial operational demo records exist on startup
  useEffect(() => {
    ensureDemoDataSeeded();
  }, []);

  // Listen for demo data upload/reset events
  useEffect(() => {
    const handleDemoSeeded = () => {
      setLocalCompany(getActiveCompanyFromStorage());
      refetchCompany();
      refetchBranchesQuery();
      queryClient.invalidateQueries();
    };

    window.addEventListener('retailcore_demo_seeded', handleDemoSeeded);
    return () => window.removeEventListener('retailcore_demo_seeded', handleDemoSeeded);
  }, [refetchCompany, refetchBranchesQuery, queryClient]);

  // Multi-branch active branch resolution
  const activeBranch = useMemo(() => {
    if (activeBranchId === 'all') return null;
    const found = branchesList.find((b) => Number(b.id) === Number(activeBranchId));
    return found || branchesList[0] || null;
  }, [branchesList, activeBranchId]);

  const isAllBranches = activeBranchId === 'all';

  // Switch branch handler
  const switchBranch = useCallback((branchId: number | 'all') => {
    setActiveBranchId(branchId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, String(branchId));
      window.dispatchEvent(new CustomEvent('retailcore_branch_changed', { detail: { branchId } }));
    }
    // Invalidate queries that are branch scoped
    queryClient.invalidateQueries({ queryKey: ['pos-terminals'] });
    queryClient.invalidateQueries({ queryKey: ['pos-session'] });
    queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  }, [queryClient]);

  // Listen for cross-window / tab branch changes
  useEffect(() => {
    const handleBranchEvent = (e: any) => {
      const newBranchId = e.detail?.branchId;
      if (newBranchId !== undefined && newBranchId !== activeBranchId) {
        setActiveBranchId(newBranchId);
      }
    };
    window.addEventListener('retailcore_branch_changed', handleBranchEvent);
    return () => window.removeEventListener('retailcore_branch_changed', handleBranchEvent);
  }, [activeBranchId]);

  // Switch company handler
  const switchCompany = useCallback(async (companyOrId: Company | number) => {
    const targetId = typeof companyOrId === 'number' ? companyOrId : Number(companyOrId.id);
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
    await queryClient.invalidateQueries({ queryKey: ['company-branches'] });
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

  const refreshBranches = useCallback(async () => {
    await refetchBranchesQuery();
  }, [refetchBranchesQuery]);

  const value: CompanyContextType = {
    company: currentCompany,
    companies: companiesList,
    companyId: activeCompanyId,
    loading: isCompanyLoading && !currentCompany,
    error: companyError ? (companyError as Error).message : null,
    switchCompany,
    updateCompanyProfile,
    refreshCompany,
    branches: branchesList,
    activeBranchId,
    activeBranch,
    isAllBranches,
    switchBranch,
    refreshBranches,
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

export function useBranch() {
  const { 
    branches, 
    activeBranchId, 
    activeBranch, 
    isAllBranches, 
    switchBranch, 
    refreshBranches 
  } = useCompany();
  return { 
    branches, 
    activeBranchId, 
    activeBranch, 
    isAllBranches, 
    switchBranch, 
    refreshBranches 
  };
}
