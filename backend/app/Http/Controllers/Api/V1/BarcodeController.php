<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\BarcodeRequest;
use App\Http\Resources\BarcodeResource;
use App\Models\AuditLog;
use App\Models\Barcode;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BarcodeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Barcode::with(['variant.product']);

        if ($request->filled('product_variant_id')) {
            $query->where('product_variant_id', $request->input('product_variant_id'));
        }

        if ($request->filled('barcode')) {
            $query->where('barcode', 'ilike', '%' . $request->input('barcode') . '%');
        }

        if ($request->filled('barcode_type')) {
            $query->where('barcode_type', $request->input('barcode_type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $barcodes = $query->latest()->paginate(25);

        return response()->json([
            'success' => true,
            'data' => BarcodeResource::collection($barcodes->items()),
            'meta' => [
                'current_page' => $barcodes->currentPage(),
                'last_page' => $barcodes->lastPage(),
                'per_page' => $barcodes->perPage(),
                'total' => $barcodes->total(),
            ],
        ]);
    }

    /**
     * Fast barcode lookup endpoint for scanner / POS integration.
     */
    public function lookup(Request $request, string $code): JsonResponse
    {
        $barcode = Barcode::with(['variant.product.category', 'variant.product.unit', 'variant.attributeValues.attribute'])
            ->where('barcode', trim($code))
            ->where('status', 'active')
            ->first();

        if (! $barcode) {
            return response()->json([
                'success' => false,
                'message' => "No active product variant found for barcode '{$code}'.",
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new BarcodeResource($barcode),
        ]);
    }

    public function store(BarcodeRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $data = $request->validated();
            $data['created_by'] = $request->user()?->id;
            $data['updated_by'] = $request->user()?->id;

            if (! empty($data['is_primary'])) {
                Barcode::where('product_variant_id', $data['product_variant_id'])
                    ->update(['is_primary' => false]);
            }

            $barcode = Barcode::create($data);

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $barcode->variant?->product?->company_id,
                'user_id' => $request->user()?->id,
                'event' => 'BARCODE_CREATED',
                'auditable_type' => Barcode::class,
                'auditable_id' => $barcode->id,
                'new_values' => ['barcode' => $barcode->barcode, 'is_primary' => $barcode->is_primary],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Barcode registered successfully.',
                'data' => new BarcodeResource($barcode->load('variant.product')),
            ], 201);
        });
    }

    public function setPrimary(Request $request, Barcode $barcode): JsonResponse
    {
        return DB::transaction(function () use ($barcode) {
            Barcode::where('product_variant_id', $barcode->product_variant_id)
                ->update(['is_primary' => false]);

            $barcode->update(['is_primary' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Barcode marked as primary.',
                'data' => new BarcodeResource($barcode->fresh('variant')),
            ]);
        });
    }

    public function destroy(Barcode $barcode): JsonResponse
    {
        $barcode->delete();

        return response()->json([
            'success' => true,
            'message' => 'Barcode deleted successfully.',
        ]);
    }
}
