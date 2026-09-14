<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StockTransfer;
use App\Services\TransferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransferController extends Controller
{
    public function __construct(protected TransferService $transferService) {}

    public function index(Request $request): JsonResponse
    {
        $query = StockTransfer::with(['sourceWarehouse', 'destinationWarehouse'])
            ->where('company_id', $request->attributes->get('company_id'))
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('source_warehouse_id')) {
            $query->where('source_warehouse_id', $request->input('source_warehouse_id'));
        }
        if ($request->filled('destination_warehouse_id')) {
            $query->where('destination_warehouse_id', $request->input('destination_warehouse_id'));
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        return response()->json([
            'success' => true,
            'data' => $query->paginate($perPage)
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'source_warehouse_id' => 'required|integer|exists:warehouses,id',
            'destination_warehouse_id' => 'required|integer|exists:warehouses,id|different:source_warehouse_id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_variant_id' => 'required|integer|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.notes' => 'nullable|string',
        ]);

        $transfer = $this->transferService->createTransfer($data, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Transfer created successfully.',
            'data' => $transfer,
        ], 201);
    }

    public function show(StockTransfer $transfer): JsonResponse
    {
        abort_if($transfer->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $transfer->load(['sourceWarehouse', 'destinationWarehouse', 'items.product', 'items.productVariant']);
        return response()->json(['success' => true, 'data' => $transfer]);
    }

    public function submit(Request $request, StockTransfer $transfer): JsonResponse
    {
        $transfer = $this->transferService->submitTransfer($transfer, $request->user()?->id);
        return response()->json(['success' => true, 'message' => 'Transfer submitted.', 'data' => $transfer]);
    }

    public function approve(Request $request, StockTransfer $transfer): JsonResponse
    {
        $transfer = $this->transferService->approveTransfer($transfer, $request->user()?->id);
        return response()->json(['success' => true, 'message' => 'Transfer approved.', 'data' => $transfer]);
    }

    public function ship(Request $request, StockTransfer $transfer): JsonResponse
    {
        $transfer = $this->transferService->shipTransfer($transfer, $request->user()?->id);
        return response()->json(['success' => true, 'message' => 'Transfer shipped.', 'data' => $transfer]);
    }

    public function receive(Request $request, StockTransfer $transfer): JsonResponse
    {
        $data = $request->validate([
            'items' => 'required|array',
            'items.*.item_id' => 'required|integer|exists:stock_transfer_items,id',
            'items.*.received_quantity' => 'required|numeric|min:0',
        ]);

        $transfer = $this->transferService->receiveTransfer($transfer, $data['items'], $request->user()?->id);
        return response()->json(['success' => true, 'message' => 'Transfer received.', 'data' => $transfer]);
    }

    public function cancel(Request $request, StockTransfer $transfer): JsonResponse
    {
        $transfer = $this->transferService->cancelTransfer($transfer, $request->user()?->id);
        return response()->json(['success' => true, 'message' => 'Transfer cancelled.', 'data' => $transfer]);
    }
}
