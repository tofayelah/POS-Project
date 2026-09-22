<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class OrganizationPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'storage_locations.view',
            'storage_locations.create',
            'storage_locations.update',
            'storage_locations.delete',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(
                ['name' => $perm],
                ['group' => 'organization']
            );
        }

        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $allPermissions = Permission::all();
            $superAdmin->permissions()->syncWithoutDetaching($allPermissions->pluck('id'));
        }

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $orgPermissions = Permission::whereIn('name', $permissions)->pluck('id');
            $admin->permissions()->syncWithoutDetaching($orgPermissions);
        }
    }
}
