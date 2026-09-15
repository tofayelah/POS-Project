<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PosTerminal;
use App\Models\Warehouse;
use App\Models\Branch;
use Illuminate\Http\Request;

class PosTerminalController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $terminals = PosTerminal::where('company_id', $companyId)
            ->with(['branch:id,name', 'warehouse:id,name'])
            ->get();
        return response()->json(['success' => true, 'data' => $terminals]);
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $terminal = PosTerminal::where('company_id', $companyId)
            ->with(['branch:id,name', 'warehouse:id,name'])
            ->findOrFail($id);
        return response()->json(['success' => true, 'data' => $terminal]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'terminal_code' => 'required|string|max:255',
            'terminal_name' => 'required|string|max:255',
            'warehouse_id' => 'required|exists:warehouses,id',
            'branch_id' => 'nullable|exists:branches,id',
            'status' => 'nullable|in:ACTIVE,INACTIVE'
        ]);

        // Enforce Company Scope
        $warehouse = Warehouse::where('company_id', $companyId)->findOrFail($validated['warehouse_id']);
        if (!empty($validated['branch_id'])) {
            Branch::where('company_id', $companyId)->findOrFail($validated['branch_id']);
        }

        if (PosTerminal::where('company_id', $companyId)->where('terminal_code', $validated['terminal_code'])->exists()) {
            return response()->json(['success' => false, 'message' => 'Terminal code already exists.'], 422);
        }

        $validated['company_id'] = $companyId;
        $validated['business_unit_id'] = $warehouse->business_unit_id;
        $validated['created_by'] = $request->user()->id;

        $terminal = PosTerminal::create($validated);

        return response()->json(['success' => true, 'message' => 'Terminal created.', 'data' => $terminal], 201);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $terminal = PosTerminal::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'terminal_name' => 'nullable|string|max:255',
            'status' => 'nullable|in:ACTIVE,INACTIVE'
        ]);

        $terminal->update($validated);
        
        return response()->json(['success' => true, 'message' => 'Terminal updated.', 'data' => $terminal]);
    }
}
