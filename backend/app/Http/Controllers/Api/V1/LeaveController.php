<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LeaveBalance;
use App\Services\LeaveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    public function __construct(
        protected LeaveService $leaveService
    ) {}

    // Leave Types
    public function listTypes(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $types = $this->leaveService->listLeaveTypes($companyId);

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }

    public function leaveTypes(Request $request): JsonResponse
    {
        return $this->listTypes($request);
    }

    public function createType(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'is_paid' => 'nullable|boolean',
            'default_days_per_year' => 'nullable|numeric|min:0',
            'days_allowed_per_year' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        if (isset($validated['days_allowed_per_year']) && !isset($validated['default_days_per_year'])) {
            $validated['default_days_per_year'] = $validated['days_allowed_per_year'];
        }

        $companyId = (int) $request->attributes->get('company_id');
        $type = $this->leaveService->createLeaveType($companyId, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Leave type created successfully.',
            'data' => $type,
        ], 201);
    }

    public function storeLeaveType(Request $request): JsonResponse
    {
        return $this->createType($request);
    }

    public function updateLeaveType(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50',
            'is_paid' => 'nullable|boolean',
            'default_days_per_year' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $type = $this->leaveService->updateLeaveType($companyId, $id, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Leave type updated successfully.',
            'data' => $type,
        ]);
    }

    // Leave Balances
    public function listBalances(Request $request, ?int $employeeId = null): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $empId = $employeeId ?: (int) $request->query('employee_id');
        $year = $request->query('year') ? (int) $request->query('year') : null;

        if ($empId) {
            $balances = $this->leaveService->listEmployeeBalances($companyId, $empId, $year);
        } else {
            $balances = LeaveBalance::where('company_id', $companyId)
                ->with(['employee.department', 'leaveType'])
                ->when($year, fn($q) => $q->where('year', $year))
                ->get();
        }

        return response()->json([
            'success' => true,
            'data' => $balances,
        ]);
    }

    public function balances(Request $request): JsonResponse
    {
        return $this->listBalances($request);
    }

    // Leave Applications
    public function listApplications(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $apps = $this->leaveService->listApplications($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $apps,
        ]);
    }

    public function applications(Request $request): JsonResponse
    {
        return $this->listApplications($request);
    }

    public function apply(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer',
            'leave_type_id' => 'required|integer',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'reason' => 'required|string|min:3',
            'status' => 'nullable|string|in:DRAFT,SUBMITTED',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $app = $this->leaveService->applyLeave($companyId, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Leave application submitted successfully.',
            'data' => $app,
        ], 201);
    }

    public function storeApplication(Request $request): JsonResponse
    {
        return $this->apply($request);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $app = $this->leaveService->approveLeave($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Leave application approved.',
            'data' => $app,
        ]);
    }

    public function approveApplication(Request $request, int $id): JsonResponse
    {
        return $this->approve($request, $id);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'rejection_reason' => 'nullable|string|min:3',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $app = $this->leaveService->rejectLeave($companyId, $id, $validated['rejection_reason'] ?? 'Rejected', $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Leave application rejected.',
            'data' => $app,
        ]);
    }

    public function rejectApplication(Request $request, int $id): JsonResponse
    {
        return $this->reject($request, $id);
    }
}
