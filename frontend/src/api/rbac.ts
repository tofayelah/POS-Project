import api from './axios';

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  permissions_count?: number;
  users_count?: number;
  permissions?: Permission[];
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  group?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RoleFormData {
  name: string;
  description?: string;
  permission_ids?: number[];
}

export const rbacApi = {
  getRoles: async (search?: string): Promise<{ success: boolean; data: Role[] }> => {
    const res = await api.get('/roles', { params: search ? { search } : undefined });
    return res.data;
  },

  getRole: async (id: number): Promise<{ success: boolean; data: Role }> => {
    const res = await api.get(`/roles/${id}`);
    return res.data;
  },

  createRole: async (data: RoleFormData): Promise<{ success: boolean; message: string; data: Role }> => {
    const res = await api.post('/roles', data);
    return res.data;
  },

  updateRole: async (id: number, data: RoleFormData): Promise<{ success: boolean; message: string; data: Role }> => {
    const res = await api.put(`/roles/${id}`, data);
    return res.data;
  },

  deleteRole: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/roles/${id}`);
    return res.data;
  },

  getRolePermissions: async (id: number): Promise<{ success: boolean; data: Permission[] }> => {
    const res = await api.get(`/roles/${id}/permissions`);
    return res.data;
  },

  syncRolePermissions: async (id: number, permissionIds: number[]): Promise<{ success: boolean; message: string; data: Role }> => {
    const res = await api.put(`/roles/${id}/permissions`, { permission_ids: permissionIds });
    return res.data;
  },

  getPermissions: async (grouped = false): Promise<{ success: boolean; data: Permission[] | Record<string, Permission[]> }> => {
    const res = await api.get('/permissions', { params: { grouped } });
    return res.data;
  },

  getUserRoles: async (userId: number): Promise<{ success: boolean; data: Role[] }> => {
    const res = await api.get(`/users/${userId}/roles`);
    return res.data;
  },

  syncUserRoles: async (userId: number, roleIds: number[]): Promise<{ success: boolean; message: string; data: any }> => {
    const res = await api.put(`/users/${userId}/roles`, { role_ids: roleIds });
    return res.data;
  },
};
