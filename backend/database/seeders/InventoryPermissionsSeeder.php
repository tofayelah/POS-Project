<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class InventoryPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'inventory.view',
            'inventory.create',
            'inventory.update',
            'inventory.adjust',
            'inventory.transfer.view',
            'inventory.transfer.create',
            'inventory.transfer.approve',
            'inventory.transfer.ship',
            'inventory.transfer.receive',
            'inventory.movement.view',
            'inventory.valuation.view',
            'inventory.count.view',
            'inventory.count.create',
            'inventory.count.submit',
            'inventory.count.approve',
            'inventory.count.post',
            'inventory.reconciliation.view',
            'inventory.reconciliation.run',
            'inventory.batches.view',
            'inventory.batches.manage',
            'inventory.expiry.view',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm], ['group' => 'inventory']);
        }

        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $allPermissions = Permission::all();
            $superAdmin->permissions()->syncWithoutDetaching($allPermissions->pluck('id'));
        }

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $allPermissions = Permission::all();
            $admin->permissions()->syncWithoutDetaching($allPermissions->pluck('id'));
        }

        $manager = Role::where('name', 'Manager')->first();
        if ($manager) {
            $managerPerms = Permission::whereIn('name', [
                'inventory.view',
                'inventory.create',
                'inventory.update',
                'inventory.adjust',
                'inventory.transfer.view',
                'inventory.transfer.create',
                'inventory.transfer.approve',
                'inventory.transfer.ship',
                'inventory.transfer.receive',
                'inventory.movement.view',
                'inventory.valuation.view',
                'inventory.count.view',
                'inventory.count.create',
                'inventory.count.submit',
                'inventory.reconciliation.view',
                'inventory.batches.view',
                'inventory.batches.manage',
                'inventory.expiry.view',
            ])->pluck('id');
            $manager->permissions()->syncWithoutDetaching($managerPerms);
        }
    }
}
