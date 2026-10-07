<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\EmployeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function __construct(
        protected EmployeeService $employeeService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $employees = $this->employeeService->listEmployees($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $employees,
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $employee = $this->employeeService->getEmployee($companyId, $id);

        return response()->json([
            'success' => true,
            'data' => $employee,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'employee_number' => 'nullable|string|max:50',
            'department_id' => 'nullable|integer',
            'designation_id' => 'nullable|integer',
            'branch_id' => 'nullable|integer',
            'business_unit_id' => 'nullable|integer',
            'user_id' => 'nullable|integer',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'gender' => 'nullable|string|in:MALE,FEMALE,OTHER',
            'date_of_birth' => 'nullable|date',
            'national_id' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'joining_date' => 'nullable|date',
            'confirmation_date' => 'nullable|date',
            'employment_type' => 'nullable|string|in:FULL_TIME,PART_TIME,CONTRACT,TEMPORARY,INTERN',
            'employment_status' => 'nullable|string|in:ACTIVE,ON_LEAVE,SUSPENDED,RESIGNED,TERMINATED,INACTIVE',
            'bank_name' => 'nullable|string|max:100',
            'bank_account_number' => 'nullable|string|max:100',
            'bank_routing_number' => 'nullable|string|max:100',
            'emergency_contact_name' => 'nullable|string|max:100',
            'emergency_contact_phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $employee = $this->employeeService->createEmployee($companyId, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Employee created successfully.',
            'data' => $employee,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'employee_number' => 'nullable|string|max:50',
            'department_id' => 'nullable|integer',
            'designation_id' => 'nullable|integer',
            'branch_id' => 'nullable|integer',
            'business_unit_id' => 'nullable|integer',
            'user_id' => 'nullable|integer',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'gender' => 'nullable|string|in:MALE,FEMALE,OTHER',
            'date_of_birth' => 'nullable|date',
            'national_id' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'joining_date' => 'nullable|date',
            'confirmation_date' => 'nullable|date',
            'employment_type' => 'nullable|string|in:FULL_TIME,PART_TIME,CONTRACT,TEMPORARY,INTERN',
            'employment_status' => 'nullable|string|in:ACTIVE,ON_LEAVE,SUSPENDED,RESIGNED,TERMINATED,INACTIVE',
            'resignation_date' => 'nullable|date',
            'termination_date' => 'nullable|date',
            'bank_name' => 'nullable|string|max:100',
            'bank_account_number' => 'nullable|string|max:100',
            'bank_routing_number' => 'nullable|string|max:100',
            'emergency_contact_name' => 'nullable|string|max:100',
            'emergency_contact_phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $employee = $this->employeeService->updateEmployee($companyId, $id, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Employee updated successfully.',
            'data' => $employee,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $this->employeeService->deleteEmployee($companyId, $id, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Employee deleted successfully.',
        ]);
    }

    public function employee360(Request $request, int $id): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $summary = $this->employeeService->getEmployee360($companyId, $id);

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    public function show360(Request $request, int $id): JsonResponse
    {
        return $this->employee360($request, $id);
    }
}
