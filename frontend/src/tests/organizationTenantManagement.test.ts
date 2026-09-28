import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory mock storage for Node test environment
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
  clear: () => { storage.clear(); },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() { return storage.size; },
};

(globalThis as unknown as { localStorage: typeof mockLocalStorage }).localStorage = mockLocalStorage;

import api from '../api/axios';
import {
  getCompanyUsers,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  assignUserToCompany,
  removeUserFromCompany,
  getRoles,
  setActiveTenantCompany,
  getActiveTenantId
} from '../api/organization';
import { Company } from '../types/organization';

describe('Organization & Tenant User Management Frontend Tests', () => {
  const companyA: Company = {
    id: 1,
    name: 'Trust Bond Trading',
    legal_name: 'Trust Bond Trading Limited',
    code: 'TBT-01',
    business_type: 'GENERAL_RETAIL',
    status: 'active',
  };

  const companyB: Company = {
    id: 2,
    name: 'ABC Fashion Ltd.',
    legal_name: 'ABC Fashion International Ltd.',
    code: 'ABC-02',
    business_type: 'GARMENTS_APPAREL',
    status: 'active',
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  it('fetches users for the active company tenant', async () => {
    setActiveTenantCompany(companyA);
    expect(getActiveTenantId()).toBe(1);

    const mockResponse = {
      data: {
        success: true,
        data: [
          { id: 10, name: 'Alice Admin', email: 'alice@example.com', status: 'active', roles: [{ id: 2, name: 'company_admin' }] },
          { id: 11, name: 'Bob Cashier', email: 'bob@example.com', status: 'active', roles: [{ id: 5, name: 'cashier' }] }
        ]
      }
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockResponse);

    const result = await getCompanyUsers();
    expect(getSpy).toHaveBeenCalledWith('/companies/1/users');
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe('Alice Admin');
  });

  it('fetches users for a explicitly specified company tenant', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: [
          { id: 20, name: 'Charlie Manager', email: 'charlie@example.com', status: 'active' }
        ]
      }
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockResponse);

    const result = await getCompanyUsers(companyB.id);
    expect(getSpy).toHaveBeenCalledWith('/companies/2/users');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].email).toBe('charlie@example.com');
  });

  it('creates a new user with company association and role', async () => {
    const newUserPayload = {
      name: 'David Dave',
      email: 'david@example.com',
      password: 'password123',
      role: 'company_admin',
      company_id: 1,
      status: 'active' as const,
    };

    const mockResponse = {
      data: {
        success: true,
        message: 'User created successfully',
        data: { id: 30, ...newUserPayload }
      }
    };

    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce(mockResponse);

    const res = await createUser(newUserPayload);
    expect(postSpy).toHaveBeenCalledWith('/users', newUserPayload);
    expect(res.data.name).toBe('David Dave');
  });

  it('assigns an existing user to a company tenant', async () => {
    const mockResponse = {
      data: {
        success: true,
        message: 'User successfully assigned to company',
        data: { id: 40, name: 'Existing User', email: 'existing@example.com', status: 'active' }
      }
    };

    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce(mockResponse);

    const res = await assignUserToCompany(companyA.id, {
      user_id: 40,
      role: 'branch_manager'
    });

    expect(postSpy).toHaveBeenCalledWith('/companies/1/users', {
      user_id: 40,
      role: 'branch_manager'
    });
    expect(res.success).toBe(true);
  });

  it('removes a user from a company tenant', async () => {
    const mockResponse = {
      data: {
        success: true,
        message: 'User company access removed successfully'
      }
    };

    const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValueOnce(mockResponse);

    const res = await removeUserFromCompany(companyA.id, 50);
    expect(deleteSpy).toHaveBeenCalledWith('/companies/1/users/50');
    expect(res.success).toBe(true);
  });

  it('fetches system roles with permission mappings', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: [
          { id: 1, name: 'super_admin', label: 'Super Admin' },
          { id: 2, name: 'company_admin', label: 'Company Admin' },
          { id: 3, name: 'branch_manager', label: 'Branch Manager' }
        ]
      }
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockResponse);

    const res = await getRoles();
    expect(getSpy).toHaveBeenCalledWith('/roles');
    expect(res.data).toHaveLength(3);
    expect(res.data[0].name).toBe('super_admin');
  });
});
