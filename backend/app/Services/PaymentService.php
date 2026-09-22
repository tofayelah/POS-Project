<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Purchase;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Carbon\Carbon;

class PaymentService
{
    public function __construct(
        protected AccountingService $accountingService,
        protected AccountMappingService $accountMappingService
    ) {}

    /**
     * Calculate SHA-256 hash of canonical payment parameters.
     */
    public function calculatePayloadHash(array $data): string
    {
        $canonical = [
            'amount' => round((float) ($data['amount'] ?? 0), 4),
            'payment_type' => strtoupper($data['payment_type'] ?? ''),
            'payment_method' => strtoupper($data['payment_method'] ?? 'CASH'),
            'branch_id' => isset($data['branch_id']) && $data['branch_id'] !== null ? (int)$data['branch_id'] : null,
        ];

        return hash('sha256', json_encode($canonical));
    }

    /**
     * Generate unique payment number for company.
     */
    public function generatePaymentNumber(int $companyId): string
    {
        $lastPayment = Payment::where('company_id', $companyId)
            ->lockForUpdate()
            ->orderBy('id', 'desc')
            ->first();

        $nextId = $lastPayment ? intval(substr($lastPayment->payment_number, -6)) + 1 : 1;
        $year = date('Y');

        return 'PAY-' . $year . '-' . str_pad($nextId, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Create a payment record and post the single General Ledger journal entry if accounting is enabled.
     * Enforces payment-level idempotency with atomic database race-condition defense and payload verification.
     */
    public function createPayment(int $companyId, array $data, ?int $userId = null): Payment
    {
        $amount = (float) ($data['amount'] ?? 0);
        if ($amount <= 0) {
            throw new ConflictHttpException("Payment amount must be greater than zero.");
        }

        $paymentType = strtoupper($data['payment_type'] ?? '');
        if (!in_array($paymentType, ['CUSTOMER', 'SUPPLIER'])) {
            throw new ConflictHttpException("Payment type must be either 'CUSTOMER' or 'SUPPLIER'.");
        }

        $paymentMethod = strtoupper($data['payment_method'] ?? 'CASH');

        // Internal callers that do not supply an idempotency key receive a UUID fallback
        $idempotencyKey = $data['idempotency_key'] ?? ('IDEMP-PAY-' . Str::uuid());
        $payloadHash = $this->calculatePayloadHash($data);

        // Pre-flight check: return existing payment if already completed
        $existing = Payment::where('company_id', $companyId)
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existing) {
            if ($existing->payload_hash && $existing->payload_hash !== $payloadHash) {
                throw new ConflictHttpException("Payload mismatch for idempotency key '{$idempotencyKey}'.");
            }
            return $existing->load('allocations');
        }

        try {
            return DB::transaction(function () use ($companyId, $data, $amount, $paymentType, $paymentMethod, $userId, $idempotencyKey, $payloadHash) {
                $paymentNumber = $data['payment_number'] ?? $this->generatePaymentNumber($companyId);

                $payment = Payment::create([
                    'company_id' => $companyId,
                    'branch_id' => $data['branch_id'] ?? null,
                    'payment_number' => $paymentNumber,
                    'amount' => $amount,
                    'payment_method' => $paymentMethod,
                    'payment_type' => $paymentType,
                    'reference_number' => $data['reference_number'] ?? null,
                    'status' => 'COMPLETED',
                    'idempotency_key' => $idempotencyKey,
                    'payload_hash' => $payloadHash,
                ]);

                // Post automated single General Ledger entry if accounting is enabled
                if ($this->accountMappingService->isAccountingEnabled($companyId)) {
                    $cashBankAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_CASH_BANK);

                    if ($paymentType === 'CUSTOMER') {
                        // Customer Payment: Debit Cash/Bank, Credit Accounts Receivable
                        $arAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_ACCOUNTS_RECEIVABLE);

                        $journalData = [
                            'journal_date' => $data['payment_date'] ?? date('Y-m-d'),
                            'reference_type' => 'Payment',
                            'reference_id' => $payment->id,
                            'description' => "Customer Payment: {$payment->payment_number}",
                            'source' => 'PAYMENT',
                            'idempotency_key' => "PAYMENT-{$payment->id}",
                            'lines' => [
                                [
                                    'account_id' => $cashBankAccount->id,
                                    'debit' => $amount,
                                    'credit' => 0,
                                    'branch_id' => $payment->branch_id,
                                    'description' => "Cash/Bank receipt for customer payment {$payment->payment_number}",
                                ],
                                [
                                    'account_id' => $arAccount->id,
                                    'debit' => 0,
                                    'credit' => $amount,
                                    'branch_id' => $payment->branch_id,
                                    'description' => "Accounts receivable clearance for customer payment {$payment->payment_number}",
                                ],
                            ],
                        ];
                    } else {
                        // Supplier Payment: Debit Accounts Payable, Credit Cash/Bank
                        $apAccount = $this->accountMappingService->getAccount($companyId, AccountMappingService::ROLE_ACCOUNTS_PAYABLE);

                        $journalData = [
                            'journal_date' => $data['payment_date'] ?? date('Y-m-d'),
                            'reference_type' => 'Payment',
                            'reference_id' => $payment->id,
                            'description' => "Supplier Payment: {$payment->payment_number}",
                            'source' => 'PAYMENT',
                            'idempotency_key' => "PAYMENT-{$payment->id}",
                            'lines' => [
                                [
                                    'account_id' => $apAccount->id,
                                    'debit' => $amount,
                                    'credit' => 0,
                                    'branch_id' => $payment->branch_id,
                                    'description' => "Accounts payable settlement for supplier payment {$payment->payment_number}",
                                ],
                                [
                                    'account_id' => $cashBankAccount->id,
                                    'debit' => 0,
                                    'credit' => $amount,
                                    'branch_id' => $payment->branch_id,
                                    'description' => "Cash/Bank disbursement for supplier payment {$payment->payment_number}",
                                ],
                            ],
                        ];
                    }

                    $this->accountingService->postAutomatedJournal($companyId, $journalData, $userId);
                }

                AuditLog::log($companyId, $userId, 'PAYMENT_CREATED', $payment->id, 'Payment', "Created Payment {$payment->payment_number}");

                return $payment;
            });
        } catch (\Illuminate\Database\QueryException $e) {
            $is23505 = ($e->getCode() == '23505' || $e->getCode() == '23000');
            $isIdempotencyConstraint = str_contains(strtolower($e->getMessage()), 'idempotency');

            if ($is23505 && $isIdempotencyConstraint) {
                $existing = Payment::where('company_id', $companyId)
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($existing) {
                    if ($existing->payload_hash && $existing->payload_hash !== $payloadHash) {
                        throw new ConflictHttpException("Payload mismatch for idempotency key '{$idempotencyKey}'.");
                    }
                    return $existing->load('allocations');
                }
            }
            throw $e;
        }
    }

    /**
     * Allocate an existing payment to invoices (Sale or Purchase).
     * Subledger-only operation; NO duplicate General Ledger entry is posted.
     */
    public function allocatePayment(int $companyId, int $paymentId, array $allocationsData, ?int $userId = null): array
    {
        return DB::transaction(function () use ($companyId, $paymentId, $allocationsData, $userId) {
            $payment = Payment::where('company_id', $companyId)
                ->lockForUpdate()
                ->findOrFail($paymentId);

            $currentAllocated = (float) $payment->allocations()->sum('amount');
            $createdAllocations = [];

            foreach ($allocationsData as $item) {
                $amount = round((float) ($item['amount'] ?? 0), 4);
                if ($amount <= 0) {
                    throw new ConflictHttpException("Allocation amount must be greater than zero.");
                }

                if (($currentAllocated + $amount) > ((float) $payment->amount + 0.0001)) {
                    $maxAllowed = (float)$payment->amount - $currentAllocated;
                    throw new ConflictHttpException("Total allocations cannot exceed payment amount. Remaining: {$maxAllowed}, Attempted: {$amount}");
                }

                $type = $item['allocatable_type'];
                $id = (int) $item['allocatable_id'];

                $allocatableClass = match ($type) {
                    'Sale', Sale::class => Sale::class,
                    'Purchase', Purchase::class => Purchase::class,
                    default => throw new ConflictHttpException("Invalid allocatable type '{$type}'. Only Sale and Purchase are supported.")
                };

                $model = $allocatableClass::where('id', $id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($model->company_id !== $companyId) {
                    throw new ConflictHttpException("Allocatable document #{$id} belongs to a different company.");
                }

                // Balance check
                $alreadyAllocatedToDoc = (float) $model->paymentAllocations()->sum('amount');
                $docTotal = (float) $model->grand_total;
                $outstanding = round($docTotal - $alreadyAllocatedToDoc, 4);

                if ($amount > ($outstanding + 0.0001)) {
                    throw new ConflictHttpException("Allocation amount ({$amount}) exceeds outstanding document balance ({$outstanding}).");
                }

                // If Sale, update paid_amount and due_amount
                if ($model instanceof Sale) {
                    $newPaid = $alreadyAllocatedToDoc + $amount;
                    $model->paid_amount = $newPaid;
                    $model->due_amount = max(0, $docTotal - $newPaid);
                    $model->payment_status = ($model->due_amount <= 0.0001) ? 'PAID' : (($model->paid_amount > 0) ? 'PARTIAL' : 'DUE');
                    $model->save();
                }

                $allocation = PaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'allocatable_type' => $allocatableClass,
                    'allocatable_id' => $model->id,
                    'amount' => $amount,
                ]);

                $createdAllocations[] = $allocation;
                $currentAllocated += $amount;

                AuditLog::log(
                    $companyId,
                    $userId,
                    'PAYMENT_ALLOCATED',
                    $allocation->id,
                    'PaymentAllocation',
                    "Allocated {$amount} of payment {$payment->payment_number} to {$type} #{$model->id}"
                );
            }

            return $createdAllocations;
        });
    }
}
