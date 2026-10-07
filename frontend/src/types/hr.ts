export type EmploymentType = 'PERMANENT' | 'PROBATION' | 'CONTRACT' | 'PART_TIME' | 'INTERN';
export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKLY_OFF' | 'REMOTE' | 'FIELD_WORK';
export type LeaveStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PayrollPeriodStatus = 'DRAFT' | 'OPEN' | 'PROCESSING' | 'COMPLETED' | 'CLOSED';
export type PayrollRunStatus = 'DRAFT' | 'CALCULATED' | 'UNDER_REVIEW' | 'APPROVED' | 'POSTED' | 'PAID' | 'CANCELLED';
export type AdvanceStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'PARTIALLY_SETTLED' | 'SETTLED' | 'CANCELLED';
export type LoanStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';

export interface Department {
  id: number;
  company_id: number;
  name: string;
  code: string;
  description?: string;
  status: string;
  employees_count?: number;
  designations_count?: number;
  created_at?: string;
}

export interface Designation {
  id: number;
  company_id: number;
  department_id?: number;
  name: string;
  code: string;
  description?: string;
  status: string;
  department?: Department;
  employees_count?: number;
  created_at?: string;
}

export interface Employee {
  id: number;
  company_id: number;
  branch_id?: number;
  department_id?: number;
  designation_id?: number;
  user_id?: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  national_id?: string;
  joining_date: string;
  confirmation_date?: string;
  resignation_date?: string;
  employment_type: EmploymentType;
  employment_status: EmploymentStatus;
  status?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  mobile_banking_provider?: string;
  mobile_banking_number?: string;
  department?: Department;
  designation?: Designation;
  branch?: {
    id: number;
    name: string;
    code: string;
  };
  salary_structures?: SalaryStructure[];
  active_salary_structure?: SalaryStructure;
  created_at?: string;
}

export interface Shift {
  id: number;
  company_id: number;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  break_duration_minutes: number;
  is_overnight: boolean;
  status: string;
}

export interface ShiftAssignment {
  id: number;
  company_id: number;
  employee_id: number;
  shift_id: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  shift?: Shift;
  employee?: Employee;
}

export interface Attendance {
  id: number;
  company_id: number;
  employee_id: number;
  shift_id?: number;
  attendance_date: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatus;
  late_minutes: number;
  early_leave_minutes: number;
  worked_minutes: number;
  overtime_minutes: number;
  notes?: string;
  employee?: Employee;
  shift?: Shift;
  adjustments?: AttendanceAdjustment[];
}

export interface AttendanceAdjustment {
  id: number;
  company_id: number;
  attendance_id: number;
  reason: string;
  old_status?: string;
  new_status?: string;
  old_check_in?: string;
  new_check_in?: string;
  old_check_out?: string;
  new_check_out?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adjusted_by?: number;
  created_at?: string;
}

export interface LeaveType {
  id: number;
  company_id: number;
  name: string;
  code: string;
  is_paid: boolean;
  default_days_per_year: number;
  description?: string;
  status: string;
}

export interface LeaveBalance {
  id: number;
  company_id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  opening_balance: number;
  accrued_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  entitled_days?: number;
  taken_days?: number;
  leave_type?: LeaveType;
}

export interface LeaveApplication {
  id: number;
  company_id: number;
  employee_id: number;
  leave_type_id: number;
  from_date: string;
  to_date: string;
  days: number;
  days_applied?: number;
  reason: string;
  status: LeaveStatus;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  employee?: Employee;
  leave_type?: LeaveType;
  approver?: {
    id: number;
    name: string;
  };
}

export interface SalaryComponent {
  id: number;
  company_id: number;
  name: string;
  code: string;
  type: 'EARNING' | 'DEDUCTION';
  calculation_method: 'FIXED' | 'PERCENTAGE_OF_BASIC';
  default_amount: number;
  is_taxable: boolean;
  is_statutory: boolean;
  status: string;
}

export interface SalaryStructureItem {
  id: number;
  salary_structure_id: number;
  salary_component_id: number;
  amount: number;
  percentage?: number;
  component?: SalaryComponent;
}

export interface SalaryStructure {
  id: number;
  company_id: number;
  employee_id?: number;
  name: string;
  code: string;
  effective_from: string;
  effective_to?: string;
  basic_salary: number;
  gross_salary: number;
  net_salary: number;
  base_gross?: number;
  status: string;
  items?: SalaryStructureItem[];
  employee?: Employee;
}

export interface PayrollPeriod {
  id: number;
  company_id: number;
  name: string;
  period_start: string;
  period_end: string;
  payment_due_date?: string;
  status: PayrollPeriodStatus;
  notes?: string;
  runs_count?: number;
}

export interface PayrollItem {
  id: number;
  payroll_run_id: number;
  employee_id: number;
  basic_salary: number;
  allowances: number;
  overtime_amount: number;
  bonus: number;
  gross_pay: number;
  unpaid_leave_deduction: number;
  loan_deduction: number;
  advance_deduction: number;
  tax_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  status: string;
  breakdown?: any;
  employee?: Employee;
}

export interface PayrollRun {
  id: number;
  company_id: number;
  payroll_period_id: number;
  run_number: string;
  status: PayrollRunStatus;
  total_basic: number;
  total_allowances: number;
  total_overtime: number;
  total_bonuses: number;
  total_gross: number;
  total_deductions: number;
  total_loan_repayments: number;
  total_advance_repayments: number;
  total_net: number;
  total_paid: number;
  total_outstanding: number;
  journal_entry_id?: number;
  calculated_at?: string;
  approved_at?: string;
  posted_at?: string;
  period?: PayrollPeriod;
  items?: PayrollItem[];
}

export interface EmployeeAdvance {
  id: number;
  company_id: number;
  employee_id: number;
  advance_number: string;
  amount: number;
  request_date: string;
  reason: string;
  status: AdvanceStatus;
  outstanding_amount: number;
  recovered_amount: number;
  approved_at?: string;
  disbursed_at?: string;
  employee?: Employee;
  repayments?: any[];
}

export interface EmployeeLoan {
  id: number;
  company_id: number;
  employee_id: number;
  loan_number: string;
  principal_amount: number;
  interest_rate_percent: number;
  total_payable: number;
  installment_count: number;
  installment_amount: number;
  start_date: string;
  status: LoanStatus;
  outstanding_balance: number;
  total_recovered: number;
  approved_at?: string;
  disbursed_at?: string;
  employee?: Employee;
  repayments?: any[];
}

export interface EmployeeProfile360 {
  employee: Employee;
  department?: Department;
  designation?: Designation;
  branch?: any;
  salary_structure?: SalaryStructure;
  leave_balances?: LeaveBalance[];
  recent_attendances?: Attendance[];
  active_loans?: EmployeeLoan[];
  active_advances?: EmployeeAdvance[];
  recent_payslips?: PayrollItem[];
  metrics?: {
    attendance_rate?: number;
    total_late_days?: number;
    total_ot_hours?: number;
    outstanding_loan_balance?: number;
    outstanding_advance_balance?: number;
  };
}

export interface HrDashboardMetrics {
  total_employees: number;
  active_employees: number;
  new_joiners: number;
  resigned_employees: number;
  attendance_today: {
    date: string;
    present: number;
    late: number;
    absent: number;
    on_leave: number;
  };
  pending_leave_applications: number;
  pending_payroll_runs: number;
  outstanding_advances: number;
  outstanding_loans: number;
}

export interface PayrollDashboardMetrics {
  latest_run?: {
    id: number;
    run_number: string;
    period_name?: string;
    status: string;
    total_basic: number;
    total_allowances: number;
    total_overtime: number;
    total_bonuses: number;
    total_gross: number;
    total_deductions: number;
    total_loan_repayments: number;
    total_advance_repayments: number;
    total_net: number;
    total_paid: number;
    total_outstanding: number;
  } | null;
  ytd_gross_payroll: number;
  ytd_net_payroll: number;
}
