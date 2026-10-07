<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\EmployeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DesignationController extends Controller
{
    public function __construct(
        protected EmployeeService $employeeService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $designations = $this->employeeService->listDesignations($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $designations,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $desig = $this->employeeService->createDesignation($companyId, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Designation created successfully.',
            'data' => $desig,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $desig = $this->employeeService->updateDesignation($companyId, $id, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Designation updated successfully.',
            'data' => $desig,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $this->employeeService->deleteDesignation($companyId, $id, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Designation deleted successfully.',
        ]);
    }
}
