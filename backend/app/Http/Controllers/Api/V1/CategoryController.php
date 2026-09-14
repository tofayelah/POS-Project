<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\AuditLog;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Category::with(['parent'])->withCount('products');

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

        if ($request->filled('parent_id')) {
            if ($request->input('parent_id') === 'root') {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $request->input('parent_id'));
            }
        }

        if ($request->boolean('all')) {
            $categories = $query->orderBy('sort_order')->orderBy('name')->get();
            return response()->json([
                'success' => true,
                'data' => CategoryResource::collection($categories),
            ]);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $categories = $query->orderBy('sort_order')->orderBy('name')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => CategoryResource::collection($categories->items()),
            'meta' => [
                'current_page' => $categories->currentPage(),
                'last_page' => $categories->lastPage(),
                'per_page' => $categories->perPage(),
                'total' => $categories->total(),
            ],
        ]);
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['company_id'] = $request->attributes->get('company_id');
        $data['created_by'] = $request->user()?->id;
        $data['updated_by'] = $request->user()?->id;

        $category = Category::create($data);

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $category->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'CATEGORY_CREATED',
            'auditable_type' => Category::class,
            'auditable_id' => $category->id,
            'new_values' => ['name' => $category->name, 'parent_id' => $category->parent_id],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully.',
            'data' => new CategoryResource($category->load('parent')),
        ], 201);
    }

    public function show(Category $category): JsonResponse
    {
        abort_if($category->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $category->load(['parent', 'children'])->loadCount('products');
        return response()->json([
            'success' => true,
            'data' => new CategoryResource($category),
        ]);
    }

    public function update(CategoryRequest $request, Category $category): JsonResponse
    {
        abort_if($category->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $oldValues = ['name' => $category->name, 'parent_id' => $category->parent_id, 'status' => $category->status];
        $data = $request->validated();
        $data['company_id'] = $request->attributes->get('company_id');
        $data['updated_by'] = $request->user()?->id;

        $category->update($data);

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $category->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'CATEGORY_UPDATED',
            'auditable_type' => Category::class,
            'auditable_id' => $category->id,
            'old_values' => $oldValues,
            'new_values' => ['name' => $category->name, 'parent_id' => $category->parent_id, 'status' => $category->status],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully.',
            'data' => new CategoryResource($category->fresh(['parent'])),
        ]);
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        abort_if($category->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        // Prevent physical deletion if referenced by products or child categories
        if ($category->products()->exists() || $category->children()->exists()) {
            $category->update(['status' => 'inactive', 'updated_by' => $request->user()?->id]);
            return response()->json([
                'success' => true,
                'message' => 'Category has associated products or children; status changed to inactive.',
            ]);
        }

        $category->delete();

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $category->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'CATEGORY_STATUS_CHANGED',
            'auditable_type' => Category::class,
            'auditable_id' => $category->id,
            'new_values' => ['status' => 'deleted'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully.',
        ]);
    }
}
