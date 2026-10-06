<?php

namespace App\Services;

use App\Models\PosTerminal;
use App\Models\PosSession;
use App\Models\PosCashMovement;
use App\Models\Sale;
use App\Models\SalesReturn;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\Branch;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use DomainException;
use Exception;

class PosShiftService
{
    public function __construct(
        protected AccountingService $accountingService,
        protected AccountMappingService $accountMappingService
    ) {}

    /**
     * Open a new shift/session for a terminal.
     */
    public function openShift(int $companyId, int $terminalId, int $cashierId, float|string $openingCash, ?string $notes = null): PosSession
    {
        $openingCash = (float) $openingCash;
        if ($openingCash < 0) {
            throw new DomainException("Opening cash float cannot be negative.");
        }

        return DB::transaction(function () use ($companyId, $terminalId, $cashierId, $openingCash, $notes) {
            $terminal = PosTerminal::where('company_id', $companyId)
                ->where('id', $terminalId)
                ->where('status', 'ACTIVE')
                ->lockForUpdate()
                ->firstOrFail();

            // Check cashier branch authorization
            $cashier = User::find($cashierId);
            if ($cashier && method_exists($cashier, 'hasRole') && !$cashier->hasRole('Super Admin')) {
                if ($terminal->branch_id && method_exists($cashier, 'branches')) {
                    $assignedBranchIds = $cashier->branches()->where('branches.company_id', $companyId)->pluck('branches.id')->toArray();
                    if (!empty($assignedBranchIds) && !in_array($terminal->branch_id, $assignedBranchIds)) {
                        throw new DomainException("Cashier does not have access to this terminal's branch.");
                    }
                }
            }

            // Check for existing open shift for this terminal
            $existingTerminalShift = PosSession::where('pos_terminal_id', $terminalId)
                ->where('status', 'OPEN')
                ->lockForUpdate()
                ->first();

            if ($existingTerminalShift) {
                throw new DomainException("Terminal already has an open session (#{$existingTerminalShift->session_number}).");
            }

            // Check if cashier already has an active open shift
            $existingCashierShift = PosSession::where('cashier_id', $cashierId)
                ->where('status', 'OPEN')
                ->lockForUpdate()
                ->first();

            if ($existingCashierShift) {
                $termName = $existingCashierShift->terminal?->terminal_name ?? 'another terminal';
                throw new DomainException("Cashier already has an open session on {$termName} (#{$existingCashierShift->session_number}).");
            }

            $sessionNumber = 'SES-' . date('Ymd') . '-' . Str::upper(Str::random(6));

            $session = PosSession::create([
                'company_id' => $companyId,
                'business_unit_id' => $terminal->business_unit_id,
                'branch_id' => $terminal->branch_id,
                'warehouse_id' => $terminal->warehouse_id,
                'pos_terminal_id' => $terminalId,
                'cashier_id' => $cashierId,
                'session_number' => $sessionNumber,
                'opened_at' => now(),
                'opening_cash' => $openingCash,
                'notes' => $notes,
                'status' => 'OPEN',
            ]);

            AuditLog::log(
                $cashier,
                $companyId,
                'POS_SHIFT_OPENED',
                $session,
                null,
                [
                    'session_number' => $sessionNumber,
                    'pos_terminal_id' => $terminalId,
                    'opening_cash' => $openingCash,
                ]
            );

            return $session->load(['terminal.branch', 'cashier']);
        });
    }

    /**
     * Get active shift for a cashier.
     */
    public function getCurrentShift(int $companyId, int $userId): ?PosSession
    {
        return PosSession::with(['terminal.branch', 'cashier'])
            ->where('company_id', $companyId)
            ->where('cashier_id', $userId)
            ->where('status', 'OPEN')
            ->first();
    }

    /**
     * Find shift by ID scoped to company.
     */
    public function getShift(int $companyId, int $sessionId): PosSession
    {
        return PosSession::where('company_id', $companyId)
            ->with(['terminal.branch', 'cashier', 'varianceApprover'])
            ->findOrFail($sessionId);
    }

    /**
     * List shifts with filters and pagination.
     */
    public function listShifts(int $companyId, array $filters = [])
    {
        $query = PosSession::where('company_id', $companyId)
            ->with(['terminal.branch', 'cashier', 'varianceApprover', 'closedBy']);

        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        if (!empty($filters['pos_terminal_id'])) {
            $query->where('pos_terminal_id', $filters['pos_terminal_id']);
        }

        if (!empty($filters['cashier_id'])) {
            $query->where('cashier_id', $filters['cashier_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', strtoupper($filters['status']));
        }

        if (!empty($filters['from_date'])) {
            $query->whereDate('opened_at', '>=', $filters['from_date']);
        }

        if (!empty($filters['to_date'])) {
            $query->whereDate('opened_at', '<=', $filters['to_date']);
        }

        $perPage = isset($filters['per_page']) ? max(1, min(100, (int) $filters['per_page'])) : 15;

        return $query->orderBy('id', 'desc')->paginate($perPage);
    }

    /**
     * Record cash in (adding float / cash into the drawer).
     */
    public function cashIn(int $companyId, int $sessionId, int $userId, array $data): PosCashMovement
    {
        $amount = (float) ($data['amount'] ?? 0);
        if ($amount <= 0) {
            throw new DomainException("Cash in amount must be greater than zero.");
        }

        if (empty($data['reason'])) {
            throw new DomainException("A reason is mandatory for cash in transactions.");
        }

        return DB::transaction(function () use ($companyId, $sessionId, $userId, $amount, $data) {
            $session = PosSession::where('company_id', $companyId)
                ->where('id', $sessionId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($session->status !== 'OPEN') {
                throw new DomainException("Cannot perform cash in. Shift is {$session->status}.");
            }

            // Check idempotency
            if (!empty($data['idempotency_key'])) {
                $existing = PosCashMovement::where('company_id', $companyId)
                    ->where('idempotency_key', $data['idempotency_key'])
                    ->first();
                if ($existing) return $existing;
            }

            $movementNumber = 'CIN-' . date('Ymd') . '-' . Str::upper(Str::random(6));

            $movement = PosCashMovement::create([
                'company_id' => $companyId,
                'branch_id' => $session->branch_id,
                'pos_session_id' => $sessionId,
                'pos_terminal_id' => $session->pos_terminal_id,
                'user_id' => $userId,
                'movement_number' => $movementNumber,
                'type' => 'CASH_IN',
                'amount' => $amount,
                'reason' => $data['reason'],
                'reference' => $data['reference'] ?? null,
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Update session cash_in_total
            $session->increment('cash_in_total', $amount);

            $user = User::find($userId);
            AuditLog::log(
                $user,
                $companyId,
                'POS_SHIFT_CASH_IN',
                $movement,
                null,
                [
                    'session_id' => $sessionId,
                    'movement_number' => $movementNumber,
                    'amount' => $amount,
                    'reason' => $data['reason'],
                ]
            );

            // Optional automated accounting posting
            if ($this->accountMappingService->isAccountingEnabled($companyId)) {
                $this->postCashMovementJournal($companyId, $session, $movement, 'IN', $userId);
            }

            return $movement;
        });
    }

    /**
     * Record cash out (drawer drop / petty expense from the till).
     */
    public function cashOut(int $companyId, int $sessionId, int $userId, array $data): PosCashMovement
    {
        $amount = (float) ($data['amount'] ?? 0);
        if ($amount <= 0) {
            throw new DomainException("Cash out amount must be greater than zero.");
        }

        if (empty($data['reason'])) {
            throw new DomainException("A reason is mandatory for cash out transactions.");
        }

        return DB::transaction(function () use ($companyId, $sessionId, $userId, $amount, $data) {
            $session = PosSession::where('company_id', $companyId)
                ->where('id', $sessionId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($session->status !== 'OPEN') {
                throw new DomainException("Cannot perform cash out. Shift is {$session->status}.");
            }

            // Prevent unauthorized cash out exceeding physical cash in till
            $expected = $this->calculateExpectedCash($companyId, $sessionId);
            $currentEstimatedCash = $expected['expected_cash'];

            if ($amount > $currentEstimatedCash) {
                throw new DomainException("Cash out amount (৳" . number_format($amount, 2) . ") exceeds current estimated drawer cash (৳" . number_format($currentEstimatedCash, 2) . ").");
            }

            // Check idempotency
            if (!empty($data['idempotency_key'])) {
                $existing = PosCashMovement::where('company_id', $companyId)
                    ->where('idempotency_key', $data['idempotency_key'])
                    ->first();
                if ($existing) return $existing;
            }

            $movementNumber = 'COUT-' . date('Ymd') . '-' . Str::upper(Str::random(6));

            $movement = PosCashMovement::create([
                'company_id' => $companyId,
                'branch_id' => $session->branch_id,
                'pos_session_id' => $sessionId,
                'pos_terminal_id' => $session->pos_terminal_id,
                'user_id' => $userId,
                'movement_number' => $movementNumber,
                'type' => 'CASH_OUT',
                'amount' => $amount,
                'reason' => $data['reason'],
                'reference' => $data['reference'] ?? null,
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Update session cash_out_total
            $session->increment('cash_out_total', $amount);

            $user = User::find($userId);
            AuditLog::log(
                $user,
                $companyId,
                'POS_SHIFT_CASH_OUT',
                $movement,
                null,
                [
                    'session_id' => $sessionId,
                    'movement_number' => $movementNumber,
                    'amount' => $amount,
                    'reason' => $data['reason'],
                ]
            );

            // Optional automated accounting posting
            if ($this->accountMappingService->isAccountingEnabled($companyId)) {
                $this->postCashMovementJournal($companyId, $session, $movement, 'OUT', $userId);
            }

            return $movement;
        });
    }

    /**
     * Compute authoritative expected cash and tender breakdown.
     */
    public function calculateExpectedCash(int $companyId, int $sessionId): array
    {
        $session = PosSession::where('company_id', $companyId)->findOrFail($sessionId);

        $openingCash = (float) $session->opening_cash;

        // Authoritative Cash Sales
        $cashSales = (float) DB::table('sale_payments')
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->where('sales.company_id', $companyId)
            ->where('sales.pos_session_id', $sessionId)
            ->where('sales.status', 'COMPLETED')
            ->where('sale_payments.payment_method', 'CASH')
            ->sum('sale_payments.amount');

        // Cash In movements
        $cashIn = (float) PosCashMovement::where('company_id', $companyId)
            ->where('pos_session_id', $sessionId)
            ->where('type', 'CASH_IN')
            ->sum('amount');

        // Cash Out movements
        $cashOut = (float) PosCashMovement::where('company_id', $companyId)
            ->where('pos_session_id', $sessionId)
            ->where('type', 'CASH_OUT')
            ->sum('amount');

        // Authoritative Cash Refunds
        $cashRefunds = (float) DB::table('sales_returns')
            ->where('company_id', $companyId)
            ->where('pos_session_id', $sessionId)
            ->where('status', 'COMPLETED')
            ->sum('cash_refund_amount');

        // Adjustments (if any)
        $cashAdjustments = (float) PosCashMovement::where('company_id', $companyId)
            ->where('pos_session_id', $sessionId)
            ->where('type', 'ADJUSTMENT')
            ->sum('amount');

        $expectedCash = $openingCash + $cashSales + $cashIn - $cashOut - $cashRefunds + $cashAdjustments;

        return [
            'opening_cash' => round($openingCash, 4),
            'cash_sales' => round($cashSales, 4),
            'cash_in' => round($cashIn, 4),
            'cash_out' => round($cashOut, 4),
            'cash_refunds' => round($cashRefunds, 4),
            'cash_adjustments' => round($cashAdjustments, 4),
            'expected_cash' => round($expectedCash, 4),
        ];
    }

    /**
     * Close shift atomically with expected cash, actual cash, variance, and audit log.
     */
    public function closeShift(int $companyId, int $sessionId, int $userId, float|string $closingCash, ?string $notes = null, ?array $denominations = null): PosSession
    {
        $closingCash = (float) $closingCash;
        if ($closingCash < 0) {
            throw new DomainException("Closing cash cannot be negative.");
        }

        return DB::transaction(function () use ($companyId, $sessionId, $userId, $closingCash, $notes, $denominations) {
            $session = PosSession::where('company_id', $companyId)
                ->where('id', $sessionId)
                ->where('status', 'OPEN')
                ->lockForUpdate()
                ->firstOrFail();

            $user = User::find($userId);

            AuditLog::log(
                $user,
                $companyId,
                'POS_SHIFT_CLOSING_STARTED',
                $session,
                null,
                ['closing_cash_input' => $closingCash]
            );

            // Calculate backend-authoritative expected cash
            $calc = $this->calculateExpectedCash($companyId, $sessionId);
            $expectedCash = $calc['expected_cash'];
            $variance = round($closingCash - $expectedCash, 4);

            if (abs($variance) < 0.0001) {
                $varianceStatus = 'BALANCED';
            } elseif ($variance < 0) {
                $varianceStatus = 'SHORT';
            } else {
                $varianceStatus = 'OVER';
            }

            AuditLog::log(
                $user,
                $companyId,
                'POS_SHIFT_COUNTED',
                $session,
                null,
                [
                    'expected_cash' => $expectedCash,
                    'closing_cash' => $closingCash,
                    'variance' => $variance,
                    'variance_status' => $varianceStatus,
                    'denominations' => $denominations,
                ]
            );

            $combinedNotes = $notes
                ? ($session->notes ? $session->notes . "\n" . $notes : $notes)
                : $session->notes;

            $session->update([
                'closing_cash' => $closingCash,
                'expected_cash' => $expectedCash,
                'cash_difference' => $variance,
                'variance_status' => $varianceStatus,
                'cash_sales_total' => $calc['cash_sales'],
                'cash_in_total' => $calc['cash_in'],
                'cash_out_total' => $calc['cash_out'],
                'cash_refunds_total' => $calc['cash_refunds'],
                'denominations' => $denominations,
                'closed_at' => now(),
                'closed_by' => $userId,
                'status' => 'CLOSED',
                'notes' => $combinedNotes,
            ]);

            // Post variance GL entry if accounting enabled and variance != 0
            if (abs($variance) >= 0.0001 && $this->accountMappingService->isAccountingEnabled($companyId)) {
                $this->postVarianceJournal($companyId, $session, $variance, $userId);
            }

            AuditLog::log(
                $user,
                $companyId,
                'POS_SHIFT_CLOSED',
                $session,
                null,
                [
                    'expected_cash' => $expectedCash,
                    'closing_cash' => $closingCash,
                    'variance' => $variance,
                    'variance_status' => $varianceStatus,
                ]
            );

            return $session->fresh(['terminal.branch', 'cashier', 'closedBy', 'varianceApprover']);
        });
    }

    /**
     * Supervisor variance approval.
     */
    public function approveVariance(int $companyId, int $sessionId, int $supervisorId, ?string $notes = null): PosSession
    {
        return DB::transaction(function () use ($companyId, $sessionId, $supervisorId, $notes) {
            $session = PosSession::where('company_id', $companyId)
                ->where('id', $sessionId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($session->status !== 'CLOSED') {
                throw new DomainException("Cannot approve variance on an open shift.");
            }

            $supervisor = User::find($supervisorId);
            if ($supervisor && method_exists($supervisor, 'hasAnyPermission')) {
                if (!$supervisor->hasAnyPermission(['pos_shifts.approve_variance', 'pos.manage']) && !$supervisor->hasRole('Super Admin')) {
                    throw new DomainException("Unauthorized: Supervisor permission required to approve variance.");
                }
            }

            $combinedNotes = $notes
                ? ($session->notes ? $session->notes . "\n[Variance Approved]: " . $notes : "[Variance Approved]: " . $notes)
                : $session->notes;

            $session->update([
                'variance_approved_by' => $supervisorId,
                'variance_approved_at' => now(),
                'notes' => $combinedNotes,
            ]);

            AuditLog::log(
                $supervisor,
                $companyId,
                'POS_SHIFT_VARIANCE_APPROVED',
                $session,
                null,
                [
                    'session_id' => $sessionId,
                    'supervisor_id' => $supervisorId,
                    'variance' => $session->cash_difference,
                    'notes' => $notes,
                ]
            );

            return $session->fresh(['terminal.branch', 'cashier', 'closedBy', 'varianceApprover']);
        });
    }

    /**
     * Get complete reconciliation summary.
     */
    public function getShiftReconciliation(int $companyId, int $sessionId): array
    {
        $session = PosSession::where('company_id', $companyId)
            ->with(['terminal.branch', 'cashier', 'closedBy', 'varianceApprover'])
            ->findOrFail($sessionId);

        $salesQuery = Sale::where('company_id', $companyId)
            ->where('pos_session_id', $sessionId)
            ->where('status', 'COMPLETED');

        $salesCount = (clone $salesQuery)->count();
        $grossSales = (float) (clone $salesQuery)->sum('subtotal');
        $discountTotal = (float) (clone $salesQuery)->sum('discount_total');
        $taxTotal = (float) (clone $salesQuery)->sum('tax_total');
        $grandTotal = (float) (clone $salesQuery)->sum('grand_total');
        $paidTotal = (float) (clone $salesQuery)->sum('paid_amount');
        $dueTotal = (float) (clone $salesQuery)->sum('due_amount');
        $avgBasketValue = $salesCount > 0 ? round($grandTotal / $salesCount, 2) : 0.0;

        // Payments grouped by method
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
        $storeCreditSales = (float) ($paymentRows['STORE_CREDIT'] ?? 0);
        $pointRedemptionSales = (float) ($paymentRows['POINT_REDEMPTION'] ?? 0);

        // Loyalty points
        $pointsEarned = (int) DB::table('customer_point_ledgers')
            ->join('sales', 'sales.id', '=', 'customer_point_ledgers.sale_id')
            ->where('sales.company_id', $companyId)
            ->where('sales.pos_session_id', $sessionId)
            ->where('customer_point_ledgers.transaction_type', 'EARN')
            ->sum('customer_point_ledgers.points');

        $pointsRedeemed = (int) DB::table('customer_point_ledgers')
            ->join('sales', 'sales.id', '=', 'customer_point_ledgers.sale_id')
            ->where('sales.company_id', $companyId)
            ->where('sales.pos_session_id', $sessionId)
            ->where('customer_point_ledgers.transaction_type', 'REDEEM')
            ->sum('customer_point_ledgers.points');

        $calc = $this->calculateExpectedCash($companyId, $sessionId);
        $expectedCash = $calc['expected_cash'];
        $actualCash = $session->closing_cash !== null ? (float) $session->closing_cash : null;
        $variance = $session->cash_difference !== null ? (float) $session->cash_difference : ($actualCash !== null ? round($actualCash - $expectedCash, 4) : null);

        $branch = $session->terminal?->branch;

        $movements = PosCashMovement::where('company_id', $companyId)
            ->where('pos_session_id', $sessionId)
            ->with('user:id,name')
            ->orderBy('id', 'asc')
            ->get();

        return [
            'session_info' => [
                'id' => $session->id,
                'session_number' => $session->session_number,
                'status' => $session->status,
                'opened_at' => $session->opened_at ?? $session->created_at,
                'closed_at' => $session->closed_at,
                'variance_status' => $session->variance_status,
                'variance_approved_at' => $session->variance_approved_at,
                'variance_approved_by' => $session->varianceApprover ? [
                    'id' => $session->varianceApprover->id,
                    'name' => $session->varianceApprover->name,
                ] : null,
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
                'closed_by' => [
                    'id' => $session->closedBy?->id,
                    'name' => $session->closedBy?->name,
                ],
            ],
            'cash' => [
                'opening_cash' => (float) $session->opening_cash,
                'cash_sales' => $cashSales,
                'cash_in' => $calc['cash_in'],
                'cash_out' => $calc['cash_out'],
                'cash_refunds' => $calc['cash_refunds'],
                'cash_adjustments' => $calc['cash_adjustments'],
                'expected_cash' => $expectedCash,
                'actual_cash' => $actualCash,
                'variance' => $variance,
                'variance_status' => $session->variance_status,
            ],
            'non_cash' => [
                'card_total' => $cardSales,
                'bkash_total' => $bkashSales,
                'nagad_total' => $nagadSales,
                'bank_total' => $bankSales,
                'store_credit_total' => $storeCreditSales,
                'point_redemption_total' => $pointRedemptionSales,
            ],
            'loyalty' => [
                'points_redeemed' => $pointsRedeemed,
                'redemption_value' => $pointRedemptionSales,
                'points_earned' => $pointsEarned,
            ],
            'sales' => [
                'gross_sales' => $grossSales,
                'discount_total' => $discountTotal,
                'tax_total' => $taxTotal,
                'net_sales' => $grandTotal,
                'transactions_count' => $salesCount,
                'average_basket_value' => $avgBasketValue,
            ],
            'credit' => [
                'credit_sales' => $dueTotal,
                'amount_paid' => $paidTotal,
                'outstanding_due' => $dueTotal,
            ],
            'cash_movements' => $movements,
            'denominations' => $session->denominations,
        ];
    }

    /**
     * GL journal for Cash In / Cash Out.
     */
    protected function postCashMovementJournal(int $companyId, PosSession $session, PosCashMovement $movement, string $direction, int $userId): void
    {
        try {
            $terminalCashAccountId = $session->terminal?->default_cash_account_id
                ?: $this->accountMappingService->getAccountId($companyId, AccountMappingService::ROLE_CASH_BANK);

            $vaultCashAccountId = $this->accountMappingService->getAccountId($companyId, AccountMappingService::ROLE_CASH_BANK);

            if ($direction === 'IN') {
                // Debit Drawer Cash, Credit Source Cash/Vault
                $journalData = [
                    'journal_date' => now()->toDateString(),
                    'reference_type' => 'PosCashMovement',
                    'reference_id' => $movement->id,
                    'description' => "POS Cash In: {$movement->movement_number} - {$movement->reason}",
                    'source' => 'POS',
                    'idempotency_key' => "POS-CIN-{$movement->id}",
                    'lines' => [
                        [
                            'account_id' => $terminalCashAccountId,
                            'debit' => (float) $movement->amount,
                            'credit' => 0,
                            'branch_id' => $session->branch_id,
                            'description' => "Drawer Cash In ({$movement->movement_number})",
                        ],
                        [
                            'account_id' => $vaultCashAccountId,
                            'debit' => 0,
                            'credit' => (float) $movement->amount,
                            'branch_id' => $session->branch_id,
                            'description' => "Source Cash Clearance ({$movement->movement_number})",
                        ],
                    ],
                ];
            } else {
                // Cash Out: Debit Operating Expense, Credit Drawer Cash
                $expenseAccountId = $this->accountMappingService->isConfigured($companyId, AccountMappingService::ROLE_OPERATING_EXPENSE)
                    ? $this->accountMappingService->getAccountId($companyId, AccountMappingService::ROLE_OPERATING_EXPENSE)
                    : $vaultCashAccountId;

                $journalData = [
                    'journal_date' => now()->toDateString(),
                    'reference_type' => 'PosCashMovement',
                    'reference_id' => $movement->id,
                    'description' => "POS Cash Out: {$movement->movement_number} - {$movement->reason}",
                    'source' => 'POS',
                    'idempotency_key' => "POS-COUT-{$movement->id}",
                    'lines' => [
                        [
                            'account_id' => $expenseAccountId,
                            'debit' => (float) $movement->amount,
                            'credit' => 0,
                            'branch_id' => $session->branch_id,
                            'description' => "Drawer Cash Out Expense/Drop ({$movement->movement_number})",
                        ],
                        [
                            'account_id' => $terminalCashAccountId,
                            'debit' => 0,
                            'credit' => (float) $movement->amount,
                            'branch_id' => $session->branch_id,
                            'description' => "Drawer Cash Out Disbursement ({$movement->movement_number})",
                        ],
                    ],
                ];
            }

            $journal = $this->accountingService->createJournal($companyId, $journalData, $userId);
            $this->accountingService->postJournal($companyId, $journal->id, $userId);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * GL journal for Shift Variance (Cash Short / Cash Over).
     */
    protected function postVarianceJournal(int $companyId, PosSession $session, float $variance, int $userId): void
    {
        try {
            $terminalCashAccountId = $session->terminal?->default_cash_account_id
                ?: $this->accountMappingService->getAccountId($companyId, AccountMappingService::ROLE_CASH_BANK);

            if ($variance < 0) {
                // Shortage: Debit Cash Shortage Expense, Credit Drawer Cash
                $amount = abs($variance);
                $shortageAccountId = $this->accountMappingService->isConfigured($companyId, AccountMappingService::ROLE_CASH_SHORTAGE)
                    ? $this->accountMappingService->getAccountId($companyId, AccountMappingService::ROLE_CASH_SHORTAGE)
                    : ($this->accountMappingService->isConfigured($companyId, AccountMappingService::ROLE_OPERATING_EXPENSE)
                        ? $this->accountMappingService->getAccountId($companyId, AccountMappingService::ROLE_OPERATING_EXPENSE)
                        : $terminalCashAccountId);

                $journalData = [
                    'journal_date' => now()->toDateString(),
                    'reference_type' => 'PosSession',
                    'reference_id' => $session->id,
                    'description' => "POS Shift Cash Shortage: {$session->session_number}",
                    'source' => 'POS',
                    'idempotency_key' => "POS-SHIFT-SHORT-{$session->id}",
                    'lines' => [
                        [
                            'account_id' => $shortageAccountId,
                            'debit' => $amount,
                            'credit' => 0,
                            'branch_id' => $session->branch_id,
                            'description' => "Cash Shortage ({$session->session_number})",
                        ],
                        [
                            'account_id' => $terminalCashAccountId,
                            'debit' => 0,
                            'credit' => $amount,
                            'branch_id' => $session->branch_id,
                            'description' => "Drawer Cash Shortage Adjustment ({$session->session_number})",
                        ],
                    ],
                ];
            } else {
                // Overage: Debit Drawer Cash, Credit Cash Overage Income
                $amount = $variance;
                $overageAccountId = $this->accountMappingService->isConfigured($companyId, AccountMappingService::ROLE_CASH_OVERAGE)
                    ? $this->accountMappingService->getAccountId($companyId, AccountMappingService::ROLE_CASH_OVERAGE)
                    : ($this->accountMappingService->isConfigured($companyId, AccountMappingService::ROLE_OTHER_INCOME)
                        ? $this->accountMappingService->getAccountId($companyId, AccountMappingService::ROLE_OTHER_INCOME)
                        : $terminalCashAccountId);

                $journalData = [
                    'journal_date' => now()->toDateString(),
                    'reference_type' => 'PosSession',
                    'reference_id' => $session->id,
                    'description' => "POS Shift Cash Surplus: {$session->session_number}",
                    'source' => 'POS',
                    'idempotency_key' => "POS-SHIFT-OVER-{$session->id}",
                    'lines' => [
                        [
                            'account_id' => $terminalCashAccountId,
                            'debit' => $amount,
                            'credit' => 0,
                            'branch_id' => $session->branch_id,
                            'description' => "Drawer Cash Surplus Adjustment ({$session->session_number})",
                        ],
                        [
                            'account_id' => $overageAccountId,
                            'debit' => 0,
                            'credit' => $amount,
                            'branch_id' => $session->branch_id,
                            'description' => "Cash Over Income ({$session->session_number})",
                        ],
                    ],
                ];
            }

            $journal = $this->accountingService->createJournal($companyId, $journalData, $userId);
            $this->accountingService->postJournal($companyId, $journal->id, $userId);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
