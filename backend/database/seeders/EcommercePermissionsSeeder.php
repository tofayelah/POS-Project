<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class EcommercePermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'ecommerce.view' => 'ecommerce',
            'ecommerce.manage' => 'ecommerce',
            'ecommerce.catalog.view' => 'ecommerce',
            'ecommerce.catalog.manage' => 'ecommerce',
            'ecommerce.orders.view' => 'ecommerce',
            'ecommerce.orders.manage' => 'ecommerce',
            'ecommerce.fulfillment.view' => 'ecommerce',
            'ecommerce.fulfillment.manage' => 'ecommerce',
            'ecommerce.returns.view' => 'ecommerce',
            'ecommerce.returns.manage' => 'ecommerce',
            'ecommerce.refunds.manage' => 'ecommerce',
            'ecommerce.shipping.manage' => 'ecommerce',
            'ecommerce.coupons.manage' => 'ecommerce',
            'ecommerce.promotions.manage' => 'ecommerce',
            'ecommerce.reviews.manage' => 'ecommerce',
            'ecommerce.settings.manage' => 'ecommerce',
            'ecommerce.reports.view' => 'reports',
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

        $manager = Role::where('name', 'Store Manager')->first();
        if ($manager) {
            $managerPermIds = Permission::whereIn('name', [
                'ecommerce.view',
                'ecommerce.catalog.view',
                'ecommerce.catalog.manage',
                'ecommerce.orders.view',
                'ecommerce.orders.manage',
                'ecommerce.fulfillment.view',
                'ecommerce.fulfillment.manage',
                'ecommerce.returns.view',
                'ecommerce.coupons.manage',
                'ecommerce.reports.view',
            ])->pluck('id');
            $manager->permissions()->syncWithoutDetaching($managerPermIds);
        }
    }
}
