<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\CustomerActivity;
use App\Models\CustomerComplaint;
use App\Models\CustomerOpportunity;
use App\Models\CustomerPointLedger;
use App\Models\PaymentAllocation;
use App\Models\Sale;
use App\Models\SalesReturn;
use App\Models\StoreCreditTransaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CustomerCrmService
{
    /**
     * Create a CRM activity or task for a customer.
     */
    public function createActivity(int $companyId, int $customerId, array $data, ?int $userId = null): CustomerActivity
    {
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $activityType = strtoupper($data['activity_type'] ?? 'NOTE');
        $validTypes = ['CALL', 'MEETING', 'VISIT', 'EMAIL', 'MESSAGE', 'FOLLOW_UP', 'NOTE', 'TASK'];
        if (!in_array($activityType, $validTypes, true)) {
            throw new ConflictHttpException("Invalid activity type '{$activityType}'.");
        }

        $activity = CustomerActivity::create([
            'company_id' => $companyId,
            'customer_id' => $customer->id,
            'activity_type' => $activityType,
            'subject' => $data['subject'] ?? 'Customer interaction',
            'description' => $data['description'] ?? null,
            'activity_at' => !empty($data['activity_at']) ? Carbon::parse($data['activity_at']) : Carbon::now(),
            'status' => strtoupper($data['status'] ?? 'OPEN'),
            'priority' => strtoupper($data['priority'] ?? 'MEDIUM'),
            'next_action_date' => !empty($data['next_action_date']) ? Carbon::parse($data['next_action_date']) : null,
            'assigned_to' => $data['assigned_to'] ?? null,
            'created_by' => $userId,
        ]);

        AuditLog::log(
            $companyId,
            $userId,
            'CRM_ACTIVITY_CREATED',
            $activity->id,
            'CustomerActivity',
            "Created CRM {$activityType} for customer {$customer->customer_code}: {$activity->subject}."
        );

        return $activity->load(['assignee', 'creator']);
    }

    /**
     * Update an existing activity.
     */
    public function updateActivity(int $companyId, int $activityId, array $data, ?int $userId = null): CustomerActivity
    {
        $activity = CustomerActivity::where('company_id', $companyId)->findOrFail($activityId);

        $update = [];
        if (isset($data['subject'])) $update['subject'] = $data['subject'];
        if (isset($data['description'])) $update['description'] = $data['description'];
        if (isset($data['status'])) $update['status'] = strtoupper($data['status']);
        if (isset($data['priority'])) $update['priority'] = strtoupper($data['priority']);
        if (isset($data['activity_at'])) $update['activity_at'] = Carbon::parse($data['activity_at']);
        if (isset($data['next_action_date'])) $update['next_action_date'] = $data['next_action_date'] ? Carbon::parse($data['next_action_date']) : null;
        if (isset($data['assigned_to'])) $update['assigned_to'] = $data['assigned_to'];
        if (isset($data['completion_notes'])) $update['completion_notes'] = $data['completion_notes'];

        if (!empty($data['status']) && strtoupper($data['status']) === 'COMPLETED' && empty($activity->completed_at)) {
            $update['completed_at'] = Carbon::now();
        }

        $activity->update($update);

        AuditLog::log(
            $companyId,
            $userId,
            'CRM_ACTIVITY_UPDATED',
            $activity->id,
            'CustomerActivity',
            "Updated CRM activity #{$activity->id} for customer #{$activity->customer_id}."
        );

        return $activity->fresh(['assignee', 'creator']);
    }

    /**
     * Mark an activity as completed.
     */
    public function completeActivity(int $companyId, int $activityId, ?string $notes = null, ?int $userId = null): CustomerActivity
    {
        return $this->updateActivity($companyId, $activityId, [
            'status' => 'COMPLETED',
            'completion_notes' => $notes,
        ], $userId);
    }

    /**
     * Get follow-ups with filter and status grouping.
     */
    public function getFollowups(int $companyId, array $filters = []): array
    {
        $query = CustomerActivity::where('company_id', $companyId)
            ->with(['customer', 'assignee'])
            ->whereNotNull('next_action_date');

        if (!empty($filters['customer_id'])) {
            $query->where('customer_id', $filters['customer_id']);
        }

        if (!empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', strtoupper($filters['status']));
        }

        $all = $query->orderBy('next_action_date', 'asc')->get();

        $today = Carbon::today();
        $todaysFollowups = [];
        $upcoming = [];
        $overdue = [];
        $completed = [];

        foreach ($all as $item) {
            if ($item->status === 'COMPLETED') {
                $completed[] = $item;
                continue;
            }

            $actionDate = Carbon::parse($item->next_action_date)->startOfDay();
            if ($actionDate->isToday()) {
                $todaysFollowups[] = $item;
            } elseif ($actionDate->isPast()) {
                $overdue[] = $item;
            } else {
                $upcoming[] = $item;
            }
        }

        return [
            'today_count' => count($todaysFollowups),
            'upcoming_count' => count($upcoming),
            'overdue_count' => count($overdue),
            'completed_count' => count($completed),
            'today' => $todaysFollowups,
            'upcoming' => $upcoming,
            'overdue' => $overdue,
            'completed' => $completed,
        ];
    }

    /**
     * Create a customer service complaint / ticket.
     */
    public function createComplaint(int $companyId, int $customerId, array $data, ?int $userId = null): CustomerComplaint
    {
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $complaintNumber = 'CMP-' . date('Y') . '-' . str_pad((string) (CustomerComplaint::where('company_id', $companyId)->count() + 1), 5, '0', STR_PAD_LEFT);

        $complaint = CustomerComplaint::create([
            'company_id' => $companyId,
            'customer_id' => $customer->id,
            'complaint_number' => $complaintNumber,
            'category' => strtoupper($data['category'] ?? 'OTHER'),
            'subject' => $data['subject'],
            'description' => $data['description'],
            'priority' => strtoupper($data['priority'] ?? 'MEDIUM'),
            'status' => 'OPEN',
            'assigned_to' => $data['assigned_to'] ?? null,
            'created_by' => $userId,
        ]);

        AuditLog::log(
            $companyId,
            $userId,
            'CRM_COMPLAINT_CREATED',
            $complaint->id,
            'CustomerComplaint',
            "Opened complaint {$complaintNumber} for customer {$customer->customer_code}."
        );

        return $complaint->load(['assignee', 'creator']);
    }

    /**
     * Resolve and close a customer complaint.
     */
    public function resolveComplaint(int $companyId, int $complaintId, string $resolution, ?int $userId = null): CustomerComplaint
    {
        $complaint = CustomerComplaint::where('company_id', $companyId)->findOrFail($complaintId);

        $complaint->update([
            'status' => 'RESOLVED',
            'resolution' => $resolution,
            'resolved_by' => $userId,
            'resolved_at' => Carbon::now(),
        ]);

        AuditLog::log(
            $companyId,
            $userId,
            'CRM_COMPLAINT_RESOLVED',
            $complaint->id,
            'CustomerComplaint',
            "Resolved complaint {$complaint->complaint_number}."
        );

        return $complaint->fresh(['assignee', 'resolver', 'creator']);
    }

    /**
     * Create a sales opportunity.
     */
    public function createOpportunity(int $companyId, int $customerId, array $data, ?int $userId = null): CustomerOpportunity
    {
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $opportunity = CustomerOpportunity::create([
            'company_id' => $companyId,
            'customer_id' => $customer->id,
            'title' => $data['title'],
            'stage' => strtoupper($data['stage'] ?? 'NEW'),
            'estimated_value' => round((float) ($data['estimated_value'] ?? 0), 4),
            'probability' => (int) ($data['probability'] ?? 50),
            'expected_close_date' => !empty($data['expected_close_date']) ? Carbon::parse($data['expected_close_date'])->toDateString() : null,
            'assigned_to' => $data['assigned_to'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $userId,
        ]);

        AuditLog::log(
            $companyId,
            $userId,
            'CRM_OPPORTUNITY_CREATED',
            $opportunity->id,
            'CustomerOpportunity',
            "Created opportunity '{$opportunity->title}' for customer {$customer->customer_code}."
        );

        return $opportunity->load(['assignee', 'creator']);
    }

    /**
     * Update opportunity stage.
     */
    public function updateOpportunityStage(int $companyId, int $opportunityId, string $newStage, ?string $lostReason = null, ?int $userId = null): CustomerOpportunity
    {
        $opportunity = CustomerOpportunity::where('company_id', $companyId)->findOrFail($opportunityId);

        $newStage = strtoupper($newStage);
        $validStages = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
        if (!in_array($newStage, $validStages, true)) {
            throw new ConflictHttpException("Invalid opportunity stage '{$newStage}'.");
        }

        $update = ['stage' => $newStage];
        if ($newStage === 'LOST') {
            $update['lost_reason'] = $lostReason;
        } elseif ($newStage === 'WON') {
            $update['probability'] = 100;
        }

        $opportunity->update($update);

        $eventName = match ($newStage) {
            'WON' => 'CRM_OPPORTUNITY_WON',
            'LOST' => 'CRM_OPPORTUNITY_LOST',
            default => 'CRM_OPPORTUNITY_STAGE_UPDATED',
        };

        AuditLog::log(
            $companyId,
            $userId,
            $eventName,
            $opportunity->id,
            'CustomerOpportunity',
            "Opportunity #{$opportunity->id} transitioned to {$newStage}."
        );

        return $opportunity->fresh(['assignee', 'creator']);
    }

    /**
     * Unified Customer Chronological Timeline.
     * Merges sales, payments, returns, loyalty points, store credit, activities, complaints, and opportunities.
     */
    public function getCustomerTimeline(int $companyId, int $customerId, int $limit = 50): array
    {
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);
        $timeline = [];

        // 1. Customer creation event
        $timeline[] = [
            'type' => 'CUSTOMER_REGISTRATION',
            'timestamp' => $customer->created_at ? $customer->created_at->toIso8601String() : date('c'),
            'title' => 'Customer Registered',
            'description' => "Customer {$customer->name} ({$customer->customer_code}) registered.",
            'badge' => 'info',
        ];

        // 2. Sales
        $sales = Sale::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->where('status', 'COMPLETED')
            ->orderBy('sale_date', 'desc')
            ->limit($limit)
            ->get();

        foreach ($sales as $sale) {
            $timeline[] = [
                'type' => 'SALE',
                'timestamp' => $sale->sale_date ? Carbon::parse($sale->sale_date)->toIso8601String() : $sale->created_at->toIso8601String(),
                'title' => "Invoice #{$sale->invoice_number}",
                'description' => "Completed purchase of ৳" . number_format($sale->grand_total, 2) . ($sale->due_amount > 0 ? " (Due: ৳" . number_format($sale->due_amount, 2) . ")" : " (Paid)"),
                'badge' => 'success',
                'reference_id' => $sale->id,
            ];
        }

        // 3. Sales Returns
        $returns = SalesReturn::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->where('status', 'COMPLETED')
            ->orderBy('return_date', 'desc')
            ->limit($limit)
            ->get();

        foreach ($returns as $ret) {
            $timeline[] = [
                'type' => 'SALES_RETURN',
                'timestamp' => $ret->return_date ? Carbon::parse($ret->return_date)->toIso8601String() : $ret->created_at->toIso8601String(),
                'title' => "Sales Return #{$ret->return_number}",
                'description' => "Return processed for ৳" . number_format($ret->refund_total, 2) . " Reason: " . ($ret->reason ?? 'Customer return'),
                'badge' => 'warning',
                'reference_id' => $ret->id,
            ];
        }

        // 4. CRM Activities
        $activities = CustomerActivity::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->orderBy('activity_at', 'desc')
            ->limit($limit)
            ->get();

        foreach ($activities as $act) {
            $timeline[] = [
                'type' => 'CRM_ACTIVITY',
                'timestamp' => $act->activity_at ? $act->activity_at->toIso8601String() : $act->created_at->toIso8601String(),
                'title' => "[{$act->activity_type}] {$act->subject}",
                'description' => $act->description ?? ($act->status . ' activity'),
                'badge' => $act->status === 'COMPLETED' ? 'success' : 'primary',
                'reference_id' => $act->id,
            ];
        }

        // 5. Complaints
        $complaints = CustomerComplaint::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        foreach ($complaints as $cmp) {
            $timeline[] = [
                'type' => 'COMPLAINT',
                'timestamp' => $cmp->created_at->toIso8601String(),
                'title' => "Complaint #{$cmp->complaint_number}",
                'description' => "{$cmp->subject} [{$cmp->status}]",
                'badge' => $cmp->status === 'RESOLVED' ? 'success' : 'danger',
                'reference_id' => $cmp->id,
            ];
        }

        // Sort descending by timestamp
        usort($timeline, function ($a, $b) {
            return strcmp($b['timestamp'], $a['timestamp']);
        });

        return array_slice($timeline, 0, $limit);
    }

    /**
     * CRM Dashboard aggregated metrics.
     */
    public function getCrmDashboard(int $companyId): array
    {
        $totalActivities = CustomerActivity::where('company_id', $companyId)->count();
        $openActivities = CustomerActivity::where('company_id', $companyId)->where('status', 'OPEN')->count();
        $openComplaints = CustomerComplaint::where('company_id', $companyId)->whereIn('status', ['OPEN', 'IN_PROGRESS'])->count();
        $resolvedComplaints = CustomerComplaint::where('company_id', $companyId)->where('status', 'RESOLVED')->count();

        $openOpportunities = CustomerOpportunity::where('company_id', $companyId)->whereNotIn('stage', ['WON', 'LOST'])->count();
        $pipelineValue = (float) CustomerOpportunity::where('company_id', $companyId)->whereNotIn('stage', ['WON', 'LOST'])->sum('estimated_value');
        $wonValue = (float) CustomerOpportunity::where('company_id', $companyId)->where('stage', 'WON')->sum('estimated_value');

        $followups = $this->getFollowups($companyId);

        return [
            'total_activities' => $totalActivities,
            'open_activities' => $openActivities,
            'today_followups' => $followups['today_count'],
            'overdue_followups' => $followups['overdue_count'],
            'upcoming_followups' => $followups['upcoming_count'],
            'open_complaints' => $openComplaints,
            'resolved_complaints' => $resolvedComplaints,
            'open_opportunities' => $openOpportunities,
            'pipeline_value' => round($pipelineValue, 4),
            'won_value' => round($wonValue, 4),
            'complaints' => [
                'open' => $openComplaints,
                'resolved' => $resolvedComplaints,
            ],
            'opportunities' => [
                'count' => $openOpportunities,
                'pipeline_value' => round($pipelineValue, 4),
                'won_value' => round($wonValue, 4),
            ],
        ];
    }

    public function getCrmDashboardSummary(int $companyId): array
    {
        return $this->getCrmDashboard($companyId);
    }
}
