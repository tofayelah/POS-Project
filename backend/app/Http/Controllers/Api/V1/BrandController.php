<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\BrandRequest;
use App\Http\Resources\BrandResource;
use App\Models\AuditLog;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BrandController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Brand::withCount('products');

        $query->where('company_id', $request->attributes->get('company_id'));

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->boolean('all')) {
            $brands = $query->orderBy('name')->get();
            return response()->json([
                'success' => true,
                'data' => BrandResource::collection($brands),
            ]);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $brands = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => BrandResource::collection($brands->items()),
            'meta' => [
                'current_page' => $brands->currentPage(),
                'last_page' => $brands->lastPage(),
                'per_page' => $brands->perPage(),
                'total' => $brands->total(),
            ],
        ]);
    }

    public function store(BrandRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['company_id'] = $request->attributes->get('company_id');
        $data['created_by'] = $request->user()?->id;
        $data['updated_by'] = $request->user()?->id;

        $brand = Brand::create($data);

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $brand->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'BRAND_CREATED',
            'auditable_type' => Brand::class,
            'auditable_id' => $brand->id,
            'new_values' => ['name' => $brand->name],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Brand created successfully.',
            'data' => new BrandResource($brand),
        ], 201);
    }

    public function show(Brand $brand): JsonResponse
    {
        abort_if($brand->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $brand->loadCount('products');
        return response()->json([
            'success' => true,
            'data' => new BrandResource($brand),
        ]);
    }

    public function update(BrandRequest $request, Brand $brand): JsonResponse
    {
        abort_if($brand->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $oldValues = ['name' => $brand->name, 'status' => $brand->status];
        $data = $request->validated();
        $data['company_id'] = $request->attributes->get('company_id');
        $data['updated_by'] = $request->user()?->id;

        $brand->update($data);

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $brand->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'BRAND_UPDATED',
            'auditable_type' => Brand::class,
            'auditable_id' => $brand->id,
            'old_values' => $oldValues,
            'new_values' => ['name' => $brand->name, 'status' => $brand->status],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Brand updated successfully.',
            'data' => new BrandResource($brand->fresh()),
        ]);
    }

    public function destroy(Request $request, Brand $brand): JsonResponse
    {
        abort_if($brand->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        if ($brand->products()->exists()) {
            $brand->update(['status' => 'inactive', 'updated_by' => $request->user()?->id]);
            return response()->json([
                'success' => true,
                'message' => 'Brand has associated products; status changed to inactive.',
            ]);
        }

        $brand->delete();

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $brand->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'BRAND_STATUS_CHANGED',
            'auditable_type' => Brand::class,
            'auditable_id' => $brand->id,
            'new_values' => ['status' => 'deleted'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Brand deleted successfully.',
        ]);
    }
}
