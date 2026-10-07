<?php

namespace App\Http\Controllers\Api\V1\Tax;

use App\Http\Controllers\Controller;
use App\Services\TaxProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxRegistrationController extends Controller
{
    public function __construct(
        protected TaxProfileService $taxProfileService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $registrations = $this->taxProfileService->listRegistrations($companyId);

        return response()->json([
            'success' => true,
            'data' => $registrations,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'tax_profile_id' => 'nullable|integer',
            'registration_type' => 'required|string|max:50',
            'registration_number' => 'required|string|max:100',
            'issuing_authority' => 'nullable|string|max:150',
            'source_reference' => 'nullable|string|max:150',
            'issue_date' => 'required|date',
            'effective_date' => 'required|date',
            'expiry_date' => 'nullable|date',
            'status' => 'nullable|string|max:30',
            'notes' => 'nullable|string',
        ]);

        $registration = $this->taxProfileService->createRegistration($companyId, $data, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax registration created successfully.',
            'data' => $registration,
        ], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $this->taxProfileService->deleteRegistration($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax registration deleted successfully.',
        ]);
    }
}
