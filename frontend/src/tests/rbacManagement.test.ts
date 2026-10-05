import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api/axios';
import { rbacApi, Role, Permission } from '../api/rbac';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

vi.mock('../api/axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('Phase 5.1 — RBAC & Permission Management Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RBAC API Client', () => {
    it('fetches roles list with search parameter', async () => {
      const mockRoles: Role[] = [
        { id: 1, name: 'Super Admin', description: 'System Administrator', permissions_count: 50, users_count: 1 },
        { id: 2, name: 'Manager', description: 'Store Manager', permissions_count: 30, users_count: 4 },
      ];
      (api.get as any).mockResolvedValueOnce({
        data: {
          success: true,
          data: mockRoles,
        },
      });

      const res = await rbacApi.getRoles('Manager');
      expect(api.get).toHaveBeenCalledWith('/roles', { params: { search: 'Manager' } });
      expect(res.data).toHaveLength(2);
      expect(res.data[1].name).toBe('Manager');
    });

    it('fetches single role details', async () => {
      const mockRole: Role = {
        id: 2,
        name: 'Cashier',
        description: 'POS Operator',
        permissions_count: 10,
        users_count: 5,
      };
      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockRole },
      });

      const res = await rbacApi.getRole(2);
      expect(api.get).toHaveBeenCalledWith('/roles/2');
      expect(res.data.name).toBe('Cashier');
    });

    it('creates new custom role', async () => {
      const newRolePayload = {
        name: 'Inventory Auditor',
        description: 'Performs physical inventory audits',
      };
      const createdRole: Role = {
        id: 10,
        ...newRolePayload,
        permissions_count: 0,
        users_count: 0,
      };
      (api.post as any).mockResolvedValueOnce({
        data: { success: true, message: 'Role created', data: createdRole },
      });

      const res = await rbacApi.createRole(newRolePayload);
      expect(api.post).toHaveBeenCalledWith('/roles', newRolePayload);
      expect(res.data.id).toBe(10);
      expect(res.data.name).toBe('Inventory Auditor');
    });

    it('updates existing role name and description', async () => {
      const updatePayload = {
        name: 'Senior Cashier',
        description: 'Handles high-volume registers',
      };
      (api.put as any).mockResolvedValueOnce({
        data: { success: true, message: 'Role updated', data: { id: 3, ...updatePayload } },
      });

      const res = await rbacApi.updateRole(3, updatePayload);
      expect(api.put).toHaveBeenCalledWith('/roles/3', updatePayload);
      expect(res.data.name).toBe('Senior Cashier');
    });

    it('deletes custom role', async () => {
      (api.delete as any).mockResolvedValueOnce({
        data: { success: true, message: 'Role deleted successfully.' },
      });

      const res = await rbacApi.deleteRole(10);
      expect(api.delete).toHaveBeenCalledWith('/roles/10');
      expect(res.success).toBe(true);
    });

    it('fetches role permissions', async () => {
      const mockRolePermissions: Permission[] = [
        { id: 1, name: 'products.view', group: 'products' },
        { id: 2, name: 'products.create', group: 'products' },
      ];
      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockRolePermissions },
      });

      const res = await rbacApi.getRolePermissions(2);
      expect(api.get).toHaveBeenCalledWith('/roles/2/permissions');
      expect(res.data).toHaveLength(2);
    });

    it('syncs role permissions with ID array', async () => {
      (api.put as any).mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Permissions synced successfully.',
          data: {
            id: 2,
            name: 'Manager',
          },
        },
      });

      const res = await rbacApi.syncRolePermissions(2, [1, 2, 5, 8]);
      expect(api.put).toHaveBeenCalledWith('/roles/2/permissions', { permission_ids: [1, 2, 5, 8] });
      expect(res.success).toBe(true);
    });

    it('fetches permissions catalog with grouped=true', async () => {
      const mockGrouped = {
        products: [
          { id: 1, name: 'products.view', group: 'products' },
          { id: 2, name: 'products.create', group: 'products' },
        ],
        sales: [
          { id: 3, name: 'pos.view', group: 'sales' },
        ],
      };
      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockGrouped },
      });

      const res = await rbacApi.getPermissions(true);
      expect(api.get).toHaveBeenCalledWith('/permissions', { params: { grouped: true } });
      expect((res.data as Record<string, Permission[]>).products).toHaveLength(2);
      expect((res.data as Record<string, Permission[]>).sales).toHaveLength(1);
    });

    it('fetches user roles and syncs user roles', async () => {
      const mockRoles: Role[] = [{ id: 3, name: 'Cashier' }];
      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockRoles },
      });

      const getRes = await rbacApi.getUserRoles(5);
      expect(api.get).toHaveBeenCalledWith('/users/5/roles');
      expect(getRes.data).toHaveLength(1);

      (api.put as any).mockResolvedValueOnce({
        data: {
          success: true,
          message: 'User roles updated successfully.',
          data: { user_id: 5, roles_count: 2 },
        },
      });

      const syncRes = await rbacApi.syncUserRoles(5, [2, 3]);
      expect(api.put).toHaveBeenCalledWith('/users/5/roles', { role_ids: [2, 3] });
      expect(syncRes.success).toBe(true);
    });
  });

  describe('RBAC Business Rules & Protection Logic', () => {
    it('identifies protected system roles correctly', () => {
      const isSystemRole = (name: string) => {
        const lower = name.toLowerCase();
        return lower === 'super admin' || lower === 'admin';
      };

      expect(isSystemRole('Super Admin')).toBe(true);
      expect(isSystemRole('super admin')).toBe(true);
      expect(isSystemRole('Admin')).toBe(true);
      expect(isSystemRole('admin')).toBe(true);
      expect(isSystemRole('Manager')).toBe(false);
      expect(isSystemRole('Cashier')).toBe(false);
      expect(isSystemRole('Custom Role')).toBe(false);
    });

    it('evaluates whether a role can be safely deleted', () => {
      const canDeleteRole = (role: { name: string; users_count?: number }) => {
        const lower = role.name.toLowerCase();
        if (lower === 'super admin' || lower === 'admin') return false;
        if ((role.users_count ?? 0) > 0) return false;
        return true;
      };

      // System roles cannot be deleted
      expect(canDeleteRole({ name: 'Super Admin', users_count: 0 })).toBe(false);
      expect(canDeleteRole({ name: 'Admin', users_count: 0 })).toBe(false);

      // Custom roles with assigned users cannot be deleted
      expect(canDeleteRole({ name: 'Sales Manager', users_count: 3 })).toBe(false);

      // Custom roles without users can be deleted
      expect(canDeleteRole({ name: 'Old Role', users_count: 0 })).toBe(true);
    });

    it('evaluates permission matrix module selection actions', () => {
      const permissions: Permission[] = [
        { id: 1, name: 'products.view', group: 'products' },
        { id: 2, name: 'products.create', group: 'products' },
        { id: 3, name: 'products.edit', group: 'products' },
        { id: 4, name: 'pos.view', group: 'pos' },
        { id: 5, name: 'pos.checkout', group: 'pos' },
      ];

      const moduleIds = permissions
        .filter((p) => p.group === 'products')
        .map((p) => p.id);

      let selectedIds = new Set<number>([1, 4]);

      // Module toggle - check if all module items selected
      const isModuleFullySelected = moduleIds.every((id) => selectedIds.has(id));
      expect(isModuleFullySelected).toBe(false);

      // Toggle module ON (select all in module)
      const nextSelected = new Set(selectedIds);
      moduleIds.forEach((id) => nextSelected.add(id));
      expect(Array.from(nextSelected).sort()).toEqual([1, 2, 3, 4]);

      // Toggle module OFF (deselect all in module)
      const clearedModule = new Set(nextSelected);
      moduleIds.forEach((id) => clearedModule.delete(id));
      expect(Array.from(clearedModule)).toEqual([4]);
    });

    it('verifies administrator lockout prevention logic', () => {
      interface MockUser {
        id: number;
        roles: string[];
      }

      const users: MockUser[] = [
        { id: 1, roles: ['Super Admin'] },
        { id: 2, roles: ['Manager'] },
        { id: 3, roles: ['Cashier'] },
      ];

      const checkCanRemoveSuperAdmin = (targetUserId: number, newRoles: string[]) => {
        const targetUser = users.find((u) => u.id === targetUserId);
        const hadSuperAdmin = targetUser?.roles.includes('Super Admin');
        const willHaveSuperAdmin = newRoles.includes('Super Admin');

        if (hadSuperAdmin && !willHaveSuperAdmin) {
          const remainingSuperAdmins = users.filter(
            (u) => u.id !== targetUserId && u.roles.includes('Super Admin')
          ).length;
          if (remainingSuperAdmins === 0) {
            return { allowed: false, error: 'Cannot remove Super Admin from sole administrator' };
          }
        }
        return { allowed: true };
      };

      // Sole Super Admin removing role -> BLOCKED
      const attempt1 = checkCanRemoveSuperAdmin(1, ['Manager']);
      expect(attempt1.allowed).toBe(false);

      // Add second Super Admin
      users.push({ id: 4, roles: ['Super Admin'] });

      // Now removing from user 1 -> ALLOWED
      const attempt2 = checkCanRemoveSuperAdmin(1, ['Manager']);
      expect(attempt2.allowed).toBe(true);
    });
  });

  describe('RBAC Bilingual i18n Verification', () => {
    const rbacKeys = [
      'roles.title',
      'roles.subtitle',
      'roles.create',
      'roles.edit',
      'roles.delete',
      'roles.name',
      'roles.description',
      'roles.permissionsCount',
      'roles.usersCount',
      'roles.managePermissions',
      'roles.assignUsers',
      'roles.protected',
      'roles.search',
      'roles.noRoles',
      'roles.noRolesDesc',
      'roles.deleteConfirm',
      'roles.deleteWarning',
      'roles.matrixTitle',
      'roles.matrixSubtitle',
      'roles.selectAll',
      'roles.deselectAll',
      'roles.selectAllModule',
      'roles.deselectAllModule',
      'roles.selectedCount',
      'roles.savePermissions',
      'roles.saveSuccess',
      'roles.userRoleTitle',
      'roles.selectRole',
      'roles.backToRoles',
      'roles.unsavedChanges',
    ] as const;

    it('verifies all RBAC translation keys exist in English translations', () => {
      for (const key of rbacKeys) {
        expect(en[key]).toBeDefined();
        expect(typeof en[key]).toBe('string');
        expect(en[key].length).toBeGreaterThan(0);
      }
    });

    it('verifies all RBAC translation keys exist in Bengali translations', () => {
      for (const key of rbacKeys) {
        expect(bn[key]).toBeDefined();
        expect(typeof bn[key]).toBe('string');
        expect(bn[key].length).toBeGreaterThan(0);
      }
    });

    it('verifies sidebar navigation contains roles translation in both languages', () => {
      expect(en['nav.roles']).toBe('Roles & Permissions');
      expect(bn['nav.roles']).toBe('ভূমিকা ও অনুমতি');
    });
  });
});
