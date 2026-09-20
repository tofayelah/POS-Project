<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StorageLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StorageLocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StorageLocation::with('warehouse')
            ->where('company_id', $request->attributes->get('company_id'));

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return response()->json([
            'success' => true,
            'data' => $query->get()
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => [
                'required',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->attributes->get('company_id'));
                }),
            ],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('storage_locations')->where(function ($query) use ($request) {
                    return $query->where('warehouse_id', $request->warehouse_id);
                }),
            ],
            'name' => 'required|string|max:150',
            'is_active' => 'boolean',
        ]);

        $validated['company_id'] = $request->attributes->get('company_id');

        $location = StorageLocation::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Storage location created successfully',
            'data' => $location
        ], 201);
    }
}
