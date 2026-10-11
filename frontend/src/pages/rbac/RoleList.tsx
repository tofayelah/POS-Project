import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Lock,
  Users,
  Key
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { rbacApi, Role, Permission } from '../../api/rbac';

export default function RoleList() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [deleteProcessing, setDeleteProcessing] = useState(false);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async (searchQuery = search) => {
    setLoading(true);
    setError(null);
    try {
      const res = await rbacApi.getRoles(searchQuery);
      setRoles(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load system roles.');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await rbacApi.getPermissions(false);
      if (Array.isArray(res.data)) {
        setPermissions(res.data);
      }
    } catch {
      // Permissions load error handled gracefully
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    loadRoles(val);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setSelectedPermIds([]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role: Role) => {
    setModalMode('edit');
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    const currentPerms = role.permissions ? role.permissions.map((p) => p.id) : [];
    setSelectedPermIds(currentPerms);
    setModalError(null);
    setIsModalOpen(true);
  };

  const togglePermissionSelection = (id: number) => {
    setSelectedPermIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError('Role name is required.');
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      if (modalMode === 'create') {
        await rbacApi.createRole({
          name: formName.trim(),
          description: formDescription.trim(),
          permission_ids: selectedPermIds,
        });
        setFeedbackMessage(`Custom role '${formName.trim()}' created successfully.`);
      } else if (modalMode === 'edit' && editingRole) {
        await rbacApi.updateRole(editingRole.id, {
          name: formName.trim(),
          description: formDescription.trim(),
        });
        if (selectedPermIds.length > 0) {
          await rbacApi.syncRolePermissions(editingRole.id, selectedPermIds);
        }
        setFeedbackMessage(`Role '${formName.trim()}' updated successfully.`);
      }

      setIsModalOpen(false);
      await loadRoles();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRole) return;
    setDeleteProcessing(true);

    try {
      await rbacApi.deleteRole(deletingRole.id);
      setFeedbackMessage(`Role '${deletingRole.name}' deleted successfully.`);
      setDeletingRole(null);
      await loadRoles();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete role.');
      setDeletingRole(null);
    } finally {
      setDeleteProcessing(false);
    }
  };

  const isProtectedRole = (name: string) => {
    const lower = name.toLowerCase();
    return lower === 'super admin' || lower === 'admin';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Roles & Permissions</h1>
              <p className="text-sm text-slate-400">
                Configure role access levels, fine-grained permissions, and security scope
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadRoles()}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => navigate('/permissions')}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg border border-indigo-500/30 text-sm font-medium transition-colors"
          >
            <Key className="w-4 h-4" />
            <span>Permission Matrix</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Role</span>
          </button>
        </div>
      </div>

      {/* Feedback & Error Banner */}
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

      {/* Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search roles..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase font-medium text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Role Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Permissions</th>
                <th className="px-6 py-4">Assigned Users</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                      <span>Loading role definitions...</span>
                    </div>
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-slate-600" />
                      <p className="font-medium text-slate-400">No roles found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                roles.map((role) => {
                  const isProtected = isProtectedRole(role.name);
                  return (
                    <tr key={role.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white flex items-center gap-2">
                        <span>{role.name}</span>
                        {isProtected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Lock className="w-3 h-3" /> System Protected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {role.description || 'No description provided.'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Key className="w-3 h-3" />
                          {role.name === 'Super Admin' ? 'All Permissions' : `${role.permissions_count ?? role.permissions?.length ?? 0} Permissions`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          <Users className="w-3 h-3 text-slate-400" />
                          {role.users_count ?? 0} Users
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/roles/${role.id}/permissions`)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors"
                            title="Manage Permissions Matrix"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(role)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Edit Role Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isProtected && (
                            <button
                              onClick={() => setDeletingRole(role)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                              title="Delete Role"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-semibold text-white">
                {modalMode === 'create' ? 'Create Custom Security Role' : `Edit Role: ${editingRole?.name}`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Role Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={modalMode === 'edit' && !!editingRole && isProtectedRole(editingRole.name)}
                  placeholder="e.g. Inventory Auditor"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe duties and permissions for this role..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {permissions.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Initial Permissions ({selectedPermIds.length} selected)
                  </label>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {permissions.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center justify-between text-xs text-slate-300 hover:bg-slate-900 p-1.5 rounded cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedPermIds.includes(perm.id)}
                            onChange={() => togglePermissionSelection(perm.id)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-mono text-slate-200">{perm.name}</span>
                        </div>
                        {perm.group && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {perm.group}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{modalMode === 'create' ? 'Create Role' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-white">Delete Role?</h3>
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete the role <strong className="text-white">{deletingRole.name}</strong>?
            </p>
            {((deletingRole.users_count ?? 0) > 0) && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs">
                Warning: This role is currently assigned to {deletingRole.users_count} user(s). Reassign them first.
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteProcessing || (deletingRole.users_count ?? 0) > 0}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {deleteProcessing && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Delete Role</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
