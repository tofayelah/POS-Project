<?php
require 'backend/vendor/autoload.php';
$app = require_once 'backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$request = Illuminate\Http\Request::create('/api/v1/dashboard/summary', 'GET');
$request->attributes->set('company_id', 1);

// Mock user with permissions
$user = App\Models\User::first();
if ($user) {
    $request->setUserResolver(function () use ($user) {
        return $user;
    });
}

$controller = new App\Http\Controllers\Api\V1\Reports\DashboardReportController();
try {
    $response = $controller->summary($request);
    echo $response->getContent();
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString();
}
