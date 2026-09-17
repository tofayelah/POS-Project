<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            ProductMasterSeeder::class,
            PurchasePermissionsSeeder::class,
            CustomerPermissionsSeeder::class,
            InventoryPermissionsSeeder::class,
            AccountingPermissionSeeder::class,
            ReportPermissionsSeeder::class,
        ]);
        
        $user = \App\Models\User::firstOrCreate(
            ['email' => 'admin@retailcore.test'],
            [
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'name' => 'Super Admin',
                'password' => 'password123',
                'status' => 'active',
            ]
        );
        $role = \App\Models\Role::where('name', 'Super Admin')->first();
        if ($role && !$user->roles()->where('role_id', $role->id)->exists()) {
            $user->roles()->attach($role->id);
        }
    }
}
