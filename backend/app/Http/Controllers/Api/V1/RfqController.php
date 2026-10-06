<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Rfq;
use App\Models\SupplierQuotation;
use App\Services\ProcurementRfqService;
use Illuminate\Http\Request;

class RfqController extends Controller
{
    protected ProcurementRfqService $rfqService;

    public function __construct(ProcurementRfqService $rfqService)
    {
        $this->rfqService = $rfqService;
    }

    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $query = Rfq::with(['items.product', 'invitedSuppliers.supplier', 'quotations.supplier', 'awardedSupplier'])
            ->where('company_id', $companyId);

        if ($request->filled('status') && strtoupper($request->status) !== 'ALL') {
            $query->where('status', strtoupper($request->status));
        }

        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $query->where(function ($q) use ($term) {
                $q->where('rfq_number', 'like', $term)
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
        $number = ProcurementRfqService::generateRfqNumber($companyId);

        return response()->json([
            'success' => true,
            'data' => ['rfq_number' => $number],
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $user = $request->user();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'purchase_requisition_id' => 'nullable|exists:purchase_requisitions,id',
            'rfq_number' => 'nullable|string|max:50',
            'issue_date' => 'nullable|date',
            'deadline_date' => 'nullable|date',
            'target_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.requested_quantity' => 'required|numeric|min:0.0001',
            'items.*.target_unit_price' => 'nullable|numeric|min:0',
            'items.*.notes' => 'nullable|string',
            'invited_supplier_ids' => 'nullable|array',
            'invited_supplier_ids.*' => 'exists:suppliers,id',
        ]);

        try {
            $rfq = $this->rfqService->createRfq($validated, $user, $companyId);
            return response()->json([
                'success' => true,
                'message' => 'RFQ created successfully.',
                'data' => $rfq,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $rfq = Rfq::with([
            'items.product',
            'items.variant',
            'invitedSuppliers.supplier',
            'quotations.supplier',
            'quotations.items.product',
            'quotations.items.variant',
            'awardedSupplier',
            'awardedQuotation',
            'requisition',
        ])
        ->where('company_id', $companyId)
        ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $rfq,
        ]);
    }

    public function invite(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $rfq = Rfq::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'supplier_ids' => 'required|array|min:1',
            'supplier_ids.*' => 'exists:suppliers,id',
        ]);

        try {
            $updated = $this->rfqService->inviteSuppliers($rfq, $validated['supplier_ids'], $request->user());
            return response()->json([
                'success' => true,
                'message' => 'Suppliers invited to RFQ.',
                'data' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function recordQuotation(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $rfq = Rfq::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'quotation_number' => 'nullable|string|max:50',
            'quotation_date' => 'nullable|date',
            'validity_date' => 'nullable|date',
            'lead_time_days' => 'nullable|integer|min:0',
            'payment_terms' => 'nullable|string',
            'discount_total' => 'nullable|numeric|min:0',
            'tax_total' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.rfq_item_id' => 'nullable|exists:rfq_items,id',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0',
            'items.*.lead_time_days' => 'nullable|integer|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        try {
            $quote = $this->rfqService->recordQuotation($rfq, (int) $validated['supplier_id'], $validated, $request->user());
            return response()->json([
                'success' => true,
                'message' => 'Supplier quotation recorded.',
                'data' => $quote,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function compare(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $rfq = Rfq::where('company_id', $companyId)->findOrFail($id);

        $matrix = $this->rfqService->compareQuotations($rfq);

        return response()->json([
            'success' => true,
            'data' => $matrix,
        ]);
    }

    public function award(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $rfq = Rfq::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'quotation_id' => 'required|exists:supplier_quotations,id',
            'notes' => 'nullable|string',
            'create_po' => 'nullable|boolean',
            'warehouse_id' => 'nullable|exists:warehouses,id',
        ]);

        $quotation = SupplierQuotation::where('rfq_id', $rfq->id)->findOrFail($validated['quotation_id']);

        try {
            $result = $this->rfqService->awardQuotation(
                $rfq,
                $quotation,
                $request->user(),
                $validated['notes'] ?? null,
                $request->boolean('create_po', true),
                isset($validated['warehouse_id']) ? (int) $validated['warehouse_id'] : null
            );

            return response()->json([
                'success' => true,
                'message' => 'Quotation awarded successfully.',
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
