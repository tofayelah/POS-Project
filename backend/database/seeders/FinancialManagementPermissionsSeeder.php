<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class FinancialManagementPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'financial_management.view' => 'finance',
            'financial_management.manage' => 'finance',
            'budgets.view' => 'finance',
            'budgets.manage' => 'finance',
            'budgets.approve' => 'finance',
            'bank_accounts.view' => 'finance',
            'bank_accounts.manage' => 'finance',
            'bank_reconciliation.view' => 'finance',
            'bank_reconciliation.manage' => 'finance',
            'financial_periods.view' => 'finance',
            'financial_periods.manage' => 'finance',
            'financial_periods.reopen' => 'finance',
            'cost_centres.view' => 'finance',
            'cost_centres.manage' => 'finance',
            'profit_centres.view' => 'finance',
            'profit_centres.manage' => 'finance',
            'fixed_assets.view' => 'finance',
            'fixed_assets.manage' => 'finance',
            'fixed_assets.depreciation' => 'finance',
            'fixed_assets.dispose' => 'finance',
            'year_end.view' => 'finance',
            'year_end.close' => 'finance',
            'financial_reports.view' => 'finance',
            'cash_forecast.view' => 'finance',
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
            $accountantPerms = Permission::where('group', 'finance')->pluck('id');
            $accountant->permissions()->syncWithoutDetaching($accountantPerms);
        }
    }
}
