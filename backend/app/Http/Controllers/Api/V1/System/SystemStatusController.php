<?php

namespace App\Http\Controllers\Api\V1\System;

use App\Http\Controllers\Controller;
use App\Services\SystemStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemStatusController extends Controller
{
    /**
     * Return authoritative system status and deployment synchronization details.
     */
    public function status(Request $request, SystemStatusService $service): JsonResponse
    {
        $frontendVersion = $request->header('X-Frontend-Version') 
            ?: $request->query('frontend_version');

        $status = $service->getStatus($frontendVersion);

        return response()->json([
            'success' => true,
            'data' => $status,
        ]);
    }
}
