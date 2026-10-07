<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\EcommerceCategory;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CatalogService
{
    public function __construct(
        protected InventoryReservationService $reservationService
    ) {}

    /**
     * Get public sanitized products with pagination, search, and filtering.
     * ZERO leakage of cost price, supplier, or internal ledger.
     */
    public function getPublicProducts(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $query = Product::with(['category', 'brand', 'variants.attributeValues', 'primaryVariant.barcodes'])
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->where('is_published', true)
            ->whereIn('visibility', ['ECOMMERCE_ONLY', 'BOTH']);

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (!empty($filters['brand_id'])) {
            $query->where('brand_id', $filters['brand_id']);
        }

        if (!empty($filters['featured'])) {
            $query->where('featured', true);
        }

        if (!empty($filters['new_arrival'])) {
            $query->where('new_arrival', true);
        }

        if (!empty($filters['best_seller'])) {
            $query->where('best_seller', true);
        }

        if (!empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(function (Builder $q) use ($term) {
                $q->where('name', 'ilike', "%{$term}%")
                    ->orWhere('slug', 'ilike', "%{$term}%")
                    ->orWhere('short_description', 'ilike', "%{$term}%")
                    ->orWhereHas('variants', function (Builder $vq) use ($term) {
                        $vq->where('sku', 'ilike', "%{$term}%")
                            ->orWhere('variant_name', 'ilike', "%{$term}%");
                    });
            });
        }

        // Sorting
        $sortBy = $filters['sort_by'] ?? 'sort_order';
        $direction = strtolower($filters['direction'] ?? 'asc') === 'desc' ? 'desc' : 'asc';
        if (in_array($sortBy, ['sort_order', 'name', 'created_at'])) {
            $query->orderBy($sortBy, $direction);
        } else {
            $query->orderBy('sort_order', 'asc')->orderBy('name', 'asc');
        }

        $perPage = min(50, max(1, (int)($filters['per_page'] ?? 12)));
        $paginator = $query->paginate($perPage);

        // Sanitize items
        $paginator->getCollection()->transform(function ($product) use ($companyId) {
            return $this->sanitizePublicProduct($product, $companyId);
        });

        return $paginator;
    }

    /**
     * Get a single public product by slug or ID safely.
     */
    public function getPublicProductBySlug(int $companyId, string $slug): array
    {
        $product = Product::with([
            'category',
            'brand',
            'variants.attributeValues',
            'reviews' => function ($rq) {
                $rq->where('status', 'APPROVED')->latest()->limit(20);
            }
        ])
            ->where('company_id', $companyId)
            ->where('slug', $slug)
            ->where('status', 'active')
            ->where('is_published', true)
            ->whereIn('visibility', ['ECOMMERCE_ONLY', 'BOTH'])
            ->first();

        if (!$product) {
            throw new NotFoundHttpException("Product not found or not published.");
        }

        return $this->sanitizePublicProduct($product, $companyId, true);
    }

    /**
     * Strip cost price, suppliers, and internal attributes from product.
     */
    public function sanitizePublicProduct(Product $product, int $companyId, bool $withReviews = false): array
    {
        $variants = $product->variants->map(function ($variant) use ($companyId) {
            $sellableQty = $this->reservationService->getSellableQuantity($companyId, $variant->id);
            return [
                'id' => $variant->id,
                'uuid' => $variant->uuid,
                'sku' => $variant->sku,
                'variant_name' => $variant->variant_name,
                'selling_price' => (float) $variant->selling_price,
                'mrp' => (float) $variant->mrp,
                'tax_rate' => (float) $variant->tax_rate,
                'in_stock' => $sellableQty > 0,
                'sellable_quantity' => $sellableQty,
                'attribute_values' => $variant->attributeValues->map(function ($attr) {
                    return [
                        'id' => $attr->id,
                        'value' => $attr->value,
                    ];
                }),
            ];
        });

        $primaryVariant = $variants->first();

        $data = [
            'id' => $product->id,
            'uuid' => $product->uuid,
            'name' => $product->name,
            'slug' => $product->slug,
            'category' => $product->category ? [
                'id' => $product->category->id,
                'name' => $product->category->name,
            ] : null,
            'brand' => $product->brand ? [
                'id' => $product->brand->id,
                'name' => $product->brand->name,
            ] : null,
            'short_description' => $product->short_description,
            'description' => $product->description,
            'images' => $product->images ?? [],
            'badge' => $product->badge,
            'featured' => (bool) $product->featured,
            'new_arrival' => (bool) $product->new_arrival,
            'best_seller' => (bool) $product->best_seller,
            'seo_title' => $product->seo_title,
            'seo_description' => $product->seo_description,
            'starting_price' => $variants->min('selling_price') ?? 0,
            'primary_variant' => $primaryVariant,
            'variants' => $variants,
        ];

        if ($withReviews) {
            $data['reviews'] = $product->reviews->map(function ($rev) {
                return [
                    'id' => $rev->id,
                    'rating' => $rev->rating,
                    'title' => $rev->review_title,
                    'comment' => $rev->review_text,
                    'is_verified' => $rev->is_verified_purchase,
                    'created_at' => $rev->created_at->toIso8601String(),
                ];
            });
            $data['average_rating'] = $product->reviews->avg('rating') ? round($product->reviews->avg('rating'), 1) : 5.0;
            $data['reviews_count'] = $product->reviews->count();
        }

        return $data;
    }

    /**
     * Admin: Update product publishing status and catalog properties.
     */
    public function updateCatalogPublishing(int $companyId, int $productId, array $data, ?int $userId = null): Product
    {
        $product = Product::where('company_id', $companyId)->findOrFail($productId);

        $product->update([
            'is_published' => isset($data['is_published']) ? (bool)$data['is_published'] : $product->is_published,
            'visibility' => $data['visibility'] ?? $product->visibility,
            'featured' => isset($data['featured']) ? (bool)$data['featured'] : $product->featured,
            'new_arrival' => isset($data['new_arrival']) ? (bool)$data['new_arrival'] : $product->new_arrival,
            'best_seller' => isset($data['best_seller']) ? (bool)$data['best_seller'] : $product->best_seller,
            'sort_order' => isset($data['sort_order']) ? (int)$data['sort_order'] : $product->sort_order,
            'short_description' => $data['short_description'] ?? $product->short_description,
            'description' => $data['description'] ?? $product->description,
            'images' => $data['images'] ?? $product->images,
            'badge' => $data['badge'] ?? $product->badge,
            'seo_title' => $data['seo_title'] ?? $product->seo_title,
            'seo_description' => $data['seo_description'] ?? $product->seo_description,
        ]);

        AuditLog::log(
            $companyId,
            $userId,
            'PRODUCT_CATALOG_UPDATED',
            $product->id,
            'Product',
            "Updated online catalog attributes for product {$product->name} (Published: " . ($product->is_published ? 'Yes' : 'No') . ")."
        );

        return $product;
    }

    /**
     * Get or manage hierarchical categories.
     */
    public function getCategories(int $companyId)
    {
        return EcommerceCategory::with('children')
            ->where('company_id', $companyId)
            ->whereNull('parent_id')
            ->orderBy('sort_order', 'asc')
            ->get();
    }

    public function createCategory(int $companyId, array $data, ?int $userId = null): EcommerceCategory
    {
        $category = EcommerceCategory::create([
            'company_id' => $companyId,
            'parent_id' => $data['parent_id'] ?? null,
            'name' => $data['name'],
            'slug' => \Illuminate\Support\Str::slug($data['name']),
            'description' => $data['description'] ?? null,
            'image' => $data['image'] ?? null,
            'icon' => $data['icon'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'seo_title' => $data['seo_title'] ?? null,
            'seo_description' => $data['seo_description'] ?? null,
        ]);

        AuditLog::log(
            $companyId,
            $userId,
            'ECOMMERCE_CATEGORY_CREATED',
            $category->id,
            'EcommerceCategory',
            "Created category '{$category->name}'."
        );

        return $category;
    }
}
