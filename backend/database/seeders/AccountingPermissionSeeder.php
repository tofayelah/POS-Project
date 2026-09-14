<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;

class AccountingPermissionSeeder extends Seeder
{
    public function run()
    {
        $permissions = [
            'account_group.view',
            'account_group.create',
            
            'account.view',
            'account.create',
            'account.activate',
            'account.deactivate',
            
            'fiscal_year.view',
            'fiscal_year.create',
            'fiscal_year.close',
            
            'accounting_period.view',
            'accounting_period.create',
            'accounting_period.lock',
            'accounting_period.unlock',
            'accounting_period.close',
            
            'journal.view',
            'journal.create',
            'journal.post',
            'journal.cancel',
            'journal.reverse',
            
            'general_ledger.view',
            'trial_balance.view',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }
    }
}
