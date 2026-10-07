<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\OnlinePaymentTransaction;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PaymentGatewayService
{
    public function __construct(
        protected PaymentService $paymentService,
        protected StoreCreditService $storeCreditService
    ) {}

    /**
     * Initiate payment for an e-commerce order.
     */
    public function initiatePayment(
        int $companyId,
        int $saleId,
        string $gateway,
        float $amount,
        ?string $idempotencyKey = null,
        array $extraData = []
    ): OnlinePaymentTransaction {
        $sale = Sale::where('company_id', $companyId)->findOrFail($saleId);

        $gateway = strtoupper(trim($gateway));
        $validGateways = ['COD', 'BKASH', 'NAGAD', 'SSLCOMMERZ', 'CARD', 'STORE_CREDIT'];
        if (!in_array($gateway, $validGateways)) {
            throw new ConflictHttpException("Unsupported payment gateway '{$gateway}'.");
        }

        $tx = OnlinePaymentTransaction::create([
            'company_id' => $companyId,
            'sale_id' => $sale->id,
            'gateway' => $gateway,
            'transaction_reference' => 'TXN-' . date('YmdHis') . '-' . rand(1000, 9999),
            'amount' => $amount,
            'currency' => 'BDT',
            'status' => ($gateway === 'COD' ? 'PENDING' : 'INITIATED'),
            'idempotency_key' => $idempotencyKey ?? ('GATEWAY-' . \Illuminate\Support\Str::uuid()),
            'payload_snapshot' => $extraData,
        ]);

        return $tx;
    }

    /**
     * Handle payment webhook/callback safely and idempotently.
     */
    public function processPaymentConfirmation(
        int $companyId,
        string $gateway,
        string $transactionRef,
        string $status,
        array $payload = [],
        ?int $userId = null
    ): OnlinePaymentTransaction {
        return DB::transaction(function () use ($companyId, $gateway, $transactionRef, $status, $payload, $userId) {
            $tx = OnlinePaymentTransaction::where('company_id', $companyId)
                ->where('transaction_reference', $transactionRef)
                ->lockForUpdate()
                ->first();

            if (!$tx) {
                throw new NotFoundHttpException("Payment transaction '{$transactionRef}' not found.");
            }

            // Idempotency: if already SUCCESS, return immediately
            if ($tx->status === 'SUCCESS') {
                return $tx;
            }

            $tx->status = strtoupper($status);
            $tx->webhook_response = $payload;
            $tx->save();

            if ($tx->status === 'SUCCESS') {
                $sale = Sale::where('company_id', $companyId)->findOrFail($tx->sale_id);

                // Use canonical PaymentService to record payment and GL entry
                $paymentMethod = match (strtoupper($gateway)) {
                    'BKASH' => 'BKASH',
                    'NAGAD' => 'NAGAD',
                    'CARD', 'SSLCOMMERZ' => 'CARD',
                    'STORE_CREDIT' => 'STORE_CREDIT',
                    default => 'CASH'
                };

                $payment = $this->paymentService->createPayment(
                    companyId: $companyId,
                    data: [
                        'amount' => (float)$tx->amount,
                        'payment_type' => 'CUSTOMER',
                        'payment_method' => $paymentMethod,
                        'reference_number' => $tx->transaction_reference,
                        'branch_id' => $sale->branch_id,
                        'idempotency_key' => 'ONLINE-PAY-' . $tx->transaction_reference,
                    ],
                    userId: $userId
                );

                // Allocate payment to Sale
                $this->paymentService->allocatePayment(
                    companyId: $companyId,
                    paymentId: $payment->id,
                    allocationsData: [
                        [
                            'allocatable_type' => 'Sale',
                            'allocatable_id' => $sale->id,
                            'amount' => (float)$tx->amount,
                        ]
                    ],
                    userId: $userId
                );

                AuditLog::log(
                    $companyId,
                    $userId,
                    'ONLINE_PAYMENT_SUCCESS',
                    $tx->id,
                    'OnlinePaymentTransaction',
                    "Payment of ৳{$tx->amount} confirmed via {$gateway} for Order #{$sale->invoice_number}."
                );
            }

            return $tx;
        });
    }
}
