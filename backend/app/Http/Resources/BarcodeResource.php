<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BarcodeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'product_variant_id' => $this->product_variant_id,
            'barcode' => $this->barcode,
            'barcode_type' => $this->barcode_type,
            'is_primary' => (bool) $this->is_primary,
            'status' => $this->status,
            'variant' => $this->whenLoaded('variant', fn() => [
                'id' => $this->variant->id,
                'sku' => $this->variant->sku,
                'variant_name' => $this->variant->variant_name,
                'product_name' => $this->variant->product?->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
