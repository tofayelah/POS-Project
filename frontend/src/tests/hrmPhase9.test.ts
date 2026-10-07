import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api/axios';
import { hrApi } from '../api/hr';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

describe('Phase 9: HRM, Attendance, Leave, Payroll & Advances Frontend Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Departments and Designations API', () => {
    it('fetches departments and creates department', async () => {
      const mockDepts = [{ id: 1, name: 'Operations', code: 'OPS', status: 'ACTIVE' }];
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockDepts } });

      const list = await hrApi.getDepartments();
      expect(api.get).toHaveBeenCalledWith('/departments');
      expect(list.length).toBe(1);
      expect(list[0].code).toBe('OPS');

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 2, name: 'Accounts', code: 'ACC', status: 'ACTIVE' } },
      });
      const created = await hrApi.createDepartment({ name: 'Accounts', code: 'ACC' });
      expect(api.post).toHaveBeenCalledWith('/departments', { name: 'Accounts', code: 'ACC' });
      expect(created.id).toBe(2);
    });

    it('fetches and creates designations', async () => {
      const mockDesigs = [{ id: 1, name: 'Manager', code: 'MGR', status: 'ACTIVE' }];
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockDesigs } });

      const list = await hrApi.getDesignations(1);
      expect(api.get).toHaveBeenCalledWith('/designations', { params: { department_id: 1 } });
      expect(list[0].name).toBe('Manager');
    });
  });

  describe('2. Employee Directory & 360 Profile API', () => {
    it('fetches employees list and single employee 360', async () => {
      const mockEmployees = [
        { id: 1, employee_number: 'EMP-01', first_name: 'Tanvir', last_name: 'Ahmed', employment_status: 'ACTIVE' },
      ];
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockEmployees } });

      const list = await hrApi.getEmployees({ status: 'ACTIVE' });
      expect(api.get).toHaveBeenCalledWith('/employees', { params: { status: 'ACTIVE' } });
      expect(list[0].employee_number).toBe('EMP-01');

      const mock360 = {
        employee: mockEmployees[0],
        department: { id: 1, name: 'Accounts', code: 'ACC', status: 'ACTIVE' },
        metrics: { attendance_rate: 98, outstanding_loan_balance: 20000, outstanding_advance_balance: 0 },
      };
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mock360 } });

      const profile = await hrApi.getEmployee360(1);
      expect(api.get).toHaveBeenCalledWith('/employees/1/360');
      expect(profile.employee.first_name).toBe('Tanvir');
      expect(profile.metrics?.attendance_rate).toBe(98);
    });
  });

  describe('3. Shift Management and Daily Attendance API', () => {
    it('handles punches and adjustments', async () => {
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 10, employee_id: 1, status: 'PRESENT', check_in: '2026-10-07 09:00:00' } },
      });

      const punchIn = await hrApi.checkIn({ employee_id: 1 });
      expect(api.post).toHaveBeenCalledWith('/attendances/check-in', { employee_id: 1 });
      expect(punchIn.status).toBe('PRESENT');

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 1, attendance_id: 10, status: 'APPROVED' } },
      });

      const adj = await hrApi.approveAdjustment(1);
      expect(api.post).toHaveBeenCalledWith('/attendance-adjustments/1/approve');
      expect(adj.status).toBe('APPROVED');
    });

    it('creates overnight and regular shifts', async () => {
      const shiftData = {
        name: 'Night Shift',
        code: 'NIGHT',
        start_time: '22:00',
        end_time: '06:00',
        grace_period_minutes: 15,
        break_duration_minutes: 60,
        is_overnight: true,
      };
      vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { success: true, data: { id: 3, ...shiftData } } });

      const created = await hrApi.createShift(shiftData);
      expect(api.post).toHaveBeenCalledWith('/shifts', shiftData);
      expect(created.is_overnight).toBe(true);
    });
  });

  describe('4. Leave Applications and Balances API', () => {
    it('applies for leave and approves application', async () => {
      const applyData = {
        employee_id: 1,
        leave_type_id: 2,
        from_date: '2026-10-10',
        to_date: '2026-10-12',
        reason: 'Family event',
      };
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 5, ...applyData, days: 3, status: 'SUBMITTED' } },
      });

      const app = await hrApi.applyLeave(applyData);
      expect(api.post).toHaveBeenCalledWith('/leave-applications', applyData);
      expect(app.status).toBe('SUBMITTED');

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 5, status: 'APPROVED' } },
      });

      const approved = await hrApi.approveLeave(5);
      expect(api.post).toHaveBeenCalledWith('/leave-applications/5/approve');
      expect(approved.status).toBe('APPROVED');
    });
  });

  describe('5. Payroll Lifecycle & GL Posting API', () => {
    it('executes full calculation, approval, GL posting, and payout settlement', async () => {
      // Calculate
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 1, status: 'CALCULATED', total_gross: 50000, total_net: 45000 } },
      });
      const calc = await hrApi.calculatePayrollRun(1);
      expect(api.post).toHaveBeenCalledWith('/payroll/runs/1/calculate');
      expect(calc.status).toBe('CALCULATED');

      // Approve
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 1, status: 'APPROVED' } },
      });
      const approved = await hrApi.approvePayrollRun(1);
      expect(api.post).toHaveBeenCalledWith('/payroll/runs/1/approve');
      expect(approved.status).toBe('APPROVED');

      // Post to GL
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 1, status: 'POSTED', journal_entry_id: 101 } },
      });
      const posted = await hrApi.postPayrollRun(1);
      expect(api.post).toHaveBeenCalledWith('/payroll/runs/1/post');
      expect(posted.status).toBe('POSTED');
      expect(posted.journal_entry_id).toBe(101);

      // Settle Payout
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 1, status: 'PAID', total_paid: 45000 } },
      });
      const paid = await hrApi.settlePayrollRun(1, { payment_method: 'BANK_TRANSFER' });
      expect(api.post).toHaveBeenCalledWith('/payroll/runs/1/settle', { payment_method: 'BANK_TRANSFER' });
      expect(paid.status).toBe('PAID');
    });
  });

  describe('6. Employee Advances and Loans API', () => {
    it('requests, approves, and disburses advance', async () => {
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 2, amount: 15000, status: 'SUBMITTED' } },
      });
      const adv = await hrApi.requestAdvance({ employee_id: 1, amount: 15000, reason: 'Medical' });
      expect(api.post).toHaveBeenCalledWith('/employee-advances', { employee_id: 1, amount: 15000, reason: 'Medical' });
      expect(adv.status).toBe('SUBMITTED');

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 2, status: 'APPROVED' } },
      });
      await hrApi.approveAdvance(2);
      expect(api.post).toHaveBeenCalledWith('/employee-advances/2/approve');

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 2, status: 'DISBURSED' } },
      });
      const disbursed = await hrApi.disburseAdvance(2, { payment_method: 'BANK_TRANSFER' });
      expect(api.post).toHaveBeenCalledWith('/employee-advances/2/disburse', { payment_method: 'BANK_TRANSFER' });
      expect(disbursed.status).toBe('DISBURSED');
    });

    it('creates and disburses employee loan', async () => {
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 3, principal_amount: 50000, installment_count: 5, status: 'APPROVED' } },
      });
      const loan = await hrApi.requestLoan({ employee_id: 1, principal_amount: 50000, installment_count: 5 });
      expect(loan.principal_amount).toBe(50000);

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, data: { id: 3, status: 'ACTIVE' } },
      });
      const disbursed = await hrApi.disburseLoan(3, { payment_method: 'BANK_TRANSFER' });
      expect(disbursed.status).toBe('ACTIVE');
    });
  });

  describe('7. Dashboards Telemetry API', () => {
    it('fetches HRM command center and payroll dashboard metrics', async () => {
      const mockHrDash = {
        total_employees: 50,
        active_employees: 48,
        new_joiners: 4,
        resigned_employees: 1,
        attendance_today: { date: '2026-10-07', present: 45, late: 3, absent: 2, on_leave: 1 },
        pending_leave_applications: 3,
        pending_payroll_runs: 1,
        outstanding_advances: 15000,
        outstanding_loans: 45000,
      };
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockHrDash } });

      const hrMetrics = await hrApi.getHrDashboard();
      expect(api.get).toHaveBeenCalledWith('/hrm/dashboard');
      expect(hrMetrics.active_employees).toBe(48);
      expect(hrMetrics.attendance_today.present).toBe(45);

      const mockPrDash = {
        latest_run: { id: 1, run_number: 'RUN-2026-10-01', status: 'POSTED', total_gross: 200000, total_net: 180000 },
        ytd_gross_payroll: 1800000,
        ytd_net_payroll: 1650000,
      };
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockPrDash } });

      const prMetrics = await hrApi.getPayrollDashboard();
      expect(api.get).toHaveBeenCalledWith('/hrm/payroll-dashboard');
      expect(prMetrics.ytd_gross_payroll).toBe(1800000);
    });
  });

  describe('8. i18n Translation Parity for Phase 9 HRM', () => {
    const requiredKeys = [
      'nav.hrm',
      'nav.hrDashboard',
      'nav.employees',
      'nav.departments',
      'nav.attendance',
      'nav.leaves',
      'nav.payroll',
      'nav.advancesLoans',
      'hr.dashboard.title',
      'hr.dashboard.subtitle',
      'hr.dashboard.viewEmployees',
      'hr.dashboard.activeEmployees',
      'hr.dashboard.total',
      'hr.dashboard.newThisMonth',
      'hr.dashboard.attendanceToday',
      'hr.dashboard.turnout',
      'hr.dashboard.lateArrivals',
      'hr.dashboard.pendingLeaves',
      'hr.dashboard.actionRequired',
      'hr.dashboard.reviewLeaves',
      'hr.dashboard.loansAdvances',
      'hr.dashboard.attendanceBreakdown',
      'hr.dashboard.manageAttendance',
      'hr.dashboard.payrollOverview',
      'hr.dashboard.managePayroll',
      'hr.dashboard.ytdGross',
      'hr.dashboard.ytdNet',
      'hr.employees.title',
      'hr.employees.subtitle',
      'hr.employees.addEmployee',
      'hr.employees.searchPlaceholder',
      'hr.employees.allDepartments',
      'hr.employees.allStatus',
      'hr.employees.thEmployee',
      'hr.employees.thRole',
      'hr.employees.thContact',
      'hr.employees.thJoining',
      'hr.employees.thStatus',
      'hr.employees.modalTitle',
      'hr.org.title',
      'hr.org.subtitle',
      'hr.attendance.title',
      'hr.attendance.subtitle',
      'hr.attendance.present',
      'hr.attendance.late',
      'hr.attendance.onLeave',
      'hr.attendance.absent',
      'hr.attendance.liveDate',
      'hr.leave.title',
      'hr.leave.subtitle',
      'hr.payroll.title',
      'hr.payroll.subtitle',
      'hr.loans.title',
      'hr.loans.subtitle',
    ];

    it('ensures all Phase 9 keys exist in English translations', () => {
      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect((en as any)[key]).toBeTruthy();
      });
    });

    it('ensures 100% key parity with Bengali translations', () => {
      requiredKeys.forEach((key) => {
        expect(bn).toHaveProperty(key);
        expect((bn as any)[key]).toBeTruthy();
      });
    });
  });
});
