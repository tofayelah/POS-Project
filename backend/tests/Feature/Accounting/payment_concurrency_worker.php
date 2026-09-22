<?php

putenv('APP_ENV=testing');
$_ENV['APP_ENV'] = 'testing';
$_SERVER['APP_ENV'] = 'testing';

$companyId = (int) ($argv[1] ?? 0);
$key = $argv[2] ?? '';
$amount = (float) ($argv[3] ?? 0);
$type = $argv[4] ?? 'CUSTOMER';
$userId = (int) ($argv[5] ?? 1);

require __DIR__ . '/../../../vendor/autoload.php';
$app = require_once __DIR__ . '/../../../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $service = app(\App\Services\PaymentService::class);
    $payment = $service->createPayment($companyId, [
        'amount' => $amount,
        'payment_type' => $type,
        'payment_method' => 'CASH',
        'idempotency_key' => $key,
    ], $userId);

    echo json_encode([
        'status' => 'success',
        'payment_id' => $payment->id,
        'payment_number' => $payment->payment_number,
    ]);
} catch (\Throwable $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'code' => $e->getCode(),
    ]);
}
