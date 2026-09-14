<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'company_id' => $this->company_id,
            'business_unit_id' => $this->business_unit_id,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category', fn() => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ]),
            'brand_id' => $this->brand_id,
            'brand' => $this->whenLoaded('brand', fn() => $this->brand ? [
                'id' => $this->brand->id,
                'name' => $this->brand->name,
            ] : null),
            'unit_id' => $this->unit_id,
            'unit' => $this->whenLoaded('unit', fn() => [
                'id' => $this->unit->id,
                'name' => $this->unit->name,
                'short_code' => $this->unit->short_code,
            ]),
            'name' => $this->name,
            'slug' => $this->slug,
            'product_code' => $this->product_code,
            'description' => $this->description,
            'product_type' => $this->product_type,
            'has_variants' => (bool) $this->has_variants,
            'tax_rate' => (float) $this->tax_rate,
            'tax_type' => $this->tax_type,
            'reorder_level' => $this->reorder_level,
            'status' => $this->status,
            'variants_count' => $this->whenCounted('variants'),
            'variants' => ProductVariantResource::collection($this->whenLoaded('variants')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
