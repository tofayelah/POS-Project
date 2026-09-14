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
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'group' => 'inventory']);
        }

        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $allPermissions = Permission::all();
            $superAdmin->permissions()->syncWithoutDetaching($allPermissions->pluck('id'));
        }
    }
}
