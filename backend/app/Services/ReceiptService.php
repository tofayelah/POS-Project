<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\CustomerPointLedger;
use App\Models\Sale;
use App\Models\SalesReturn;
use App\Models\StoreCreditTransaction;
use App\Models\User;

class ReceiptService
{
    /**
     * Retrieve authoritative finalized receipt presentation data for a Sale.
     * Strictly read-only; no financial, inventory, or ledger mutations.
     */
    public function getSaleReceipt(int $companyId, int $saleId, bool $isReprint = false): array
    {
        $sale = Sale::where('company_id', $companyId)
            ->with([
                'customer',
                'terminal',
                'session.branch',
                'branch',
                'cashier',
                'items.variant.product',
                'payments'
            ])
            ->findOrFail($saleId);

        $company = $sale->branch?->company ?? Company::find($companyId);

        $pointsLedgerEarned = CustomerPointLedger::where('company_id', $companyId)
            ->where('sale_id', $saleId)
            ->where('transaction_type', 'EARN')
            ->sum('points');

        $pointsLedgerRedeemed = CustomerPointLedger::where('company_id', $companyId)
            ->where('sale_id', $saleId)
            ->where('transaction_type', 'REDEEM')
            ->sum('points');

        $storeCreditRedeemed = StoreCreditTransaction::where('company_id', $companyId)
            ->where('reference_type', 'Sale')
            ->where('reference_id', $saleId)
            ->where('type', 'REDEMPTION')
            ->sum('amount');

        $items = $sale->items->map(function ($item) {
            return [
                'id' => $item->id,
                'name' => $item->product_name_snapshot ?: ($item->product?->name ?? 'Product'),
                'variant_name' => $item->variant_description_snapshot ?: ($item->variant?->variant_name ?? null),
                'sku' => $item->sku_snapshot ?: ($item->variant?->sku ?? ''),
                'barcode' => $item->barcode_snapshot ?: '',
                'quantity' => (float) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'discount' => (float) $item->discount,
                'tax' => (float) $item->tax,
                'line_total' => (float) $item->line_total,
            ];
        })->toArray();

        $payments = $sale->payments->map(function ($p) {
            return [
                'method' => $p->payment_method,
                'amount' => (float) $p->amount,
                'transaction_ref' => $p->transaction_number ?: $p->reference,
            ];
        })->toArray();

        $cashPayment = (float) $sale->payments->where('payment_method', 'CASH')->sum('amount');
        $changeAmount = max(0.0, round($cashPayment - (float) $sale->grand_total, 2));

        $reprintCount = AuditLog::where('company_id', $companyId)
            ->where('auditable_type', Sale::class)
            ->where('auditable_id', $saleId)
            ->where('event', 'RECEIPT_REPRINTED')
            ->count();

        return [
            'receipt_type' => 'SALE',
            'sale_id' => $sale->id,
            'invoice_number' => $sale->invoice_number,
            'sale_date' => $sale->sale_date ? (is_string($sale->sale_date) ? $sale->sale_date : $sale->sale_date->format('Y-m-d H:i:s')) : $sale->created_at->format('Y-m-d H:i:s'),
            'sale_type' => 'RETAIL / COUNTER SALE',
            'company' => [
                'name' => $company->legal_name ?: ($company->name ?? 'RetailCore'),
                'address' => $company->address ?: 'Dhaka, Bangladesh',
                'phone' => $company->phone ?: '+880 1700-000000',
                'bin' => $company->vat_registration ?: ($company->tax_number ?? 'BIN-000000000'),
                'website' => $company->website ?: '',
                'logo_url' => $company->logo_path ?: null,
            ],
            'branch' => [
                'id' => $sale->branch_id,
                'name' => $sale->branch?->name ?: ($sale->session?->branch?->name ?? 'Main Branch'),
                'address' => $sale->branch?->address ?: ($company->address ?? ''),
            ],
            'terminal' => [
                'id' => $sale->pos_terminal_id,
                'name' => $sale->terminal?->terminal_name ?: "Terminal #{$sale->pos_terminal_id}",
                'code' => $sale->terminal?->terminal_code ?: "POS-{$sale->pos_terminal_id}",
            ],
            'shift' => [
                'id' => $sale->pos_session_id,
                'session_number' => $sale->session?->session_number ?: null,
            ],
            'cashier' => [
                'id' => $sale->cashier_id,
                'name' => $sale->cashier?->name ?: 'Cashier',
            ],
            'customer' => $sale->customer ? [
                'id' => $sale->customer->id,
                'name' => $sale->customer->name,
                'mobile' => $sale->customer->mobile,
                'code' => $sale->customer->customer_code,
                'points_balance' => (float) $sale->customer->points_balance,
            ] : null,
            'items' => $items,
            'total_quantity' => (float) $sale->items->sum('quantity'),
            'subtotal' => (float) $sale->subtotal,
            'discount_total' => (float) $sale->discount_total,
            'tax_total' => (float) $sale->tax_total,
            'grand_total' => (float) $sale->grand_total,
            'paid_amount' => (float) $sale->paid_amount,
            'due_amount' => (float) $sale->due_amount,
            'change_amount' => $changeAmount,
            'payment_status' => $sale->payment_status,
            'payment_method' => count($payments) > 1 ? 'SPLIT' : ($payments[0]['method'] ?? 'CASH'),
            'payments' => $payments,
            'store_credit' => [
                'amount_used' => (float) $storeCreditRedeemed,
            ],
            'loyalty' => [
                'points_earned' => (int) $pointsLedgerEarned,
                'points_redeemed' => (int) abs($pointsLedgerRedeemed),
                'current_points_balance' => $sale->customer ? (float) $sale->customer->points_balance : null,
            ],
            'is_reprint' => $isReprint,
            'reprint_count' => $reprintCount,
            'notes' => $sale->notes,
            'footer' => [
                'message' => 'THANK YOU FOR SHOPPING WITH US',
                'exchange_policy' => 'Goods sold can be exchanged within 7 days upon presenting this sales slip.',
                'warranty' => 'Warranty claims subject to manufacturer terms.',
            ],
        ];
    }

    /**
     * Controlled reprint of a sale receipt.
     * Records structured AuditLog event with zero financial/inventory mutations.
     */
    public function reprintSaleReceipt(int $companyId, int $saleId, int $userId, ?string $reason = null): array
    {
        $sale = Sale::where('company_id', $companyId)->findOrFail($saleId);
        $user = User::find($userId);

        AuditLog::log(
            $user,
            $companyId,
            'RECEIPT_REPRINTED',
            $sale,
            null,
            [
                'sale_id' => $sale->id,
                'invoice_number' => $sale->invoice_number,
                'reason' => $reason ?: 'Customer requested reprint copy',
                'reprinted_by' => $userId,
                'reprinted_at' => now()->toIso8601String(),
            ]
        );

        return $this->getSaleReceipt($companyId, $saleId, true);
    }

    /**
     * Retrieve authoritative finalized receipt presentation data for a SalesReturn.
     * Strictly read-only; no financial, inventory, or ledger mutations.
     */
    public function getReturnReceipt(int $companyId, int $returnId, bool $isReprint = false): array
    {
        $return = SalesReturn::where('company_id', $companyId)
            ->with([
                'originalSale.terminal',
                'originalSale.session',
                'customer',
                'branch',
                'processor',
                'items.originalSaleItem',
                'payments'
            ])
            ->findOrFail($returnId);

        $company = $return->branch?->company ?? Company::find($companyId);

        $pointsReversed = CustomerPointLedger::where('company_id', $companyId)
            ->where('sale_id', $return->original_sale_id)
            ->where('points', '<', 0)
            ->where('description', 'like', "%{$return->return_number}%")
            ->sum('points');

        $items = $return->items->map(function ($item) {
            $unitPrice = (float) ($item->originalSaleItem?->unit_price ?? 0);
            $qty = (float) $item->return_quantity;
            return [
                'id' => $item->id,
                'name' => $item->product_name_snapshot ?: ($item->originalSaleItem?->product_name_snapshot ?? 'Item'),
                'variant_name' => $item->variant_description_snapshot ?: ($item->originalSaleItem?->variant_description_snapshot ?? null),
                'sku' => $item->sku_snapshot ?: ($item->originalSaleItem?->sku_snapshot ?? ''),
                'barcode' => $item->barcode_snapshot ?: '',
                'return_quantity' => $qty,
                'condition' => $item->condition,
                'unit_price' => $unitPrice,
                'refund_line_total' => round($unitPrice * $qty, 4),
            ];
        })->toArray();

        $refundPayments = [];
        if ((float) $return->cash_refund_amount > 0) {
            $refundPayments[] = ['method' => 'CASH', 'amount' => (float) $return->cash_refund_amount];
        }
        if ((float) $return->customer_credit_amount > 0) {
            $refundPayments[] = ['method' => 'STORE_CREDIT', 'amount' => (float) $return->customer_credit_amount];
        }

        $reprintCount = AuditLog::where('company_id', $companyId)
            ->where('auditable_type', SalesReturn::class)
            ->where('auditable_id', $returnId)
            ->where('event', 'RECEIPT_REPRINTED')
            ->count();

        return [
            'receipt_type' => 'SALES_RETURN',
            'return_id' => $return->id,
            'return_number' => $return->return_number,
            'original_sale_id' => $return->original_sale_id,
            'original_invoice_number' => $return->originalSale?->invoice_number,
            'return_date' => $return->return_date ? (is_string($return->return_date) ? $return->return_date : $return->return_date->format('Y-m-d H:i:s')) : $return->created_at->format('Y-m-d H:i:s'),
            'return_type' => $return->return_type,
            'reason' => $return->reason,
            'company' => [
                'name' => $company->legal_name ?: ($company->name ?? 'RetailCore'),
                'address' => $company->address ?: 'Dhaka, Bangladesh',
                'phone' => $company->phone ?: '+880 1700-000000',
                'bin' => $company->vat_registration ?: ($company->tax_number ?? 'BIN-000000000'),
                'website' => $company->website ?: '',
                'logo_url' => $company->logo_path ?: null,
            ],
            'branch' => [
                'id' => $return->branch_id,
                'name' => $return->branch?->name ?: 'Main Branch',
            ],
            'processor' => [
                'id' => $return->processed_by,
                'name' => $return->processor?->name ?: 'Cashier',
            ],
            'customer' => $return->customer ? [
                'id' => $return->customer->id,
                'name' => $return->customer->name,
                'mobile' => $return->customer->mobile,
                'code' => $return->customer->customer_code,
            ] : null,
            'items' => $items,
            'total_quantity' => (float) $return->items->sum('return_quantity'),
            'subtotal' => (float) $return->subtotal,
            'discount' => (float) $return->discount,
            'tax' => (float) $return->tax,
            'refund_total' => (float) $return->refund_total,
            'customer_credit_amount' => (float) $return->customer_credit_amount,
            'cash_refund_amount' => (float) $return->cash_refund_amount,
            'exchange_difference' => (float) $return->exchange_difference,
            'payments' => $refundPayments,
            'points_reversed' => (int) abs($pointsReversed),
            'is_reprint' => $isReprint,
            'reprint_count' => $reprintCount,
            'notes' => $return->notes,
            'footer' => [
                'message' => 'SALES RETURN & REFUND VOUCHER',
                'policy' => 'Customer refund processed according to store return policy.',
            ],
        ];
    }

    /**
     * Controlled reprint of a sales return receipt.
     * Records structured AuditLog event with zero financial/inventory mutations.
     */
    public function reprintReturnReceipt(int $companyId, int $returnId, int $userId, ?string $reason = null): array
    {
        $return = SalesReturn::where('company_id', $companyId)->findOrFail($returnId);
        $user = User::find($userId);

        AuditLog::log(
            $user,
            $companyId,
            'RECEIPT_REPRINTED',
            $return,
            null,
            [
                'return_id' => $return->id,
                'return_number' => $return->return_number,
                'reason' => $reason ?: 'Customer requested reprint copy',
                'reprinted_by' => $userId,
                'reprinted_at' => now()->toIso8601String(),
            ]
        );

        return $this->getReturnReceipt($companyId, $returnId, true);
    }
}
