<?php

namespace App\Http\Controllers\Api\V1\Tax;

use App\Http\Controllers\Controller;
use App\Services\TaxProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxProfileController extends Controller
{
    public function __construct(
        protected TaxProfileService $taxProfileService
    ) {}

    public function show(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $profile = $this->taxProfileService->getProfile($companyId);

        return response()->json([
            'success' => true,
            'data' => $profile,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'business_unit_id' => 'nullable|integer',
            'branch_id' => 'nullable|integer',
            'legal_name' => 'required|string|max:255',
            'trade_name' => 'required|string|max:255',
            'bin' => 'required|string|max:50',
            'tin' => 'required|string|max:50',
            'vat_registration_number' => 'nullable|string|max:50',
            'turnover_tax_enrollment_number' => 'nullable|string|max:50',
            'taxpayer_type' => 'nullable|string|max:50',
            'tax_jurisdiction' => 'nullable|string|max:50',
            'tax_circle' => 'nullable|string|max:100',
            'tax_zone' => 'nullable|string|max:100',
            'commissionerate' => 'nullable|string|max:150',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date',
            'status' => 'nullable|string|max:30',
            'address' => 'nullable|string',
            'contact_email' => 'nullable|email|max:150',
            'contact_phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $profile = $this->taxProfileService->createOrUpdateProfile($companyId, $data, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax profile updated successfully.',
            'data' => $profile,
        ]);
    }
}
