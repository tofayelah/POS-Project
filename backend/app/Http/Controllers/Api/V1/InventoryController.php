<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventoryController extends Controller
{
    public function __construct(protected InventoryService $inventoryService) {}

    public function index(Request $request): JsonResponse
    {
        $query = Inventory::with(['warehouse', 'product', 'productVariant'])
            ->where('company_id', $request->attributes->get('company_id'));

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }
        if ($request->filled('product_variant_id')) {
            $query->where('product_variant_id', $request->input('product_variant_id'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('product', function($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%");
            })->orWhereHas('productVariant', function($q) use ($search) {
                $q->where('sku', 'ilike', "%{$search}%")
                  ->orWhere('variant_name', 'ilike', "%{$search}%");
            });
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        return response()->json([
            'success' => true,
            'data' => $query->paginate($perPage)
        ]);
    }

    public function openingStock(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'warehouse_id' => [
                'required', 'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->company_id);
                }),
            ],
            'product_variant_id' => [
                'required', 'integer',
                function ($attribute, $value, $fail) use ($request) {
                    $variant = \App\Models\ProductVariant::with('product')->find($value);
                    if (!$variant || $variant->product->company_id != $request->company_id) {
                        $fail('The selected product variant is invalid.');
                    }
                }
            ],
            'quantity' => 'required|numeric|min:0.0001',
            'unit_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'storage_location_id' => [
                'nullable', 'integer',
                Rule::exists('storage_locations', 'id')->where(function ($query) use ($request) {
                    return $query->where('warehouse_id', $request->warehouse_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],
            'stock_batch_id' => [
                'nullable', 'integer',
                Rule::exists('stock_batches', 'id')->where(function ($query) use ($request) {
                    return $query->where('variant_id', $request->product_variant_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],

        ]);

        $movement = $this->inventoryService->addOpeningStock($data, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Opening stock recorded successfully.',
            'data' => $movement,
        ], 201);
    }

    public function adjustStock(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'warehouse_id' => [
                'required', 'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->company_id);
                }),
            ],
            'product_variant_id' => [
                'required', 'integer',
                function ($attribute, $value, $fail) use ($request) {
                    $variant = \App\Models\ProductVariant::with('product')->find($value);
                    if (!$variant || $variant->product->company_id != $request->company_id) {
                        $fail('The selected product variant is invalid.');
                    }
                }
            ],
            'type' => 'required|in:add,subtract',
            'quantity' => 'required|numeric|min:0.0001',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
            'storage_location_id' => [
                'nullable', 'integer',
                Rule::exists('storage_locations', 'id')->where(function ($query) use ($request) {
                    return $query->where('warehouse_id', $request->warehouse_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],
            'stock_batch_id' => [
                'nullable', 'integer',
                Rule::exists('stock_batches', 'id')->where(function ($query) use ($request) {
                    return $query->where('variant_id', $request->product_variant_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],

        ]);

        $movement = $this->inventoryService->adjustStock($data, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Stock adjusted successfully.',
            'data' => $movement,
        ], 201);
    }

    public function recordDamageLoss(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'warehouse_id' => [
                'required', 'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->company_id);
                }),
            ],
            'product_variant_id' => [
                'required', 'integer',
                function ($attribute, $value, $fail) use ($request) {
                    $variant = \App\Models\ProductVariant::with('product')->find($value);
                    if (!$variant || $variant->product->company_id != $request->company_id) {
                        $fail('The selected product variant is invalid.');
                    }
                }
            ],
            'type' => 'required|in:damage,loss',
            'quantity' => 'required|numeric|min:0.0001',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
            'storage_location_id' => [
                'nullable', 'integer',
                Rule::exists('storage_locations', 'id')->where(function ($query) use ($request) {
                    return $query->where('warehouse_id', $request->warehouse_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],
            'stock_batch_id' => [
                'nullable', 'integer',
                Rule::exists('stock_batches', 'id')->where(function ($query) use ($request) {
                    return $query->where('variant_id', $request->product_variant_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],

        ]);

        $movement = $this->inventoryService->recordDamageLoss($data, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => ucfirst($data['type']) . ' recorded successfully.',
            'data' => $movement,
        ], 201);
    }

    public function movements(Request $request): JsonResponse
    {
        $query = StockMovement::with(['warehouse', 'product', 'productVariant', 'creator'])
            ->where('company_id', $request->attributes->get('company_id'))
            ->latest();

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }
        if ($request->filled('product_variant_id')) {
            $query->where('product_variant_id', $request->input('product_variant_id'));
        }
        if ($request->filled('movement_type')) {
            $query->where('movement_type', $request->input('movement_type'));
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        return response()->json([
            'success' => true,
            'data' => $query->paginate($perPage)
        ]);
    }

    public function lowStock(Request $request): JsonResponse
    {
        // Simple foundation for low stock - joins to products to get reorder level
        $companyId = $request->attributes->get('company_id');
        
        $inventory = Inventory::with(['warehouse', 'product', 'productVariant'])
            ->where('company_id', $companyId)
            ->whereHas('product', function($q) {
                $q->whereColumn('inventories.available_quantity', '<=', 'products.reorder_level');
            })
            ->get();

        return response()->json([
            'success' => true,
            'data' => $inventory
        ]);
    }

    public function directTransfer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'source_warehouse_id' => [
                'required', 'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->company_id);
                }),
            ],
            'destination_warehouse_id' => [
                'required', 'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->company_id);
                }),
            ],
            'product_variant_id' => [
                'required', 'integer',
                function ($attribute, $value, $fail) use ($request) {
                    $variant = \App\Models\ProductVariant::with('product')->find($value);
                    if (!$variant || (int) $variant->product->company_id !== (int) $request->company_id) {
                        $fail('The selected product variant is invalid.');
                    }
                }
            ],
            'quantity' => 'required|numeric|min:0.0001',
            'reference_type' => 'required|string',
            'reference_id' => 'required|integer',
            'reference_number' => 'required|string',
            'source_storage_location_id' => [
                'nullable', 'integer',
                Rule::exists('storage_locations', 'id')->where(function ($query) use ($request) {
                    return $query->where('warehouse_id', $request->source_warehouse_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],
            'destination_storage_location_id' => [
                'nullable', 'integer',
                Rule::exists('storage_locations', 'id')->where(function ($query) use ($request) {
                    return $query->where('warehouse_id', $request->destination_warehouse_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],
            'stock_batch_id' => [
                'nullable', 'integer',
                Rule::exists('stock_batches', 'id')->where(function ($query) use ($request) {
                    return $query->where('variant_id', $request->product_variant_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $result = $this->inventoryService->transferStock(
            companyId: (int) $data['company_id'],
            sourceWarehouseId: (int) $data['source_warehouse_id'],
            destinationWarehouseId: (int) $data['destination_warehouse_id'],
            productVariantId: (int) $data['product_variant_id'],
            quantity: (float) $data['quantity'],
            referenceType: $data['reference_type'],
            referenceId: (int) $data['reference_id'],
            referenceNumber: $data['reference_number'],
            sourceStorageLocationId: isset($data['source_storage_location_id']) ? (int) $data['source_storage_location_id'] : null,
            destinationStorageLocationId: isset($data['destination_storage_location_id']) ? (int) $data['destination_storage_location_id'] : null,
            stockBatchId: isset($data['stock_batch_id']) ? (int) $data['stock_batch_id'] : null,
            reason: $data['reason'] ?? null,
            notes: $data['notes'] ?? null,
            userId: $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Stock transferred successfully.',
            'data' => $result,
        ], 200);
    }

    public function adjustmentIn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'warehouse_id' => [
                'required', 'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->company_id);
                }),
            ],
            'product_variant_id' => [
                'required', 'integer',
                function ($attribute, $value, $fail) use ($request) {
                    $variant = \App\Models\ProductVariant::with('product')->find($value);
                    if (!$variant || (int) $variant->product->company_id !== (int) $request->company_id) {
                        $fail('The selected product variant is invalid.');
                    }
                }
            ],
            'quantity' => 'required|numeric|min:0.0001',
            'unit_cost' => 'required|numeric|min:0',
            'reference_type' => 'required|string',
            'reference_id' => 'required|integer',
            'reference_number' => 'required|string',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
            'storage_location_id' => [
                'nullable', 'integer',
                Rule::exists('storage_locations', 'id')->where(function ($query) use ($request) {
                    return $query->where('warehouse_id', $request->warehouse_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],
            'stock_batch_id' => [
                'nullable', 'integer',
                Rule::exists('stock_batches', 'id')->where(function ($query) use ($request) {
                    return $query->where('variant_id', $request->product_variant_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],
            'batch_number' => 'nullable|string|max:100',
        ]);

        $movement = $this->inventoryService->adjustmentIn(
            companyId: (int) $data['company_id'],
            warehouseId: (int) $data['warehouse_id'],
            productVariantId: (int) $data['product_variant_id'],
            quantity: (float) $data['quantity'],
            unitCost: (float) $data['unit_cost'],
            referenceType: $data['reference_type'],
            referenceId: (int) $data['reference_id'],
            referenceNumber: $data['reference_number'],
            reason: $data['reason'],
            notes: $data['notes'] ?? null,
            userId: $request->user()?->id,
            stockBatchId: isset($data['stock_batch_id']) ? (int) $data['stock_batch_id'] : null,
            batchNumber: $data['batch_number'] ?? null,
            storageLocationId: isset($data['storage_location_id']) ? (int) $data['storage_location_id'] : null
        );

        return response()->json([
            'success' => true,
            'message' => 'Stock adjusted in successfully.',
            'data' => $movement,
        ], 201);
    }

    public function adjustmentOut(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'warehouse_id' => [
                'required', 'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->company_id);
                }),
            ],
            'product_variant_id' => [
                'required', 'integer',
                function ($attribute, $value, $fail) use ($request) {
                    $variant = \App\Models\ProductVariant::with('product')->find($value);
                    if (!$variant || (int) $variant->product->company_id !== (int) $request->company_id) {
                        $fail('The selected product variant is invalid.');
                    }
                }
            ],
            'quantity' => 'required|numeric|min:0.0001',
            'reference_type' => 'required|string',
            'reference_id' => 'required|integer',
            'reference_number' => 'required|string',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
            'storage_location_id' => [
                'nullable', 'integer',
                Rule::exists('storage_locations', 'id')->where(function ($query) use ($request) {
                    return $query->where('warehouse_id', $request->warehouse_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],
            'stock_batch_id' => [
                'nullable', 'integer',
                Rule::exists('stock_batches', 'id')->where(function ($query) use ($request) {
                    return $query->where('variant_id', $request->product_variant_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],
        ]);

        $movement = $this->inventoryService->adjustmentOut(
            companyId: (int) $data['company_id'],
            warehouseId: (int) $data['warehouse_id'],
            productVariantId: (int) $data['product_variant_id'],
            quantity: (float) $data['quantity'],
            referenceType: $data['reference_type'],
            referenceId: (int) $data['reference_id'],
            referenceNumber: $data['reference_number'],
            reason: $data['reason'],
            notes: $data['notes'] ?? null,
            userId: $request->user()?->id,
            stockBatchId: isset($data['stock_batch_id']) ? (int) $data['stock_batch_id'] : null,
            storageLocationId: isset($data['storage_location_id']) ? (int) $data['storage_location_id'] : null
        );

        return response()->json([
            'success' => true,
            'message' => 'Stock adjusted out successfully.',
            'data' => $movement,
        ], 201);
    }
}
