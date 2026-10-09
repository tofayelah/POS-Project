<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\SystemDemoRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class DemoDataService
{
    /**
     * Preview expected demo dataset counts.
     */
    public function previewDemo(string $size = 'small', ?int $companyId = null, ?User $user = null): array
    {
        $isMedium = strtolower($size) === 'medium';

        $counts = [
            'branches' => $isMedium ? 3 : 2,
            'warehouses' => $isMedium ? 3 : 2,
            'categories' => 3,
            'products' => $isMedium ? 100 : 20,
            'customers' => $isMedium ? 50 : 10,
            'suppliers' => $isMedium ? 10 : 5,
            'purchases' => $isMedium ? 200 : 20,
            'sales' => $isMedium ? 500 : 50,
        ];

        $demoQuery = SystemDemoRecord::query();
        if ($companyId) {
            $demoQuery->where('company_id', $companyId);
        }
        $existingCount = $demoQuery->count();

        AuditLog::log($user, $companyId, 'DEMO_DATA_PREVIEWED', null, null, [
            'size' => $size,
            'planned_records' => $counts,
            'existing_demo_records' => $existingCount,
        ]);

        return [
            'size' => $size,
            'expected_counts' => $counts,
            'is_demo_present' => $existingCount > 0,
            'existing_demo_count' => $existingCount,
            'currency' => 'BDT',
            'business_profile' => 'Apex Retail Demo Ltd. (Bangladesh Retail POS/ERP)',
        ];
    }

    /**
     * Check if demo data currently exists.
     */
    public function hasDemoData(?int $companyId = null): array
    {
        $query = SystemDemoRecord::query();
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $exists = $query->exists();
        $count = $query->count();
        $latestBatch = $query->latest('id')->value('batch_id');

        return [
            'has_demo' => $exists,
            'total_records' => $count,
            'latest_batch' => $latestBatch,
        ];
    }

    /**
     * Insert realistic Bangladesh retail demo dataset.
     */
    public function insertDemo(
        ?int $companyId = null,
        string $size = 'small',
        ?User $user = null
    ): array {
        // 1. Environment Guard
        $isProduction = app()->environment('production') || config('app.env') === 'production';
        if ($isProduction && !config('maintenance.allow_demo_in_production', false)) {
            throw new AccessDeniedHttpException('Demo data generation is disabled in production environments.');
        }

        // 2. Idempotency Check
        $status = $this->hasDemoData($companyId);
        if ($status['has_demo']) {
            return [
                'success' => false,
                'already_exists' => true,
                'message' => 'Demo data already exists in the system.',
                'batch_id' => $status['latest_batch'],
                'total_records' => $status['total_records'],
            ];
        }

        // 3. Resolve Company
        $company = $companyId ? Company::find($companyId) : Company::first();
        if (!$company) {
            $company = Company::create([
                'uuid' => (string) Str::uuid(),
                'name' => 'Apex Retail Demo Ltd',
                'legal_name' => 'Apex Retail Demo Holdings Limited',
                'code' => 'APEX-DEMO',
                'country' => 'Bangladesh',
                'currency_code' => 'BDT',
                'timezone' => 'Asia/Dhaka',
                'status' => 'active',
            ]);
        }
        $companyId = $company->id;
        $batchId = 'DEMO_' . now()->format('Ymd_His') . '_' . Str::lower(Str::random(6));
        $isMedium = in_array(strtolower($size), ['medium', 'large'], true);

        $createdCounts = [];
        $recordsTracked = 0;

        DB::beginTransaction();
        try {
            // Helper to track inserted demo records
            $track = function (string $table, int $recordId) use ($batchId, $companyId, &$recordsTracked, &$createdCounts) {
                SystemDemoRecord::create([
                    'batch_id' => $batchId,
                    'company_id' => $companyId,
                    'table_name' => $table,
                    'record_id' => $recordId,
                ]);
                $recordsTracked++;
                $createdCounts[$table] = ($createdCounts[$table] ?? 0) + 1;
            };

            // A0. Business Unit
            $buId = DB::table('business_units')->where('company_id', $companyId)->value('id');
            if (!$buId) {
                $buId = DB::table('business_units')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'name' => 'Retail Division (Demo)',
                    'code' => 'DEMO-BU-' . Str::upper(Str::random(4)),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $track('business_units', $buId);
            }

            // A. Branches
            $branchesData = [
                ['name' => 'Dhaka Main Branch (Demo)', 'code' => 'DEMO-BR-DHK'],
                ['name' => 'Chattogram Branch (Demo)', 'code' => 'DEMO-BR-CTG'],
            ];
            $branchIds = [];
            foreach ($branchesData as $b) {
                $branchId = DB::table('branches')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'business_unit_id' => $buId,
                    'name' => $b['name'],
                    'code' => $b['code'] . '-' . Str::lower(Str::random(3)),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $track('branches', $branchId);
                $branchIds[] = $branchId;
            }

            // B. Warehouses
            $warehousesData = [
                ['name' => 'Dhaka Central Warehouse (Demo)', 'code' => 'DEMO-WH-DHK', 'branch_id' => $branchIds[0]],
                ['name' => 'Chattogram Warehouse (Demo)', 'code' => 'DEMO-WH-CTG', 'branch_id' => $branchIds[1]],
            ];
            $warehouseIds = [];
            foreach ($warehousesData as $w) {
                $whId = DB::table('warehouses')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'business_unit_id' => $buId,
                    'branch_id' => $w['branch_id'],
                    'name' => $w['name'],
                    'code' => $w['code'] . '-' . Str::lower(Str::random(3)),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $track('warehouses', $whId);
                $warehouseIds[] = $whId;
            }

            // C. Units
            $unitId = DB::table('units')->where('company_id', $companyId)->value('id');
            if (!$unitId) {
                $unitId = DB::table('units')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'name' => 'Piece',
                    'short_code' => 'PCS-DEMO',
                    'decimal_allowed' => false,
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $track('units', $unitId);
            }

            // D. Categories
            $categoriesData = [
                ['name' => 'Baby & Infant Care (Demo)', 'slug' => 'demo-baby-infant'],
                ['name' => 'Apparel & Innerwear (Demo)', 'slug' => 'demo-apparel-innerwear'],
                ['name' => 'Home & Organizing (Demo)', 'slug' => 'demo-home-organizing'],
                ['name' => 'Food Staples & Groceries (Demo)', 'slug' => 'demo-food-staples'],
            ];
            $categoryIds = [];
            foreach ($categoriesData as $c) {
                $catId = DB::table('categories')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'name' => $c['name'],
                    'slug' => $c['slug'] . '-' . Str::lower(Str::random(4)),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $track('categories', $catId);
                $categoryIds[] = $catId;
            }

            // E. Realistic Bangladesh Retail Products (22 products)
            $demoProducts = [
                ['name' => 'Miniket Rice Premium 5kg', 'sku' => 'DEMO-RIC-MNK', 'cat' => 3, 'cost' => 340, 'price' => 420],
                ['name' => 'Fortified Soybean Oil 2L', 'sku' => 'DEMO-OIL-SOY', 'cat' => 3, 'cost' => 310, 'price' => 380],
                ['name' => 'Baby Feeding Bottle 240ml', 'sku' => 'DEMO-BTL-240', 'cat' => 0, 'cost' => 210, 'price' => 350],
                ['name' => 'Silicone Baby Spoon Set', 'sku' => 'DEMO-SPN-SIL', 'cat' => 0, 'cost' => 130, 'price' => 220],
                ['name' => 'Deluxe Baby Gift Box', 'sku' => 'DEMO-GFT-DLX', 'cat' => 0, 'cost' => 750, 'price' => 1250],
                ['name' => 'Organic Cotton Baby Romper', 'sku' => 'DEMO-RMP-COT', 'cat' => 0, 'cost' => 270, 'price' => 450],
                ['name' => 'Soft Baby Powder Puff', 'sku' => 'DEMO-PUF-SFT', 'cat' => 0, 'cost' => 100, 'price' => 180],
                ['name' => 'Silicone Teether Ring', 'sku' => 'DEMO-TTH-RNG', 'cat' => 0, 'cost' => 120, 'price' => 200],
                ['name' => 'Women Seamless Comfort Bra', 'sku' => 'DEMO-BRA-SML', 'cat' => 1, 'cost' => 340, 'price' => 580],
                ['name' => 'Women Cotton Briefs (3-Pack)', 'sku' => 'DEMO-PNT-3PK', 'cat' => 1, 'cost' => 250, 'price' => 420],
                ['name' => 'Everyday Cotton Camisole', 'sku' => 'DEMO-CAM-COT', 'cat' => 1, 'cost' => 190, 'price' => 320],
                ['name' => 'Sports Wireless Support Bra', 'sku' => 'DEMO-BRA-SPT', 'cat' => 1, 'cost' => 380, 'price' => 650],
                ['name' => 'Men Cotton Boxers (2-Pack)', 'sku' => 'DEMO-BOX-2PK', 'cat' => 1, 'cost' => 230, 'price' => 390],
                ['name' => 'Men Combed Cotton Vest', 'sku' => 'DEMO-VST-CMB', 'cat' => 1, 'cost' => 160, 'price' => 280],
                ['name' => 'Multi-tier Closet Organizer', 'sku' => 'DEMO-ORG-CLS', 'cat' => 2, 'cost' => 510, 'price' => 850],
                ['name' => 'Transparent Storage Bin 20L', 'sku' => 'DEMO-BIN-20L', 'cat' => 2, 'cost' => 290, 'price' => 480],
                ['name' => 'Desktop Storage Caddy', 'sku' => 'DEMO-CAD-DSK', 'cat' => 2, 'cost' => 150, 'price' => 260],
                ['name' => 'Microfiber Cleaning Cloth (4-Pk)', 'sku' => 'DEMO-CLT-4PK', 'cat' => 2, 'cost' => 110, 'price' => 190],
                ['name' => 'Velvet Non-slip Hangers (10-Pk)', 'sku' => 'DEMO-HNG-10P', 'cat' => 2, 'cost' => 330, 'price' => 550],
                ['name' => 'Kitchen Spice Rack Organizer', 'sku' => 'DEMO-SPK-RCK', 'cat' => 2, 'cost' => 430, 'price' => 720],
                ['name' => 'Foldable Fabric Laundry Hamper', 'sku' => 'DEMO-HMP-FLD', 'cat' => 2, 'cost' => 360, 'price' => 600],
                ['name' => 'Travel Toiletry Organizer Pouch', 'sku' => 'DEMO-PCH-TRV', 'cat' => 2, 'cost' => 200, 'price' => 340],
            ];

            $productRecords = [];
            foreach ($demoProducts as $p) {
                $prodId = DB::table('products')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'category_id' => $categoryIds[$p['cat']],
                    'unit_id' => $unitId,
                    'name' => $p['name'],
                    'slug' => Str::slug($p['name']) . '-' . Str::lower(Str::random(4)),
                    'product_code' => $p['sku'],
                    'product_type' => 'simple',
                    'has_variants' => false,
                    'status' => 'active',
                    'tax_rate' => 0.00,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $track('products', $prodId);

                $variantId = DB::table('product_variants')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'product_id' => $prodId,
                    'sku' => $p['sku'] . '-STD',
                    'variant_name' => 'Standard',
                    'cost_price' => $p['cost'],
                    'selling_price' => $p['price'],
                    'mrp' => $p['price'],
                    'status' => 'active',
                    'attribute_signature' => 'standard',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $track('product_variants', $variantId);

                $productRecords[] = [
                    'product_id' => $prodId,
                    'variant_id' => $variantId,
                    'name' => $p['name'],
                    'sku' => $p['sku'] . '-STD',
                    'cost' => $p['cost'],
                    'price' => $p['price'],
                ];
            }

            // F. Suppliers (5 Bangladesh Suppliers)
            $suppliersData = [
                ['name' => 'Meghna Textile Mills Ltd (Demo)', 'code' => 'DEMO-SUP-01', 'mobile' => '+8801811000001', 'email' => 'demo.meghna@retailcore.test'],
                ['name' => 'Bengal Plastics & Household (Demo)', 'code' => 'DEMO-SUP-02', 'mobile' => '+8801811000002', 'email' => 'demo.bengal@retailcore.test'],
                ['name' => 'Aman Baby Gear Importers (Demo)', 'code' => 'DEMO-SUP-03', 'mobile' => '+8801811000003', 'email' => 'demo.aman@retailcore.test'],
                ['name' => 'Dhaka Home Organizers Co (Demo)', 'code' => 'DEMO-SUP-04', 'mobile' => '+8801811000004', 'email' => 'demo.dhakahome@retailcore.test'],
                ['name' => 'Padma Fabricators Limited (Demo)', 'code' => 'DEMO-SUP-05', 'mobile' => '+8801811000005', 'email' => 'demo.padma@retailcore.test'],
            ];
            $supplierIds = [];
            foreach ($suppliersData as $s) {
                $supId = DB::table('suppliers')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'business_unit_id' => $buId,
                    'supplier_code' => $s['code'] . '-' . Str::lower(Str::random(3)),
                    'name' => $s['name'],
                    'mobile' => $s['mobile'],
                    'email' => $s['email'],
                    'status' => 'ACTIVE',
                    'qualification_status' => 'QUALIFIED',
                    'risk_rating' => 'LOW',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $track('suppliers', $supId);
                $supplierIds[] = $supId;
            }

            // G. Customers (10 Bangladeshi Demo Customers)
            $customersData = [
                ['name' => 'Tanvir Rahman', 'phone' => '+8801711000001', 'email' => 'demo.tanvir@retailcore.test'],
                ['name' => 'Nusrat Jahan', 'phone' => '+8801711000002', 'email' => 'demo.nusrat@retailcore.test'],
                ['name' => 'Ariful Islam', 'phone' => '+8801711000003', 'email' => 'demo.arif@retailcore.test'],
                ['name' => 'Farhana Akter', 'phone' => '+8801711000004', 'email' => 'demo.farhana@retailcore.test'],
                ['name' => 'Mehedi Hasan', 'phone' => '+8801711000005', 'email' => 'demo.mehedi@retailcore.test'],
                ['name' => 'Sadia Sultana', 'phone' => '+8801711000006', 'email' => 'demo.sadia@retailcore.test'],
                ['name' => 'Mahmudul Karim', 'phone' => '+8801711000007', 'email' => 'demo.mahmud@retailcore.test'],
                ['name' => 'Rina Begum', 'phone' => '+8801711000008', 'email' => 'demo.rina@retailcore.test'],
                ['name' => 'Kamrul Ahsan', 'phone' => '+8801711000009', 'email' => 'demo.kamrul@retailcore.test'],
                ['name' => 'Bilkis Banu', 'phone' => '+8801711000010', 'email' => 'demo.bilkis@retailcore.test'],
            ];
            $customerIds = [];
            foreach ($customersData as $idx => $c) {
                $custId = DB::table('customers')->insertGetId([
                    'company_id' => $companyId,
                    'business_unit_id' => $buId,
                    'customer_code' => 'DEMO-CUST-' . str_pad((string)($idx + 1), 3, '0', STR_PAD_LEFT) . '-' . Str::lower(Str::random(3)),
                    'name' => $c['name'],
                    'mobile' => $c['phone'],
                    'email' => $c['email'],
                    'status' => 'ACTIVE',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $track('customers', $custId);
                $customerIds[] = $custId;
            }

            // H. Purchases & Initial Stock (5 purchases to seed warehouse stock)
            foreach ($supplierIds as $sIdx => $supId) {
                $targetWarehouse = $warehouseIds[$sIdx % count($warehouseIds)];
                $targetBranch = $branchIds[$sIdx % count($branchIds)];
                $invNumber = 'PINV-DEMO-' . date('Ymd') . '-' . str_pad((string)($sIdx + 1), 3, '0', STR_PAD_LEFT);

                $purchaseSubtotal = 0;
                $purchaseId = DB::table('purchases')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'business_unit_id' => $buId,
                    'branch_id' => $targetBranch,
                    'warehouse_id' => $targetWarehouse,
                    'supplier_id' => $supId,
                    'supplier_invoice_number' => $invNumber,
                    'invoice_date' => now()->subDays(5)->toDateString(),
                    'status' => 'POSTED',
                    'subtotal' => 0,
                    'grand_total' => 0,
                    'created_at' => now()->subDays(5),
                    'updated_at' => now()->subDays(5),
                ]);
                $track('purchases', $purchaseId);

                // Add 4 products to this purchase
                $assignedProducts = array_slice($productRecords, $sIdx * 4, 4);
                foreach ($assignedProducts as $prod) {
                    $qty = 100;
                    $lineTotal = $qty * $prod['cost'];
                    $purchaseSubtotal += $lineTotal;

                    $pItemId = DB::table('purchase_items')->insertGetId([
                        'purchase_id' => $purchaseId,
                        'product_id' => $prod['product_id'],
                        'product_variant_id' => $prod['variant_id'],
                        'quantity' => $qty,
                        'unit_cost' => $prod['cost'],
                        'line_total' => $lineTotal,
                        'created_at' => now()->subDays(5),
                        'updated_at' => now()->subDays(5),
                    ]);
                    $track('purchase_items', $pItemId);

                    // Initialize Inventory position
                    $invId = DB::table('inventories')->insertGetId([
                        'uuid' => (string) Str::uuid(),
                        'company_id' => $companyId,
                        'business_unit_id' => $buId,
                        'warehouse_id' => $targetWarehouse,
                        'branch_id' => $targetBranch,
                        'product_id' => $prod['product_id'],
                        'product_variant_id' => $prod['variant_id'],
                        'quantity' => $qty,
                        'available_quantity' => $qty,
                        'reserved_quantity' => 0,
                        'average_cost' => $prod['cost'],
                        'total_value' => $lineTotal,
                        'created_at' => now()->subDays(5),
                        'updated_at' => now()->subDays(5),
                    ]);
                    $track('inventories', $invId);

                    // Stock movement for purchase
                    $smId = DB::table('stock_movements')->insertGetId([
                        'uuid' => (string) Str::uuid(),
                        'company_id' => $companyId,
                        'business_unit_id' => $buId,
                        'warehouse_id' => $targetWarehouse,
                        'branch_id' => $targetBranch,
                        'product_id' => $prod['product_id'],
                        'product_variant_id' => $prod['variant_id'],
                        'movement_type' => 'PURCHASE_RECEIVE',
                        'quantity' => $qty,
                        'unit_cost' => $prod['cost'],
                        'total_cost' => $lineTotal,
                        'quantity_before' => 0,
                        'quantity_after' => $qty,
                        'reference_type' => 'purchase',
                        'reference_id' => $purchaseId,
                        'reference_number' => $invNumber,
                        'created_at' => now()->subDays(5),
                        'updated_at' => now()->subDays(5),
                    ]);
                    $track('stock_movements', $smId);
                }

                DB::table('purchases')->where('id', $purchaseId)->update([
                    'subtotal' => $purchaseSubtotal,
                    'grand_total' => $purchaseSubtotal,
                ]);
            }

            // I. POS Sessions & Sales (~50 sales)
            $totalSalesToCreate = $isMedium ? 200 : 50;

            $cashierId = $user?->id ?? DB::table('users')->where('company_id', $companyId)->value('id') ?? DB::table('users')->value('id');

            $terminalId = DB::table('pos_terminals')->where('company_id', $companyId)->value('id');
            if (!$terminalId) {
                $terminalId = DB::table('pos_terminals')->insertGetId([
                    'company_id' => $companyId,
                    'business_unit_id' => $buId,
                    'branch_id' => $branchIds[0],
                    'warehouse_id' => $warehouseIds[0],
                    'terminal_code' => 'TERM-DEMO-' . Str::upper(Str::random(4)),
                    'terminal_name' => 'Main Checkout POS',
                    'status' => 'ACTIVE',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $track('pos_terminals', $terminalId);
            }

            $sessionId = DB::table('pos_sessions')->insertGetId([
                'company_id' => $companyId,
                'business_unit_id' => $buId,
                'branch_id' => $branchIds[0],
                'warehouse_id' => $warehouseIds[0],
                'pos_terminal_id' => $terminalId,
                'cashier_id' => $cashierId,
                'session_number' => 'POS-SESS-DEMO-' . date('Ymd') . '-' . Str::lower(Str::random(4)),
                'opened_at' => now()->subDays(3),
                'opening_cash' => 5000.00,
                'status' => 'OPEN',
                'created_at' => now()->subDays(3),
                'updated_at' => now()->subDays(3),
            ]);
            $track('pos_sessions', $sessionId);

            $paymentMethods = ['CASH', 'BKASH', 'NAGAD', 'CARD'];

            for ($i = 1; $i <= $totalSalesToCreate; $i++) {
                $chosenCustomer = $customerIds[($i - 1) % count($customerIds)];
                $chosenBranch = $branchIds[($i - 1) % count($branchIds)];
                $chosenWarehouse = $warehouseIds[($i - 1) % count($warehouseIds)];
                $invNo = 'INV-DEMO-' . date('Ymd') . '-' . str_pad((string)$i, 4, '0', STR_PAD_LEFT);
                $saleDate = now()->subDays(rand(0, 3))->toDateString();

                // Select 1 to 3 items
                $itemCount = rand(1, 3);
                $subtotal = 0;
                $itemsToInsert = [];

                for ($j = 0; $j < $itemCount; $j++) {
                    $prod = $productRecords[($i + $j) % count($productRecords)];
                    $qty = rand(1, 4);
                    $lineTotal = $qty * $prod['price'];
                    $subtotal += $lineTotal;

                    $itemsToInsert[] = [
                        'prod' => $prod,
                        'qty' => $qty,
                        'line_total' => $lineTotal,
                    ];
                }

                $taxTotal = round($subtotal * 0.05, 2); // 5% retail VAT
                $grandTotal = $subtotal + $taxTotal;

                $saleId = DB::table('sales')->insertGetId([
                    'company_id' => $companyId,
                    'business_unit_id' => $buId,
                    'branch_id' => $chosenBranch,
                    'warehouse_id' => $chosenWarehouse,
                    'pos_terminal_id' => $terminalId,
                    'pos_session_id' => $sessionId,
                    'customer_id' => $chosenCustomer,
                    'cashier_id' => $cashierId,
                    'invoice_number' => $invNo,
                    'sale_date' => $saleDate,
                    'channel' => 'POS',
                    'status' => 'COMPLETED',
                    'payment_status' => 'PAID',
                    'fulfillment_status' => 'FULFILLED',
                    'subtotal' => $subtotal,
                    'discount_total' => 0,
                    'tax_total' => $taxTotal,
                    'shipping_amount' => 0,
                    'grand_total' => $grandTotal,
                    'paid_amount' => $grandTotal,
                    'due_amount' => 0,
                    'created_at' => now()->subHours(rand(1, 48)),
                    'updated_at' => now(),
                ]);
                $track('sales', $saleId);

                // Insert sale items and decrement inventory
                foreach ($itemsToInsert as $item) {
                    $sItemId = DB::table('sale_items')->insertGetId([
                        'sale_id' => $saleId,
                        'product_id' => $item['prod']['product_id'],
                        'product_variant_id' => $item['prod']['variant_id'],
                        'sku_snapshot' => $item['prod']['sku'],
                        'product_name_snapshot' => $item['prod']['name'],
                        'quantity' => $item['qty'],
                        'unit_price' => $item['prod']['price'],
                        'discount' => 0,
                        'tax' => 0,
                        'line_total' => $item['line_total'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $track('sale_items', $sItemId);

                    // Update stock position
                    DB::table('inventories')
                        ->where('company_id', $companyId)
                        ->where('product_variant_id', $item['prod']['variant_id'])
                        ->decrement('quantity', $item['qty']);

                    // Stock movement for sale
                    $smId = DB::table('stock_movements')->insertGetId([
                        'uuid' => (string) Str::uuid(),
                        'company_id' => $companyId,
                        'business_unit_id' => $buId,
                        'warehouse_id' => $chosenWarehouse,
                        'branch_id' => $chosenBranch,
                        'product_id' => $item['prod']['product_id'],
                        'product_variant_id' => $item['prod']['variant_id'],
                        'movement_type' => 'SALE',
                        'quantity' => -$item['qty'],
                        'unit_cost' => $item['prod']['cost'],
                        'total_cost' => $item['qty'] * $item['prod']['cost'],
                        'quantity_before' => 100,
                        'quantity_after' => 100 - $item['qty'],
                        'reference_type' => 'sale',
                        'reference_id' => $saleId,
                        'reference_number' => $invNo,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $track('stock_movements', $smId);
                }

                // Sale payment
                $method = $paymentMethods[$i % count($paymentMethods)];
                $spId = DB::table('sale_payments')->insertGetId([
                    'sale_id' => $saleId,
                    'payment_method' => $method,
                    'amount' => $grandTotal,
                    'transaction_number' => 'TXN-DEMO-' . Str::upper(Str::random(8)),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $track('sale_payments', $spId);
            }

            DB::commit();

            AuditLog::log($user, $companyId, 'DEMO_DATA_INSERTED', null, null, [
                'batch_id' => $batchId,
                'total_records_tracked' => $recordsTracked,
                'summary' => $createdCounts,
            ]);

            return [
                'success' => true,
                'batch_id' => $batchId,
                'total_records' => $recordsTracked,
                'breakdown' => $createdCounts,
                'message' => "Successfully inserted {$recordsTracked} realistic demonstration records.",
            ];
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Demo data insertion failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            throw new \RuntimeException("Demo data insertion failed: {$e->getMessage()}", 0, $e);
        }
    }

    /**
     * Remove ONLY demo-tagged/demo-batch records in reverse dependency order.
     */
    public function removeDemo(?int $companyId = null, ?User $user = null): array
    {
        if ($user && !$user->hasRole('Super Admin')) {
            throw new AccessDeniedHttpException('Removing demo data requires Super Admin privileges.');
        }

        $query = SystemDemoRecord::query();
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $records = $query->get();
        if ($records->isEmpty()) {
            return [
                'success' => true,
                'deleted_count' => 0,
                'message' => 'No demo data records were found to remove.',
            ];
        }

        // Group records by table
        $grouped = $records->groupBy('table_name')->map(fn($group) => $group->pluck('record_id')->toArray());

        // Reverse dependency deletion order
        $orderedTables = [
            'sale_payments',
            'sale_items',
            'sales',
            'pos_cash_movements',
            'pos_sessions',
            'purchase_items',
            'purchases',
            'stock_movements',
            'inventories',
            'product_variants',
            'products',
            'customers',
            'suppliers',
            'warehouses',
            'branches',
            'categories',
            'units',
        ];

        $deletedBreakdown = [];
        $totalDeleted = 0;

        DB::beginTransaction();
        try {
            foreach ($orderedTables as $table) {
                if (isset($grouped[$table]) && Schema::hasTable($table)) {
                    $ids = $grouped[$table];
                    $cnt = DB::table($table)->whereIn('id', $ids)->delete();
                    $deletedBreakdown[$table] = $cnt;
                    $totalDeleted += $cnt;
                }
            }

            // Remove demo record tracking
            $query->delete();

            DB::commit();

            AuditLog::log($user, $companyId, 'DEMO_DATA_REMOVED', null, null, [
                'total_deleted' => $totalDeleted,
                'tables' => $deletedBreakdown,
            ]);

            return [
                'success' => true,
                'deleted_count' => $totalDeleted,
                'breakdown' => $deletedBreakdown,
                'message' => "Successfully removed {$totalDeleted} demonstration records.",
            ];
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Demo data removal failed: ' . $e->getMessage());
            throw new \RuntimeException("Demo data removal failed: {$e->getMessage()}", 0, $e);
        }
    }
}
