<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class ProcurementPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'procurement.requisitions.view' => 'procurement',
            'procurement.requisitions.create' => 'procurement',
            'procurement.requisitions.review' => 'procurement',
            'procurement.requisitions.approve' => 'procurement',
            'procurement.requisitions.convert' => 'procurement',
            'procurement.rfq.view' => 'procurement',
            'procurement.rfq.create' => 'procurement',
            'procurement.rfq.evaluate' => 'procurement',
            'procurement.rfq.award' => 'procurement',
            'procurement.suppliers.qualify' => 'procurement',
            'procurement.suppliers.performance' => 'procurement',
            'procurement.contracts.view' => 'procurement',
            'procurement.contracts.manage' => 'procurement',
            'procurement.matching.view' => 'procurement',
            'procurement.planning.view' => 'procurement',
            'procurement.dashboard.view' => 'procurement',
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
