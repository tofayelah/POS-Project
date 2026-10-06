<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StockCount;
use App\Services\StockCountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockCountController extends Controller
{
    public function __construct(
        protected StockCountService $stockCountService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');

        $query = StockCount::with(['warehouse:id,name,code', 'storageLocation:id,name,code', 'countedBy:id,name'])
            ->where('company_id', $companyId);

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('count_date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('count_date', '<=', $request->input('date_to'));
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $counts = $query->latest('id')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $counts,
        ]);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');

        $count = StockCount::with([
            'warehouse:id,name,code,business_unit_id,branch_id',
            'storageLocation:id,name,code',
            'countedBy:id,name',
            'submittedBy:id,name',
            'reviewedBy:id,name',
            'approvedBy:id,name',
            'postedBy:id,name',
            'items.product:id,name,product_code',
            'items.productVariant:id,sku,variant_name,cost_price',
            'items.stockBatch:id,batch_no,exp_date',
            'items.storageLocation:id,name,code',
        ])
        ->where('company_id', $companyId)
        ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $count,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'warehouse_id' => 'required|integer|exists:warehouses,id',
            'storage_location_id' => 'nullable|integer|exists:storage_locations,id',
            'count_type' => 'nullable|string|in:FULL,PARTIAL,CYCLE_COUNT',
            'description' => 'nullable|string|max:500',
            'count_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
            'auto_populate' => 'nullable|boolean',
            'items' => 'nullable|array',
            'items.*.product_variant_id' => 'required_with:items|integer|exists:product_variants,id',
            'items.*.storage_location_id' => 'nullable|integer|exists:storage_locations,id',
            'items.*.stock_batch_id' => 'nullable|integer|exists:stock_batches,id',
            'items.*.counted_quantity' => 'nullable|numeric|min:0',
            'items.*.variance_reason' => 'nullable|string|max:100',
            'items.*.notes' => 'nullable|string|max:500',
        ]);

        $validated['company_id'] = $companyId;

        $count = $this->stockCountService->createCount($validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Stock count created successfully.',
            'data' => $count,
        ], 201);
    }

    public function start(Request $request, $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $count = StockCount::where('company_id', $companyId)->findOrFail($id);

        $updated = $this->stockCountService->startCount($count, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Stock count started.',
            'data' => $updated,
        ]);
    }

    public function updateItems(Request $request, $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $count = StockCount::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer|exists:stock_count_items,id',
            'items.*.counted_quantity' => 'required|numeric|min:0',
            'items.*.variance_reason' => 'nullable|string|max:100',
            'items.*.notes' => 'nullable|string|max:500',
        ]);

        $updated = $this->stockCountService->updateItems($count, $validated['items'], $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Stock count items updated.',
            'data' => $updated,
        ]);
    }

    public function submit(Request $request, $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $count = StockCount::where('company_id', $companyId)->findOrFail($id);

        $updated = $this->stockCountService->submitCount($count, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Stock count submitted for review.',
            'data' => $updated,
        ]);
    }

    public function review(Request $request, $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $count = StockCount::where('company_id', $companyId)->findOrFail($id);

        $updated = $this->stockCountService->reviewCount($count, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Stock count marked as reviewed.',
            'data' => $updated,
        ]);
    }

    public function approve(Request $request, $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $count = StockCount::where('company_id', $companyId)->findOrFail($id);

        $updated = $this->stockCountService->approveCount($count, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Stock count approved.',
            'data' => $updated,
        ]);
    }

    public function post(Request $request, $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $count = StockCount::where('company_id', $companyId)->findOrFail($id);

        $updated = $this->stockCountService->postCount($count, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Stock count posted to inventory ledger.',
            'data' => $updated,
        ]);
    }

    public function cancel(Request $request, $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $count = StockCount::where('company_id', $companyId)->findOrFail($id);

        $updated = $this->stockCountService->cancelCount($count, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Stock count cancelled.',
            'data' => $updated,
        ]);
    }
}
