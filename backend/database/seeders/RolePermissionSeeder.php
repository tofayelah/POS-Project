<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Manager']);
        Role::firstOrCreate(['name' => 'Cashier']);

        $permissions = [
            'storage_locations.view' => 'organization',
            'storage_locations.create' => 'organization',
            'storage_locations.update' => 'organization',
            'storage_locations.delete' => 'organization',
            'roles.view' => 'roles',
            'roles.create' => 'roles',
            'roles.update' => 'roles',
            'roles.delete' => 'roles',
            'permissions.view' => 'roles',
            'users.view' => 'users',
            'users.create' => 'users',
            'users.update' => 'users',
            'users.delete' => 'users',
            'users.company_access' => 'users',
            'audit_logs.view' => 'audit',
            'audit.view' => 'audit',
            'loyalty.view' => 'loyalty',
            'loyalty.manage' => 'loyalty',
            'loyalty.adjust' => 'loyalty',
            'loyalty.redeem' => 'loyalty',
            'store_credit.view' => 'store_credit',
            'store_credit.issue' => 'store_credit',
            'store_credit.redeem' => 'store_credit',
            'store_credit.adjust' => 'store_credit',
            'pos.view' => 'pos',
            'pos.open_session' => 'pos',
            'pos.close_session' => 'pos',
            'pos_shifts.view' => 'pos',
            'pos_shifts.open' => 'pos',
            'pos_shifts.close' => 'pos',
            'pos_shifts.cash_in' => 'pos',
            'pos_shifts.cash_out' => 'pos',
            'pos_shifts.reconcile' => 'pos',
            'pos_shifts.approve_variance' => 'pos',
            'receipts.view' => 'pos',
            'receipts.print' => 'pos',
            'receipts.reprint' => 'pos',
            'inventory.count.view' => 'inventory',
            'inventory.count.create' => 'inventory',
            'inventory.count.submit' => 'inventory',
            'inventory.count.approve' => 'inventory',
            'inventory.count.post' => 'inventory',
            'inventory.reconciliation.view' => 'inventory',
            'inventory.reconciliation.run' => 'inventory',
            'inventory.batches.view' => 'inventory',
            'inventory.batches.manage' => 'inventory',
            'inventory.expiry.view' => 'inventory',
            'inventory.valuation.view' => 'inventory',
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
            $managerPerms = Permission::whereIn('name', [
                'loyalty.view', 'loyalty.manage', 'loyalty.adjust', 'loyalty.redeem',
                'store_credit.view', 'store_credit.issue', 'store_credit.redeem', 'store_credit.adjust',
                'pos.view', 'pos.open_session', 'pos.close_session',
                'pos_shifts.view', 'pos_shifts.open', 'pos_shifts.close',
                'pos_shifts.cash_in', 'pos_shifts.cash_out', 'pos_shifts.reconcile',
                'pos_shifts.approve_variance',
                'receipts.view', 'receipts.print', 'receipts.reprint'
            ])->pluck('id');
            $manager->permissions()->syncWithoutDetaching($managerPerms);
        }

        $cashier = Role::where('name', 'Cashier')->first();
        if ($cashier) {
            $cashierPerms = Permission::whereIn('name', [
                'loyalty.view', 'loyalty.redeem',
                'store_credit.view', 'store_credit.redeem',
                'pos.view', 'pos.open_session', 'pos.close_session',
                'pos_shifts.view', 'pos_shifts.open', 'pos_shifts.close',
                'pos_shifts.cash_in', 'pos_shifts.cash_out', 'pos_shifts.reconcile',
                'receipts.view', 'receipts.print', 'receipts.reprint'
            ])->pluck('id');
            $cashier->permissions()->syncWithoutDetaching($cashierPerms);
        }
    }
}
