<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\EmployeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function __construct(
        protected EmployeeService $employeeService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $departments = $this->employeeService->listDepartments($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $departments,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
            'branch_id' => 'nullable|integer',
            'business_unit_id' => 'nullable|integer',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $dept = $this->employeeService->createDepartment($companyId, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Department created successfully.',
            'data' => $dept,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
            'branch_id' => 'nullable|integer',
            'business_unit_id' => 'nullable|integer',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $dept = $this->employeeService->updateDepartment($companyId, $id, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Department updated successfully.',
            'data' => $dept,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $this->employeeService->deleteDepartment($companyId, $id, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Department deleted successfully.',
        ]);
    }
}
