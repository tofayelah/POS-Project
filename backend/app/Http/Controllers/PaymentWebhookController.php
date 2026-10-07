<?php

namespace App\Http\Controllers;

use App\Services\PaymentGatewayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function __construct(
        protected PaymentGatewayService $gatewayService
    ) {}

    public function handleWebhook(Request $request, string $gateway): JsonResponse
    {
        $companyId = (int) ($request->header('X-Company-ID') ?? 1);
        $transactionRef = $request->input('transaction_reference') ?? $request->input('paymentID') ?? $request->input('tran_id');
        $status = $request->input('status') ?? ($request->input('transactionStatus') === 'Completed' ? 'SUCCESS' : 'PENDING');

        if (!$transactionRef) {
            return response()->json(['message' => 'Missing transaction reference.'], 400);
        }

        $tx = $this->gatewayService->processPaymentConfirmation(
            companyId: $companyId,
            gateway: $gateway,
            transactionRef: $transactionRef,
            status: $status,
            payload: $request->all()
        );

        return response()->json([
            'status' => 'processed',
            'transaction_status' => $tx->status,
        ]);
    }
}
