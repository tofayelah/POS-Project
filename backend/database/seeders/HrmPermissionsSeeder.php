<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class HrmPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'hr.view' => 'hrm',
            'hr.create' => 'hrm',
            'hr.update' => 'hrm',
            'hr.delete' => 'hrm',
            'employees.view' => 'hrm',
            'employees.create' => 'hrm',
            'employees.update' => 'hrm',
            'employees.delete' => 'hrm',
            'departments.view' => 'hrm',
            'departments.manage' => 'hrm',
            'designations.view' => 'hrm',
            'designations.manage' => 'hrm',
            'attendance.view' => 'hrm',
            'attendance.manage' => 'hrm',
            'leave.view' => 'hrm',
            'leave.create' => 'hrm',
            'leave.approve' => 'hrm',
            'leave.reject' => 'hrm',
            'shift.view' => 'hrm',
            'shift.manage' => 'hrm',
            'payroll.view' => 'payroll',
            'payroll.create' => 'payroll',
            'payroll.calculate' => 'payroll',
            'payroll.approve' => 'payroll',
            'payroll.post' => 'payroll',
            'payroll.pay' => 'payroll',
            'employee_loans.view' => 'hrm',
            'employee_loans.create' => 'hrm',
            'employee_loans.approve' => 'hrm',
            'employee_loans.manage' => 'hrm',
            'reports.hr.view' => 'reports',
            'reports.payroll.view' => 'reports',
        ];

        foreach ($permissions as $name => $group) {
            Permission::firstOrCreate(['name' => $name], ['group' => $group]);
        }

        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $superAdmin->permissions()->syncWithoutDetaching(Permission::pluck('id'));
        }

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $admin->permissions()->syncWithoutDetaching(Permission::pluck('id'));
        }

        $manager = Role::where('name', 'Manager')->first();
        if ($manager) {
            $managerPerms = Permission::whereIn('name', array_keys($permissions))->pluck('id');
            $manager->permissions()->syncWithoutDetaching($managerPerms);
        }
    }
}
