<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class DataResetService
{
    /**
     * Dependency-aware list of transactional operational tables (Child-first, Parent-last).
     */
    protected const TRANSACTIONAL_TABLES = [
        // E-commerce interactions & carts
        'wishlists',
        'product_reviews',
        'ecommerce_cart_items',
        'ecommerce_carts',

        // Sales Returns & Payments
        'sales_return_payments',
        'sales_return_items',
        'sales_returns',

        // Sales & POS Details
        'online_payment_transactions',
        'coupon_usages',
        'customer_point_ledgers',
        'customer_credit_overrides',
        'shipment_items',
        'shipments',
        'sale_payments',
        'sale_items',
        'sales',

        // POS Cash & Sessions
        'pos_cash_movements',
        'pos_sessions',

        // Purchases & Procurement
        'purchase_items',
        'purchases',
        'goods_receipt_items',
        'goods_receipts',
        'purchase_order_items',
        'purchase_orders',
        'purchase_requisition_items',
        'purchase_requisitions',
        'rfq_invited_suppliers',
        'rfq_items',
        'rfqs',
        'supplier_quotation_items',
        'supplier_quotations',

        // Inventory Movements, Counts & Reservations
        'inventory_reservations',
        'stock_count_items',
        'stock_counts',
        'stock_transfer_items',
        'stock_transfers',
        'stock_movements',

        // Expenses
        'expense_payments',
        'expense_items',
        'expenses',

        // CRM Transactional Activities & Ledgers
        'customer_opportunities',
        'customer_ledgers',
        'supplier_ledgers',
        'store_credit_transactions',

        // Payroll & HR Operational Runs
        'payroll_items',
        'payroll_runs',
        'leave_applications',
        'employee_advance_repayments',
        'employee_advances',
        'employee_loan_repayments',
        'employee_loans',

        // Tax Transactions
        'tax_adjustments',
        'tax_reconciliations',
        'tax_transaction_components',
        'tax_transactions',
        'transaction_taxes',

        // Payments & Allocations
        'payment_allocations',
        'payments',

        // Accounting Operational Entries
        'asset_depreciation_entries',
        'asset_disposals',
        'year_end_closings',
        'journal_entry_lines',
        'journal_entries',
    ];

    public function __construct(
        protected DatabaseBackupService $backupService
    ) {}

    /**
     * Preview record counts of operational data without mutating state.
     */
    public function previewReset(?int $companyId = null, ?User $user = null): array
    {
        $breakdown = [];
        $totalTransactionalRecords = 0;

        foreach (self::TRANSACTIONAL_TABLES as $table) {
            if (Schema::hasTable($table)) {
                $query = DB::table($table);
                if ($companyId && Schema::hasColumn($table, 'company_id')) {
                    $query->where('company_id', $companyId);
                }
                $count = $query->count();
                $breakdown[$table] = $count;
                $totalTransactionalRecords += $count;
            }
        }

        // Master records preserved
        $preserved = $this->getPreservedCounts($companyId);

        AuditLog::log($user, $companyId, 'DATA_RESET_PREVIEWED', null, null, [
            'total_transactional_records' => $totalTransactionalRecords,
            'tables_evaluated' => count($breakdown),
        ]);

        return [
            'mode' => 'TRANSACTIONAL_DATA',
            'total_records_to_remove' => $totalTransactionalRecords,
            'breakdown' => $breakdown,
            'preserved' => $preserved,
            'environment' => config('app.env', 'production'),
            'safety_backup_required' => true,
        ];
    }

    /**
     * Execute multi-layered, authoritative data reset with mandatory safety backup.
     */
    public function executeReset(
        User $user,
        ?int $companyId = null,
        string $mode = 'TRANSACTIONAL_DATA',
        ?string $confirmationText = null,
        ?string $password = null
    ): array {
        $startTime = microtime(true);
        $operationId = (string) Str::uuid();

        // 1. Authorize: Super Admin role strictly required
        if (!$user->hasRole('Super Admin')) {
            throw new AccessDeniedHttpException('Data Reset is a destructive operation requiring Super Admin privileges.');
        }

        // 2. Environment Protection Policy
        $isProduction = app()->environment('production') || config('app.env') === 'production';
        $allowDestructive = config('maintenance.allow_destructive_reset', false);
        if ($isProduction && !$allowDestructive) {
            throw new AccessDeniedHttpException('Destructive data reset is strictly prohibited in production environments.');
        }

        // 3. Multi-Step Confirmation Validation
        if (trim((string) $confirmationText) !== 'RESET RETAILCORE') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'confirmation_text' => ["Confirmation string mismatch. You must type 'RESET RETAILCORE'."],
            ]);
        }

        if ($password !== null && !Hash::check($password, $user->password)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'password' => ['Security verification failed. Invalid password.'],
            ]);
        }

        AuditLog::log($user, $companyId, 'DATA_RESET_STARTED', null, null, [
            'operation_id' => $operationId,
            'mode' => $mode,
            'user' => $user->email,
        ]);

        // 4. Mandatory Automatic Database Backup Before Reset
        Log::info("Data Reset: Initiating safety database backup for operation {$operationId}");
        try {
            $backup = $this->backupService->createBackup(
                $user,
                $companyId,
                "Pre-Reset Safety Backup (Operation: {$operationId})"
            );

            if (!$backup || $backup->status !== 'COMPLETED') {
                throw new \RuntimeException('Database backup status is not COMPLETED.');
            }
        } catch (\Throwable $e) {
            AuditLog::log($user, $companyId, 'DATA_RESET_FAILED', null, null, [
                'operation_id' => $operationId,
                'reason' => 'Pre-reset safety backup failed',
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException("Safety backup creation failed. Data reset aborted to prevent unrecoverable data loss: {$e->getMessage()}", 0, $e);
        }

        // 5. Execute Dependency-Aware Deletion
        $deletedCounts = [];
        $totalDeleted = 0;

        try {
            DB::beginTransaction();

            foreach (self::TRANSACTIONAL_TABLES as $table) {
                if (Schema::hasTable($table)) {
                    $query = DB::table($table);
                    if ($companyId && Schema::hasColumn($table, 'company_id')) {
                        $query->where('company_id', $companyId);
                    }
                    $count = $query->count();
                    if ($count > 0) {
                        $query->delete();
                    }
                    $deletedCounts[$table] = $count;
                    $totalDeleted += $count;
                }
            }

            // Reset stock quantities to 0 without deleting products or locations
            if (Schema::hasTable('inventories')) {
                $invQuery = DB::table('inventories');
                if ($companyId && Schema::hasColumn('inventories', 'company_id')) {
                    $invQuery->where('company_id', $companyId);
                }
                $invUpdates = ['quantity' => 0];
                if (Schema::hasColumn('inventories', 'reserved_quantity')) {
                    $invUpdates['reserved_quantity'] = 0;
                }
                if (Schema::hasColumn('inventories', 'available_quantity')) {
                    $invUpdates['available_quantity'] = 0;
                }
                if (Schema::hasColumn('inventories', 'total_value')) {
                    $invUpdates['total_value'] = 0;
                }
                $invQuery->update($invUpdates);
            }

            if (Schema::hasTable('store_credit_accounts')) {
                $scQuery = DB::table('store_credit_accounts');
                if ($companyId && Schema::hasColumn('store_credit_accounts', 'company_id')) {
                    $scQuery->where('company_id', $companyId);
                }
                $scUpdates = [];
                if (Schema::hasColumn('store_credit_accounts', 'current_balance')) {
                    $scUpdates['current_balance'] = 0;
                }
                if (Schema::hasColumn('store_credit_accounts', 'balance')) {
                    $scUpdates['balance'] = 0;
                }
                if (Schema::hasColumn('store_credit_accounts', 'points_balance')) {
                    $scUpdates['points_balance'] = 0;
                }
                if (!empty($scUpdates)) {
                    $scQuery->update($scUpdates);
                }
            }

            // Remove demo record tracking if transactional reset cleared everything
            if (Schema::hasTable('system_demo_records')) {
                $demoQuery = DB::table('system_demo_records');
                if ($companyId) {
                    $demoQuery->where('company_id', $companyId);
                }
                $demoQuery->delete();
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            AuditLog::log($user, $companyId, 'DATA_RESET_FAILED', null, null, [
                'operation_id' => $operationId,
                'backup_id' => $backup->id,
                'error' => $e->getMessage(),
            ]);

            throw new \RuntimeException("Data reset execution failed and was rolled back: {$e->getMessage()}", 0, $e);
        }

        // 6. Post-Reset System Integrity Verification
        $integrity = $this->verifySystemIntegrity($user);

        $duration = round(microtime(true) - $startTime, 2);
        $preservedCounts = $this->getPreservedCounts($companyId);

        AuditLog::log($user, $companyId, 'DATA_RESET_COMPLETED', null, null, [
            'operation_id' => $operationId,
            'backup_id' => $backup->id,
            'total_deleted' => $totalDeleted,
            'duration_seconds' => $duration,
            'integrity' => $integrity['status'],
        ]);

        return [
            'operation_id' => $operationId,
            'backup_id' => $backup->id,
            'backup_filename' => $backup->filename,
            'mode' => $mode,
            'total_deleted' => $totalDeleted,
            'deleted_counts' => $deletedCounts,
            'preserved' => $preservedCounts,
            'duration_seconds' => $duration,
            'status' => 'COMPLETED',
            'integrity_check' => $integrity,
            'safety_backup' => [
                'id' => $backup->id,
                'filename' => $backup->filename,
                'status' => $backup->status,
            ],
            'post_reset_integrity' => [
                'passed' => $integrity['status'] === 'PASSED',
                'status' => $integrity['status'],
                'details' => $integrity['details'],
                'active_companies' => \App\Models\Company::count(),
                'active_users' => \App\Models\User::count(),
                'active_roles' => \App\Models\Role::count(),
                'active_permissions' => \App\Models\Permission::count(),
                'transactional_sales_count' => \Illuminate\Support\Facades\Schema::hasTable('sales') ? \Illuminate\Support\Facades\DB::table('sales')->count() : 0,
                'transactional_purchases_count' => \Illuminate\Support\Facades\Schema::hasTable('purchases') ? \Illuminate\Support\Facades\DB::table('purchases')->count() : 0,
                'transactional_stock_movements_count' => \Illuminate\Support\Facades\Schema::hasTable('stock_movements') ? \Illuminate\Support\Facades\DB::table('stock_movements')->count() : 0,
            ],
        ];
    }

    /**
     * Verify database integrity following a reset operation.
     */
    public function verifySystemIntegrity(User $user): array
    {
        $checks = [];

        try {
            DB::connection()->getPdo();
            $checks['database_connectivity'] = 'PASSED';
        } catch (\Throwable) {
            $checks['database_connectivity'] = 'FAILED';
        }

        $superAdminExists = User::whereHas('roles', fn($q) => $q->where('name', 'Super Admin'))->exists();
        $checks['super_admin_account'] = $superAdminExists ? 'PASSED' : 'FAILED';

        $checks['companies_master'] = Company::count() > 0 ? 'PASSED' : 'WARNING_EMPTY';
        $checks['system_settings'] = Setting::count() > 0 ? 'PASSED' : 'WARNING_EMPTY';
        $checks['audit_trail'] = AuditLog::count() > 0 ? 'PASSED' : 'WARNING_EMPTY';

        if (Schema::hasTable('accounts')) {
            $checks['chart_of_accounts'] = DB::table('accounts')->exists() ? 'PASSED' : 'EMPTY';
        }
        if (Schema::hasTable('products')) {
            $checks['products_master'] = DB::table('products')->exists() ? 'PASSED' : 'EMPTY';
        }
        if (Schema::hasTable('taxes')) {
            $checks['tax_configuration'] = DB::table('taxes')->exists() ? 'PASSED' : 'EMPTY';
        }

        $allPassed = !in_array('FAILED', $checks, true);

        return [
            'status' => $allPassed ? 'PASSED' : 'NEEDS_ATTENTION',
            'details' => $checks,
        ];
    }

    /**
     * Gather preserved master records summary.
     */
    protected function getPreservedCounts(?int $companyId = null): array
    {
        $preserved = [];

        $tables = [
            'users' => 'Users',
            'roles' => 'Roles & RBAC',
            'permissions' => 'Permissions',
            'companies' => 'Companies',
            'branches' => 'Branches',
            'warehouses' => 'Warehouses',
            'storage_locations' => 'Storage Locations',
            'categories' => 'Product Categories',
            'brands' => 'Brands',
            'products' => 'Products Master',
            'product_variants' => 'Product Variants',
            'customers' => 'Customer Master',
            'suppliers' => 'Supplier Master',
            'accounts' => 'Chart of Accounts',
            'taxes' => 'Tax Engine Profiles',
            'settings' => 'System Settings',
            'audit_logs' => 'Audit Logs (Immutable)',
        ];

        foreach ($tables as $table => $label) {
            if (Schema::hasTable($table)) {
                $query = DB::table($table);
                if ($companyId && Schema::hasColumn($table, 'company_id')) {
                    $query->where('company_id', $companyId);
                }
                $preserved[$label] = $query->count();
            }
        }

        return $preserved;
    }
}
