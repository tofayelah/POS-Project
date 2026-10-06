<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CustomerActivity;
use App\Models\CustomerComplaint;
use App\Models\CustomerOpportunity;
use App\Services\CustomerCrmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerCrmController extends Controller
{
    public function __construct(
        protected CustomerCrmService $crmService
    ) {}

    public function dashboard(Request $request): JsonResponse
    {
        $this->authorize('crm.view');
        $companyId = $request->attributes->get('company_id');

        $kpis = $this->crmService->getCrmDashboardSummary($companyId);

        return response()->json([
            'success' => true,
            'data' => $kpis,
        ]);
    }

    public function timeline(Request $request, int $customerId): JsonResponse
    {
        $this->authorize('crm.view');
        $companyId = $request->attributes->get('company_id');

        $timeline = $this->crmService->getCustomerTimeline($companyId, $customerId);

        return response()->json([
            'success' => true,
            'data' => $timeline,
        ]);
    }

    // --- Activities ---

    public function listActivities(Request $request): JsonResponse
    {
        $this->authorize('crm.view');
        $companyId = $request->attributes->get('company_id');

        $query = CustomerActivity::with(['customer:id,customer_code,name', 'user:id,name', 'assignedTo:id,name'])
            ->where('company_id', $companyId);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }
        if ($request->filled('activity_type')) {
            $query->where('activity_type', $request->activity_type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        $activities = $query->orderBy('due_date', 'asc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $activities,
        ]);
    }

    public function createActivity(Request $request): JsonResponse
    {
        $this->authorize('crm.manage');
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'activity_type' => 'required|in:CALL,MEETING,NOTE,EMAIL,TASK,VISIT',
            'subject' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:PENDING,COMPLETED,CANCELLED',
            'priority' => 'nullable|in:LOW,MEDIUM,HIGH,URGENT',
            'due_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $activity = $this->crmService->createActivity(
            $companyId,
            (int) $validated['customer_id'],
            $validated,
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Activity recorded successfully',
            'data' => $activity->load(['customer', 'assignee', 'creator']),
        ], 201);
    }

    public function completeActivity(Request $request, int $id): JsonResponse
    {
        $this->authorize('crm.manage');
        $companyId = $request->attributes->get('company_id');

        $activity = $this->crmService->completeActivity($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Activity marked as completed',
            'data' => $activity,
        ]);
    }

    // --- Complaints ---

    public function listComplaints(Request $request): JsonResponse
    {
        $this->authorize('crm.view');
        $companyId = $request->attributes->get('company_id');

        $query = CustomerComplaint::with(['customer:id,customer_code,name', 'sale:id,invoice_no', 'creator:id,name', 'assignee:id,name'])
            ->where('company_id', $companyId);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        $complaints = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $complaints,
        ]);
    }

    public function createComplaint(Request $request): JsonResponse
    {
        $this->authorize('crm.manage');
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'sale_id' => 'nullable|exists:sales,id',
            'category' => 'required|string|max:100',
            'priority' => 'nullable|in:LOW,MEDIUM,HIGH,CRITICAL',
            'subject' => 'required|string|max:255',
            'description' => 'required|string',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $complaint = $this->crmService->createComplaint(
            $companyId,
            (int) $validated['customer_id'],
            $validated,
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Complaint logged successfully',
            'data' => $complaint->load(['customer', 'creator']),
        ], 201);
    }

    public function resolveComplaint(Request $request, int $id): JsonResponse
    {
        $this->authorize('crm.manage');
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'resolution_notes' => 'required|string|max:1000',
        ]);

        $complaint = $this->crmService->resolveComplaint(
            $companyId,
            $id,
            $validated['resolution_notes'],
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Complaint resolved successfully',
            'data' => $complaint,
        ]);
    }

    // --- Opportunities ---

    public function listOpportunities(Request $request): JsonResponse
    {
        $this->authorize('crm.view');
        $companyId = $request->attributes->get('company_id');

        $query = CustomerOpportunity::with(['customer:id,customer_code,name', 'salesperson:id,name', 'creator:id,name'])
            ->where('company_id', $companyId);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }
        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }
        if ($request->filled('salesperson_id')) {
            $query->where('salesperson_id', $request->salesperson_id);
        }

        $opportunities = $query->orderBy('expected_close_date', 'asc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $opportunities,
        ]);
    }

    public function createOpportunity(Request $request): JsonResponse
    {
        $this->authorize('crm.manage');
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'title' => 'required|string|max:255',
            'expected_value' => 'required|numeric|min:0',
            'probability_pct' => 'nullable|integer|min:0|max:100',
            'stage' => 'nullable|in:NEW,CONTACTED,PROPOSAL,NEGOTIATION,WON,LOST',
            'expected_close_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'salesperson_id' => 'nullable|exists:users,id',
        ]);

        $oppData = [
            'title' => $validated['title'],
            'estimated_value' => $validated['expected_value'],
            'probability' => $validated['probability_pct'] ?? 20,
            'stage' => $validated['stage'] ?? 'NEW',
            'expected_close_date' => $validated['expected_close_date'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'assigned_to' => $validated['salesperson_id'] ?? null,
        ];

        $opportunity = $this->crmService->createOpportunity(
            $companyId,
            (int) $validated['customer_id'],
            $oppData,
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Opportunity created successfully',
            'data' => $opportunity->load(['customer', 'salesperson']),
        ], 201);
    }

    public function updateOpportunity(Request $request, int $id): JsonResponse
    {
        $this->authorize('crm.manage');
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'stage' => 'nullable|in:NEW,CONTACTED,PROPOSAL,NEGOTIATION,WON,LOST',
            'probability_pct' => 'nullable|integer|min:0|max:100',
            'expected_value' => 'nullable|numeric|min:0',
            'expected_close_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if (!empty($validated['stage'])) {
            $opportunity = $this->crmService->updateOpportunityStage(
                $companyId,
                $id,
                $validated['stage'],
                $validated['notes'] ?? null,
                $request->user()->id
            );
        }

        $opp = CustomerOpportunity::where('company_id', $companyId)->findOrFail($id);
        $updateFields = [];
        if (isset($validated['probability_pct'])) $updateFields['probability'] = $validated['probability_pct'];
        if (isset($validated['expected_value'])) $updateFields['estimated_value'] = $validated['expected_value'];
        if (isset($validated['expected_close_date'])) $updateFields['expected_close_date'] = $validated['expected_close_date'];
        if (isset($validated['notes'])) $updateFields['notes'] = $validated['notes'];

        if (!empty($updateFields)) {
            $opp->update($updateFields);
        }

        $opportunity = $opp->fresh(['assignee', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Opportunity updated successfully',
            'data' => $opportunity,
        ]);
    }
}
