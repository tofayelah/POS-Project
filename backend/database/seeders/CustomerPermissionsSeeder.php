<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;
use App\Models\Role;

class CustomerPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'customers.view',
            'customers.create',
            'customers.update',
            'customers.delete',
            'customers.activate',
            'customers.deactivate',
            'customer_groups.view',
            'customer_groups.create',
            'customer_groups.update',
            'customer_groups.delete',
            'customer_ledger.view',
            'customer_ledger.create_adjustment',
            'customer_ledger.create_opening_balance',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $superAdmin->permissions()->syncWithoutDetaching(\App\Models\Permission::whereIn('name', $permissions)->pluck('id'));
        }

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $admin->permissions()->syncWithoutDetaching(\App\Models\Permission::whereIn('name', $permissions)->pluck('id'));
        }
    }
}
