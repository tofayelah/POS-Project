#!/bin/bash
mkdir -p backend/app/Models
mkdir -p backend/app/Http/Controllers/Api/V1
mkdir -p backend/app/Http/Requests
mkdir -p backend/app/Http/Resources
mkdir -p backend/routes

# Routes
cat << 'ROUTE_EOF' > backend/routes/api.php
<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/login', [\App\Http\Controllers\Api\V1\AuthController::class, 'login']);
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [\App\Http\Controllers\Api\V1\AuthController::class, 'logout']);
        Route::get('/auth/me', [\App\Http\Controllers\Api\V1\AuthController::class, 'me']);

        Route::apiResource('users', \App\Http\Controllers\Api\V1\UserController::class);
        Route::apiResource('roles', \App\Http\Controllers\Api\V1\RoleController::class);
        Route::apiResource('business-units', \App\Http\Controllers\Api\V1\BusinessUnitController::class);
        Route::apiResource('branches', \App\Http\Controllers\Api\V1\BranchController::class);
        Route::apiResource('warehouses', \App\Http\Controllers\Api\V1\WarehouseController::class);
        Route::get('settings', [\App\Http\Controllers\Api\V1\SettingController::class, 'index']);
        Route::patch('settings', [\App\Http\Controllers\Api\V1\SettingController::class, 'update']);
        Route::get('audit-logs', [\App\Http\Controllers\Api\V1\AuditLogController::class, 'index']);
        
        Route::get('dashboard/metrics', [\App\Http\Controllers\Api\V1\DashboardController::class, 'metrics']);
    });
});
ROUTE_EOF

