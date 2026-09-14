<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductVariantRequest;
use App\Http\Resources\ProductVariantResource;
use App\Models\AuditLog;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductVariantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ProductVariant::with(['product', 'attributeValues.attribute', 'barcodes']);

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('sku', 'ilike', "%{$search}%")
                  ->orWhere('variant_name', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $variants = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => ProductVariantResource::collection($variants->items()),
            'meta' => [
                'current_page' => $variants->currentPage(),
                'last_page' => $variants->lastPage(),
                'per_page' => $variants->perPage(),
                'total' => $variants->total(),
            ],
        ]);
    }

    public function show(ProductVariant $variant): JsonResponse
    {
        $variant->load(['product', 'attributeValues.attribute', 'barcodes']);
        return response()->json([
            'success' => true,
            'data' => new ProductVariantResource($variant),
        ]);
    }

    public function update(ProductVariantRequest $request, ProductVariant $variant): JsonResponse
    {
        $oldValues = [
            'sku' => $variant->sku,
            'selling_price' => $variant->selling_price,
            'cost_price' => $variant->cost_price,
            'status' => $variant->status,
        ];

        $data = $request->validated();
        $attrIds = $data['attribute_value_ids'] ?? null;
        unset($data['attribute_value_ids']);

        $data['updated_by'] = $request->user()?->id;
        $variant->update($data);

        if ($attrIds !== null) {
            $syncPayload = [];
            $attrValues = \App\Models\AttributeValue::whereIn('id', $attrIds)->get();
            foreach ($attrValues as $av) {
                $syncPayload[$av->id] = ['attribute_id' => $av->attribute_id];
            }
            $variant->attributeValues()->sync($syncPayload);
        }

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $variant->product?->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'PRODUCT_VARIANT_UPDATED',
            'auditable_type' => ProductVariant::class,
            'auditable_id' => $variant->id,
            'old_values' => $oldValues,
            'new_values' => [
                'sku' => $variant->sku,
                'selling_price' => $variant->selling_price,
                'cost_price' => $variant->cost_price,
                'status' => $variant->status,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product variant updated successfully.',
            'data' => new ProductVariantResource($variant->fresh(['product', 'attributeValues.attribute', 'barcodes'])),
        ]);
    }

    public function activate(Request $request, ProductVariant $variant): JsonResponse
    {
        $variant->update(['status' => 'active', 'updated_by' => $request->user()?->id]);
        return response()->json([
            'success' => true,
            'message' => 'Product variant activated.',
            'data' => new ProductVariantResource($variant->fresh()),
        ]);
    }

    public function deactivate(Request $request, ProductVariant $variant): JsonResponse
    {
        $variant->update(['status' => 'inactive', 'updated_by' => $request->user()?->id]);
        return response()->json([
            'success' => true,
            'message' => 'Product variant deactivated.',
            'data' => new ProductVariantResource($variant->fresh()),
        ]);
    }
}
