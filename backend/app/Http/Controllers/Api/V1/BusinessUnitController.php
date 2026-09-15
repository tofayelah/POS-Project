<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BusinessUnit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BusinessUnitController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $units = BusinessUnit::where('company_id', $companyId)->get();
        return response()->json(['success' => true, 'data' => $units]);
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $unit = BusinessUnit::where('company_id', $companyId)->findOrFail($id);
        return response()->json(['success' => true, 'data' => $unit]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive'
        ]);

        $validated['company_id'] = $companyId;
        $validated['uuid'] = (string) Str::uuid();

        // Check unique code within company
        if (BusinessUnit::where('company_id', $companyId)->where('code', $validated['code'])->exists()) {
            return response()->json(['success' => false, 'message' => 'Code already exists in this company.'], 422);
        }

        $unit = BusinessUnit::create($validated);

        return response()->json(['success' => true, 'message' => 'Business unit created.', 'data' => $unit], 201);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $unit = BusinessUnit::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive'
        ]);

        if (isset($validated['code']) && $validated['code'] !== $unit->code) {
            if (BusinessUnit::where('company_id', $companyId)->where('code', $validated['code'])->exists()) {
                return response()->json(['success' => false, 'message' => 'Code already exists in this company.'], 422);
            }
        }

        $unit->update($validated);

        return response()->json(['success' => true, 'message' => 'Business unit updated.', 'data' => $unit]);
    }

    public function destroy(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $unit = BusinessUnit::where('company_id', $companyId)->findOrFail($id);
        
        $unit->delete();

        return response()->json(['success' => true, 'message' => 'Business unit deleted.']);
    }
}
