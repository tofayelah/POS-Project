<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class CustomerCrmPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'customers.credit_manage' => 'customers',
            'customers.credit_approve' => 'customers',
            'customers.credit_override' => 'customers',
            'crm.view' => 'crm',
            'crm.manage' => 'crm',
            'customer_intelligence.view' => 'customer_intelligence',
            'customer_intelligence.manage' => 'customer_intelligence',
            'sales_intelligence.view' => 'sales_intelligence',
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
