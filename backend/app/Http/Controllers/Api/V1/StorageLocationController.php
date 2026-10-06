<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStorageLocationRequest;
use App\Http\Requests\UpdateStorageLocationRequest;
use App\Models\AuditLog;
use App\Models\StorageLocation;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StorageLocationController extends Controller
{
    private function resolveCompanyId(Request $request): int
    {
        $companyId = $request->attributes->get('company_id')
            ?? $request->user()?->companies()->first()?->id
            ?? $request->user()?->company_id;

        if (!$companyId) {
            abort(403, 'Company scope could not be determined.');
        }

        return (int) $companyId;
    }

    private function resolveLocationId($storageLocation): int
    {
        return $storageLocation instanceof StorageLocation ? $storageLocation->id : (int) $storageLocation;
    }

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);

        $query = StorageLocation::with(['warehouse:id,name,code,business_unit_id', 'parent:id,name,code', 'children:id,name,code,parent_id'])
            ->where('company_id', $companyId);

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }

        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->input('parent_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('code', 'ilike', "%{$search}%");
            });
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    public function show(Request $request, $storageLocation): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $locationId = $this->resolveLocationId($storageLocation);

        $location = StorageLocation::with(['warehouse:id,name,code,business_unit_id', 'parent:id,name,code', 'children'])
            ->where('company_id', $companyId)
            ->findOrFail($locationId);

        return response()->json([
            'success' => true,
            'data' => $location,
        ]);
    }

    public function store(StoreStorageLocationRequest $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $validated = $request->validated();

        // Validate warehouse ownership within current company
        Warehouse::where('company_id', $companyId)->findOrFail($validated['warehouse_id']);

        $validated['company_id'] = $companyId;
        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $location = StorageLocation::create($validated);

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'user_id' => $request->user()?->id,
            'event' => 'LOCATION_CREATED',
            'auditable_type' => StorageLocation::class,
            'auditable_id' => $location->id,
            'new_values' => ['name' => $location->name, 'code' => $location->code, 'warehouse_id' => $location->warehouse_id],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Storage location created successfully.',
            'data' => $location->load(['warehouse:id,name,code,business_unit_id', 'parent:id,name,code']),
        ], 201);
    }

    public function update(UpdateStorageLocationRequest $request, $storageLocation): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $locationId = $this->resolveLocationId($storageLocation);

        $location = StorageLocation::where('company_id', $companyId)->findOrFail($locationId);
        $validated = $request->validated();

        if (isset($validated['warehouse_id'])) {
            Warehouse::where('company_id', $companyId)->findOrFail($validated['warehouse_id']);
        }

        // Prevent cyclic parent relationship
        if (isset($validated['parent_id']) && $validated['parent_id']) {
            if ((int) $validated['parent_id'] === $location->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'A storage location cannot be its own parent.',
                ], 422);
            }

            // Check if proposed parent is a descendant of this location
            $curr = StorageLocation::find($validated['parent_id']);
            while ($curr) {
                if ($curr->id === $location->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cyclic storage location hierarchy detected.',
                    ], 422);
                }
                $curr = $curr->parent;
            }
        }

        $location->update($validated);

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'user_id' => $request->user()?->id,
            'event' => 'LOCATION_UPDATED',
            'auditable_type' => StorageLocation::class,
            'auditable_id' => $location->id,
            'new_values' => ['name' => $location->name, 'code' => $location->code, 'is_active' => $location->is_active],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Storage location updated successfully.',
            'data' => $location->fresh(['warehouse:id,name,code,business_unit_id', 'parent:id,name,code']),
        ]);
    }

    public function destroy(Request $request, $storageLocation): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $locationId = $this->resolveLocationId($storageLocation);

        $location = StorageLocation::where('company_id', $companyId)->findOrFail($locationId);

        // Delete Safety: Check if children exist
        if ($location->children()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete storage location that has sub-locations. Please reassign or delete child locations first.',
            ], 422);
        }

        // Delete Safety: Must not be deleted if active inventory batches with quantity > 0 exist
        $hasActiveInventory = $location->inventoryBatches()
            ->where('quantity', '>', 0)
            ->exists();

        if ($hasActiveInventory) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete storage location with active inventory.',
            ], 422);
        }

        // Disassociate zero-quantity batches to allow safe deletion
        $location->inventoryBatches()->where('quantity', '<=', 0)->update(['storage_location_id' => null]);

        $location->delete();

        return response()->json([
            'success' => true,
            'message' => 'Storage location deleted successfully.',
        ]);
    }
}
