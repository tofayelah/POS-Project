<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckOrganizationalScope
{
    /**
     * Enforce server-side organizational hierarchy scope.
     * Prevents users from accessing or manipulating companies, business units,
     * branches, or warehouses outside their assigned permissions.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $scopeType): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Super Admin has global enterprise scope
        if ($user->hasRole('Super Admin')) {
            return $next($request);
        }

        // Determine the target ID based on route parameter or request payload
        $targetId = match ($scopeType) {
            'company' => $request->route('company') 
                ?? $request->route('company_id') 
                ?? $request->input('company_id') 
                ?? $request->query('company_id'),
            'business_unit' => $request->route('business_unit') 
                ?? $request->route('business_unit_id') 
                ?? $request->input('business_unit_id') 
                ?? $request->query('business_unit_id'),
            'branch' => $request->route('branch') 
                ?? $request->route('branch_id') 
                ?? $request->input('branch_id') 
                ?? $request->query('branch_id'),
            'warehouse' => $request->route('warehouse') 
                ?? $request->route('warehouse_id') 
                ?? $request->input('warehouse_id') 
                ?? $request->query('warehouse_id'),
            default => null,
        };

        // If a specific ID is being accessed or manipulated, verify user's access
        if ($targetId !== null) {
            $hasAccess = match ($scopeType) {
                'company' => $user->hasCompanyAccess($targetId),
                'business_unit' => $user->hasBusinessUnitAccess($targetId),
                'branch' => $user->hasBranchAccess($targetId),
                'warehouse' => $user->hasWarehouseAccess($targetId),
                default => false,
            };

            if (! $hasAccess) {
                return response()->json([
                    'success' => false,
                    'message' => "Unauthorized. You do not have access to this organizational {$scopeType}.",
                    'scope' => $scopeType,
                    'denied_id' => $targetId,
                ], 403);
            }
        }

        return $next($request);
    }
}
