<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\AuditLog;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function __construct(
        protected ProductService $productService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Product::with([
            'category',
            'brand',
            'unit',
            'variants.attributeValues',
            'variants.barcodes',
        ])->withCount('variants');

        $companyId = $request->attributes->get('company_id') ?? 1;
        $query->where('company_id', $companyId);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('product_code', 'ilike', "%{$search}%")
                  ->orWhereHas('variants', function ($vq) use ($search) {
                      $vq->where('sku', 'ilike', "%{$search}%")
                         ->orWhere('variant_name', 'ilike', "%{$search}%")
                         ->orWhereHas('barcodes', function ($bq) use ($search) {
                             $bq->where('barcode', 'ilike', "%{$search}%");
                         });
                  });
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }

        if ($request->filled('product_type')) {
            $query->where('product_type', $request->input('product_type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $allowedSorts = ['name', 'created_at', 'updated_at', 'product_type', 'status'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');
        } else {
            $query->latest();
        }

        if ($request->boolean('all') || $request->input('all') === 'true' || $request->input('all') === 1) {
            $allProducts = $query->get();
            return response()->json([
                'success' => true,
                'data' => ProductResource::collection($allProducts),
            ]);
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $products = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => ProductResource::collection($products->items()),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $data = $request->validated();
        if ($companyId = $request->attributes->get('company_id')) {
            $data['company_id'] = $companyId;
        }

        $product = $this->productService->createProduct(
            $data,
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Product and variants created successfully.',
            'data' => new ProductResource($product),
        ], 201);
    }

    public function show(Product $product): JsonResponse
    {
        abort_if($product->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $product->load([
            'category',
            'brand',
            'unit',
            'variants.attributeValues',
            'variants.barcodes',
        ])->loadCount('variants');

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product),
        ]);
    }

    public function update(ProductRequest $request, Product $product): JsonResponse
    {
        abort_if($product->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $data = $request->validated();
        if ($companyId = $request->attributes->get('company_id')) {
            $data['company_id'] = $companyId;
        }

        $updatedProduct = $this->productService->updateProduct(
            $product,
            $data,
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Product and variants updated successfully.',
            'data' => new ProductResource($updatedProduct),
        ]);
    }

    public function activate(Request $request, Product $product): JsonResponse
    {
        abort_if($product->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $product->update(['status' => 'active', 'updated_by' => $request->user()?->id]);
        $product->variants()->update(['status' => 'active', 'updated_by' => $request->user()?->id]);

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $product->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'PRODUCT_STATUS_CHANGED',
            'auditable_type' => Product::class,
            'auditable_id' => $product->id,
            'new_values' => ['status' => 'active'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product and variants activated.',
            'data' => new ProductResource($product->fresh(['variants'])),
        ]);
    }

    public function deactivate(Request $request, Product $product): JsonResponse
    {
        abort_if($product->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $product->update(['status' => 'inactive', 'updated_by' => $request->user()?->id]);
        $product->variants()->update(['status' => 'inactive', 'updated_by' => $request->user()?->id]);

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $product->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'PRODUCT_STATUS_CHANGED',
            'auditable_type' => Product::class,
            'auditable_id' => $product->id,
            'new_values' => ['status' => 'inactive'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product and variants deactivated.',
            'data' => new ProductResource($product->fresh(['variants'])),
        ]);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        abort_if($product->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $product->delete();

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $product->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'PRODUCT_STATUS_CHANGED',
            'auditable_type' => Product::class,
            'auditable_id' => $product->id,
            'new_values' => ['status' => 'deleted'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product soft-deleted successfully.',
        ]);
    }
}
