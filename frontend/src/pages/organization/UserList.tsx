import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Filter,
  Building2,
  Shield,
  UserPlus,
  Mail,
  UserMinus,
  RefreshCw
} from 'lucide-react';
import { OrganizationUser, Role } from '../../types/organization';
import {
  getCompanyUsers,
  getAllUsers,
  createUser,
  updateUser,
  assignUserToCompany,
  removeUserFromCompany,
  deleteUser,
  getRoles
} from '../../api/organization';
import { useCompany } from '../../contexts/CompanyContext';

export function UserList() {
  const { company, companyId } = useCompany();
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'assign' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<OrganizationUser | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('company_admin');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formAssignUserId, setFormAssignUserId] = useState<string>('');
  const [allAvailableUsers, setAllAvailableUsers] = useState<OrganizationUser[]>([]);

  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Action Dialog State
  const [targetUser, setTargetUser] = useState<OrganizationUser | null>(null);
  const [actionType, setActionType] = useState<'remove-access' | 'delete' | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [companyId]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCompanyUsers(companyId);
      setUsers(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load organization users');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await getRoles();
      setRoles(res.data || []);
    } catch {
      // Fallback roles if API returns empty
      setRoles([
        { id: 1, name: 'super_admin', label: 'Super Admin' },
        { id: 2, name: 'company_admin', label: 'Company Admin' },
        { id: 3, name: 'branch_manager', label: 'Branch Manager' },
        { id: 4, name: 'warehouse_manager', label: 'Warehouse Manager' },
        { id: 5, name: 'cashier', label: 'Cashier' },
      ]);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('company_admin');
    setFormStatus('active');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenAssignModal = async () => {
    setModalMode('assign');
    setEditingUser(null);
    setFormAssignUserId('');
    setFormRole('company_admin');
    setModalError(null);
    setIsModalOpen(true);

    try {
      const res = await getAllUsers();
      // Exclude users already assigned to the company
      const currentIds = new Set(users.map(u => u.id));
      const unassigned = (res.data || []).filter(u => !currentIds.has(u.id));
      setAllAvailableUsers(unassigned);
    } catch {
      setAllAvailableUsers([]);
    }
  };

  const handleOpenEditModal = (user: OrganizationUser) => {
    setModalMode('edit');
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword('');
    setFormRole(user.roles?.[0]?.name || user.role || 'company_admin');
    setFormStatus(user.status || 'active');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    try {
      if (modalMode === 'create') {
        if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
          setModalError('Name, email, and password are required.');
          setSaving(false);
          return;
        }

        await createUser({
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
          role: formRole,
          company_id: companyId,
          status: formStatus,
        });
        setFeedbackMessage('User created and assigned to company successfully.');
      } else if (modalMode === 'assign') {
        if (!formAssignUserId) {
          setModalError('Please select a user to assign.');
          setSaving(false);
          return;
        }

        await assignUserToCompany(companyId, {
          user_id: Number(formAssignUserId),
          role: formRole,
        });
        setFeedbackMessage('User successfully assigned to company.');
      } else if (modalMode === 'edit' && editingUser) {
        if (!formName.trim() || !formEmail.trim()) {
          setModalError('Name and email are required.');
          setSaving(false);
          return;
        }

        await updateUser(editingUser.id, {
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword.trim() ? formPassword : undefined,
          role: formRole,
          status: formStatus,
        });
        setFeedbackMessage('User details updated successfully.');
      }

      setIsModalOpen(false);
      await loadUsers();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!targetUser || !actionType) return;
    setActionProcessing(true);

    try {
      if (actionType === 'remove-access') {
        await removeUserFromCompany(companyId, targetUser.id);
        setFeedbackMessage(`Access removed for ${targetUser.name} from current company.`);
      } else if (actionType === 'delete') {
        await deleteUser(targetUser.id);
        setFeedbackMessage(`User ${targetUser.name} deleted successfully.`);
      }

      setTargetUser(null);
      setActionType(null);
      await loadUsers();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete user action.');
      setTargetUser(null);
      setActionType(null);
    } finally {
      setActionProcessing(false);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const userRoleName = u.roles?.[0]?.name || u.role || '';
    const matchesRole =
      roleFilter === 'all' || userRoleName === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Organization Users</h1>
              <p className="text-sm text-slate-400">
                Manage user access, security roles, and tenant assignments for{' '}
                <span className="text-indigo-400 font-medium">{company?.name || `Company #${companyId}`}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-sm font-medium transition-colors"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleOpenAssignModal}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg border border-indigo-500/30 text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign User</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {feedbackMessage && (
        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter className="w-4 h-4" />
            <span>Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.label || r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase font-medium text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                      <span>Loading organization users...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <p className="font-medium text-slate-400">No users found</p>
                      <p className="text-xs text-slate-500">
                        {search || roleFilter !== 'all'
                          ? 'Try changing your search or filter parameters'
                          : 'Create a new user or assign an existing user to this company'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleName = user.roles?.[0]?.label || user.roles?.[0]?.name || user.role || 'Member';
                  const initials = user.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-600/20 text-indigo-400 font-semibold text-xs flex items-center justify-center border border-indigo-500/30">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-white">{user.name}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
                          <Shield className="w-3 h-3 text-indigo-400" />
                          {roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            (user.status || 'active') === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              (user.status || 'active') === 'active' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          {(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setTargetUser(user);
                              setActionType('remove-access');
                            }}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-amber-400 hover:text-amber-300 transition-colors"
                            title="Remove from Company"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setTargetUser(user);
                              setActionType('delete');
                            }}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Create / Assign / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-semibold text-white">
                {modalMode === 'create'
                  ? 'Create New User'
                  : modalMode === 'assign'
                  ? 'Assign User to Company'
                  : 'Edit User Profile'}
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

            <form onSubmit={handleSaveUser} className="space-y-4">
              {modalMode === 'assign' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Select User <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formAssignUserId}
                    onChange={(e) => setFormAssignUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">-- Choose User --</option>
                    {allAvailableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  {allAvailableUsers.length === 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      No unassigned users found in system. Create a new user instead.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Arif Rahman"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {modalMode === 'edit' ? 'New Password (leave blank to keep current)' : 'Password *'}
                    </label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      required={modalMode === 'create'}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Security Role <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.label || r.name}
                    </option>
                  ))}
                </select>
              </div>

              {modalMode !== 'assign' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
                  <span>{modalMode === 'create' ? 'Create User' : modalMode === 'assign' ? 'Assign' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {actionType && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-white">
                {actionType === 'remove-access' ? 'Remove Company Access?' : 'Delete User?'}
              </h3>
            </div>
            <p className="text-sm text-slate-300">
              {actionType === 'remove-access'
                ? `Are you sure you want to remove ${targetUser.name}'s access from ${company?.name || 'this company'}? They will no longer be able to log in or manage this tenant.`
                : `Are you sure you want to permanently delete user ${targetUser.name}? This action cannot be undone.`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setTargetUser(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {actionProcessing && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{actionType === 'remove-access' ? 'Remove Access' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
