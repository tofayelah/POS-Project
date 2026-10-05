<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Manager']);
        Role::firstOrCreate(['name' => 'Cashier']);

        $permissions = [
            'storage_locations.view' => 'organization',
            'storage_locations.create' => 'organization',
            'storage_locations.update' => 'organization',
            'storage_locations.delete' => 'organization',
            'roles.view' => 'roles',
            'roles.create' => 'roles',
            'roles.update' => 'roles',
            'roles.delete' => 'roles',
            'permissions.view' => 'roles',
            'users.view' => 'users',
            'users.create' => 'users',
            'users.update' => 'users',
            'users.delete' => 'users',
            'users.company_access' => 'users',
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
    }
}
