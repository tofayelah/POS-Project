<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PosSession;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Services\CustomerLedgerService;
use App\Services\InventoryAccountingService;
use App\Services\InventoryService;
use App\Services\LoyaltyService;
use App\Services\PaymentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Exception;

class SalesService
{
    protected $inventoryService;
    protected $customerLedgerService;
    protected $paymentService;
    protected $inventoryAccountingService;
    protected $loyaltyService;

    public function __construct(
        InventoryService $inventoryService,
        CustomerLedgerService $customerLedgerService,
        PaymentService $paymentService,
        InventoryAccountingService $inventoryAccountingService,
        LoyaltyService $loyaltyService
    ) {
        $this->inventoryService = $inventoryService;
        $this->customerLedgerService = $customerLedgerService;
        $this->paymentService = $paymentService;
        $this->inventoryAccountingService = $inventoryAccountingService;
        $this->loyaltyService = $loyaltyService;
    }

    public function completeSale($companyId, $data)
    {
        return DB::transaction(function () use ($companyId, $data) {
            if (!empty($data['idempotency_key'])) {
                $existingSale = Sale::where('company_id', $companyId)
                    ->where('idempotency_key', $data['idempotency_key'])
                    ->first();
                if ($existingSale && $existingSale->status === 'COMPLETED') {
                    return $existingSale->load(['items', 'payments', 'paymentAllocations.payment', 'customer', 'terminal']);
                }
            }

            $session = PosSession::where('company_id', $companyId)
                ->where('id', $data['pos_session_id'])
                ->first();

            if (!$session) {
                throw new Exception("POS session not found.");
            }

            if ($session->status !== 'OPEN') {
                throw new Exception("Cannot create sale. POS session is {$session->status}.");
            }

            if ($session->cashier_id !== $data['cashier_id']) {
                throw new Exception("Cashier mismatch. Cannot complete sale for another user's session.");
            }

            $invoiceNumber = $data['invoice_number'] ?? null;
            if ($invoiceNumber) {
                $existingSale = Sale::where('company_id', $companyId)
                    ->where('invoice_number', $invoiceNumber)
                    ->first();
                if ($existingSale && $existingSale->status === 'COMPLETED') {
                    throw new Exception("Sale already completed.");
                }
            } else {
                // Collision retry loop for random invoice number
                $attempts = 0;
                do {
                    $invoiceNumber = 'INV-' . date('YmdHis') . '-' . rand(100, 999);
                    $exists = Sale::where('company_id', $companyId)
                        ->where('invoice_number', $invoiceNumber)
                        ->exists();
                    $attempts++;
                } while ($exists && $attempts < 5);
                if ($exists) {
                    throw new Exception("Failed to generate unique invoice number.");
                }
            }

            $customer = null;
            if (!empty($data['customer_id'])) {
                $customer = Customer::where('company_id', $companyId)
                    ->where('id', $data['customer_id'])
                    ->firstOrFail();
            }

            $subtotal = 0;
            $totalDiscount = 0;
            $totalTax = 0;
            
            // Validate Items & Stock
            $itemsData = [];
            foreach ($data['items'] as $item) {
                if ($item['quantity'] <= 0) throw new Exception("Quantity must be greater than 0");
                if ($item['unit_price'] < 0) throw new Exception("Price cannot be negative");
                
                $variant = ProductVariant::with(['product', 'barcodes'])
                    ->where('id', $item['product_variant_id'])
                    ->lockForUpdate()
                    ->firstOrFail();
                    
                if ($variant->product->company_id !== $companyId) {
                    throw new Exception("Invalid product ownership.");
                }
                
                $prodStatus = strtoupper($variant->product->status ?? 'ACTIVE');
                $varStatus = strtoupper($variant->status ?? 'ACTIVE');
                if ($prodStatus !== 'ACTIVE' || $varStatus !== 'ACTIVE') {
                    throw new Exception("Cannot sell inactive product.");
                }
                
                // Server-authoritative tax calculation
                $taxRate = (float) ($variant->tax_rate ?? $variant->product->tax_rate ?? 0.0);
                $itemDiscount = (float) ($item['discount'] ?? 0);
                $taxableAmount = max(0, ($item['quantity'] * $item['unit_price']) - $itemDiscount);
                $itemTax = round($taxableAmount * ($taxRate / 100), 4);
                $lineTotal = round($taxableAmount + $itemTax, 4);

                $subtotal += ($item['quantity'] * $item['unit_price']);
                $totalDiscount += $itemDiscount;
                $totalTax += $itemTax;
                
                $itemsData[] = [
                    'variant' => $variant,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $itemDiscount,
                    'tax' => $itemTax,
                    'tax_rate' => $taxRate,
                    'line_total' => $lineTotal
                ];
            }

            $saleDiscount = (float) ($data['sale_discount'] ?? 0);
            if ($saleDiscount < -0.0001) {
                throw new ConflictHttpException("Sale discount cannot be negative.");
            }
            $eligibleSubtotal = max(0, $subtotal - $totalDiscount);
            if ($saleDiscount > ($eligibleSubtotal + 0.0001)) {
                throw new ConflictHttpException("Sale discount cannot exceed eligible subtotal.");
            }
            $totalDiscountAmount = $totalDiscount + $saleDiscount;
            $grandTotal = round($subtotal - $totalDiscount + $totalTax - $saleDiscount, 4);
            if ($grandTotal < 0) {
                $grandTotal = 0;
            }

            // Terminal Enabled Payment Methods Validation
            $terminalId = $session->pos_terminal_id;
            if ($terminalId) {
                $hasTerminalPMConfig = DB::table('pos_terminal_payment_methods')
                    ->where('pos_terminal_id', $terminalId)
                    ->exists();
                if ($hasTerminalPMConfig) {
                    $enabledCodes = DB::table('pos_terminal_payment_methods')
                        ->join('payment_methods', 'payment_methods.id', '=', 'pos_terminal_payment_methods.payment_method_id')
                        ->where('pos_terminal_payment_methods.pos_terminal_id', $terminalId)
                        ->where('pos_terminal_payment_methods.is_enabled', true)
                        ->pluck('payment_methods.code')
                        ->map(fn($c) => strtoupper($c))
                        ->toArray();

                    foreach ($data['payments'] ?? [] as $pmItem) {
                        $mCode = strtoupper($pmItem['method'] ?? $pmItem['payment_method'] ?? 'CASH');
                        if (!in_array($mCode, $enabledCodes)) {
                            throw new ConflictHttpException("Payment method '{$mCode}' is not enabled for this POS terminal.");
                        }
                    }
                }
            }

            // Prepare payments & Calculate Point Redemption
            $paidAmount = 0;
            $payments = [];
            $pointRedemptionAmount = 0;

            if (!empty($data['payments'])) {
                foreach ($data['payments'] as $payment) {
                    $amt = (float) ($payment['amount'] ?? 0);
                    if ($amt <= 0) continue;
                    $mName = strtoupper($payment['method'] ?? $payment['payment_method'] ?? 'CASH');
                    if ($mName === 'POINT_REDEMPTION') {
                        $pointRedemptionAmount += $amt;
                    }
                    $paidAmount += $amt;
                    $payments[] = $payment;
                }
            }

            // Check if points_redeemed is explicitly passed
            $loyaltySettings = $this->loyaltyService->getSettings($companyId);
            $redemptionValuePerPoint = (float) $loyaltySettings->redemption_point_value ?: 1.0;
            if (!empty($data['points_redeemed']) && $pointRedemptionAmount <= 0) {
                $pointRedemptionAmount = round((float) $data['points_redeemed'] * $redemptionValuePerPoint, 4);
            }

            $pointsRedeemed = 0;
            if ($pointRedemptionAmount > 0) {
                if (!$customer) {
                    throw new ConflictHttpException("Walk-in customers cannot redeem loyalty points.");
                }
                $pointsRedeemed = round($pointRedemptionAmount / $redemptionValuePerPoint, 4);

                // Validates min 400, customer balance, discount mutual exclusion, grand total
                $this->loyaltyService->validateRedemption(
                    $companyId,
                    $customer,
                    $pointsRedeemed,
                    $totalDiscountAmount,
                    $grandTotal
                );
            }

            // Payment Total Validation: Overpayment and Underpayment Rules
            $isSingleCashPayment = (count($payments) === 1 && strtoupper($payments[0]['method'] ?? $payments[0]['payment_method'] ?? '') === 'CASH');

            if ($paidAmount > ($grandTotal + 0.0001)) {
                if ($isSingleCashPayment) {
                    // Single cash tender: customer hands cash, cashier calculates change
                    $actualPaidForSale = $grandTotal;
                } else {
                    // Split payments, digital payments, point redemption: overpayment strictly rejected
                    throw new ConflictHttpException("Payment total ({$paidAmount}) exceeds grand total ({$grandTotal}). Overpayment is not permitted.");
                }
            } else {
                $actualPaidForSale = $paidAmount;
            }

            $dueAmount = max(0, round($grandTotal - $actualPaidForSale, 4));

            if ($dueAmount > 0.0001) {
                if (!$customer) {
                    throw new Exception("Walk-in customers cannot have a due balance.");
                }
                if ($customer->credit_limit !== null && $customer->credit_limit > 0) {
                    // Check credit limit
                    $currentBalance = DB::table('customer_ledgers')
                        ->where('customer_id', $customer->id)
                        ->orderBy('id', 'desc')
                        ->value('balance_after') ?? 0;

                    if (($currentBalance + $dueAmount) > $customer->credit_limit) {
                        throw new Exception("Credit limit exceeded.");
                    }
                }
            }

            // Create or Update Sale
            $saleId = $data['sale_id'] ?? null;
            if ($saleId) {
                $sale = Sale::where('company_id', $companyId)
                    ->where('id', $saleId)
                    ->whereIn('status', ['DRAFT', 'HELD'])
                    ->firstOrFail();
                    
                $sale->update([
                    'pos_session_id' => $session->id,
                    'customer_id' => $customer ? $customer->id : null,
                    'subtotal' => $subtotal,
                    'discount_total' => $totalDiscount + $saleDiscount,
                    'tax_total' => $totalTax,
                    'grand_total' => $grandTotal,
                    'paid_amount' => 0,
                    'due_amount' => $grandTotal,
                    'payment_status' => 'DUE',
                    'status' => 'COMPLETED',
                    'idempotency_key' => $data['idempotency_key'] ?? null,
                    'cashier_id' => $data['cashier_id']
                ]);
                $sale->items()->delete();
                $sale->payments()->delete();
            } else {
                $sale = Sale::create([
                    'company_id' => $companyId,
                    'business_unit_id' => $session->business_unit_id,
                    'branch_id' => $session->branch_id,
                    'warehouse_id' => $session->warehouse_id,
                    'pos_terminal_id' => $session->pos_terminal_id,
                    'pos_session_id' => $session->id,
                    'customer_id' => $customer ? $customer->id : null,
                    'invoice_number' => $invoiceNumber,
                    'idempotency_key' => $data['idempotency_key'] ?? null,
                    'sale_date' => now()->toDateString(),
                    'status' => 'COMPLETED',
                    'subtotal' => $subtotal,
                    'discount_total' => $totalDiscount + $saleDiscount,
                    'tax_total' => $totalTax,
                    'grand_total' => $grandTotal,
                    'paid_amount' => 0,
                    'due_amount' => $grandTotal,
                    'payment_status' => 'DUE',
                    'notes' => $data['notes'] ?? null,
                    'cashier_id' => $data['cashier_id'],
                    'created_by' => $data['cashier_id']
                ]);
            }

            // Process Items and Inventory
            $totalCogs = 0;
            foreach ($itemsData as $item) {
                $variant = $item['variant'];
                $product = $variant->product;
                
                // Inventory Stock Out
                $inventoryMove = $this->inventoryService->stockOut(
                    $companyId,
                    $session->warehouse_id,
                    $variant->id,
                    $item['quantity'],
                    'SALE',
                    $sale->id,
                    "Sale {$sale->invoice_number}"
                );
                
                $unitCost = (float) ($inventoryMove['unit_cost'] ?? 0);
                $lineCogs = round($unitCost * $item['quantity'], 4);
                $totalCogs += $lineCogs;
                
                $primaryBarcode = $variant->barcodes ? $variant->barcodes->firstWhere('is_primary', true)?->barcode : null;
                $barcodeSnapshot = $primaryBarcode ?? $variant->barcodes?->first()?->barcode ?? $variant->sku;

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'product_variant_id' => $variant->id,
                    'sku_snapshot' => $variant->sku,
                    'barcode_snapshot' => $barcodeSnapshot,
                    'product_name_snapshot' => $product->name,
                    'variant_description_snapshot' => $variant->variant_name ?? $variant->name ?? $variant->sku,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $item['discount'],
                    'tax' => $item['tax'],
                    'line_total' => $item['line_total'],
                    'unit_cost_snapshot' => $unitCost,
                    'total_cost_snapshot' => $lineCogs
                ]);
            }

            // 1. Post Sale Invoice General Ledger Journal Entry (AR, Revenue, VAT)
            $this->inventoryAccountingService->postSaleInvoice($sale, $data['cashier_id']);

            // 2. Post Sale COGS General Ledger Journal Entry (COGS, Inventory Asset)
            if ($totalCogs > 0) {
                $this->inventoryAccountingService->postSaleCogs($sale, $totalCogs, $data['cashier_id']);
            }

            // 3. Process Payments via Authoritative PaymentService (Payment v2 + Allocation + SalePayment)
            $remainingPaid = $actualPaidForSale;
            $payIndex = 0;
            foreach ($payments as $payment) {
                if ($remainingPaid <= 0) break;
                
                $alloc = min((float) $payment['amount'], $remainingPaid);
                if ($alloc <= 0) continue;
                $remainingPaid -= $alloc;
                $payIndex++;
                
                $method = strtoupper($payment['method'] ?? $payment['payment_method'] ?? 'CASH');

                // If POINT_REDEMPTION, deduct customer loyalty points atomically
                if ($method === 'POINT_REDEMPTION' && $customer && $pointsRedeemed > 0) {
                    $pointsForThisPayment = round($alloc / $redemptionValuePerPoint, 4);
                    $this->loyaltyService->redeemPoints(
                        $companyId,
                        $customer->id,
                        $pointsForThisPayment,
                        $sale->id,
                        $sale->invoice_number,
                        $data['cashier_id']
                    );
                }

                $paymentIdempKey = !empty($data['idempotency_key']) 
                    ? "{$data['idempotency_key']}-PAY-{$payIndex}" 
                    : "SALE-{$sale->id}-PAY-{$payIndex}-" . Str::uuid();

                // Authoritative Payment v2 (posts DR Cash/Bank or DR Loyalty Expense, CR AR if accounting enabled)
                $paymentRecord = $this->paymentService->createPayment($companyId, [
                    'amount' => $alloc,
                    'payment_type' => 'CUSTOMER',
                    'payment_method' => $method,
                    'branch_id' => $sale->branch_id,
                    'reference_number' => $payment['reference_number'] ?? $payment['transaction_ref'] ?? $sale->invoice_number,
                    'payment_date' => $sale->sale_date ? (is_string($sale->sale_date) ? $sale->sale_date : $sale->sale_date->format('Y-m-d')) : date('Y-m-d'),
                    'idempotency_key' => $paymentIdempKey,
                ], $data['cashier_id']);

                // Polymorphic PaymentAllocation to Sale (updates sale paid_amount, due_amount, payment_status)
                $this->paymentService->allocatePayment($companyId, $paymentRecord->id, [
                    [
                        'allocatable_type' => 'Sale',
                        'allocatable_id' => $sale->id,
                        'amount' => $alloc,
                    ]
                ], $data['cashier_id'], ['from_pos_checkout' => true]);

                // Session compatibility: also record SalePayment for cashier shift drawer audit
                SalePayment::create([
                    'sale_id' => $sale->id,
                    'payment_method' => $method,
                    'amount' => $alloc,
                    'received_by' => $data['cashier_id']
                ]);
            }

            // Refresh sale model after payment allocations
            $sale->refresh();

            // Customer Ledger for Due Amount
            if ($sale->due_amount > 0 && $customer) {
                $this->customerLedgerService->postTransaction(
                    $companyId,
                    $customer->id,
                    'SALE',
                    $sale->due_amount,
                    0,
                    $sale->sale_date ? (is_string($sale->sale_date) ? $sale->sale_date : $sale->sale_date->format('Y-m-d')) : date('Y-m-d'),
                    'Sale',
                    $sale->id,
                    $sale->invoice_number,
                    "Credit sale {$sale->invoice_number}",
                    $data['cashier_id']
                );
            }

            // 4. Award Loyalty Points (Zero accounting journal, updated atomically with point ledger)
            if ($customer) {
                $pointsEarned = $this->loyaltyService->calculatePointsEarned(
                    $companyId,
                    $subtotal,
                    $totalDiscountAmount,
                    $pointsRedeemed
                );
                if ($pointsEarned > 0) {
                    $this->loyaltyService->earnPoints(
                        $companyId,
                        $customer->id,
                        $pointsEarned,
                        $sale->id,
                        $sale->invoice_number,
                        $data['cashier_id']
                    );
                }
            }
            
            // Audit Log
            AuditLog::log(
                $companyId,
                $data['cashier_id'],
                'SALE_COMPLETED',
                $sale->id,
                'Sale',
                "Completed sale {$sale->invoice_number} for total {$sale->grand_total}"
            );

            return $sale->load(['items', 'payments', 'paymentAllocations.payment', 'customer', 'terminal']);
        });
    }
    
    public function holdSale($companyId, $data)
    {
        return DB::transaction(function () use ($companyId, $data) {
            $invoiceNumber = $data['invoice_number'] ?? ('HLD-' . date('YmdHis') . '-' . rand(100, 999));
            
            $session = null;
            if (!empty($data['pos_session_id'])) {
                $session = PosSession::where('company_id', $companyId)->find($data['pos_session_id']);
            }

            $subtotal = 0;
            $itemsData = [];
            foreach ($data['items'] as $item) {
                $variant = ProductVariant::with(['product', 'barcodes'])->find($item['product_variant_id']);
                if (!$variant) continue;

                $qty = (float) $item['quantity'];
                $unitPrice = (float) $item['unit_price'];
                $discount = (float) ($item['discount'] ?? 0);
                $tax = (float) ($item['tax'] ?? 0);
                $lineTotal = ($qty * $unitPrice) - $discount + $tax;
                $subtotal += ($qty * $unitPrice);

                $primaryBarcode = $variant->barcodes ? $variant->barcodes->firstWhere('is_primary', true)?->barcode : null;
                $barcodeSnapshot = $primaryBarcode ?? $variant->barcodes?->first()?->barcode ?? $variant->sku;

                $itemsData[] = [
                    'variant' => $variant,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'discount' => $discount,
                    'tax' => $tax,
                    'line_total' => $lineTotal,
                    'barcode_snapshot' => $barcodeSnapshot,
                ];
            }

            $discountTotal = (float) ($data['discount_total'] ?? $data['sale_discount'] ?? 0);
            $taxTotal = (float) ($data['tax_total'] ?? 0);
            $grandTotal = (float) ($data['grand_total'] ?? ($subtotal - $discountTotal + $taxTotal));

            $sale = Sale::create([
                'company_id' => $companyId,
                'business_unit_id' => $data['business_unit_id'] ?? $session?->business_unit_id,
                'branch_id' => $data['branch_id'] ?? $session?->branch_id,
                'warehouse_id' => $data['warehouse_id'] ?? $session?->warehouse_id,
                'pos_terminal_id' => $data['pos_terminal_id'] ?? $session?->pos_terminal_id,
                'pos_session_id' => $session?->id ?? ($data['pos_session_id'] ?? null),
                'customer_id' => $data['customer_id'] ?? null,
                'invoice_number' => $invoiceNumber,
                'sale_date' => now()->toDateString(),
                'status' => 'HELD',
                'subtotal' => $subtotal,
                'discount_total' => $discountTotal,
                'tax_total' => $taxTotal,
                'grand_total' => $grandTotal,
                'paid_amount' => 0,
                'due_amount' => $grandTotal,
                'payment_status' => 'DUE',
                'notes' => $data['notes'] ?? null,
                'cashier_id' => $data['cashier_id'],
                'created_by' => $data['cashier_id']
            ]);
            
            foreach ($itemsData as $row) {
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $row['variant']->product_id,
                    'product_variant_id' => $row['variant']->id,
                    'sku_snapshot' => $row['variant']->sku,
                    'barcode_snapshot' => $row['barcode_snapshot'],
                    'product_name_snapshot' => $row['variant']->product->name,
                    'variant_description_snapshot' => $row['variant']->variant_name,
                    'quantity' => $row['quantity'],
                    'unit_price' => $row['unit_price'],
                    'discount' => $row['discount'],
                    'tax' => $row['tax'],
                    'line_total' => $row['line_total']
                ]);
            }

            return $sale->load(['items.variant.product', 'customer', 'terminal']);
        });
    }
}
