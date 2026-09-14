<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\ProductVariant;
use App\Models\Customer;
use App\Models\PosSession;
use Illuminate\Support\Facades\DB;
use Exception;

class SalesService
{
    protected $inventoryService;
    protected $customerLedgerService;

    public function __construct(InventoryService $inventoryService, CustomerLedgerService $customerLedgerService)
    {
        $this->inventoryService = $inventoryService;
        $this->customerLedgerService = $customerLedgerService;
    }

    public function completeSale($companyId, $data)
    {
        return DB::transaction(function () use ($companyId, $data) {
            if (!empty($data['idempotency_key'])) {
                $existingSale = Sale::where('company_id', $companyId)
                    ->where('idempotency_key', $data['idempotency_key'])
                    ->first();
                if ($existingSale && $existingSale->status === 'COMPLETED') {
                    return $existingSale->load(['items', 'payments', 'customer', 'terminal']);
                }
            }

            $session = PosSession::where('company_id', $companyId)
                ->where('id', $data['pos_session_id'])
                ->where('status', 'OPEN')
                ->firstOrFail();

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
                
                $variant = ProductVariant::with('product')
                    ->where('id', $item['product_variant_id'])
                    ->lockForUpdate()
                    ->firstOrFail();
                    
                if ($variant->product->company_id !== $companyId) {
                    throw new Exception("Invalid product ownership.");
                }
                
                if ($variant->product->status !== 'ACTIVE' || $variant->status !== 'ACTIVE') {
                    throw new Exception("Cannot sell inactive product.");
                }
                
                $lineTotal = ($item['quantity'] * $item['unit_price']) - ($item['discount'] ?? 0) + ($item['tax'] ?? 0);
                if ($lineTotal < 0) throw new Exception("Line total cannot be negative");

                $subtotal += ($item['quantity'] * $item['unit_price']);
                $totalDiscount += ($item['discount'] ?? 0);
                $totalTax += ($item['tax'] ?? 0);
                
                $itemsData[] = [
                    'variant' => $variant,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $item['discount'] ?? 0,
                    'tax' => $item['tax'] ?? 0,
                    'line_total' => $lineTotal
                ];
            }

            $grandTotal = $subtotal - $totalDiscount + $totalTax - ($data['sale_discount'] ?? 0);
            
            $paidAmount = 0;
            $payments = [];
            if (!empty($data['payments'])) {
                foreach ($data['payments'] as $payment) {
                    if ($payment['amount'] <= 0) continue;
                    $paidAmount += $payment['amount'];
                    $payments[] = $payment;
                }
            }
            
            // Handle overpayment (Change)
            $actualPaidForSale = min($paidAmount, $grandTotal);
            $dueAmount = max(0, $grandTotal - $actualPaidForSale);
            
            $paymentStatus = 'DUE';
            if ($dueAmount == 0) $paymentStatus = 'PAID';
            else if ($actualPaidForSale > 0) $paymentStatus = 'PARTIAL';

            if ($dueAmount > 0) {
                if (!$customer) {
                    throw new Exception("Walk-in customers cannot have a due balance.");
                }
                if ($customer->credit_limit !== null && $customer->credit_limit > 0) {
                    // Check credit limit
                    // Get current due from ledger
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
                    'discount_total' => $totalDiscount + ($data['sale_discount'] ?? 0),
                    'tax_total' => $totalTax,
                    'grand_total' => $grandTotal,
                    'paid_amount' => $actualPaidForSale,
                    'due_amount' => $dueAmount,
                    'payment_status' => $paymentStatus,
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
                    'discount_total' => $totalDiscount + ($data['sale_discount'] ?? 0),
                    'tax_total' => $totalTax,
                    'grand_total' => $grandTotal,
                    'paid_amount' => $actualPaidForSale,
                    'due_amount' => $dueAmount,
                    'payment_status' => $paymentStatus,
                    'notes' => $data['notes'] ?? null,
                    'cashier_id' => $data['cashier_id'],
                    'created_by' => $data['cashier_id']
                ]);
            }

            // Process Items and Inventory
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
                
                $unitCost = $inventoryMove['unit_cost'] ?? 0;
                
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'product_variant_id' => $variant->id,
                    'sku_snapshot' => $variant->sku,
                    'barcode_snapshot' => $variant->barcode,
                    'product_name_snapshot' => $product->name,
                    'variant_description_snapshot' => $variant->name,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $item['discount'],
                    'tax' => $item['tax'],
                    'line_total' => $item['line_total'],
                    'unit_cost_snapshot' => $unitCost,
                    'total_cost_snapshot' => $unitCost * $item['quantity']
                ]);
            }

            // Process Payments
            $remainingPaid = $actualPaidForSale;
            foreach ($payments as $payment) {
                if ($remainingPaid <= 0) break;
                
                $alloc = min($payment['amount'], $remainingPaid);
                $remainingPaid -= $alloc;
                
                SalePayment::create([
                    'sale_id' => $sale->id,
                    'payment_method' => $payment['method'], // CASH, CARD, BKASH, etc.
                    'amount' => $alloc,
                    'received_by' => $data['cashier_id']
                ]);
            }

            // Customer Ledger for Due Amount
            if ($dueAmount > 0 && $customer) {
                $this->customerLedgerService->addAdjustment(
                    $companyId,
                    $customer->id,
                    $dueAmount,
                    'DEBIT', // Due means customer owes us
                    'SALE',
                    $sale->id,
                    $sale->invoice_number,
                    "Credit sale {$sale->invoice_number}"
                );
            }
            
            // Audit Log
            // App\Services\AuditLogService::log(...) if it exists, or just emit event.

            return $sale->load(['items', 'payments', 'customer', 'terminal']);
        });
    }
    
    public function holdSale($companyId, $data)
    {
        return DB::transaction(function () use ($companyId, $data) {
            $invoiceNumber = $data['invoice_number'] ?? ('HLD-' . date('YmdHis') . '-' . rand(100, 999));
            
            $sale = Sale::create([
                'company_id' => $companyId,
                'business_unit_id' => $data['business_unit_id'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
                'warehouse_id' => $data['warehouse_id'] ?? null,
                'pos_terminal_id' => $data['pos_terminal_id'] ?? null,
                'pos_session_id' => $data['pos_session_id'] ?? null,
                'customer_id' => $data['customer_id'] ?? null,
                'invoice_number' => $invoiceNumber,
                'sale_date' => now()->toDateString(),
                'status' => 'HELD',
                'cashier_id' => $data['cashier_id'],
                'created_by' => $data['cashier_id']
            ]);
            
            foreach ($data['items'] as $item) {
                $variant = ProductVariant::with('product')->find($item['product_variant_id']);
                if (!$variant) continue;
                
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $variant->product_id,
                    'product_variant_id' => $variant->id,
                    'sku_snapshot' => $variant->sku,
                    'product_name_snapshot' => $variant->product->name,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'line_total' => $item['quantity'] * $item['unit_price']
                ]);
            }
            return $sale;
        });
    }
}
