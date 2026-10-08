<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class BiPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'bi.view' => 'bi',
            'bi.dashboard' => 'bi',
            'bi.sales' => 'bi',
            'bi.profitability' => 'bi',
            'bi.inventory' => 'bi',
            'bi.procurement' => 'bi',
            'bi.customer' => 'bi',
            'bi.supplier' => 'bi',
            'bi.finance' => 'bi',
            'bi.vat' => 'bi',
            'bi.hr' => 'bi',
            'bi.pos' => 'bi',
            'bi.ecommerce' => 'bi',
            'bi.branch' => 'bi',
            'bi.product' => 'bi',
            'bi.report_builder' => 'bi',
            'bi.saved_reports' => 'bi',
            'bi.export' => 'bi',
            'bi.alerts' => 'bi',
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
            $managerPerms = Permission::where('group', 'bi')->pluck('id');
            $manager->permissions()->syncWithoutDetaching($managerPerms);
        }

        $accountant = Role::where('name', 'Accountant')->first();
        if ($accountant) {
            $accPerms = Permission::whereIn('name', [
                'bi.view', 'bi.dashboard', 'bi.finance', 'bi.vat', 'bi.profitability', 'bi.saved_reports', 'bi.export'
            ])->pluck('id');
            $accountant->permissions()->syncWithoutDetaching($accPerms);
        }
    }
}
