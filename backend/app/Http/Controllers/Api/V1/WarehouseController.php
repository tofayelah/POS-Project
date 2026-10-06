<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $query = Warehouse::where('company_id', $companyId)
            ->with(['businessUnit:id,name,code', 'branch:id,name,code']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('code', 'ilike', "%{$search}%");
            });
        }

        $warehouses = $query->get();
        return response()->json(['success' => true, 'data' => $warehouses]);
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $warehouse = Warehouse::where('company_id', $companyId)
            ->with(['businessUnit:id,name,code', 'branch:id,name,code', 'storageLocations'])
            ->findOrFail($id);
        return response()->json(['success' => true, 'data' => $warehouse]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'business_unit_id' => 'required|exists:business_units,id',
            'branch_id' => 'nullable|exists:branches,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'is_default' => 'nullable|boolean',
            'warehouse_type' => 'nullable|string|in:MAIN,CENTRAL,BRANCH,STORE,RETURN,DAMAGED',
            'status' => 'nullable|in:active,inactive'
        ]);

        // Ensure business unit belongs to the company
        $bu = BusinessUnit::where('company_id', $companyId)->find($validated['business_unit_id']);
        if (!$bu) {
            return response()->json([
                'success' => false,
                'message' => 'The selected business unit does not belong to the authorized company.',
                'errors' => ['business_unit_id' => ['The selected business unit does not belong to the authorized company.']]
            ], 422);
        }
        
        // Ensure branch belongs to the business unit, if provided
        if (!empty($validated['branch_id'])) {
            $branch = Branch::where('company_id', $companyId)->where('business_unit_id', $bu->id)->find($validated['branch_id']);
            if (!$branch) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected branch does not belong to the authorized business unit or company.',
                    'errors' => ['branch_id' => ['The selected branch does not belong to the authorized business unit or company.']]
                ], 422);
            }
        }

        // Check unique code within the company / business unit
        if (Warehouse::where('company_id', $companyId)->where('code', $validated['code'])->exists()) {
            return response()->json(['success' => false, 'message' => 'Code already exists in this company.'], 422);
        }

        $validated['company_id'] = $companyId;
        $validated['uuid'] = (string) Str::uuid();
        if (empty($validated['warehouse_type'])) {
            $validated['warehouse_type'] = 'MAIN';
        }
        if (empty($validated['status'])) {
            $validated['status'] = 'active';
        }

        // Handle default warehouse exclusivity
        if (!empty($validated['is_default'])) {
            Warehouse::where('company_id', $companyId)->update(['is_default' => false]);
        }

        $warehouse = Warehouse::create($validated);

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'user_id' => $request->user()?->id,
            'event' => 'WAREHOUSE_CREATED',
            'auditable_type' => Warehouse::class,
            'auditable_id' => $warehouse->id,
            'new_values' => ['name' => $warehouse->name, 'code' => $warehouse->code, 'status' => $warehouse->status],
        ]);

        return response()->json(['success' => true, 'message' => 'Warehouse created.', 'data' => $warehouse], 201);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $warehouse = Warehouse::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'business_unit_id' => 'nullable|exists:business_units,id',
            'branch_id' => 'nullable|exists:branches,id',
            'name' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'is_default' => 'nullable|boolean',
            'warehouse_type' => 'nullable|string|in:MAIN,CENTRAL,BRANCH,STORE,RETURN,DAMAGED',
            'status' => 'nullable|in:active,inactive'
        ]);

        $targetBuId = $warehouse->business_unit_id;
        if (isset($validated['business_unit_id']) && $validated['business_unit_id'] != $warehouse->business_unit_id) {
            $bu = BusinessUnit::where('company_id', $companyId)->find($validated['business_unit_id']);
            if (!$bu) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected business unit does not belong to the authorized company.',
                    'errors' => ['business_unit_id' => ['The selected business unit does not belong to the authorized company.']]
                ], 422);
            }
            $targetBuId = $bu->id;
        }

        if (array_key_exists('branch_id', $validated)) {
            if (!empty($validated['branch_id']) && $validated['branch_id'] !== $warehouse->branch_id) {
                $branch = Branch::where('company_id', $companyId)->where('business_unit_id', $targetBuId)->find($validated['branch_id']);
                if (!$branch) {
                    return response()->json([
                        'success' => false,
                        'message' => 'The selected branch does not belong to the authorized business unit or company.',
                        'errors' => ['branch_id' => ['The selected branch does not belong to the authorized business unit or company.']]
                    ], 422);
                }
            }
        }

        if (isset($validated['code']) && $validated['code'] !== $warehouse->code) {
            if (Warehouse::where('company_id', $companyId)->where('code', $validated['code'])->where('id', '!=', $warehouse->id)->exists()) {
                return response()->json(['success' => false, 'message' => 'Code already exists in this company.'], 422);
            }
        }

        if (!empty($validated['is_default'])) {
            Warehouse::where('company_id', $companyId)->where('id', '!=', $warehouse->id)->update(['is_default' => false]);
        }

        $oldStatus = $warehouse->status;
        $warehouse->update($validated);

        $event = ($oldStatus !== 'inactive' && isset($validated['status']) && $validated['status'] === 'inactive')
            ? 'WAREHOUSE_DEACTIVATED'
            : 'WAREHOUSE_UPDATED';

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'user_id' => $request->user()?->id,
            'event' => $event,
            'auditable_type' => Warehouse::class,
            'auditable_id' => $warehouse->id,
            'old_values' => ['status' => $oldStatus],
            'new_values' => ['name' => $warehouse->name, 'code' => $warehouse->code, 'status' => $warehouse->status],
        ]);

        return response()->json(['success' => true, 'message' => 'Warehouse updated.', 'data' => $warehouse]);
    }

    public function destroy(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $warehouse = Warehouse::where('company_id', $companyId)->findOrFail($id);
        
        // Prevent deletion if active stock exists
        $hasActiveStock = Inventory::where('warehouse_id', $warehouse->id)->where('quantity', '>', 0)->exists();
        if ($hasActiveStock) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete warehouse with active stock inventory.'
            ], 422);
        }

        // Prevent deletion if historical stock movements exist
        $hasMovements = StockMovement::where('warehouse_id', $warehouse->id)->exists();
        if ($hasMovements) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete warehouse with historical stock movement ledger records.'
            ], 422);
        }

        $warehouse->delete();

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'user_id' => $request->user()?->id,
            'event' => 'WAREHOUSE_DEACTIVATED',
            'auditable_type' => Warehouse::class,
            'auditable_id' => $warehouse->id,
            'old_values' => ['status' => $warehouse->status],
            'new_values' => ['deleted' => true],
        ]);

        return response()->json(['success' => true, 'message' => 'Warehouse deleted.']);
    }
}
