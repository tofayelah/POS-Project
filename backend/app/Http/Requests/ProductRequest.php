<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'business_unit_id' => ['nullable', 'integer', 'exists:business_units,id'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'name' => ['required', 'string', 'max:255'],
            'product_code' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'product_type' => ['required', 'string', Rule::in(['simple', 'variable'])],
            'has_variants' => ['required', 'boolean'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tax_type' => ['nullable', 'string', Rule::in(['inclusive', 'exclusive', 'exempt'])],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],

            // Variants definition
            'variants' => ['required', 'array', 'min:1'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.sku' => ['required', 'string', 'max:100'],
            'variants.*.variant_name' => ['required', 'string', 'max:255'],
            'variants.*.cost_price' => ['required', 'numeric', 'min:0'],
            'variants.*.selling_price' => ['required', 'numeric', 'min:0'],
            'variants.*.wholesale_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.mrp' => ['nullable', 'numeric', 'min:0'],
            'variants.*.status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],
            'variants.*.attribute_value_ids' => ['nullable', 'array'],
            'variants.*.attribute_value_ids.*' => ['integer', 'exists:attribute_values,id'],
            'variants.*.barcodes' => ['nullable', 'array'],
            'variants.*.barcodes.*.barcode' => ['required', 'string', 'max:100'],
            'variants.*.barcodes.*.barcode_type' => ['nullable', 'string', Rule::in(['EAN', 'UPC', 'Internal', 'Supplier', 'Other'])],
            'variants.*.barcodes.*.is_primary' => ['nullable', 'boolean'],
        ];
    }
}
