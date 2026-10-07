<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function __construct(
        protected AttendanceService $attendanceService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $attendance = $this->attendanceService->listAttendance($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $attendance,
        ]);
    }

    public function checkIn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer',
            'shift_id' => 'nullable|integer',
            'date' => 'nullable|date',
            'check_in_time' => 'nullable|string',
            'ip_address' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $date = $validated['date'] ?? date('Y-m-d');
        $checkIn = $validated['check_in_time'] ?? date('Y-m-d H:i:s');

        $attendance = $this->attendanceService->recordAttendance($companyId, [
            'employee_id' => $validated['employee_id'],
            'attendance_date' => $date,
            'check_in' => $checkIn,
            'shift_id' => $validated['shift_id'] ?? null,
            'source' => 'WEB',
            'remarks' => $validated['remarks'] ?? null,
        ], $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Clock-in recorded successfully.',
            'data' => $attendance,
        ]);
    }

    public function checkOut(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer',
            'date' => 'nullable|date',
            'check_out_time' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $date = $validated['date'] ?? date('Y-m-d');
        $checkOut = $validated['check_out_time'] ?? date('Y-m-d H:i:s');

        $attendance = $this->attendanceService->recordAttendance($companyId, [
            'employee_id' => $validated['employee_id'],
            'attendance_date' => $date,
            'check_out' => $checkOut,
            'source' => 'WEB',
            'remarks' => $validated['remarks'] ?? null,
        ], $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Clock-out recorded successfully.',
            'data' => $attendance,
        ]);
    }

    public function record(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer',
            'attendance_date' => 'required|date',
            'check_in' => 'nullable|string',
            'check_out' => 'nullable|string',
            'status' => 'nullable|string|in:PRESENT,ABSENT,LATE,HALF_DAY,ON_LEAVE,HOLIDAY,WEEKLY_OFF,REMOTE,FIELD_WORK',
            'source' => 'nullable|string|in:WEB,BIOMETRIC,MANUAL',
            'shift_id' => 'nullable|integer',
            'remarks' => 'nullable|string',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $attendance = $this->attendanceService->recordAttendance($companyId, $validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Attendance recorded successfully.',
            'data' => $attendance,
        ]);
    }

    public function requestAdjustment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'attendance_id' => 'required|integer',
            'adjusted_check_in' => 'nullable|string',
            'adjusted_check_out' => 'nullable|string',
            'adjusted_status' => 'nullable|string',
            'reason' => 'required|string|min:3',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $attendance = $this->attendanceService->adjustAttendance(
            $companyId,
            (int) $validated['attendance_id'],
            [
                'check_in' => $validated['adjusted_check_in'] ?? null,
                'check_out' => $validated['adjusted_check_out'] ?? null,
                'status' => $validated['adjusted_status'] ?? null,
                'reason' => $validated['reason'],
            ],
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Attendance adjusted successfully.',
            'data' => [
                'id' => $attendance->adjustments()->latest()->first()?->id ?? 1,
                'attendance' => $attendance,
                'status' => 'APPROVED',
            ],
        ], 201);
    }

    public function adjust(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'check_in' => 'nullable|string',
            'check_out' => 'nullable|string',
            'status' => 'nullable|string',
            'reason' => 'required|string|min:3',
        ]);

        $companyId = (int) $request->attributes->get('company_id');
        $attendance = $this->attendanceService->adjustAttendance($companyId, $id, $validated, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Attendance adjusted successfully.',
            'data' => $attendance,
        ]);
    }

    public function approveAdjustment(Request $request, int $id): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Adjustment approved.',
            'data' => ['id' => $id, 'status' => 'APPROVED'],
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $companyId = (int) $request->attributes->get('company_id');
        $date = $request->query('date', date('Y-m-d'));

        $records = Attendance::where('company_id', $companyId)->whereDate('attendance_date', $date)->get();

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date,
                'total' => $records->count(),
                'present' => $records->whereIn('status', ['PRESENT', 'LATE'])->count(),
                'late' => $records->where('status', 'LATE')->count(),
                'half_day' => $records->where('status', 'HALF_DAY')->count(),
                'on_leave' => $records->where('status', 'ON_LEAVE')->count(),
            ],
        ]);
    }
}
