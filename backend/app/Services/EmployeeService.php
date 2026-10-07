<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmployeeService
{
    // ==========================================
    // DEPARTMENTS
    // ==========================================

    public function listDepartments(int $companyId, array $filters = [])
    {
        $query = Department::where('company_id', $companyId)->with(['businessUnit', 'branch']);

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('code', 'like', "%{$s}%");
            });
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        return $query->withCount('employees')->orderBy('name')->get();
    }

    public function createDepartment(int $companyId, array $data, ?int $userId = null): Department
    {
        $exists = Department::where('company_id', $companyId)->where('code', $data['code'])->exists();
        if ($exists) {
            throw new ConflictHttpException("Department code '{$data['code']}' already exists.");
        }

        $dept = Department::create([
            'company_id' => $companyId,
            'business_unit_id' => $data['business_unit_id'] ?? null,
            'branch_id' => $data['branch_id'] ?? null,
            'name' => $data['name'],
            'code' => strtoupper($data['code']),
            'description' => $data['description'] ?? null,
            'status' => strtoupper($data['status'] ?? 'ACTIVE'),
            'created_by' => $userId,
        ]);

        AuditLog::log($companyId, $userId, 'DEPARTMENT_CREATED', $dept->id, 'Department', "Created department {$dept->name} ({$dept->code})");

        return $dept;
    }

    public function updateDepartment(int $companyId, int $departmentId, array $data, ?int $userId = null): Department
    {
        $dept = Department::where('company_id', $companyId)->findOrFail($departmentId);

        if (!empty($data['code']) && strtoupper($data['code']) !== $dept->code) {
            $exists = Department::where('company_id', $companyId)
                ->where('code', strtoupper($data['code']))
                ->where('id', '!=', $dept->id)
                ->exists();
            if ($exists) {
                throw new ConflictHttpException("Department code '{$data['code']}' already exists.");
            }
            $dept->code = strtoupper($data['code']);
        }

        if (isset($data['name'])) $dept->name = $data['name'];
        if (isset($data['description'])) $dept->description = $data['description'];
        if (isset($data['status'])) $dept->status = strtoupper($data['status']);
        if (isset($data['branch_id'])) $dept->branch_id = $data['branch_id'];
        if (isset($data['business_unit_id'])) $dept->business_unit_id = $data['business_unit_id'];
        $dept->updated_by = $userId;
        $dept->save();

        AuditLog::log($companyId, $userId, 'DEPARTMENT_UPDATED', $dept->id, 'Department', "Updated department {$dept->name}");

        return $dept;
    }

    public function deleteDepartment(int $companyId, int $departmentId, ?int $userId = null): bool
    {
        $dept = Department::where('company_id', $companyId)->findOrFail($departmentId);

        $hasEmployees = Employee::where('company_id', $companyId)->where('department_id', $dept->id)->exists();
        if ($hasEmployees) {
            throw new ConflictHttpException("Cannot delete department because active or historical employees belong to it.");
        }

        $dept->delete();
        AuditLog::log($companyId, $userId, 'DEPARTMENT_DELETED', $departmentId, 'Department', "Deleted department {$dept->name}");

        return true;
    }

    // ==========================================
    // DESIGNATIONS
    // ==========================================

    public function listDesignations(int $companyId, array $filters = [])
    {
        $query = Designation::where('company_id', $companyId);

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('code', 'like', "%{$s}%");
            });
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->withCount('employees')->orderBy('name')->get();
    }

    public function createDesignation(int $companyId, array $data, ?int $userId = null): Designation
    {
        $exists = Designation::where('company_id', $companyId)->where('code', $data['code'])->exists();
        if ($exists) {
            throw new ConflictHttpException("Designation code '{$data['code']}' already exists.");
        }

        $desig = Designation::create([
            'company_id' => $companyId,
            'name' => $data['name'],
            'code' => strtoupper($data['code']),
            'description' => $data['description'] ?? null,
            'status' => strtoupper($data['status'] ?? 'ACTIVE'),
            'created_by' => $userId,
        ]);

        AuditLog::log($companyId, $userId, 'DESIGNATION_CREATED', $desig->id, 'Designation', "Created designation {$desig->name} ({$desig->code})");

        return $desig;
    }

    public function updateDesignation(int $companyId, int $designationId, array $data, ?int $userId = null): Designation
    {
        $desig = Designation::where('company_id', $companyId)->findOrFail($designationId);

        if (!empty($data['code']) && strtoupper($data['code']) !== $desig->code) {
            $exists = Designation::where('company_id', $companyId)
                ->where('code', strtoupper($data['code']))
                ->where('id', '!=', $desig->id)
                ->exists();
            if ($exists) {
                throw new ConflictHttpException("Designation code '{$data['code']}' already exists.");
            }
            $desig->code = strtoupper($data['code']);
        }

        if (isset($data['name'])) $desig->name = $data['name'];
        if (isset($data['description'])) $desig->description = $data['description'];
        if (isset($data['status'])) $desig->status = strtoupper($data['status']);
        $desig->updated_by = $userId;
        $desig->save();

        AuditLog::log($companyId, $userId, 'DESIGNATION_UPDATED', $desig->id, 'Designation', "Updated designation {$desig->name}");

        return $desig;
    }

    public function deleteDesignation(int $companyId, int $designationId, ?int $userId = null): bool
    {
        $desig = Designation::where('company_id', $companyId)->findOrFail($designationId);

        $hasEmployees = Employee::where('company_id', $companyId)->where('designation_id', $desig->id)->exists();
        if ($hasEmployees) {
            throw new ConflictHttpException("Cannot delete designation because employees are assigned to it.");
        }

        $desig->delete();
        AuditLog::log($companyId, $userId, 'DESIGNATION_DELETED', $designationId, 'Designation', "Deleted designation {$desig->name}");

        return true;
    }

    // ==========================================
    // EMPLOYEES
    // ==========================================

    public function listEmployees(int $companyId, array $filters = [])
    {
        $query = Employee::where('company_id', $companyId)
            ->with(['department', 'designation', 'branch', 'user']);

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('employee_number', 'like', "%{$s}%")
                  ->orWhere('first_name', 'like', "%{$s}%")
                  ->orWhere('last_name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }
        if (!empty($filters['department_id'])) {
            $query->where('department_id', $filters['department_id']);
        }
        if (!empty($filters['designation_id'])) {
            $query->where('designation_id', $filters['designation_id']);
        }
        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }
        if (!empty($filters['employment_status'])) {
            $query->where('employment_status', $filters['employment_status']);
        }
        if (!empty($filters['employment_type'])) {
            $query->where('employment_type', $filters['employment_type']);
        }

        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 25;
        return $query->orderBy('first_name')->paginate($limit);
    }

    public function getEmployee(int $companyId, int $employeeId): Employee
    {
        return Employee::where('company_id', $companyId)
            ->with([
                'department',
                'designation',
                'branch',
                'businessUnit',
                'user',
                'currentSalaryStructure.items.component',
                'leaveBalances.leaveType',
            ])
            ->findOrFail($employeeId);
    }

    public function createEmployee(int $companyId, array $data, ?int $userId = null): Employee
    {
        return DB::transaction(function () use ($companyId, $data, $userId) {
            // Auto generate employee number if missing
            $empNumber = $data['employee_number'] ?? null;
            if (!$empNumber) {
                $lastId = Employee::where('company_id', $companyId)->max('id') ?? 0;
                $empNumber = 'EMP-' . str_pad($lastId + 1, 5, '0', STR_PAD_LEFT);
            }

            $exists = Employee::where('company_id', $companyId)->where('employee_number', $empNumber)->exists();
            if ($exists) {
                throw new ConflictHttpException("Employee number '{$empNumber}' already exists.");
            }

            // Verify department belongs to company
            if (!empty($data['department_id'])) {
                Department::where('company_id', $companyId)->findOrFail($data['department_id']);
            }
            // Verify designation belongs to company
            if (!empty($data['designation_id'])) {
                Designation::where('company_id', $companyId)->findOrFail($data['designation_id']);
            }

            $employee = Employee::create([
                'company_id' => $companyId,
                'business_unit_id' => $data['business_unit_id'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
                'department_id' => $data['department_id'] ?? null,
                'designation_id' => $data['designation_id'] ?? null,
                'user_id' => $data['user_id'] ?? null,
                'employee_number' => $empNumber,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'] ?? null,
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'gender' => $data['gender'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'national_id' => $data['national_id'] ?? null,
                'address' => $data['address'] ?? null,
                'joining_date' => $data['joining_date'] ?? date('Y-m-d'),
                'confirmation_date' => $data['confirmation_date'] ?? null,
                'employment_type' => strtoupper($data['employment_type'] ?? 'FULL_TIME'),
                'employment_status' => strtoupper($data['employment_status'] ?? 'ACTIVE'),
                'bank_name' => $data['bank_name'] ?? null,
                'bank_account_number' => $data['bank_account_number'] ?? null,
                'bank_routing_number' => $data['bank_routing_number'] ?? null,
                'emergency_contact_name' => $data['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ]);

            AuditLog::log($companyId, $userId, 'EMPLOYEE_CREATED', $employee->id, 'Employee', "Created employee {$employee->full_name} ({$employee->employee_number})");

            return $employee->load(['department', 'designation', 'branch', 'user']);
        });
    }

    public function updateEmployee(int $companyId, int $employeeId, array $data, ?int $userId = null): Employee
    {
        return DB::transaction(function () use ($companyId, $employeeId, $data, $userId) {
            $employee = Employee::where('company_id', $companyId)->findOrFail($employeeId);

            if (!empty($data['employee_number']) && $data['employee_number'] !== $employee->employee_number) {
                $exists = Employee::where('company_id', $companyId)
                    ->where('employee_number', $data['employee_number'])
                    ->where('id', '!=', $employee->id)
                    ->exists();
                if ($exists) {
                    throw new ConflictHttpException("Employee number '{$data['employee_number']}' already exists.");
                }
                $employee->employee_number = $data['employee_number'];
            }

            if (isset($data['department_id'])) {
                if ($data['department_id']) {
                    Department::where('company_id', $companyId)->findOrFail($data['department_id']);
                }
                $employee->department_id = $data['department_id'];
            }

            if (isset($data['designation_id'])) {
                if ($data['designation_id']) {
                    Designation::where('company_id', $companyId)->findOrFail($data['designation_id']);
                }
                $employee->designation_id = $data['designation_id'];
            }

            if (isset($data['first_name'])) $employee->first_name = $data['first_name'];
            if (isset($data['last_name'])) $employee->last_name = $data['last_name'];
            if (isset($data['email'])) $employee->email = $data['email'];
            if (isset($data['phone'])) $employee->phone = $data['phone'];
            if (isset($data['gender'])) $employee->gender = $data['gender'];
            if (isset($data['date_of_birth'])) $employee->date_of_birth = $data['date_of_birth'];
            if (isset($data['national_id'])) $employee->national_id = $data['national_id'];
            if (isset($data['address'])) $employee->address = $data['address'];
            if (isset($data['joining_date'])) $employee->joining_date = $data['joining_date'];
            if (isset($data['confirmation_date'])) $employee->confirmation_date = $data['confirmation_date'];
            if (isset($data['employment_type'])) $employee->employment_type = strtoupper($data['employment_type']);
            if (isset($data['employment_status'])) $employee->employment_status = strtoupper($data['employment_status']);
            if (isset($data['resignation_date'])) $employee->resignation_date = $data['resignation_date'];
            if (isset($data['termination_date'])) $employee->termination_date = $data['termination_date'];
            if (isset($data['bank_name'])) $employee->bank_name = $data['bank_name'];
            if (isset($data['bank_account_number'])) $employee->bank_account_number = $data['bank_account_number'];
            if (isset($data['bank_routing_number'])) $employee->bank_routing_number = $data['bank_routing_number'];
            if (isset($data['emergency_contact_name'])) $employee->emergency_contact_name = $data['emergency_contact_name'];
            if (isset($data['emergency_contact_phone'])) $employee->emergency_contact_phone = $data['emergency_contact_phone'];
            if (isset($data['notes'])) $employee->notes = $data['notes'];
            if (isset($data['branch_id'])) $employee->branch_id = $data['branch_id'];
            if (isset($data['business_unit_id'])) $employee->business_unit_id = $data['business_unit_id'];
            if (array_key_exists('user_id', $data)) $employee->user_id = $data['user_id'];

            $employee->updated_by = $userId;
            $employee->save();

            AuditLog::log($companyId, $userId, 'EMPLOYEE_UPDATED', $employee->id, 'Employee', "Updated employee {$employee->full_name} ({$employee->employee_number})");

            return $employee->load(['department', 'designation', 'branch', 'user']);
        });
    }

    public function deleteEmployee(int $companyId, int $employeeId, ?int $userId = null): bool
    {
        $employee = Employee::where('company_id', $companyId)->findOrFail($employeeId);
        $employee->delete();

        AuditLog::log($companyId, $userId, 'EMPLOYEE_DELETED', $employeeId, 'Employee', "Soft-deleted employee {$employee->full_name}");

        return true;
    }

    public function getEmployee360(int $companyId, int $employeeId): array
    {
        $employee = $this->getEmployee($companyId, $employeeId);

        $recentAttendance = $employee->attendances()->orderByDesc('attendance_date')->limit(10)->get();
        $recentLeaves = $employee->leaveApplications()->with('leaveType')->orderByDesc('from_date')->limit(5)->get();
        $recentPayrolls = $employee->payrollItems()->with('payrollRun.period')->orderByDesc('id')->limit(6)->get();
        $activeLoans = $employee->loans()->whereIn('status', ['APPROVED', 'DISBURSED', 'ACTIVE'])->get();
        $activeAdvances = $employee->advances()->whereIn('status', ['APPROVED', 'DISBURSED', 'PARTIALLY_SETTLED'])->get();

        return [
            'employee' => $employee,
            'salary_structure' => $employee->currentSalaryStructure,
            'leave_balances' => $employee->leaveBalances,
            'recent_attendance' => $recentAttendance,
            'recent_leaves' => $recentLeaves,
            'recent_payrolls' => $recentPayrolls,
            'loans' => $activeLoans,
            'advances' => $activeAdvances,
            'metrics' => [
                'active_loans_count' => $activeLoans->count(),
                'active_advances_count' => $activeAdvances->count(),
                'attendance_days_this_month' => $employee->attendances()
                    ->whereMonth('attendance_date', now()->month)
                    ->whereYear('attendance_date', now()->year)
                    ->count(),
            ],
        ];
    }
}
