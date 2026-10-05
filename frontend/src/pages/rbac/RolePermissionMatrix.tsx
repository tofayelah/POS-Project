import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  ShieldCheck,
  Check,
  CheckSquare,
  Square,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
  Filter,
  RefreshCw,
  Layers
} from 'lucide-react';
import { rbacApi, Role, Permission } from '../../api/rbac';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n';

export default function RolePermissionMatrix() {
  const { t } = useTranslation();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(id ? parseInt(id, 10) : null);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(new Set());
  const [initialPermIds, setInitialPermIds] = useState<Set<number>>(new Set());
  const [filterModule, setFilterModule] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const canUpdateRole = hasRole('Super Admin') || hasRole('Admin') || hasPermission('roles.update');

  // Fetch all roles
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await rbacApi.getRoles();
      return res.data;
    },
  });

  // Default to first role if not set
  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    }
  }, [selectedRoleId, roles]);

  // Fetch all permissions
  const { data: allPermissions = [], isLoading: isLoadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await rbacApi.getPermissions(false);
      return res.data as Permission[];
    },
  });

  // Fetch selected role's current permissions
  const {
    data: rolePermissions = [],
    isLoading: isLoadingRolePerms,
    refetch: refetchRolePerms
  } = useQuery({
    queryKey: ['role-permissions', selectedRoleId],
    queryFn: async () => {
      if (!selectedRoleId) return [];
      const res = await rbacApi.getRolePermissions(selectedRoleId);
      return res.data;
    },
    enabled: !!selectedRoleId,
  });

  // Sync state when role permissions are loaded
  useEffect(() => {
    const permIds = new Set(rolePermissions.map((p) => p.id));
    setSelectedPermIds(new Set(permIds));
    setInitialPermIds(new Set(permIds));
    setFeedback(null);
  }, [rolePermissions, selectedRoleId]);

  const activeRole = roles.find((r) => r.id === selectedRoleId);

  // Group permissions dynamically by module
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};

    allPermissions.forEach((perm) => {
      const groupName = perm.group || perm.name.split('.')[0] || 'general';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(perm);
    });

    return groups;
  }, [allPermissions]);

  const moduleNames = useMemo(() => Object.keys(groupedPermissions).sort(), [groupedPermissions]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) throw new Error('No role selected');
      return rbacApi.syncRolePermissions(selectedRoleId, Array.from(selectedPermIds));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions', selectedRoleId] });
      setInitialPermIds(new Set(selectedPermIds));
      setFeedback({ type: 'success', message: t('roles.saveSuccess', 'Permissions saved successfully') });
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save role permissions',
      });
    },
  });

  const hasUnsavedChanges = useMemo(() => {
    if (selectedPermIds.size !== initialPermIds.size) return true;
    for (const id of selectedPermIds) {
      if (!initialPermIds.has(id)) return true;
    }
    return false;
  }, [selectedPermIds, initialPermIds]);

  const togglePermission = (permId: number) => {
    if (!canUpdateRole) return;
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!canUpdateRole) return;
    const allIds = new Set(allPermissions.map((p) => p.id));
    setSelectedPermIds(allIds);
  };

  const handleDeselectAll = () => {
    if (!canUpdateRole) return;
    setSelectedPermIds(new Set());
  };

  const handleSelectModule = (moduleKey: string) => {
    if (!canUpdateRole) return;
    const modulePerms = groupedPermissions[moduleKey] || [];
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      modulePerms.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const handleDeselectModule = (moduleKey: string) => {
    if (!canUpdateRole) return;
    const modulePerms = groupedPermissions[moduleKey] || [];
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      modulePerms.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const formatModuleName = (mod: string) => {
    return mod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatPermissionName = (name: string) => {
    const parts = name.split('.');
    if (parts.length > 1) {
      return parts.slice(1).join(' ').replace(/_/g, ' ');
    }
    return name;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/roles"
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            title={t('roles.backToRoles', 'Back to Roles')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
              {t('roles.matrixTitle', 'Role Permission Matrix')}
            </h1>
            <p className="text-sm text-slate-500">
              {t('roles.matrixSubtitle', 'Configure granular permissions for role')}:{' '}
              <span className="font-semibold text-slate-800">{activeRole?.name || '...'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full animate-pulse">
              {t('roles.unsavedChanges', 'Unsaved Changes')}
            </span>
          )}
          {canUpdateRole && (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasUnsavedChanges}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : t('roles.savePermissions', 'Save Permissions')}
            </button>
          )}
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Role Selection bar & Global filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Role Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('roles.selectRole', 'Select Role')}:
          </label>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => {
              const isSelected = r.id === selectedRoleId;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRoleId(r.id);
                    navigate(`/roles/${r.id}/permissions`, { replace: true });
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Bulk Toggles */}
        {canUpdateRole && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              {t('roles.selectAll', 'Select All')}
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              {t('roles.deselectAll', 'Deselect All')}
            </button>
            <div className="text-xs font-mono font-medium text-slate-500 pl-2">
              {selectedPermIds.size} / {allPermissions.length} {t('roles.selectedCount', 'permissions assigned')}
            </div>
          </div>
        )}
      </div>

      {/* Module Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter permissions by keyword..."
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">Module:</span>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Modules ({moduleNames.length})</option>
            {moduleNames.map((mod) => (
              <option key={mod} value={mod}>
                {formatModuleName(mod)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Permissions Matrix Content */}
      {isLoadingPerms || isLoadingRolePerms ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded-md w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className="h-10 bg-slate-50 rounded-xl"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {moduleNames
            .filter((mod) => filterModule === 'all' || filterModule === mod)
            .map((moduleKey) => {
              const modulePerms = (groupedPermissions[moduleKey] || []).filter(
                (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
              );

              if (modulePerms.length === 0) return null;

              const selectedInModule = modulePerms.filter((p) => selectedPermIds.has(p.id)).length;
              const allSelected = selectedInModule === modulePerms.length && modulePerms.length > 0;

              return (
                <div
                  key={moduleKey}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  {/* Module Header */}
                  <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Layers className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {formatModuleName(moduleKey)}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                        {selectedInModule} / {modulePerms.length}
                      </span>
                    </div>

                    {canUpdateRole && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleSelectModule(moduleKey)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium transition cursor-pointer"
                        >
                          {t('roles.selectAllModule', 'Select All')}
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => handleDeselectModule(moduleKey)}
                          className="text-slate-500 hover:text-slate-700 font-medium transition cursor-pointer"
                        >
                          {t('roles.deselectAllModule', 'Deselect All')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Permissions Grid */}
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {modulePerms.map((perm) => {
                      const isChecked = selectedPermIds.has(perm.id);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          className={`p-3 rounded-xl border transition flex items-start gap-3 select-none ${
                            !canUpdateRole
                              ? 'cursor-not-allowed opacity-75'
                              : 'cursor-pointer hover:border-indigo-300'
                          } ${
                            isChecked
                              ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="pt-0.5 shrink-0">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-semibold truncate capitalize">
                              {formatPermissionName(perm.name)}
                            </span>
                            <span className="block text-[10px] font-mono text-slate-400 truncate">
                              {perm.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
