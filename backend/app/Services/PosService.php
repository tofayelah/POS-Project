<?php

namespace App\Services;

use App\Models\PosTerminal;
use App\Models\PosSession;
use Illuminate\Support\Facades\DB;
use Exception;

class PosService
{
    public function getTerminals($companyId, $filters = [])
    {
        $query = PosTerminal::where('company_id', $companyId);
        if (isset($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        return $query->get();
    }

    public function createTerminal($companyId, $data)
    {
        $data['company_id'] = $companyId;
        return PosTerminal::create($data);
    }

    public function openSession($companyId, $terminalId, $cashierId, $openingCash, $notes = null)
    {
        if ($openingCash < 0) {
            throw new Exception("Opening cash float cannot be negative.");
        }

        return DB::transaction(function () use ($companyId, $terminalId, $cashierId, $openingCash, $notes) {
            $terminal = PosTerminal::where('company_id', $companyId)
                ->where('id', $terminalId)
                ->where('status', 'ACTIVE')
                ->lockForUpdate()
                ->firstOrFail();

            // Check if cashier has access to this terminal's branch
            $cashier = \App\Models\User::find($cashierId);
            if ($cashier && method_exists($cashier, 'hasRole') && !$cashier->hasRole('Super Admin')) {
                if ($terminal->branch_id && method_exists($cashier, 'branches')) {
                    $assignedBranchIds = $cashier->branches()->where('branches.company_id', $companyId)->pluck('branches.id')->toArray();
                    if (!empty($assignedBranchIds) && !in_array($terminal->branch_id, $assignedBranchIds)) {
                        throw new Exception("Cashier does not have access to this terminal's branch.");
                    }
                }
            }

            // Check for existing open session for this terminal
            $existing = PosSession::where('pos_terminal_id', $terminalId)
                ->where('status', 'OPEN')
                ->lockForUpdate()
                ->first();

            if ($existing) {
                throw new Exception("Terminal already has an open session.");
            }

            // Check if cashier already has an open session
            $cashierSession = PosSession::where('cashier_id', $cashierId)
                ->where('status', 'OPEN')
                ->lockForUpdate()
                ->first();

            if ($cashierSession) {
                throw new Exception("Cashier already has an open session on terminal {$cashierSession->terminal->terminal_name}.");
            }

            $sessionNumber = 'SES-' . date('Ymd') . '-' . rand(1000, 9999);

            return PosSession::create([
                'company_id' => $companyId,
                'business_unit_id' => $terminal->business_unit_id,
                'branch_id' => $terminal->branch_id,
                'warehouse_id' => $terminal->warehouse_id,
                'pos_terminal_id' => $terminalId,
                'cashier_id' => $cashierId,
                'session_number' => $sessionNumber,
                'opening_cash' => $openingCash,
                'notes' => $notes,
                'status' => 'OPEN',
            ]);
        });
    }

    public function closeSession($companyId, $sessionId, $closingCash, $closedById, $notes = null)
    {
        return DB::transaction(function () use ($companyId, $sessionId, $closingCash, $closedById, $notes) {
            $session = PosSession::where('company_id', $companyId)
                ->where('id', $sessionId)
                ->where('status', 'OPEN')
                ->lockForUpdate()
                ->firstOrFail();

            // Calculate expected cash based on cash sales during the session
            // Cash drawer includes physical CASH only
            $cashPayments = DB::table('sale_payments')
                ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
                ->where('sales.pos_session_id', $sessionId)
                ->where('sales.status', 'COMPLETED')
                ->where('sale_payments.payment_method', 'CASH')
                ->sum('sale_payments.amount');

            $expectedCash = (float) $session->opening_cash + (float) $cashPayments;
            $difference = (float) $closingCash - (float) $expectedCash;

            $session->update([
                'closing_cash' => $closingCash,
                'expected_cash' => $expectedCash,
                'cash_difference' => $difference,
                'closed_at' => now(),
                'closed_by' => $closedById,
                'status' => 'CLOSED',
                'notes' => $notes ? $session->notes . "\n" . $notes : $session->notes
            ]);

            return $session;
        });
    }

    public function getSessionReconciliation($companyId, $sessionId)
    {
        $session = PosSession::where('company_id', $companyId)
            ->with(['terminal', 'cashier'])
            ->findOrFail($sessionId);

        $salesQuery = \App\Models\Sale::where('company_id', $companyId)
            ->where('pos_session_id', $sessionId)
            ->where('status', 'COMPLETED');

        $salesCount = (clone $salesQuery)->count();
        $grossSales = (clone $salesQuery)->sum('subtotal');
        $discountTotal = (clone $salesQuery)->sum('discount_total');
        $taxTotal = (clone $salesQuery)->sum('tax_total');
        $grandTotal = (clone $salesQuery)->sum('grand_total');
        $paidTotal = (clone $salesQuery)->sum('paid_amount');
        $dueTotal = (clone $salesQuery)->sum('due_amount');
        $avgBasketValue = $salesCount > 0 ? round($grandTotal / $salesCount, 2) : 0;

        $paymentRows = DB::table('sale_payments')
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->where('sales.company_id', $companyId)
            ->where('sales.pos_session_id', $sessionId)
            ->where('sales.status', 'COMPLETED')
            ->select('sale_payments.payment_method', DB::raw('SUM(sale_payments.amount) as total_amount'))
            ->groupBy('sale_payments.payment_method')
            ->pluck('total_amount', 'payment_method')
            ->toArray();

        $cashSales = (float) ($paymentRows['CASH'] ?? 0);
        $cardSales = (float) ($paymentRows['CARD'] ?? 0);
        $bkashSales = (float) ($paymentRows['BKASH'] ?? 0);
        $nagadSales = (float) ($paymentRows['NAGAD'] ?? 0);
        $bankSales = (float) ($paymentRows['BANK'] ?? 0);
        $pointRedemptionSales = (float) ($paymentRows['POINT_REDEMPTION'] ?? 0);

        $pointsEarned = DB::table('customer_point_ledgers')
            ->join('sales', 'sales.id', '=', 'customer_point_ledgers.sale_id')
            ->where('sales.company_id', $companyId)
            ->where('sales.pos_session_id', $sessionId)
            ->where('customer_point_ledgers.transaction_type', 'EARN')
            ->sum('customer_point_ledgers.points');

        $pointsRedeemed = DB::table('customer_point_ledgers')
            ->join('sales', 'sales.id', '=', 'customer_point_ledgers.sale_id')
            ->where('sales.company_id', $companyId)
            ->where('sales.pos_session_id', $sessionId)
            ->where('customer_point_ledgers.transaction_type', 'REDEEM')
            ->sum('customer_point_ledgers.points');

        $expectedClosingCash = (float) $session->opening_cash + $cashSales;
        $actualCash = $session->closing_cash !== null ? (float) $session->closing_cash : null;
        $variance = $session->cash_difference !== null ? (float) $session->cash_difference : ($actualCash !== null ? $actualCash - $expectedClosingCash : null);

        $branch = \App\Models\Branch::find($session->branch_id);

        return [
            'session_info' => [
                'id' => $session->id,
                'session_number' => $session->session_number,
                'status' => $session->status,
                'opened_at' => $session->opened_at ?? $session->created_at,
                'closed_at' => $session->closed_at,
                'terminal' => [
                    'id' => $session->terminal?->id,
                    'name' => $session->terminal?->terminal_name,
                    'code' => $session->terminal?->terminal_code,
                ],
                'branch' => [
                    'id' => $branch?->id,
                    'name' => $branch?->name,
                ],
                'cashier' => [
                    'id' => $session->cashier?->id,
                    'name' => $session->cashier?->name,
                ],
            ],
            'cash' => [
                'opening_cash' => (float) $session->opening_cash,
                'cash_sales' => $cashSales,
                'cash_in' => 0.00,
                'cash_out' => 0.00,
                'cash_refunds' => 0.00,
                'expected_cash' => $expectedClosingCash,
                'actual_cash' => $actualCash,
                'variance' => $variance,
            ],
            'non_cash' => [
                'card_total' => $cardSales,
                'bkash_total' => $bkashSales,
                'nagad_total' => $nagadSales,
                'bank_total' => $bankSales,
                'point_redemption_total' => $pointRedemptionSales,
                'other_total' => 0.00,
            ],
            'loyalty' => [
                'points_redeemed' => (int) $pointsRedeemed,
                'redemption_value' => $pointRedemptionSales,
                'points_earned' => (int) $pointsEarned,
            ],
            'sales' => [
                'gross_sales' => (float) $grossSales,
                'discount_total' => (float) $discountTotal,
                'tax_total' => (float) $taxTotal,
                'net_sales' => (float) $grandTotal,
                'transactions_count' => $salesCount,
                'average_basket_value' => (float) $avgBasketValue,
            ],
            'credit' => [
                'credit_sales' => (float) $dueTotal,
                'amount_paid' => (float) $paidTotal,
                'outstanding_due' => (float) $dueTotal,
            ],
        ];
    }
}
