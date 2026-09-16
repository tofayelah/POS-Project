<?php

namespace App\Http\Middleware;

use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetCurrentCompanyScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $requestedCompanyId = $request->header('X-Company-ID')
            ?? $request->input('company_id')
            ?? $request->query('company_id');

        // Determine effective company ID
        $companyId = null;

        if ($user) {
            if ($requestedCompanyId) {
                // Check if user has access
                if (!$user->hasCompanyAccess($requestedCompanyId)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Forbidden: You do not have access to this company.'
                    ], 403);
                }
                $companyId = $requestedCompanyId;
            } else {
                // Default to first available company if no explicit ID is provided
                $companyId = $user->companies()->first()?->id;
            }
        } else {
            // For unauthenticated requests (like login), we don't enforce user access, 
            // but we can pass through the requested company ID if there is one. 
            // Or default to Company::first().
            $companyId = $requestedCompanyId ?? Company::first()?->id;
        }

        if ($companyId) {
            $request->attributes->set('company_id', (int) $companyId);
        }

        return $next($request);
    }
}
