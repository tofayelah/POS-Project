<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PosTerminal;
use Illuminate\Http\Request;

class PosTerminalController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $terminals = PosTerminal::where('company_id', $companyId)->get();
        return response()->json(['success' => true, 'data' => $terminals]);
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
        $validated['company_id'] = $companyId;
        $validated['created_by'] = $request->user()->id;
        
        $terminal = PosTerminal::create($validated);
        
        return response()->json(['success' => true, 'data' => $terminal], 201);
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
        return response()->json(['success' => true, 'data' => $terminal]);
    }
}
