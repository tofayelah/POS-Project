<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

abstract class Controller
{
    use AuthorizesRequests;

    protected function getCompanyId(Request $request): int
    {
        return (int) (
            $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->input('company_id')
            ?? $request->user()?->current_company_id
            ?? $request->user()?->company_id
            ?? $request->user()?->companies()->first()?->id
            ?? 0
        );
    }
}
