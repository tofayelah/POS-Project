<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id',
        'business_unit_id',
        'branch_id',
        'department_id',
        'designation_id',
        'user_id',
        'employee_number',
        'first_name',
        'last_name',
        'email',
        'phone',
        'gender',
        'date_of_birth',
        'national_id',
        'address',
        'joining_date',
        'confirmation_date',
        'employment_type',
        'employment_status',
        'resignation_date',
        'termination_date',
        'bank_name',
        'bank_account_number',
        'bank_routing_number',
        'emergency_contact_name',
        'emergency_contact_phone',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'joining_date' => 'date',
        'confirmation_date' => 'date',
        'resignation_date' => 'date',
        'termination_date' => 'date',
    ];

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function businessUnit()
    {
        return $this->belongsTo(BusinessUnit::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function designation()
    {
        return $this->belongsTo(Designation::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function shiftAssignments()
    {
        return $this->hasMany(ShiftAssignment::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function leaveApplications()
    {
        return $this->hasMany(LeaveApplication::class);
    }

    public function salaryStructures()
    {
        return $this->hasMany(SalaryStructure::class);
    }

    public function currentSalaryStructure()
    {
        return $this->hasOne(SalaryStructure::class)->where('status', 'ACTIVE')->latest('effective_from');
    }

    public function payrollItems()
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function advances()
    {
        return $this->hasMany(EmployeeAdvance::class);
    }

    public function loans()
    {
        return $this->hasMany(EmployeeLoan::class);
    }
}
