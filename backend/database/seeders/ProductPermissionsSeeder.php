<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class ProductPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'products.view',
            'products.create',
            'products.update',
            'products.delete',
            'products.activate',
            'products.deactivate',
            'categories.view',
            'categories.create',
            'categories.update',
            'categories.delete',
            'brands.view',
            'brands.create',
            'brands.update',
            'brands.delete',
            'units.view',
            'units.create',
            'units.update',
            'units.delete',
            'attributes.view',
            'attributes.create',
            'attributes.update',
            'attributes.delete',
            'product_variants.view',
            'product_variants.update',
            'product_variants.activate',
            'product_variants.deactivate',
            'barcodes.view',
            'barcodes.create',
            'barcodes.update',
            'barcodes.delete',
            'pos.view',
            'pos.open_session',
            'pos.close_session',
            'pos.hold',
            'sales.view',
            'sales.complete',
            'sales_return.view',
            'sales_return.create',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(
                ['name' => $perm],
                ['group' => 'catalog']
            );
        }

        $allPerms = Permission::all();
        $roles = Role::all();

        foreach ($roles as $role) {
            $role->permissions()->syncWithoutDetaching($allPerms->pluck('id'));
        }
    }
}
