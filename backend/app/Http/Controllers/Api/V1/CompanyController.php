<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function show(Request $request)
    {
        $companyId = $request->attributes->get('company_id') ?? 1;
        $company = Company::find($companyId) ?? Company::first();

        if (!$company) {
            $company = Company::create([
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'name' => 'Apex Retail Ltd',
                'legal_name' => 'Apex Retail Holdings Limited',
                'code' => 'APEX-01',
                'phone' => '+880 1700-000000',
                'email' => 'admin@sonaribd.com',
                'address' => 'Level 8, Concord Tower, Dhaka, Bangladesh',
                'country' => 'Bangladesh',
                'currency_code' => 'BDT',
                'timezone' => 'Asia/Dhaka',
                'status' => 'active',
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $company
        ]);
    }

    public function update(Request $request)
    {
        $companyId = $request->attributes->get('company_id') ?? 1;
        $company = Company::find($companyId) ?? Company::first();

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'legal_name' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'country' => 'nullable|string|max:255',
            'currency_code' => 'nullable|string|max:10',
            'timezone' => 'nullable|string|max:100',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($company) {
            $company->update(array_filter($validated, fn($v) => !is_null($v)));
        }

        return response()->json([
            'success' => true,
            'message' => 'Company profile updated.',
            'data' => $company
        ]);
    }

    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => Company::all()
        ]);
    }
}
