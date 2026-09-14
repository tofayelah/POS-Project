<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\ExpenseItem;
use App\Models\ExpensePayment;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Carbon\Carbon;

class ExpenseService
{
    /**
     * Generate next expense number
     */
    public function generateExpenseNumber($companyId)
    {
        return DB::transaction(function () use ($companyId) {
            $lastExpense = Expense::where('company_id', $companyId)
                ->lockForUpdate()
                ->orderBy('id', 'desc')
                ->first();
                
            $nextId = $lastExpense ? intval(substr($lastExpense->expense_number, -6)) + 1 : 1;
            $year = date('Y');
            
            return 'EXP-' . $year . '-' . str_pad($nextId, 6, '0', STR_PAD_LEFT);
        });
    }

    /**
     * Create new expense
     */
    public function createExpense($companyId, array $data, $userId)
    {
        if (isset($data['idempotency_key'])) {
            $existing = Expense::where('company_id', $companyId)
                ->where('idempotency_key', $data['idempotency_key'])
                ->first();
            if ($existing) return $existing;
        }

        return DB::transaction(function () use ($companyId, $data, $userId) {
            $subtotal = 0;
            $itemsData = [];
            
            foreach ($data['items'] as $item) {
                if ($item['quantity'] < 0 || $item['unit_cost'] < 0 || $item['discount'] < 0 || $item['tax'] < 0) {
                    throw new ConflictHttpException("Item values cannot be negative.");
                }
                
                $lineTotal = ($item['quantity'] * $item['unit_cost']) - $item['discount'] + $item['tax'];
                if ($lineTotal < 0) {
                    throw new ConflictHttpException("Item line total cannot be negative.");
                }
                
                $subtotal += $lineTotal;
                
                $itemsData[] = array_merge($item, [
                    'line_total' => $lineTotal
                ]);
            }
            
            $docDiscount = $data['discount'] ?? 0;
            $docTax = $data['tax'] ?? 0;
            
            if ($docDiscount < 0 || $docTax < 0) {
                throw new ConflictHttpException("Document discount and tax cannot be negative.");
            }
            
            $totalAmount = $subtotal - $docDiscount + $docTax;
            if ($totalAmount < 0) {
                throw new ConflictHttpException("Total amount cannot be negative.");
            }

            $expense = Expense::create([
                'company_id' => $companyId,
                'business_unit_id' => $data['business_unit_id'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
                'warehouse_id' => $data['warehouse_id'] ?? null,
                'expense_category_id' => $data['expense_category_id'],
                'supplier_id' => $data['supplier_id'] ?? null,
                'expense_number' => $this->generateExpenseNumber($companyId),
                'expense_date' => $data['expense_date'] ?? date('Y-m-d'),
                'status' => 'DRAFT',
                'payment_status' => 'UNPAID',
                'subtotal' => $subtotal,
                'discount' => $docDiscount,
                'tax' => $docTax,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'due_amount' => $totalAmount,
                'description' => $data['description'] ?? null,
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
                'requested_by' => $userId,
                'idempotency_key' => $data['idempotency_key'] ?? null,
            ]);

            foreach ($itemsData as $itemData) {
                $expense->items()->create($itemData);
            }

            AuditLog::log($companyId, $userId, 'EXPENSE_CREATED', $expense->id, 'Expense', "Created Expense {$expense->expense_number}");

            return $expense->load('items');
        });
    }

    /**
     * Submit expense for approval
     */
    public function submitExpense($companyId, $expenseId, $userId)
    {
        return DB::transaction(function () use ($companyId, $expenseId, $userId) {
            $expense = Expense::where('company_id', $companyId)->lockForUpdate()->findOrFail($expenseId);
            
            if ($expense->status !== 'DRAFT') {
                throw new ConflictHttpException("Only DRAFT expenses can be submitted.");
            }
            
            $expense->status = 'PENDING_APPROVAL';
            $expense->save();
            
            AuditLog::log($companyId, $userId, 'EXPENSE_SUBMITTED', $expense->id, 'Expense', "Submitted Expense {$expense->expense_number} for approval");
            
            return $expense;
        });
    }

    /**
     * Approve expense
     */
    public function approveExpense($companyId, $expenseId, $userId)
    {
        return DB::transaction(function () use ($companyId, $expenseId, $userId) {
            $expense = Expense::where('company_id', $companyId)->lockForUpdate()->findOrFail($expenseId);
            
            if (!in_array($expense->status, ['DRAFT', 'PENDING_APPROVAL'])) {
                throw new ConflictHttpException("Only DRAFT or PENDING_APPROVAL expenses can be approved.");
            }
            
            $expense->status = 'APPROVED';
            $expense->approved_by = $userId;
            $expense->approved_at = Carbon::now();
            $expense->save();
            
            AuditLog::log($companyId, $userId, 'EXPENSE_APPROVED', $expense->id, 'Expense', "Approved Expense {$expense->expense_number}");
            
            return $expense;
        });
    }

    /**
     * Reject expense
     */
    public function rejectExpense($companyId, $expenseId, $userId)
    {
        return DB::transaction(function () use ($companyId, $expenseId, $userId) {
            $expense = Expense::where('company_id', $companyId)->lockForUpdate()->findOrFail($expenseId);
            
            if ($expense->status !== 'PENDING_APPROVAL') {
                throw new ConflictHttpException("Only PENDING_APPROVAL expenses can be rejected.");
            }
            
            $expense->status = 'REJECTED';
            $expense->save();
            
            AuditLog::log($companyId, $userId, 'EXPENSE_REJECTED', $expense->id, 'Expense', "Rejected Expense {$expense->expense_number}");
            
            return $expense;
        });
    }

    /**
     * Complete expense
     */
    public function completeExpense($companyId, $expenseId, $userId, array $payments = [])
    {
        return DB::transaction(function () use ($companyId, $expenseId, $userId, $payments) {
            $expense = Expense::where('company_id', $companyId)->lockForUpdate()->findOrFail($expenseId);
            
            if ($expense->status === 'COMPLETED') {
                return $expense; // Already completed
            }
            if ($expense->status === 'CANCELLED') {
                throw new ConflictHttpException("Cannot complete a cancelled expense.");
            }
            if (!in_array($expense->status, ['APPROVED', 'DRAFT', 'PENDING_APPROVAL'])) { // Assuming we can complete right away if permitted
                 $expense->status = 'APPROVED'; // Auto approve on complete if it wasn't
                 $expense->approved_by = $expense->approved_by ?? $userId;
                 $expense->approved_at = $expense->approved_at ?? Carbon::now();
            }

            // Handle immediate payments if provided
            $totalPayment = 0;
            if (!empty($payments)) {
                foreach ($payments as $payment) {
                    if ($payment['amount'] <= 0) {
                        throw new ConflictHttpException("Payment amount must be positive.");
                    }
                    $totalPayment += $payment['amount'];
                }
                
                if ($totalPayment > $expense->due_amount) {
                    throw new ConflictHttpException("Payment amount cannot exceed due amount.");
                }
                
                foreach ($payments as $payment) {
                    $expense->payments()->create([
                        'company_id' => $companyId,
                        'payment_method' => $payment['payment_method'],
                        'amount' => $payment['amount'],
                        'payment_date' => $payment['payment_date'] ?? date('Y-m-d'),
                        'reference' => $payment['reference'] ?? null,
                        'transaction_reference' => $payment['transaction_reference'] ?? null,
                        'notes' => $payment['notes'] ?? null,
                        'created_by' => $userId,
                    ]);
                }
                
                $expense->paid_amount += $totalPayment;
                $expense->due_amount = $expense->total_amount - $expense->paid_amount;
                
                if ($expense->due_amount == 0) {
                    $expense->payment_status = 'PAID';
                } elseif ($expense->paid_amount > 0) {
                    $expense->payment_status = 'PARTIAL';
                }
            }

            $expense->status = 'COMPLETED';
            $expense->completed_by = $userId;
            $expense->completed_at = Carbon::now();
            $expense->save();
            
            AuditLog::log($companyId, $userId, 'EXPENSE_COMPLETED', $expense->id, 'Expense', "Completed Expense {$expense->expense_number}");
            
            // Note: If supplier_id exists, and it's not fully paid, we *could* create a supplier ledger payable entry here.
            // But requirement states "do not create duplicate supplier-balance logic" and "use SupplierLedgerService if explicitly required".
            // Since this is operational expenses, we will only log it for now. If an explicit payable is needed, we would call it.
            
            return $expense->load(['items', 'payments']);
        });
    }

    /**
     * Add Payment to Expense
     */
    public function addPayment($companyId, $expenseId, $userId, array $paymentData)
    {
        return DB::transaction(function () use ($companyId, $expenseId, $userId, $paymentData) {
            $expense = Expense::where('company_id', $companyId)->lockForUpdate()->findOrFail($expenseId);
            
            if ($expense->status === 'CANCELLED') {
                throw new ConflictHttpException("Cannot pay a cancelled expense.");
            }
            if ($expense->due_amount <= 0) {
                throw new ConflictHttpException("Expense is already fully paid.");
            }
            
            $amount = $paymentData['amount'];
            if ($amount <= 0) {
                throw new ConflictHttpException("Payment amount must be positive.");
            }
            if ($amount > $expense->due_amount) {
                throw new ConflictHttpException("Payment amount cannot exceed due amount.");
            }
            
            $payment = $expense->payments()->create([
                'company_id' => $companyId,
                'payment_method' => $paymentData['payment_method'],
                'amount' => $amount,
                'payment_date' => $paymentData['payment_date'] ?? date('Y-m-d'),
                'reference' => $paymentData['reference'] ?? null,
                'transaction_reference' => $paymentData['transaction_reference'] ?? null,
                'notes' => $paymentData['notes'] ?? null,
                'created_by' => $userId,
            ]);
            
            $expense->paid_amount += $amount;
            $expense->due_amount = $expense->total_amount - $expense->paid_amount;
            
            if ($expense->due_amount == 0) {
                $expense->payment_status = 'PAID';
            } elseif ($expense->paid_amount > 0) {
                $expense->payment_status = 'PARTIAL';
            }
            $expense->save();
            
            AuditLog::log($companyId, $userId, 'EXPENSE_PAYMENT_CREATED', $expense->id, 'Expense', "Added payment of {$amount} to Expense {$expense->expense_number}");
            
            return $payment;
        });
    }

    /**
     * Cancel Expense
     */
    public function cancelExpense($companyId, $expenseId, $userId)
    {
        return DB::transaction(function () use ($companyId, $expenseId, $userId) {
            $expense = Expense::where('company_id', $companyId)->lockForUpdate()->findOrFail($expenseId);
            
            if (in_array($expense->status, ['COMPLETED', 'CANCELLED'])) {
                throw new ConflictHttpException("Cannot cancel a {$expense->status} expense.");
            }
            
            $expense->status = 'CANCELLED';
            $expense->cancelled_by = $userId;
            $expense->cancelled_at = Carbon::now();
            $expense->save();
            
            AuditLog::log($companyId, $userId, 'EXPENSE_CANCELLED', $expense->id, 'Expense', "Cancelled Expense {$expense->expense_number}");
            
            return $expense;
        });
    }
}
