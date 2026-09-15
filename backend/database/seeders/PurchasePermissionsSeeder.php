<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Str;

class PurchasePermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'suppliers.view',
            'suppliers.create',
            'suppliers.update',
            'suppliers.delete',
            'suppliers.activate',
            'suppliers.deactivate',
            'purchases.view',
            'purchases.create',
            'purchases.update',
            'purchases.delete',
            'purchase_orders.view',
            'purchase_orders.create',
            'purchase_orders.update',
            'purchase_orders.submit',
            'purchase_orders.approve',
            'purchase_orders.cancel',
            'goods_receipts.view',
            'goods_receipts.create',
            'goods_receipts.update',
            'goods_receipts.post',
            'goods_receipts.cancel',
            'supplier_ledger.view',
            'supplier_ledger.create_adjustment',
        ];

        $superAdmin = Role::where('name', 'Super Admin')->first();
        
        foreach ($permissions as $perm) {
            $permission = Permission::firstOrCreate(['name' => $perm]);
            
            if ($superAdmin && !$superAdmin->permissions()->where('permission_id', $permission->id)->exists()) {
                $superAdmin->permissions()->attach($permission->id);
            }
        }
    }
}
