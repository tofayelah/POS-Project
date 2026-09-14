<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request and enforce server-side RBAC permissions.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($user->status === 'inactive') {
            return response()->json([
                'success' => false,
                'message' => 'Your account is inactive. Please contact an administrator.',
            ], 403);
        }

        // Super Admin role possesses full bypass
        if ($user->hasRole('Super Admin')) {
            return $next($request);
        }

        // If no permissions were passed, allow if authenticated
        if (empty($permissions)) {
            return $next($request);
        }

        // Check if user has at least one of the required permissions
        if (! $user->hasAnyPermission($permissions)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Insufficient permissions.',
                'required' => count($permissions) === 1 ? $permissions[0] : $permissions,
            ], 403);
        }

        return $next($request);
    }
}
