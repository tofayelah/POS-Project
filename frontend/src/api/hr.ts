import api from './axios';
import {
  Department,
  Designation,
  Employee,
  EmployeeProfile360,
  Shift,
  ShiftAssignment,
  Attendance,
  AttendanceAdjustment,
  LeaveType,
  LeaveBalance,
  LeaveApplication,
  SalaryComponent,
  SalaryStructure,
  PayrollPeriod,
  PayrollRun,
  EmployeeAdvance,
  EmployeeLoan,
  HrDashboardMetrics,
  PayrollDashboardMetrics,
} from '../types/hr';

export const hrApi = {
  // ==========================================
  // DEPARTMENTS & DESIGNATIONS
  // ==========================================
  getDepartments: async (): Promise<Department[]> => {
    const res = await api.get('/departments');
    return res.data.data;
  },

  createDepartment: async (data: { name: string; code: string; description?: string }): Promise<Department> => {
    const res = await api.post('/departments', data);
    return res.data.data;
  },

  updateDepartment: async (id: number, data: { name?: string; code?: string; description?: string }): Promise<Department> => {
    const res = await api.put(`/departments/${id}`, data);
    return res.data.data;
  },

  deleteDepartment: async (id: number): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },

  getDesignations: async (departmentId?: number): Promise<Designation[]> => {
    const res = await api.get('/designations', { params: departmentId ? { department_id: departmentId } : {} });
    return res.data.data;
  },

  createDesignation: async (data: { department_id?: number; name: string; code: string; description?: string }): Promise<Designation> => {
    const res = await api.post('/designations', data);
    return res.data.data;
  },

  updateDesignation: async (id: number, data: { department_id?: number; name?: string; code?: string; description?: string }): Promise<Designation> => {
    const res = await api.put(`/designations/${id}`, data);
    return res.data.data;
  },

  deleteDesignation: async (id: number): Promise<void> => {
    await api.delete(`/designations/${id}`);
  },

  // ==========================================
  // EMPLOYEES
  // ==========================================
  getEmployees: async (params?: { department_id?: number; status?: string; search?: string }): Promise<Employee[]> => {
    const res = await api.get('/employees', { params });
    return res.data.data;
  },

  getEmployee: async (id: number): Promise<Employee> => {
    const res = await api.get(`/employees/${id}`);
    return res.data.data;
  },

  getEmployee360: async (id: number): Promise<EmployeeProfile360> => {
    const res = await api.get(`/employees/${id}/360`);
    return res.data.data;
  },

  createEmployee: async (data: Partial<Employee>): Promise<Employee> => {
    const res = await api.post('/employees', data);
    return res.data.data;
  },

  updateEmployee: async (id: number, data: Partial<Employee>): Promise<Employee> => {
    const res = await api.put(`/employees/${id}`, data);
    return res.data.data;
  },

  // ==========================================
  // SHIFTS & ATTENDANCE
  // ==========================================
  getShifts: async (): Promise<Shift[]> => {
    const res = await api.get('/shifts');
    return res.data.data;
  },

  createShift: async (data: Partial<Shift>): Promise<Shift> => {
    const res = await api.post('/shifts', data);
    return res.data.data;
  },

  updateShift: async (id: number, data: Partial<Shift>): Promise<Shift> => {
    const res = await api.put(`/shifts/${id}`, data);
    return res.data.data;
  },

  assignShift: async (data: { employee_id: number; shift_id: number; effective_from: string; effective_to?: string }): Promise<ShiftAssignment> => {
    const res = await api.post('/shifts/assign', data);
    return res.data.data;
  },

  getAttendances: async (params?: { date?: string; employee_id?: number; department_id?: number }): Promise<Attendance[]> => {
    const res = await api.get('/attendances', { params });
    return res.data.data;
  },

  checkIn: async (data: { employee_id: number; timestamp?: string }): Promise<Attendance> => {
    const res = await api.post('/attendances/check-in', data);
    return res.data.data;
  },

  checkOut: async (data: { employee_id: number; timestamp?: string }): Promise<Attendance> => {
    const res = await api.post('/attendances/check-out', data);
    return res.data.data;
  },

  requestAdjustment: async (data: { attendance_id: number; reason: string; new_check_in?: string; new_check_out?: string }): Promise<AttendanceAdjustment> => {
    const res = await api.post('/attendances/adjust', data);
    return res.data.data;
  },

  approveAdjustment: async (id: number): Promise<AttendanceAdjustment> => {
    const res = await api.post(`/attendance-adjustments/${id}/approve`);
    return res.data.data;
  },

  getAttendanceSummary: async (params?: { start_date?: string; end_date?: string; department_id?: number }): Promise<any> => {
    const res = await api.get('/attendances/summary', { params });
    return res.data.data;
  },

  // ==========================================
  // LEAVE MANAGEMENT
  // ==========================================
  getLeaveTypes: async (): Promise<LeaveType[]> => {
    const res = await api.get('/leave-types');
    return res.data.data;
  },

  createLeaveType: async (data: Partial<LeaveType>): Promise<LeaveType> => {
    const res = await api.post('/leave-types', data);
    return res.data.data;
  },

  getLeaveBalances: async (employeeId?: number, year?: number): Promise<LeaveBalance[]> => {
    const res = await api.get('/leave-balances', { params: { employee_id: employeeId, year } });
    return res.data.data;
  },

  getLeaveApplications: async (params?: { status?: string; employee_id?: number }): Promise<LeaveApplication[]> => {
    const res = await api.get('/leave-applications', { params });
    return res.data.data;
  },

  applyLeave: async (data: { employee_id: number; leave_type_id: number; from_date: string; to_date: string; reason: string }): Promise<LeaveApplication> => {
    const res = await api.post('/leave-applications', data);
    return res.data.data;
  },

  approveLeave: async (id: number): Promise<LeaveApplication> => {
    const res = await api.post(`/leave-applications/${id}/approve`);
    return res.data.data;
  },

  rejectLeave: async (id: number, reason: string): Promise<LeaveApplication> => {
    const res = await api.post(`/leave-applications/${id}/reject`, { reason });
    return res.data.data;
  },

  // ==========================================
  // SALARY STRUCTURES & COMPONENTS
  // ==========================================
  getSalaryComponents: async (): Promise<SalaryComponent[]> => {
    const res = await api.get('/salary-components');
    return res.data.data;
  },

  createSalaryComponent: async (data: Partial<SalaryComponent>): Promise<SalaryComponent> => {
    const res = await api.post('/salary-components', data);
    return res.data.data;
  },

  getSalaryStructures: async (employeeId?: number): Promise<SalaryStructure[]> => {
    const res = await api.get('/salary-structures', { params: employeeId ? { employee_id: employeeId } : {} });
    return res.data.data;
  },

  createSalaryStructure: async (data: any): Promise<SalaryStructure> => {
    const res = await api.post('/salary-structures', data);
    return res.data.data;
  },

  assignSalaryStructure: async (data: { employee_id: number; salary_structure_id: number; effective_from: string }): Promise<SalaryStructure> => {
    const res = await api.post('/salary-structures/assign', data);
    return res.data.data;
  },

  // ==========================================
  // PAYROLL PERIODS & RUNS
  // ==========================================
  getPayrollPeriods: async (): Promise<PayrollPeriod[]> => {
    const res = await api.get('/payroll/periods');
    return res.data.data;
  },

  createPayrollPeriod: async (data: Partial<PayrollPeriod>): Promise<PayrollPeriod> => {
    const res = await api.post('/payroll/periods', data);
    return res.data.data;
  },

  getPayrollRuns: async (params?: { payroll_period_id?: number; status?: string }): Promise<PayrollRun[]> => {
    const res = await api.get('/payroll/runs', { params });
    return res.data.data;
  },

  getPayrollRun: async (id: number): Promise<PayrollRun> => {
    const res = await api.get(`/payroll/runs/${id}`);
    return res.data.data;
  },

  createPayrollRun: async (data: { payroll_period_id: number }): Promise<PayrollRun> => {
    const res = await api.post('/payroll/runs', data);
    return res.data.data;
  },

  calculatePayrollRun: async (id: number): Promise<PayrollRun> => {
    const res = await api.post(`/payroll/runs/${id}/calculate`);
    return res.data.data;
  },

  approvePayrollRun: async (id: number): Promise<PayrollRun> => {
    const res = await api.post(`/payroll/runs/${id}/approve`);
    return res.data.data;
  },

  postPayrollRun: async (id: number): Promise<PayrollRun> => {
    const res = await api.post(`/payroll/runs/${id}/post`);
    return res.data.data;
  },

  settlePayrollRun: async (id: number, data: { payment_method: string; amount?: number }): Promise<PayrollRun> => {
    const res = await api.post(`/payroll/runs/${id}/settle`, data);
    return res.data.data;
  },

  // ==========================================
  // EMPLOYEE ADVANCES & LOANS
  // ==========================================
  getAdvances: async (params?: { employee_id?: number; status?: string }): Promise<EmployeeAdvance[]> => {
    const res = await api.get('/employee-advances', { params });
    return res.data.data;
  },

  requestAdvance: async (data: { employee_id: number; amount: number; reason: string; request_date?: string }): Promise<EmployeeAdvance> => {
    const res = await api.post('/employee-advances', data);
    return res.data.data;
  },

  approveAdvance: async (id: number): Promise<EmployeeAdvance> => {
    const res = await api.post(`/employee-advances/${id}/approve`);
    return res.data.data;
  },

  disburseAdvance: async (id: number, data: { payment_method: string }): Promise<EmployeeAdvance> => {
    const res = await api.post(`/employee-advances/${id}/disburse`, data);
    return res.data.data;
  },

  getLoans: async (params?: { employee_id?: number; status?: string }): Promise<EmployeeLoan[]> => {
    const res = await api.get('/employee-loans', { params });
    return res.data.data;
  },

  requestLoan: async (data: { employee_id: number; principal_amount: number; installment_count: number; interest_rate_percent?: number; start_date?: string }): Promise<EmployeeLoan> => {
    const res = await api.post('/employee-loans', data);
    return res.data.data;
  },

  disburseLoan: async (id: number, data: { payment_method: string }): Promise<EmployeeLoan> => {
    const res = await api.post(`/employee-loans/${id}/disburse`, data);
    return res.data.data;
  },

  // ==========================================
  // DASHBOARDS
  // ==========================================
  getHrDashboard: async (): Promise<HrDashboardMetrics> => {
    const res = await api.get('/hrm/dashboard');
    return res.data.data;
  },

  getPayrollDashboard: async (): Promise<PayrollDashboardMetrics> => {
    const res = await api.get('/hrm/payroll-dashboard');
    return res.data.data;
  },
};
