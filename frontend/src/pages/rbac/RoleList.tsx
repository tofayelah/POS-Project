import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import {
  Shield,
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Lock,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { rbacApi, Role, RoleFormData } from '../../api/rbac';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n';

export default function RoleList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const canCreateRole = hasRole('Super Admin') || hasRole('Admin') || hasPermission('roles.create');
  const canUpdateRole = hasRole('Super Admin') || hasRole('Admin') || hasPermission('roles.update');
  const canDeleteRole = hasRole('Super Admin') || hasRole('Admin') || hasPermission('roles.delete');

  const { data: roles = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['roles', search],
    queryFn: async () => {
      const res = await rbacApi.getRoles(search);
      return res.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: RoleFormData) => rbacApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to create role');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoleFormData }) => rbacApi.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditingRole(null);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to update role');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => rbacApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeletingRole(null);
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (role: Role) => {
    resetForm();
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Role name is required.');
      return;
    }

    if (editingRole) {
      updateMutation.mutate({
        id: editingRole.id,
        data: { name: formName.trim(), description: formDescription.trim() || undefined },
      });
    } else {
      createMutation.mutate({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
      });
    }
  };

  const isProtectedRole = (role: Role) => {
    const lower = role.name.toLowerCase();
    return lower === 'super admin' || lower === 'admin';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">
              {t('roles.title', 'Roles & Permissions')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {t('roles.subtitle', 'Manage access control roles, permission matrices, and user assignments')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/permissions"
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            {t('roles.managePermissions', 'Permissions Matrix')}
          </Link>
          {canCreateRole && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t('roles.create', 'Create Role')}
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('roles.search', 'Search roles by name or description...')}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded-md w-1/2"></div>
              <div className="h-4 bg-slate-100 rounded-md w-3/4"></div>
              <div className="h-10 bg-slate-50 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-semibold text-rose-900">Failed to load roles</h3>
          <p className="text-sm text-rose-600">{(error as any)?.message || 'An error occurred while fetching roles.'}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition"
          >
            Retry
          </button>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <Shield className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">{t('roles.noRoles', 'No roles found')}</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {t('roles.noRolesDesc', 'Create your first custom role to manage granular user access permissions.')}
          </p>
          {canCreateRole && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t('roles.create', 'Create Role')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => {
            const protectedRole = isProtectedRole(role);
            return (
              <div
                key={role.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          {role.name}
                          {protectedRole && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                              <Lock className="w-2.5 h-2.5" />
                              {t('roles.protected', 'System Protected')}
                            </span>
                          )}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 min-h-8">
                    {role.description || 'No description provided.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-slate-400 block mb-0.5">{t('roles.permissionsCount', 'Permissions')}</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {role.permissions_count ?? (role.permissions?.length || 0)}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-slate-400 block mb-0.5">{t('roles.usersCount', 'Assigned Users')}</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {role.users_count ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="bg-slate-50/70 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/roles/${role.id}/permissions`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    <span>{t('roles.managePermissions', 'Permissions Matrix')}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-1">
                    {canUpdateRole && (
                      <button
                        onClick={() => handleOpenEdit(role)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition"
                        title={t('roles.edit', 'Edit Role')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDeleteRole && !protectedRole && (
                      <button
                        onClick={() => setDeletingRole(role)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title={t('roles.delete', 'Delete Role')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Role Modal */}
      {(isCreateModalOpen || editingRole) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRole ? t('roles.edit', 'Edit Role') : t('roles.create', 'Create Role')}
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingRole(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  {t('roles.name', 'Role Name')} *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Inventory Manager"
                  disabled={editingRole ? isProtectedRole(editingRole) : false}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  {t('roles.description', 'Description')}
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the duties or scope associated with this role..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingRole(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900">{t('roles.delete', 'Delete Role')}</h3>
            </div>
            <p className="text-sm text-slate-600">
              {t('roles.deleteConfirm', 'Are you sure you want to delete role')}{' '}
              <span className="font-semibold text-slate-900">"{deletingRole.name}"</span>?{' '}
              {t('roles.deleteWarning', 'This will remove the role from the system. This action cannot be undone.')}
            </p>
            {deleteMutation.isError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {(deleteMutation.error as any)?.response?.data?.message || 'Failed to delete role.'}
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingRole.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
