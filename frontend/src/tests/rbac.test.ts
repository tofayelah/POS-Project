import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { User } from '../hooks/useAuth';

// Pure RBAC logic mirror for testing authorization helper specifications
function checkHasRole(user: User | null, roleName: string): boolean {
  if (!user || !user.roles) return false;
  return user.roles.some((r) => r.name.toLowerCase() === roleName.toLowerCase());
}

function checkHasPermission(user: User | null, permissionName: string): boolean {
  if (!user || !user.permissions) return false;
  return user.permissions.some((p) => {
    const pName = typeof p === 'string' ? p : p.name;
    return pName.toLowerCase() === permissionName.toLowerCase();
  });
}

describe('Authorization Helpers (RBAC)', () => {
  const mockUser: User = {
    id: 1,
    name: 'Admin User',
    email: 'admin@retailcore.test',
    roles: [
      { id: 1, name: 'Admin' },
      { id: 2, name: 'Manager' },
    ],
    permissions: [
      'view-dashboard',
      'view-users',
      { id: 10, name: 'edit-settings', group: 'settings' },
    ],
  };

  describe('hasRole', () => {
    it('returns true when user has the specified role (case-insensitive)', () => {
      assert.strictEqual(checkHasRole(mockUser, 'Admin'), true);
      assert.strictEqual(checkHasRole(mockUser, 'admin'), true);
      assert.strictEqual(checkHasRole(mockUser, 'MANAGER'), true);
    });

    it('returns false when user does not have the specified role', () => {
      assert.strictEqual(checkHasRole(mockUser, 'Super Admin'), false);
      assert.strictEqual(checkHasRole(mockUser, 'Cashier'), false);
    });

    it('returns false and does not crash when user is null (default deny)', () => {
      assert.strictEqual(checkHasRole(null, 'Admin'), false);
    });

    it('returns false and does not crash when user has undefined roles', () => {
      const userWithoutRoles: User = {
        id: 2,
        name: 'Guest',
        email: 'guest@retailcore.test',
      };
      assert.strictEqual(checkHasRole(userWithoutRoles, 'Admin'), false);
    });
  });

  describe('hasPermission', () => {
    it('returns true for string permissions', () => {
      assert.strictEqual(checkHasPermission(mockUser, 'view-dashboard'), true);
      assert.strictEqual(checkHasPermission(mockUser, 'VIEW-USERS'), true);
    });

    it('returns true for object-based permissions with name field', () => {
      assert.strictEqual(checkHasPermission(mockUser, 'edit-settings'), true);
    });

    it('returns false when permission is not granted', () => {
      assert.strictEqual(checkHasPermission(mockUser, 'delete-database'), false);
      assert.strictEqual(checkHasPermission(mockUser, 'access-pos'), false);
    });

    it('returns false and does not crash when user is null (default deny)', () => {
      assert.strictEqual(checkHasPermission(null, 'view-dashboard'), false);
    });

    it('returns false and does not crash when user has undefined permissions', () => {
      const userWithoutPermissions: User = {
        id: 3,
        name: 'Restricted User',
        email: 'restricted@retailcore.test',
      };
      assert.strictEqual(checkHasPermission(userWithoutPermissions, 'view-dashboard'), false);
    });
  });
});
