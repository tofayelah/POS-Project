<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SupplierContract;
use App\Models\SupplierPriceAgreement;
use App\Services\ProcurementPriceService;
use Illuminate\Http\Request;

class SupplierContractController extends Controller
{
    protected ProcurementPriceService $priceService;

    public function __construct(ProcurementPriceService $priceService)
    {
        $this->priceService = $priceService;
    }

    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $query = SupplierContract::with(['supplier', 'priceAgreements.product', 'priceAgreements.variant'])
            ->where('company_id', $companyId);

        if ($request->filled('supplier_id') && $request->supplier_id !== 'ALL') {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('status') && strtoupper($request->status) !== 'ALL') {
            $query->where('status', strtoupper($request->status));
        }

        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $query->where(function ($q) use ($term) {
                $q->where('contract_number', 'like', $term)
                  ->orWhere('title', 'like', $term);
            });
        }

        $query->orderBy('id', 'desc');

        if ($request->boolean('all')) {
            return response()->json(['success' => true, 'data' => $query->get()]);
        }

        $perPage = (int) $request->get('per_page', 15);
        return response()->json(['success' => true, 'data' => $query->paginate($perPage)]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'contract_number' => 'required|string|max:50',
            'title' => 'required|string|max:255',
            'status' => 'nullable|in:DRAFT,ACTIVE,EXPIRED,TERMINATED',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'payment_terms' => 'nullable|string',
            'min_spend_commitment' => 'nullable|numeric|min:0',
            'max_spend_limit' => 'nullable|numeric|min:0',
            'contract_value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if (SupplierContract::where('company_id', $companyId)->where('contract_number', $validated['contract_number'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => "Contract number '{$validated['contract_number']}' already exists.",
            ], 422);
        }

        $validated['company_id'] = $companyId;
        $validated['created_by'] = $request->user() ? $request->user()->id : null;

        $contract = SupplierContract::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier contract created successfully.',
            'data' => $contract->load('supplier'),
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $contract = SupplierContract::with(['supplier', 'priceAgreements.product', 'priceAgreements.variant', 'purchaseOrders'])
            ->where('company_id', $companyId)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $contract,
        ]);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $contract = SupplierContract::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'status' => 'sometimes|in:DRAFT,ACTIVE,EXPIRED,TERMINATED',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date',
            'payment_terms' => 'nullable|string',
            'min_spend_commitment' => 'nullable|numeric|min:0',
            'max_spend_limit' => 'nullable|numeric|min:0',
            'contract_value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $contract->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier contract updated successfully.',
            'data' => $contract->fresh('supplier'),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $contract = SupplierContract::where('company_id', $companyId)->findOrFail($id);
        $contract->delete();

        return response()->json([
            'success' => true,
            'message' => 'Supplier contract deleted successfully.',
        ]);
    }

    public function priceAgreements(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $query = SupplierPriceAgreement::with(['supplier', 'contract', 'product', 'variant'])
            ->where('company_id', $companyId);

        if ($request->filled('supplier_id') && $request->supplier_id !== 'ALL') {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('contract_id')) {
            $query->where('supplier_contract_id', $request->contract_id);
        }

        if ($request->filled('status') && strtoupper($request->status) !== 'ALL') {
            $query->where('status', strtoupper($request->status));
        }

        $query->orderBy('id', 'desc');

        if ($request->boolean('all')) {
            return response()->json(['success' => true, 'data' => $query->get()]);
        }

        $perPage = (int) $request->get('per_page', 15);
        return response()->json(['success' => true, 'data' => $query->paginate($perPage)]);
    }

    public function storePriceAgreement(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'supplier_contract_id' => 'nullable|exists:supplier_contracts,id',
            'product_id' => 'required|exists:products,id',
            'product_variant_id' => 'required|exists:product_variants,id',
            'agreed_unit_price' => 'required|numeric|min:0',
            'min_order_quantity' => 'nullable|numeric|min:0.0001',
            'lead_time_days' => 'nullable|integer|min:0',
            'effective_date' => 'required|date',
            'expiry_date' => 'nullable|date|after_or_equal:effective_date',
            'status' => 'nullable|in:ACTIVE,INACTIVE',
            'notes' => 'nullable|string',
        ]);

        $validated['company_id'] = $companyId;
        $agreement = SupplierPriceAgreement::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier price agreement created successfully.',
            'data' => $agreement->load(['supplier', 'product', 'variant']),
        ], 201);
    }

    public function resolvePrice(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity' => 'nullable|numeric|min:0.0001',
        ]);

        $resolved = $this->priceService->resolveUnitPrice(
            $companyId,
            (int) $validated['supplier_id'],
            (int) $validated['product_variant_id'],
            (float) ($validated['quantity'] ?? 1.0)
        );

        return response()->json([
            'success' => true,
            'data' => $resolved,
        ]);
    }
}
