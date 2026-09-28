<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CompanyController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $routeCompany = $request->route('company');
        
        $companyId = ($routeCompany instanceof Company ? $routeCompany->id : $routeCompany)
            ?? $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id')
            ?? ($user ? $user->companies()->first()?->id : null);

        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'No active company context identified.'
            ], 400);
        }

        $company = null;
        if ($companyId) {
            $company = Company::find($companyId);
        }

        if (!$company && $user) {
            $company = $user->companies()->first();
        }

        if (!$company) {
            $company = Company::first();
        }

        if (!$company) {
            $company = Company::create([
                'name' => 'Apex Retail Ltd',
                'legal_name' => 'Apex Retail Holdings Limited',
                'code' => 'APEX-01',
                'subdomain' => 'apex',
                'status' => 'active',
                'country' => 'Bangladesh',
                'currency_code' => 'BDT',
                'timezone' => 'Asia/Dhaka',
            ]);
            if ($user) {
                $user->companies()->syncWithoutDetaching([$company->id]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $company
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $routeCompany = $request->route('company');

        $companyId = ($routeCompany instanceof Company ? $routeCompany->id : $routeCompany)
            ?? $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id')
            ?? ($user ? $user->companies()->first()?->id : null);

        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'No active company context identified.'
            ], 400);
        }

        $company = null;
        if ($companyId) {
            $company = Company::find($companyId);
        }
        if (!$company && $user) {
            $company = $user->companies()->first();
        }
        if (!$company) {
            $company = Company::first();
        }

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found.'
            ], 404);
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

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.'
            ], 401);
        }

        if (!$user->hasRole('Super Admin') && !$user->hasPermission('company.create') && !$user->hasPermission('companies.create')) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: Only administrators can create tenant companies.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'legal_name' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:255|unique:companies,code',
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

        if (empty($validated['code'])) {
            unset($validated['code']);
        }

        // Synchronize vat_registration and tax_number
        if (!empty($validated['vat_registration']) && empty($validated['tax_number'])) {
            $validated['tax_number'] = $validated['vat_registration'];
        } elseif (!empty($validated['tax_number']) && empty($validated['vat_registration'])) {
            $validated['vat_registration'] = $validated['tax_number'];
        }

        // Fallbacks for phone / email if passed as owner_phone / owner_email
        if (empty($validated['phone']) && $request->filled('owner_phone')) {
            $validated['phone'] = trim($request->input('owner_phone'));
        }
        if (empty($validated['email']) && $request->filled('owner_email')) {
            $validated['email'] = trim($request->input('owner_email'));
        }

        // Defaults
        $validated['country'] = !empty($validated['country']) ? $validated['country'] : 'Bangladesh';
        $validated['currency_code'] = !empty($validated['currency_code']) ? $validated['currency_code'] : 'BDT';
        $validated['timezone'] = !empty($validated['timezone']) ? $validated['timezone'] : 'Asia/Dhaka';
        $validated['status'] = !empty($validated['status']) ? $validated['status'] : 'active';

        $company = DB::transaction(function () use ($validated, $user) {
            $company = Company::create($validated);
            $company->users()->syncWithoutDetaching([$user->id]);
            return $company;
        });

        return response()->json([
            'success' => true,
            'message' => "Tenant Company '{$company->name}' created successfully.",
            'data' => $company
        ], 201);
    }
}
