import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  Check,
  X,
  Search,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { rbacApi, Role, Permission } from '../../api/rbac';

export default function RolePermissionMatrix() {
  const navigate = useNavigate();
  const { id: paramRoleId } = useParams<{ id?: string }>();

  const [roles, setRoles] = useState<Role[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
  const [flatPermissions, setFlatPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(
    paramRoleId ? parseInt(paramRoleId, 10) : null
  );

  const [assignedPermIds, setAssignedPermIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRoleId && roles.length > 0) {
      loadRolePermissions(selectedRoleId);
    }
  }, [selectedRoleId, roles]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rbacApi.getRoles(),
        rbacApi.getPermissions(true),
      ]);

      const fetchedRoles = rolesRes.data || [];
      setRoles(fetchedRoles);

      if (permsRes.data && typeof permsRes.data === 'object' && !Array.isArray(permsRes.data)) {
        setGroupedPermissions(permsRes.data as Record<string, Permission[]>);
        const flat = Object.values(permsRes.data as Record<string, Permission[]>).flat();
        setFlatPermissions(flat);
      } else if (Array.isArray(permsRes.data)) {
        setFlatPermissions(permsRes.data);
        // Group by group field
        const grouped: Record<string, Permission[]> = {};
        permsRes.data.forEach((p) => {
          const grp = p.group || 'general';
          if (!grouped[grp]) grouped[grp] = [];
          grouped[grp].push(p);
        });
        setGroupedPermissions(grouped);
      }

      if (!selectedRoleId && fetchedRoles.length > 0) {
        // Default to first non-superadmin role or first role
        const defaultRole = fetchedRoles.find((r) => r.name !== 'Super Admin') || fetchedRoles[0];
        setSelectedRoleId(defaultRole.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load roles and permissions matrix.');
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: number) => {
    try {
      const targetRole = roles.find((r) => r.id === roleId);
      if (targetRole && targetRole.permissions) {
        setAssignedPermIds(targetRole.permissions.map((p) => p.id));
      } else {
        const res = await rbacApi.getRolePermissions(roleId);
        setAssignedPermIds((res.data || []).map((p) => p.id));
      }
    } catch {
      setAssignedPermIds([]);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const handleTogglePermission = (permId: number) => {
    if (!selectedRole || selectedRole.name === 'Super Admin') return;
    setAssignedPermIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleToggleGroup = (groupPerms: Permission[]) => {
    if (!selectedRole || selectedRole.name === 'Super Admin') return;
    const groupIds = groupPerms.map((p) => p.id);
    const allSelected = groupIds.every((id) => assignedPermIds.includes(id));

    if (allSelected) {
      setAssignedPermIds((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      setAssignedPermIds((prev) => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId || !selectedRole) return;
    setSaving(true);
    setError(null);

    try {
      await rbacApi.syncRolePermissions(selectedRoleId, assignedPermIds);
      setFeedbackMessage(`Permissions for role '${selectedRole.name}' synchronized successfully.`);
      await loadData();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save role permissions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/roles')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Roles
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Role Permission Matrix</h1>
              <p className="text-sm text-slate-400">
                Fine-grained RBAC permission assignment per security module and API action
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={saving || !selectedRole || selectedRole.name === 'Super Admin'}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-600/20 transition-colors"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Matrix</span>
          </button>
        </div>
      </div>

      {/* Global Banners */}
      {feedbackMessage && (
        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Selection Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <span className="text-xs font-medium text-slate-400 mr-2 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> Target Role:
          </span>
          {roles.map((r) => {
            const isSelected = r.id === selectedRoleId;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {r.name}
              </button>
            );
          })}
        </div>

        {/* Search & Role Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {selectedRole ? (
              <div className="text-xs text-slate-300">
                Editing permissions for <strong className="text-white">{selectedRole.name}</strong>.
                {selectedRole.name === 'Super Admin' && (
                  <span className="ml-2 text-amber-400">(Super Admin possesses full system bypass automatically)</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400">Select a role to modify permissions</span>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Permission Matrix Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        {loading ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span>Loading permissions matrix...</span>
          </div>
        ) : Object.keys(groupedPermissions).length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            No permissions definitions found in system.
          </div>
        ) : (
          Object.entries(groupedPermissions).map(([group, groupPerms]) => {
            const filteredPerms = groupPerms.filter(
              (p) =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                group.toLowerCase().includes(search.toLowerCase())
            );

            if (filteredPerms.length === 0) return null;

            const allSelected = filteredPerms.every((p) => assignedPermIds.includes(p.id));
            const isSuperAdmin = selectedRole?.name === 'Super Admin';

            return (
              <div key={group} className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                <div className="bg-slate-800/80 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Module: {group} ({filteredPerms.length})
                  </h3>
                  {!isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => handleToggleGroup(filteredPerms)}
                      className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      {allSelected ? 'Deselect All in Module' : 'Select All in Module'}
                    </button>
                  )}
                </div>

                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredPerms.map((perm) => {
                    const isChecked = isSuperAdmin || assignedPermIds.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                          isChecked
                            ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        } ${isSuperAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isSuperAdmin}
                            onChange={() => {}}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                          />
                          <span className="font-mono text-xs truncate">{perm.name}</span>
                        </div>
                        {isChecked ? (
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
