<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Str;

class ReportPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'reports.dashboard',
            'reports.sales.view',
            'reports.sales_return.view',
            'reports.purchase.view',
            'reports.expense.view',
            'reports.inventory.view',
            'reports.stock_movement.view',
            'reports.customer.view',
            'reports.supplier.view'
        ];

        $superAdmin = Role::where('name', 'Super Admin')->first();
        $admin = Role::where('name', 'Admin')->first();
        $manager = Role::where('name', 'Manager')->first();

        foreach ($permissions as $perm) {
            $permission = Permission::firstOrCreate(['name' => $perm]);
            
            if ($superAdmin && !$superAdmin->permissions()->where('permission_id', $permission->id)->exists()) {
                $superAdmin->permissions()->attach($permission->id);
            }
            if ($admin && !$admin->permissions()->where('permission_id', $permission->id)->exists()) {
                $admin->permissions()->attach($permission->id);
            }
            if ($manager && !$manager->permissions()->where('permission_id', $permission->id)->exists()) {
                $manager->permissions()->attach($permission->id);
            }
        }
    }
}
