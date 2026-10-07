<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SalaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalaryStructureController extends Controller
{
    public function __construct(
        protected SalaryService $salaryService
    ) {}

    // Salary Components
    public function listComponents(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $this->salaryService->seedDefaultComponentsIfEmpty($companyId);
        $components = $this->salaryService->listComponents($companyId);

        return response()->json([
            'success' => true,
            'data' => $components,
        ]);
    }

    public function components(Request $request): JsonResponse
    {
        return $this->listComponents($request);
    }

    public function createComponent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'type' => 'required|string|in:EARNING,DEDUCTION',
            'calculation_method' => 'nullable|string|in:FIXED,PERCENTAGE_OF_BASIC',
            'default_amount' => 'nullable|numeric|min:0',
            'is_taxable' => 'nullable|boolean',
            'is_statutory' => 'nullable|boolean',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $comp = $this->salaryService->createComponent($companyId, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Salary component created successfully.',
            'data' => $comp,
        ], 201);
    }

    public function storeComponent(Request $request): JsonResponse
    {
        return $this->createComponent($request);
    }

    // Salary Structures
    public function index(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $structures = $this->salaryService->listStructures($companyId);

        return response()->json([
            'success' => true,
            'data' => $structures,
        ]);
    }

    public function showEmployeeStructure(Request $request, int $employeeId): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $structure = $this->salaryService->getEmployeeStructure($companyId, $employeeId);

        return response()->json([
            'success' => true,
            'data' => $structure,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $structure = $this->salaryService->createSalaryStructure($companyId, $request->all(), $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Salary structure created successfully.',
            'data' => $structure,
        ], 201);
    }

    public function assignStructure(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer',
            'salary_structure_id' => 'required|integer',
            'effective_from' => 'nullable|date',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $structure = $this->salaryService->assignStructureToEmployee(
            $companyId,
            $validated['employee_id'],
            $validated['salary_structure_id'],
            $validated['effective_from'] ?? date('Y-m-d'),
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Salary structure assigned successfully.',
            'data' => $structure,
        ]);
    }

    public function assign(Request $request): JsonResponse
    {
        return $this->assignStructure($request);
    }
}
