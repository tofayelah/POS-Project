<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\PosShiftService;
use App\Models\PosSession;
use App\Models\PosCashMovement;
use Illuminate\Http\Request;
use DomainException;
use Exception;

class PosSessionController extends Controller
{
    public function __construct(
        protected PosShiftService $shiftService
    ) {}

    /**
     * List all shifts for the company with filtering and pagination.
     */
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $filters = $request->only(['branch_id', 'pos_terminal_id', 'cashier_id', 'status', 'from_date', 'to_date', 'per_page']);
        
        $shifts = $this->shiftService->listShifts($companyId, $filters);
        return response()->json(['success' => true, 'data' => $shifts]);
    }

    /**
     * Get details of a single shift.
     */
    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        try {
            $shift = $this->shiftService->getShift($companyId, (int) $id);
            return response()->json(['success' => true, 'data' => $shift]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'POS shift not found.'], 404);
        }
    }

    /**
     * Open a new shift.
     */
    public function open(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'pos_terminal_id' => 'required|exists:pos_terminals,id',
            'opening_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        try {
            $session = $this->shiftService->openShift(
                $companyId,
                (int) $validated['pos_terminal_id'],
                $request->user()->id,
                $validated['opening_cash'],
                $validated['notes'] ?? null
            );
            return response()->json(['success' => true, 'data' => $session], 201);
        } catch (DomainException $e) {
            $msg = $e->getMessage();
            $status = (str_contains($msg, 'already has') || str_contains($msg, 'not have access to this terminal'))
                ? 409
                : 422;
            return response()->json(['success' => false, 'message' => $msg], $status);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }

    /**
     * Close a shift.
     */
    public function close(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'closing_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'denominations' => 'nullable|array',
        ]);

        try {
            $session = $this->shiftService->closeShift(
                $companyId,
                (int) $id,
                $request->user()->id,
                $validated['closing_cash'],
                $validated['notes'] ?? null,
                $validated['denominations'] ?? null
            );
            return response()->json(['success' => true, 'data' => $session]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'POS shift not found.'], 404);
        } catch (DomainException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }

    /**
     * Get active shift for current cashier.
     */
    public function current(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $session = $this->shiftService->getCurrentShift($companyId, $request->user()->id);

        if (!$session) {
            return response()->json(['success' => false, 'message' => 'No active session found'], 404);
        }

        return response()->json(['success' => true, 'data' => $session]);
    }

    /**
     * Get shift reconciliation.
     */
    public function reconciliation(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        try {
            $data = $this->shiftService->getShiftReconciliation($companyId, (int) $id);
            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'POS session not found.'], 404);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Drawer Cash In.
     */
    public function cashIn(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:255',
            'reference' => 'nullable|string|max:100',
            'idempotency_key' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        try {
            $movement = $this->shiftService->cashIn(
                $companyId,
                (int) $id,
                $request->user()->id,
                $validated
            );
            return response()->json(['success' => true, 'data' => $movement], 201);
        } catch (DomainException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Drawer Cash Out.
     */
    public function cashOut(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:255',
            'reference' => 'nullable|string|max:100',
            'idempotency_key' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        try {
            $movement = $this->shiftService->cashOut(
                $companyId,
                (int) $id,
                $request->user()->id,
                $validated
            );
            return response()->json(['success' => true, 'data' => $movement], 201);
        } catch (DomainException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * List cash movements for a shift.
     */
    public function movements(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $session = PosSession::where('company_id', $companyId)->findOrFail($id);

        $movements = PosCashMovement::where('company_id', $companyId)
            ->where('pos_session_id', $session->id)
            ->with(['user:id,name', 'terminal:id,terminal_name,terminal_code'])
            ->orderBy('id', 'asc')
            ->get();

        return response()->json(['success' => true, 'data' => $movements]);
    }

    /**
     * Supervisor approval of variance.
     */
    public function approveVariance(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            $shift = $this->shiftService->approveVariance(
                $companyId,
                (int) $id,
                $request->user()->id,
                $validated['notes'] ?? null
            );
            return response()->json(['success' => true, 'data' => $shift]);
        } catch (DomainException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 403);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
