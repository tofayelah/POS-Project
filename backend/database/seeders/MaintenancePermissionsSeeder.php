<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class MaintenancePermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'maintenance.view' => 'maintenance',
            'maintenance.backup' => 'maintenance',
            'maintenance.reset' => 'maintenance',
            'maintenance.demo' => 'maintenance',
            'maintenance.demo_remove' => 'maintenance',
        ];

        foreach ($permissions as $name => $group) {
            Permission::firstOrCreate(
                ['name' => $name],
                ['group' => $group]
            );
        }

        // Super Admin gets all maintenance permissions
        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $superAdmin->permissions()->syncWithoutDetaching(
                Permission::whereIn('name', array_keys($permissions))->pluck('id')
            );
        }

        // Admin gets view, backup, and demo insertion
        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $adminPermissions = [
                'maintenance.view',
                'maintenance.backup',
                'maintenance.demo',
            ];
            $admin->permissions()->syncWithoutDetaching(
                Permission::whereIn('name', $adminPermissions)->pluck('id')
            );
        }

        // Manager gets view only
        $manager = Role::where('name', 'Manager')->first();
        if ($manager) {
            $managerPermissions = [
                'maintenance.view',
            ];
            $manager->permissions()->syncWithoutDetaching(
                Permission::whereIn('name', $managerPermissions)->pluck('id')
            );
        }
    }
}
