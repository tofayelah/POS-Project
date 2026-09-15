<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BusinessUnit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BranchController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $branches = Branch::where('company_id', $companyId)
            ->with('businessUnit:id,name,code')
            ->get();
        return response()->json(['success' => true, 'data' => $branches]);
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $branch = Branch::where('company_id', $companyId)
            ->with('businessUnit:id,name,code')
            ->findOrFail($id);
        return response()->json(['success' => true, 'data' => $branch]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'business_unit_id' => 'required|exists:business_units,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'status' => 'nullable|in:active,inactive'
        ]);

        // Ensure the business unit belongs to the same company
        $bu = BusinessUnit::where('company_id', $companyId)->findOrFail($validated['business_unit_id']);

        // Check unique code within the business unit
        if (Branch::where('business_unit_id', $bu->id)->where('code', $validated['code'])->exists()) {
            return response()->json(['success' => false, 'message' => 'Code already exists in this business unit.'], 422);
        }

        $validated['company_id'] = $companyId;
        $validated['uuid'] = (string) Str::uuid();

        $branch = Branch::create($validated);

        return response()->json(['success' => true, 'message' => 'Branch created.', 'data' => $branch], 201);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $branch = Branch::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'status' => 'nullable|in:active,inactive'
        ]);

        if (isset($validated['code']) && $validated['code'] !== $branch->code) {
            if (Branch::where('business_unit_id', $branch->business_unit_id)->where('code', $validated['code'])->exists()) {
                return response()->json(['success' => false, 'message' => 'Code already exists in this business unit.'], 422);
            }
        }

        $branch->update($validated);

        return response()->json(['success' => true, 'message' => 'Branch updated.', 'data' => $branch]);
    }

    public function destroy(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $branch = Branch::where('company_id', $companyId)->findOrFail($id);
        
        $branch->delete();

        return response()->json(['success' => true, 'message' => 'Branch deleted.']);
    }
}
