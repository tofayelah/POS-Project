<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'product_id' => $this->product_id,
            'sku' => $this->sku,
            'variant_name' => $this->variant_name,
            'cost_price' => (float) $this->cost_price,
            'selling_price' => (float) $this->selling_price,
            'wholesale_price' => (float) $this->wholesale_price,
            'mrp' => (float) $this->mrp,
            'tax_rate' => $this->tax_rate !== null ? (float) $this->tax_rate : null,
            'status' => $this->status,
            'product' => $this->whenLoaded('product', fn() => [
                'id' => $this->product->id,
                'name' => $this->product->name,
                'product_type' => $this->product->product_type,
            ]),
            'attribute_values' => $this->attributeValues ? $this->attributeValues->map(fn($av) => [
                'id' => $av->id,
                'attribute_id' => $av->attribute_id,
                'attribute_name' => $av->attribute?->name,
                'value' => $av->value,
                'code' => $av->code,
            ]) : [],
            'barcodes' => BarcodeResource::collection($this->whenLoaded('barcodes')),
            'primary_barcode' => $this->whenLoaded('primaryBarcode', fn() => $this->primaryBarcode ? [
                'id' => $this->primaryBarcode->id,
                'barcode' => $this->primaryBarcode->barcode,
                'barcode_type' => $this->primaryBarcode->barcode_type,
            ] : null),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
