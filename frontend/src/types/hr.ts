export type EmploymentType = 'PERMANENT' | 'PROBATION' | 'CONTRACT' | 'TEMPORARY' | 'INTERN' | string;

export interface Employee {
  id: number | string;
  employee_id?: string;
  employee_number?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  phone?: string;
  national_id?: string;
  bank_name?: string;
  bank_account_number?: string;
  mobile_banking_provider?: string;
  mobile_banking_number?: string;
  department_id?: number | string;
  department?: string | { id?: number | string; name?: string };
  designation_id?: number | string;
  designation?: string | { id?: number | string; name?: string; title?: string };
  joining_date?: string;
  basic_salary?: number;
  employment_type?: EmploymentType;
  employment_status?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | string;
}

export interface Department {
  id: number | string;
  name: string;
  code?: string;
  description?: string;
  manager_id?: number | string;
  employees_count?: number;
  status?: string;
}

export interface Designation {
  id: number | string;
  title?: string;
  name?: string;
  code?: string;
  description?: string;
  department_id?: number | string;
  department?: { id?: number | string; name?: string };
  status?: string;
}

export interface LeaveType {
  id: number | string;
  name: string;
  code?: string;
  days_allowed: number;
  is_paid?: boolean;
  description?: string;
  default_days_per_year?: number;
}

export interface LeaveBalance {
  id: number | string;
  employee_id: number | string;
  leave_type_id: number | string;
  leave_type?: LeaveType | any;
  year?: number;
  accrued_days?: number;
  entitled_days?: number;
  used_days?: number;
  taken_days?: number;
  pending_days?: number;
  remaining_days?: number;
  days_remaining: number;
}

export interface LeaveApplication {
  id: number | string;
  employee_id: number | string;
  employee?: Employee;
  leave_type: LeaveType | any;
  start_date: string;
  end_date: string;
  from_date?: string;
  to_date?: string;
  days_applied?: number;
  days?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  reason?: string;
}

export type LeaveRequest = LeaveApplication;

export interface Shift {
  id: number | string;
  name: string;
  code?: string;
  start_time: string;
  end_time: string;
  is_overnight?: boolean;
  grace_period_minutes?: number;
  break_duration_minutes?: number;
}

export interface ShiftAssignment {
  id: number | string;
  employee_id: number | string;
  shift_id: number | string;
  effective_from: string;
  effective_to?: string;
  shift?: Shift;
}

export interface Attendance {
  id: number | string;
  employee_id: number | string;
  employee?: Employee;
  shift?: Shift;
  date: string;
  attendance_date?: string;
  clock_in?: string;
  clock_out?: string;
  check_in?: string;
  check_out?: string;
  worked_minutes?: number;
  late_minutes?: number;
  early_leave_minutes?: number;
  overtime_minutes?: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | string;
}

export type AttendanceRecord = Attendance;

export interface AttendanceAdjustment {
  id: number | string;
  attendance_id: number | string;
  reason: string;
  requested_check_in?: string;
  requested_check_out?: string;
  status: string;
}

export interface SalaryComponent {
  id: number | string;
  name: string;
  code?: string;
  type: 'EARNING' | 'DEDUCTION' | string;
  is_taxable?: boolean;
}

export interface SalaryStructure {
  id: number | string;
  employee_id: number | string;
  basic_salary: number;
  components?: any[];
}

export interface PayrollPeriod {
  id: number | string;
  name: string;
  start_date: string;
  end_date: string;
  period_start?: string;
  period_end?: string;
  payment_due_date?: string;
  status?: string;
}

export interface PayrollItem {
  id: number | string;
  payroll_run_id: number | string;
  employee_id: number | string;
  basic_salary: number;
  allowances?: number;
  overtime_amount?: number;
  gross_pay?: number;
  loan_deduction?: number;
  advance_deduction?: number;
  tax_deduction?: number;
  net_pay?: number;
  net_salary: number;
}

export interface PayrollRun {
  id: number | string;
  run_number?: string;
  period_id?: number | string;
  payroll_period_id?: number | string;
  period_name?: string;
  period?: any;
  status: string;
  total_gross?: number;
  total_deductions?: number;
  total_net?: number;
  total_payout: number;
  total_paid?: number;
  journal_entry_id?: number | string;
  items?: PayrollItem[];
}

export interface PayrollRecord {
  id: number | string;
  employee_id: number | string;
  period: string;
  basic_salary: number;
  allowances?: number;
  deductions?: number;
  net_salary: number;
  status: 'DRAFT' | 'APPROVED' | 'PAID' | string;
}

export interface AdvanceLoan {
  id: number | string;
  advance_number?: string;
  loan_number?: string;
  employee_id: number | string;
  employee?: Employee;
  request_date?: string;
  reason?: string;
  amount: number;
  principal_amount?: number;
  repayment_months: number;
  monthly_deduction?: number;
  installment_amount?: number;
  installment_count?: number;
  outstanding_amount?: number;
  outstanding_balance?: number;
  balance_remaining: number;
  status: 'APPROVED' | 'RUNNING' | 'CLOSED' | string;
}

export type EmployeeAdvance = AdvanceLoan;
export type EmployeeLoan = AdvanceLoan;

export interface EmployeeProfile360 {
  employee: Employee;
  department?: Department;
  designation?: Designation;
  branch?: any;
  metrics?: any;
  leaves?: LeaveApplication[];
  attendances?: Attendance[];
  recent_attendances?: Attendance[];
  leave_balances?: LeaveBalance[];
  salary_structure?: any;
  payrolls?: PayrollRecord[];
  active_loans?: AdvanceLoan[];
  active_advances?: AdvanceLoan[];
}

export interface HrDashboardMetrics {
  total_employees?: number;
  active_employees?: number;
  on_leave_employees?: number;
  new_joiners?: number;
  new_joiners_this_month?: number;
  pending_leave_applications?: number;
  outstanding_advances?: number;
  outstanding_loans?: number;
  attendance_today?: { present?: number; absent?: number; late?: number; on_leave?: number; date?: string };
}

export interface PayrollDashboardMetrics {
  total_payroll_cost?: number;
  pending_approvals?: number;
  processed_this_month?: number;
  ytd_gross_payroll?: number;
  ytd_net_payroll?: number;
  latest_run?: PayrollRun;
}
