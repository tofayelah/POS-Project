<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PurchaseRequisition;
use App\Services\ProcurementRequisitionService;
use Illuminate\Http\Request;

class PurchaseRequisitionController extends Controller
{
    protected ProcurementRequisitionService $requisitionService;

    public function __construct(ProcurementRequisitionService $requisitionService)
    {
        $this->requisitionService = $requisitionService;
    }

    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $query = PurchaseRequisition::with(['warehouse', 'requester', 'approver', 'items.product', 'items.variant'])
            ->where('company_id', $companyId);

        if ($request->filled('status') && strtoupper($request->status) !== 'ALL') {
            $query->where('status', strtoupper($request->status));
        }

        if ($request->filled('priority') && strtoupper($request->priority) !== 'ALL') {
            $query->where('priority', strtoupper($request->priority));
        }

        if ($request->filled('warehouse_id') && $request->warehouse_id !== 'ALL') {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $query->where(function ($q) use ($term) {
                $q->where('requisition_no', 'like', $term)
                  ->orWhere('title', 'like', $term);
            });
        }

        $query->orderBy('id', 'desc');

        if ($request->boolean('all')) {
            return response()->json([
                'success' => true,
                'data' => $query->get(),
            ]);
        }

        $perPage = (int) $request->get('per_page', 15);
        return response()->json([
            'success' => true,
            'data' => $query->paginate($perPage),
        ]);
    }

    public function nextNumber(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $number = ProcurementRequisitionService::generateRequisitionNumber($companyId);

        return response()->json([
            'success' => true,
            'data' => ['requisition_no' => $number],
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $user = $request->user();

        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'business_unit_id' => 'nullable|integer',
            'branch_id' => 'nullable|integer',
            'requisition_no' => 'nullable|string|max:50',
            'title' => 'nullable|string|max:255',
            'priority' => 'nullable|in:LOW,MEDIUM,HIGH,URGENT',
            'required_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.requested_quantity' => 'required|numeric|min:0.0001',
            'items.*.estimated_unit_cost' => 'nullable|numeric|min:0',
            'items.*.preferred_supplier_id' => 'nullable|exists:suppliers,id',
            'items.*.notes' => 'nullable|string',
        ]);

        try {
            $requisition = $this->requisitionService->createRequisition($validated, $user, $companyId);

            return response()->json([
                'success' => true,
                'message' => 'Purchase requisition created successfully.',
                'data' => $requisition,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $requisition = PurchaseRequisition::with([
            'warehouse',
            'requester',
            'reviewer',
            'approver',
            'rejecter',
            'items.product',
            'items.variant',
            'items.preferredSupplier',
            'purchaseOrder',
            'rfq',
        ])
        ->where('company_id', $companyId)
        ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $requisition,
        ]);
    }

    public function submit(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $requisition = PurchaseRequisition::where('company_id', $companyId)->findOrFail($id);

        try {
            $updated = $this->requisitionService->submitRequisition($requisition, $request->user());
            return response()->json([
                'success' => true,
                'message' => 'Requisition submitted for approval.',
                'data' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function review(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $requisition = PurchaseRequisition::where('company_id', $companyId)->findOrFail($id);

        try {
            $updated = $this->requisitionService->reviewRequisition($requisition, $request->user(), $request->input('notes'));
            return response()->json([
                'success' => true,
                'message' => 'Requisition marked as under review.',
                'data' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function approve(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $requisition = PurchaseRequisition::where('company_id', $companyId)->findOrFail($id);

        $enforceSegregation = $request->boolean('enforce_segregation', false);

        try {
            $updated = $this->requisitionService->approveRequisition($requisition, $request->user(), $enforceSegregation);
            return response()->json([
                'success' => true,
                'message' => 'Requisition approved successfully.',
                'data' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function reject(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $requisition = PurchaseRequisition::where('company_id', $companyId)->findOrFail($id);

        $request->validate(['reason' => 'required|string|min:3']);

        try {
            $updated = $this->requisitionService->rejectRequisition($requisition, $request->user(), $request->reason);
            return response()->json([
                'success' => true,
                'message' => 'Requisition rejected.',
                'data' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function cancel(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $requisition = PurchaseRequisition::where('company_id', $companyId)->findOrFail($id);

        try {
            $updated = $this->requisitionService->cancelRequisition($requisition, $request->user(), $request->input('reason'));
            return response()->json([
                'success' => true,
                'message' => 'Requisition cancelled.',
                'data' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function convertToPo(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $requisition = PurchaseRequisition::with('items')->where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
        ]);

        try {
            $po = $this->requisitionService->convertToPo(
                $requisition,
                (int) $validated['supplier_id'],
                isset($validated['warehouse_id']) ? (int) $validated['warehouse_id'] : null,
                $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => "Requisition converted to Purchase Order #{$po->po_number}.",
                'data' => $po,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function convertToRfq(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $requisition = PurchaseRequisition::with('items')->where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'deadline_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        try {
            $rfq = $this->requisitionService->convertToRfq($requisition, $validated, $request->user());

            return response()->json([
                'success' => true,
                'message' => "Requisition converted to RFQ #{$rfq->rfq_number}.",
                'data' => $rfq,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
