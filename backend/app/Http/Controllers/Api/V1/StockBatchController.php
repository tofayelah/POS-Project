<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StockBatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockBatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StockBatch::with(['product', 'variant', 'supplier'])
            ->where('company_id', $request->attributes->get('company_id'));

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }

        if ($request->filled('variant_id')) {
            $query->where('variant_id', $request->input('variant_id'));
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json([
            'success' => true,
            'data' => $query->get()
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => [
                'required',
                Rule::exists('products', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->attributes->get('company_id'));
                }),
            ],
            'variant_id' => [
                'required',
                Rule::exists('product_variants', 'id')->where(function ($query) use ($request) {
                    return $query->where('product_id', $request->product_id);
                }),
            ],
            'supplier_id' => [
                'nullable',
                Rule::exists('suppliers', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->attributes->get('company_id'));
                }),
            ],
            'batch_no' => [
                'required',
                'string',
                'max:100',
                Rule::unique('stock_batches')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->attributes->get('company_id'))
                                 ->where('variant_id', $request->variant_id);
                }),
            ],
            'mfg_date' => 'nullable|date',
            'exp_date' => 'nullable|date',
            'unit_cost' => 'numeric|min:0',
            'status' => 'string|max:50'
        ]);

        $validated['company_id'] = $request->attributes->get('company_id');
        $validated['status'] = $validated['status'] ?? 'ACTIVE';

        $batch = StockBatch::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Stock batch created successfully',
            'data' => $batch
        ], 201);
    }
}
