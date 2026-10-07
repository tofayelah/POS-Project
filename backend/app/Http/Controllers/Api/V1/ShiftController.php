<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function __construct(
        protected ShiftService $shiftService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $shifts = $this->shiftService->listShifts($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $shifts,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'start_time' => 'required|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'end_time' => 'required|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'break_minutes' => 'nullable|integer|min:0',
            'grace_minutes' => 'nullable|integer|min:0',
            'overtime_after_minutes' => 'nullable|integer|min:0',
            'is_overnight' => 'nullable|boolean',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $shift = $this->shiftService->createShift($companyId, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Shift created successfully.',
            'data' => $shift,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50',
            'start_time' => 'sometimes|required|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'end_time' => 'sometimes|required|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'break_minutes' => 'nullable|integer|min:0',
            'grace_minutes' => 'nullable|integer|min:0',
            'overtime_after_minutes' => 'nullable|integer|min:0',
            'is_overnight' => 'nullable|boolean',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $shift = $this->shiftService->updateShift($companyId, $id, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Shift updated successfully.',
            'data' => $shift,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        \App\Models\Shift::where('company_id', $companyId)->findOrFail($id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Shift deleted successfully.',
        ]);
    }

    public function assign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer',
            'shift_id' => 'required|integer',
            'effective_from' => 'required|date',
            'effective_to' => 'nullable|date|after_or_equal:effective_from',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $assignment = $this->shiftService->assignShift(
            $companyId,
            $validated['employee_id'],
            $validated['shift_id'],
            $validated['effective_from'],
            $validated['effective_to'] ?? null,
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Shift assigned successfully.',
            'data' => $assignment,
        ]);
    }

    public function assignShift(Request $request): JsonResponse
    {
        return $this->assign($request);
    }
}
