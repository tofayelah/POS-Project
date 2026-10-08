<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class SettingsPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'settings.view' => 'settings',
            'settings.update' => 'settings',
            'settings.general' => 'settings',
            'settings.company' => 'settings',
            'settings.security' => 'settings',
            'settings.pos' => 'settings',
            'settings.sales' => 'settings',
            'settings.purchase' => 'settings',
            'settings.inventory' => 'settings',
            'settings.accounting' => 'settings',
            'settings.vat' => 'settings',
            'settings.payments' => 'settings',
            'settings.crm' => 'settings',
            'settings.hr' => 'settings',
            'settings.ecommerce' => 'settings',
            'settings.notifications' => 'settings',
            'settings.numbering' => 'settings',
            'settings.bi' => 'settings',
            'settings.maintenance' => 'settings',
            'settings.localization' => 'settings',
            'settings.audit' => 'settings',
        ];

        foreach ($permissions as $name => $group) {
            Permission::firstOrCreate(
                ['name' => $name],
                ['group' => $group]
            );
        }

        // Attach to Super Admin and Admin
        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $superAdmin->permissions()->syncWithoutDetaching(
                Permission::whereIn('name', array_keys($permissions))->pluck('id')
            );
        }

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $admin->permissions()->syncWithoutDetaching(
                Permission::whereIn('name', array_keys($permissions))->pluck('id')
            );
        }

        // Manager gets operational settings permissions
        $manager = Role::where('name', 'Manager')->first();
        if ($manager) {
            $managerPermissions = [
                'settings.view',
                'settings.general',
                'settings.pos',
                'settings.sales',
                'settings.inventory',
                'settings.crm',
                'settings.bi',
            ];
            $manager->permissions()->syncWithoutDetaching(
                Permission::whereIn('name', $managerPermissions)->pluck('id')
            );
        }
    }
}
