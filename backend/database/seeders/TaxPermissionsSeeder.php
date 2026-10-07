<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class TaxPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'tax.view' => 'tax',
            'tax.manage' => 'tax',
            'tax.calculate' => 'tax',
            'tax.override' => 'tax',
            'tax.post' => 'tax',
            'tax.reconcile' => 'tax',
            'tax.adjust' => 'tax',
            'tax.close_period' => 'tax',
            'tax.settle' => 'tax',
            'reports.tax.view' => 'reports',
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

        $accountant = Role::where('name', 'Accountant')->first();
        if ($accountant) {
            $taxPermIds = Permission::whereIn('name', [
                'tax.view',
                'tax.calculate',
                'tax.post',
                'tax.reconcile',
                'tax.adjust',
                'tax.close_period',
                'tax.settle',
                'reports.tax.view',
            ])->pluck('id');
            $accountant->permissions()->syncWithoutDetaching($taxPermIds);
        }
    }
}
