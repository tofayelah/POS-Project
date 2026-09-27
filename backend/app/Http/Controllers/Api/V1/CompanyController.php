<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        
        $companyId = $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id')
            ?? ($user ? $user->companies()->first()?->id : null);

        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'No active company context identified.'
            ], 400);
        }

        $company = Company::find($companyId);
        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found.'
            ], 404);
        }

        if ($user && !$user->hasCompanyAccess($company->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: You do not have access to this company.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $company
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $companyId = $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id')
            ?? ($user ? $user->companies()->first()?->id : null);

        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'No active company context identified.'
            ], 400);
        }

        $company = Company::find($companyId);
        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found.'
            ], 404);
        }

        if ($user && !$user->hasCompanyAccess($company->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: You do not have access to this company.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'legal_name' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|string|max:255',
            'vat_registration' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'country' => 'nullable|string|max:255',
            'currency_code' => 'nullable|string|max:10',
            'timezone' => 'nullable|string|max:100',
            'logo_path' => 'nullable|string|max:500',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated = array_map(function ($val) {
            return is_string($val) ? trim($val) : $val;
        }, $validated);

        if (empty($validated['name'])) {
            return response()->json([
                'success' => false,
                'message' => 'Company name cannot be empty.'
            ], 422);
        }

        // Synchronize vat_registration and tax_number
        if (!empty($validated['vat_registration']) && empty($validated['tax_number'])) {
            $validated['tax_number'] = $validated['vat_registration'];
        } elseif (!empty($validated['tax_number']) && empty($validated['vat_registration'])) {
            $validated['vat_registration'] = $validated['tax_number'];
        }

        $company->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Company profile updated.',
            'data' => $company->fresh()
        ]);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.'
            ], 401);
        }

        if ($user->hasRole('Super Admin')) {
            $companies = Company::orderBy('name')->get();
        } else {
            $companies = $user->companies()->orderBy('name')->get();
        }

        return response()->json([
            'success' => true,
            'data' => $companies
        ]);
    }
}
