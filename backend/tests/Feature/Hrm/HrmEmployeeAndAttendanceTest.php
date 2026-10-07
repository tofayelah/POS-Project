<?php

namespace Tests\Feature\Hrm;

use App\Models\Attendance;
use App\Models\AttendanceAdjustment;
use App\Models\Company;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\Role;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HrmEmployeeAndAttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->seed(\Database\Seeders\HrmPermissionsSeeder::class);

        $this->company = Company::factory()->create();

        $this->user = User::factory()->create();
        $this->user->companies()->attach($this->company->id);
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $this->user->roles()->attach($superAdminRole->id);
    }

    public function test_can_manage_departments_and_designations()
    {
        // 1. Create Department
        $deptResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/departments',
            [
                'name' => 'Retail Operations',
                'code' => 'OPS',
                'description' => 'Retail store operations and frontline staff',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $deptResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'OPS');

        $deptId = $deptResponse->json('data.id');

        // 2. Create Designation
        $desigResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/designations',
            [
                'name' => 'Store Cashier',
                'code' => 'CSH',
                'department_id' => $deptId,
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $desigResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'CSH');
    }

    public function test_can_create_and_retrieve_employee_360()
    {
        $dept = Department::create([
            'company_id' => $this->company->id,
            'name' => 'Operations',
            'code' => 'OPS',
        ]);

        $desig = Designation::create([
            'company_id' => $this->company->id,
            'department_id' => $dept->id,
            'name' => 'Cashier',
            'code' => 'CSH',
        ]);

        $createResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/employees',
            [
                'employee_number' => 'EMP-001',
                'first_name' => 'Kamal',
                'last_name' => 'Hossain',
                'email' => 'kamal@retailcore.local',
                'phone' => '01711223344',
                'national_id' => '1990123456789',
                'department_id' => $dept->id,
                'designation_id' => $desig->id,
                'joining_date' => '2026-01-01',
                'employment_status' => 'ACTIVE',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $createResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.employee_number', 'EMP-001');

        $empId = $createResponse->json('data.id');

        // Fetch Employee 360 Overview
        $showResponse = $this->actingAs($this->user)->getJson(
            "/api/v1/employees/{$empId}/360",
            ['X-Company-ID' => $this->company->id]
        );

        $showResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.employee.employee_number', 'EMP-001')
            ->assertJsonPath('data.metrics.active_loans_count', 0)
            ->assertJsonPath('data.metrics.attendance_days_this_month', 0);
    }

    public function test_shift_management_and_overnight_shift_support()
    {
        // Create an overnight shift (e.g., 22:00 to 06:00 next day)
        $shiftResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/shifts',
            [
                'name' => 'Night Shift',
                'code' => 'NS-01',
                'start_time' => '22:00:00',
                'end_time' => '06:00:00',
                'is_overnight' => true,
                'grace_minutes' => 15,
                'break_minutes' => 60,
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $shiftResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_overnight', true);
    }

    public function test_attendance_checkin_and_checkout_authoritative_calculations()
    {
        $dept = Department::create([
            'company_id' => $this->company->id,
            'name' => 'Operations',
            'code' => 'OPS',
        ]);
        $emp = Employee::create([
            'company_id' => $this->company->id,
            'employee_number' => 'EMP-002',
            'first_name' => 'Rahim',
            'last_name' => 'Uddin',
            'email' => 'rahim@retailcore.local',
            'department_id' => $dept->id,
            'joining_date' => '2026-01-01',
            'employment_status' => 'ACTIVE',
        ]);

        $shift = Shift::create([
            'company_id' => $this->company->id,
            'name' => 'Day Shift',
            'code' => 'DS-01',
            'start_time' => '09:00:00',
            'end_time' => '18:00:00',
            'is_overnight' => false,
            'grace_minutes' => 15,
            'break_minutes' => 60,
        ]);

        // Check-in at 09:30 (15 min after grace period of 09:15 => 30 minutes late from 09:00)
        $today = Carbon::today()->toDateString();
        $checkInResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/attendances/check-in',
            [
                'employee_id' => $emp->id,
                'shift_id' => $shift->id,
                'date' => $today,
                'check_in_time' => "{$today} 09:30:00",
                'ip_address' => '192.168.1.100',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $checkInResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'LATE')
            ->assertJsonPath('data.late_minutes', 30);

        // Check-out at 18:30 (30 min after 18:00 => overtime 30 min)
        $checkOutResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/attendances/check-out',
            [
                'employee_id' => $emp->id,
                'date' => $today,
                'check_out_time' => "{$today} 18:30:00",
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $checkOutResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.overtime_minutes', 30)
            ->assertJsonPath('data.worked_minutes', 480); // 9 hours elapsed - 60 min break = 480 min worked
    }

    public function test_attendance_adjustment_request_and_approval()
    {
        $dept = Department::create(['company_id' => $this->company->id, 'name' => 'Ops', 'code' => 'OPS']);
        $emp = Employee::create([
            'company_id' => $this->company->id,
            'employee_number' => 'EMP-003',
            'first_name' => 'Tareq',
            'email' => 'tareq@retailcore.local',
            'department_id' => $dept->id,
            'joining_date' => '2026-01-01',
            'employment_status' => 'ACTIVE',
        ]);

        $today = Carbon::today()->toDateString();
        $att = Attendance::create([
            'company_id' => $this->company->id,
            'employee_id' => $emp->id,
            'attendance_date' => $today,
            'status' => 'ABSENT',
        ]);

        // Request adjustment
        $adjResponse = $this->actingAs($this->user)->postJson(
            '/api/v1/attendances/adjust',
            [
                'attendance_id' => $att->id,
                'adjusted_check_in' => "{$today} 09:00:00",
                'adjusted_check_out' => "{$today} 18:00:00",
                'adjusted_status' => 'PRESENT',
                'reason' => 'Fingerprint biometric scanner glitch',
            ],
            ['X-Company-ID' => $this->company->id]
        );

        $adjResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'APPROVED');

        $adjId = $adjResponse->json('data.id');

        // Approve adjustment
        $approveResponse = $this->actingAs($this->user)->postJson(
            "/api/v1/attendance-adjustments/{$adjId}/approve",
            [],
            ['X-Company-ID' => $this->company->id]
        );

        $approveResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'APPROVED');

        // Assert attendance was updated
        $att->refresh();
        $this->assertEquals('PRESENT', $att->status);
    }
}
