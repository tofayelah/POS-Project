import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Building,
  Briefcase,
  Phone,
  Mail,
  ChevronRight,
  UserCheck,
  UserX,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from '../../i18n';
import { hrApi } from '../../api/hr';
import { Employee, Department, Designation, EmploymentType } from '../../types/hr';

export const EmployeeManagement: React.FC = () => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & search
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Create Employee Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    employee_number: '',
    email: '',
    phone: '',
    department_id: '',
    designation_id: '',
    employment_type: 'PERMANENT' as EmploymentType,
    joining_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empData, deptData, desigData] = await Promise.all([
        hrApi.getEmployees(),
        hrApi.getDepartments(),
        hrApi.getDesignations(),
      ]);
      setEmployees(Array.isArray(empData) ? empData : (empData as any)?.data || []);
      setDepartments(Array.isArray(deptData) ? deptData : (deptData as any)?.data || []);
      setDesignations(Array.isArray(desigData) ? desigData : (desigData as any)?.data || []);
    } catch (err) {
      console.error('Failed to load employee directory', err);
      setEmployees([]);
      setDepartments([]);
      setDesignations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await hrApi.createEmployee({
        first_name: formData.first_name,
        last_name: formData.last_name,
        employee_number: formData.employee_number,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        department_id: formData.department_id ? Number(formData.department_id) : undefined,
        designation_id: formData.designation_id ? Number(formData.designation_id) : undefined,
        employment_type: formData.employment_type,
        joining_date: formData.joining_date,
      });
      setIsModalOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        employee_number: '',
        email: '',
        phone: '',
        department_id: '',
        designation_id: '',
        employment_type: 'PERMANENT',
        joining_date: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to register employee');
    } finally {
      setSubmitting(false);
    }
  };

  const employeeList = Array.isArray(employees) ? employees : [];
  const departmentList = Array.isArray(departments) ? departments : [];
  const designationList = Array.isArray(designations) ? designations : [];

  const filteredEmployees = employeeList.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const query = search.toLowerCase();
    const matchSearch =
      !search ||
      fullName.includes(query) ||
      emp.employee_number.toLowerCase().includes(query) ||
      (emp.phone && emp.phone.includes(query)) ||
      (emp.email && emp.email.toLowerCase().includes(query));

    const matchDept =
      selectedDept === 'ALL' ||
      emp.department_id?.toString() === selectedDept;

    const matchStatus =
      selectedStatus === 'ALL' ||
      emp.employment_status === selectedStatus ||
      emp.status === selectedStatus;

    return matchSearch && matchDept && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {t('hr.employees.title', 'Workforce Directory & 360 Profiles')}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('hr.employees.subtitle', 'Manage company employees, job roles, departments, and payroll profiles')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('hr.employees.addEmployee', 'Register Employee')}
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={t('hr.employees.searchPlaceholder', 'Search by name, ID number, mobile, email...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/60 text-white text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-800/60 text-slate-300 text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">{t('hr.employees.allDepartments', 'All Departments')}</option>
            {departmentList.map((d) => (
              <option key={d.id} value={d.id.toString()}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-800/60 text-slate-300 text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">{t('hr.employees.allStatus', 'All Statuses')}</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PROBATION">PROBATION</option>
            <option value="ON_LEAVE">ON_LEAVE</option>
            <option value="RESIGNED">RESIGNED</option>
            <option value="TERMINATED">TERMINATED</option>
          </select>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">{t('hr.employees.thEmployee', 'Employee')}</th>
                <th className="py-3 px-4">{t('hr.employees.thRole', 'Department & Role')}</th>
                <th className="py-3 px-4">{t('hr.employees.thContact', 'Contact')}</th>
                <th className="py-3 px-4">{t('hr.employees.thJoining', 'Joining Date')}</th>
                <th className="py-3 px-4">{t('hr.employees.thStatus', 'Status')}</th>
                <th className="py-3 px-4 text-right">{t('common.action', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading workforce records...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No employees matching the criteria found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-white block">
                            {emp.first_name} {emp.last_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {emp.employee_number}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex flex-col">
                        <span className="font-medium text-white flex items-center gap-1.5">
                          <Building className="w-3 h-3 text-sky-400" />
                          {emp.department?.name || '—'}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Briefcase className="w-3 h-3 text-indigo-400" />
                          {emp.designation?.name || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex flex-col text-[11px]">
                        {emp.phone && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Phone className="w-3 h-3 text-emerald-400" /> {emp.phone}
                          </span>
                        )}
                        {emp.email && (
                          <span className="flex items-center gap-1 text-slate-400 mt-0.5">
                            <Mail className="w-3 h-3 text-indigo-400" /> {emp.email}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {emp.joining_date}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${
                          emp.employment_status === 'ACTIVE' || emp.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-700 text-slate-300 border-slate-600'
                        }`}
                      >
                        {emp.employment_status || emp.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/hr/employees/${emp.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 font-medium rounded-lg text-xs transition"
                      >
                        Profile 360
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                {t('hr.employees.modalTitle', 'Register New Employee')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Employee ID / Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employee_number}
                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    placeholder="EMP-1001"
                    className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Department</option>
                    {departmentList.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Designation
                  </label>
                  <select
                    value={formData.designation_id}
                    onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                    className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Designation</option>
                    {designationList.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="employee@retailcore.com"
                    className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+880 1700 000000"
                    className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                >
                  {submitting ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
