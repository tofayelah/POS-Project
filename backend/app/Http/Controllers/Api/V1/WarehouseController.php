<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BusinessUnit;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $warehouses = Warehouse::where('company_id', $companyId)
            ->with(['businessUnit:id,name,code', 'branch:id,name,code'])
            ->get();
        return response()->json(['success' => true, 'data' => $warehouses]);
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $warehouse = Warehouse::where('company_id', $companyId)
            ->with(['businessUnit:id,name,code', 'branch:id,name,code'])
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

        // Check unique code within the business unit
        if (Warehouse::where('business_unit_id', $bu->id)->where('code', $validated['code'])->exists()) {
            return response()->json(['success' => false, 'message' => 'Code already exists in this business unit.'], 422);
        }

        $validated['company_id'] = $companyId;
        $validated['uuid'] = (string) Str::uuid();
        if (empty($validated['warehouse_type'])) {
            $validated['warehouse_type'] = 'MAIN';
        }

        $warehouse = Warehouse::create($validated);

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
            if (Warehouse::where('business_unit_id', $targetBuId)->where('code', $validated['code'])->exists()) {
                return response()->json(['success' => false, 'message' => 'Code already exists in this business unit.'], 422);
            }
        }

        $warehouse->update($validated);

        return response()->json(['success' => true, 'message' => 'Warehouse updated.', 'data' => $warehouse]);
    }

    public function destroy(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $warehouse = Warehouse::where('company_id', $companyId)->findOrFail($id);
        
        $warehouse->delete();

        return response()->json(['success' => true, 'message' => 'Warehouse deleted.']);
    }
}
