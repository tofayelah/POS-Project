import React, { useEffect, useState } from 'react';
import {
  Building,
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  AlertCircle,
  Users,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { hrApi } from '../../api/hr';
import { Department, Designation } from '../../types/hr';

export const DepartmentDesignationManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'DEPARTMENTS' | 'DESIGNATIONS'>('DEPARTMENTS');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState<boolean>(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);

  // Designation Modal State
  const [isDesigModalOpen, setIsDesigModalOpen] = useState<boolean>(false);
  const [desigForm, setDesigForm] = useState({ name: '', code: '', department_id: '', description: '' });
  const [editingDesigId, setEditingDesigId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [deptData, desigData] = await Promise.all([
        hrApi.getDepartments(),
        hrApi.getDesignations(),
      ]);
      setDepartments(Array.isArray(deptData) ? deptData : (deptData as any)?.data || []);
      setDesignations(Array.isArray(desigData) ? desigData : (desigData as any)?.data || []);
    } catch (err) {
      console.error('Failed to load org structures', err);
      setDepartments([]);
      setDesignations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingDeptId) {
        await hrApi.updateDepartment(editingDeptId, deptForm);
      } else {
        await hrApi.createDepartment(deptForm);
      }
      setIsDeptModalOpen(false);
      setDeptForm({ name: '', code: '', description: '' });
      setEditingDeptId(null);
      loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save department.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: desigForm.name,
        code: desigForm.code,
        description: desigForm.description,
        department_id: desigForm.department_id ? Number(desigForm.department_id) : undefined,
      };
      if (editingDesigId) {
        await hrApi.updateDesignation(editingDesigId, payload);
      } else {
        await hrApi.createDesignation(payload);
      }
      setIsDesigModalOpen(false);
      setDesigForm({ name: '', code: '', department_id: '', description: '' });
      setEditingDesigId(null);
      loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save designation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await hrApi.deleteDepartment(id);
      loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete department');
    }
  };

  const handleDeleteDesignation = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) return;
    try {
      await hrApi.deleteDesignation(id);
      loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete designation');
    }
  };

  const filteredDepartments = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDesignations = designations.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {t('hr.org.title', 'Departments & Job Designations')}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('hr.org.subtitle', 'Configure enterprise workforce structure, units, and role designations')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAll}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </button>
          {activeTab === 'DEPARTMENTS' ? (
            <button
              onClick={() => {
                setEditingDeptId(null);
                setDeptForm({ name: '', code: '', description: '' });
                setIsDeptModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Department
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingDesigId(null);
                setDesigForm({ name: '', code: '', department_id: '', description: '' });
                setIsDesigModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Designation
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('DEPARTMENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'DEPARTMENTS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Departments ({departments.length})
          </button>
          <button
            onClick={() => setActiveTab('DESIGNATIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'DESIGNATIONS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Designations ({designations.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 text-white text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Content Panels */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Department Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Workforce Headcount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredDepartments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-800/20">
                  <td className="py-3 px-4 font-mono font-semibold text-white">{dept.code}</td>
                  <td className="py-3 px-4 font-medium text-white">{dept.name}</td>
                  <td className="py-3 px-4 text-slate-400">{dept.description || '—'}</td>
                  <td className="py-3 px-4 text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      {dept.employees_count ?? 0} Staff
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                      {dept.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingDeptId(dept.id);
                        setDeptForm({
                          name: dept.name,
                          code: dept.code,
                          description: dept.description || '',
                        });
                        setIsDeptModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDepartment(dept.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'DESIGNATIONS' && (
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredDesignations.map((desig) => (
                <tr key={desig.id} className="hover:bg-slate-800/20">
                  <td className="py-3 px-4 font-mono font-semibold text-white">{desig.code}</td>
                  <td className="py-3 px-4 font-medium text-white">{desig.name}</td>
                  <td className="py-3 px-4 text-slate-300">
                    {desig.department?.name || 'All Departments'}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{desig.description || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                      {desig.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingDesigId(desig.id);
                        setDesigForm({
                          name: desig.name,
                          code: desig.code,
                          department_id: desig.department_id ? desig.department_id.toString() : '',
                          description: desig.description || '',
                        });
                        setIsDesigModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDesignation(desig.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">
                {editingDeptId ? 'Edit Department' : 'Create Department'}
              </h2>
              <button onClick={() => setIsDeptModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDepartment} className="p-5 space-y-4 text-xs">
              {error && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Finance & Accounts"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Code *</label>
                <input
                  type="text"
                  required
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  placeholder="e.g. FIN"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-md"
                >
                  {submitting ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Designation Modal */}
      {isDesigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">
                {editingDesigId ? 'Edit Designation' : 'Create Designation'}
              </h2>
              <button onClick={() => setIsDesigModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDesignation} className="p-5 space-y-4 text-xs">
              {error && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Designation Name *</label>
                <input
                  type="text"
                  required
                  value={desigForm.name}
                  onChange={(e) => setDesigForm({ ...desigForm, name: e.target.value })}
                  placeholder="e.g. Senior Accountant"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Code *</label>
                <input
                  type="text"
                  required
                  value={desigForm.code}
                  onChange={(e) => setDesigForm({ ...desigForm, code: e.target.value })}
                  placeholder="e.g. S-ACT"
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Department</label>
                <select
                  value={desigForm.department_id}
                  onChange={(e) => setDesigForm({ ...desigForm, department_id: e.target.value })}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Company-Wide (All Departments)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  value={desigForm.description}
                  onChange={(e) => setDesigForm({ ...desigForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDesigModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-md"
                >
                  {submitting ? 'Saving...' : 'Save Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentDesignationManagement;
