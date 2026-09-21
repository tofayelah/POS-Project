<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStorageLocationRequest;
use App\Http\Requests\UpdateStorageLocationRequest;
use App\Models\StorageLocation;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StorageLocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');

        $query = StorageLocation::where('company_id', $companyId)
            ->with('warehouse:id,name,code,business_unit_id,branch_id');

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $locations = $query->get();

        return response()->json([
            'success' => true,
            'data' => $locations,
        ]);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');

        $location = StorageLocation::where('company_id', $companyId)
            ->with('warehouse:id,name,code,business_unit_id,branch_id')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $location,
        ]);
    }

    public function store(StoreStorageLocationRequest $request): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validated();

        // Ensure the warehouse belongs to the current company
        $warehouse = Warehouse::where('company_id', $companyId)
            ->findOrFail($validated['warehouse_id']);

        // Check unique code within the warehouse (defense in depth)
        if (StorageLocation::where('warehouse_id', $warehouse->id)->where('code', $validated['code'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Code already exists in this warehouse.',
            ], 422);
        }

        $validated['company_id'] = $companyId;
        if (!array_key_exists('is_active', $validated) || $validated['is_active'] === null) {
            $validated['is_active'] = true;
        }

        $location = StorageLocation::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Storage location created.',
            'data' => $location->load('warehouse:id,name,code'),
        ], 201);
    }

    public function update(UpdateStorageLocationRequest $request, $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $location = StorageLocation::where('company_id', $companyId)->findOrFail($id);
        $validated = $request->validated();

        // If warehouse_id is provided, verify it belongs to current company
        if (isset($validated['warehouse_id']) && $validated['warehouse_id'] != $location->warehouse_id) {
            $warehouse = Warehouse::where('company_id', $companyId)->findOrFail($validated['warehouse_id']);
            $targetWarehouseId = $warehouse->id;
        } else {
            $targetWarehouseId = $location->warehouse_id;
        }

        // Check unique code within target warehouse
        $targetCode = $validated['code'] ?? $location->code;
        if (StorageLocation::where('warehouse_id', $targetWarehouseId)
            ->where('code', $targetCode)
            ->where('id', '!=', $location->id)
            ->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Code already exists in this warehouse.',
            ], 422);
        }

        $location->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Storage location updated.',
            'data' => $location->load('warehouse:id,name,code'),
        ]);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $location = StorageLocation::where('company_id', $companyId)->findOrFail($id);

        // Check if any inventory batches exist for this storage location
        if ($location->inventoryBatches()->where('quantity', '>', 0)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete storage location with active inventory.',
            ], 422);
        }

        $location->delete();

        return response()->json([
            'success' => true,
            'message' => 'Storage location deleted.',
        ]);
    }
}
