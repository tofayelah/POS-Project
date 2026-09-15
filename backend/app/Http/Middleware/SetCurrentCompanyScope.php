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

        $companyId = $request->header('X-Company-ID')
            ?? $request->input('company_id')
            ?? $request->query('company_id')
            ?? $user?->companies()->first()?->id
            ?? Company::first()?->id;

        if ($companyId) {
            $request->attributes->set('company_id', (int) $companyId);
        }

        return $next($request);
    }
}
