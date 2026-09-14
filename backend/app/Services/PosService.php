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
        return DB::transaction(function () use ($companyId, $terminalId, $cashierId, $openingCash, $notes) {
            $terminal = PosTerminal::where('company_id', $companyId)
                ->where('id', $terminalId)
                ->where('status', 'ACTIVE')
                ->firstOrFail();

            // Check for existing open session for this terminal
            $existing = PosSession::where('pos_terminal_id', $terminalId)
                ->where('status', 'OPEN')
                ->first();

            if ($existing) {
                throw new Exception("Terminal already has an open session.");
            }

            // Check if cashier already has an open session
            $cashierSession = PosSession::where('cashier_id', $cashierId)
                ->where('status', 'OPEN')
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
            // For now, let's say expected cash = opening cash + sum(cash payments for this session)
            $cashPayments = DB::table('sale_payments')
                ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
                ->where('sales.pos_session_id', $sessionId)
                ->where('sales.status', 'COMPLETED')
                ->where('sale_payments.payment_method', 'CASH')
                ->sum('sale_payments.amount');

            $expectedCash = $session->opening_cash + $cashPayments;
            $difference = $closingCash - $expectedCash;

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
}
