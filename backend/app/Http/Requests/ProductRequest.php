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

    protected function prepareForValidation(): void
    {
        $companyId = $this->input('company_id') ?? $this->attributes->get('company_id') ?? 1;
        $this->merge([
            'company_id' => (int) $companyId,
            'status' => strtolower((string) $this->input('status', 'active')),
            'product_type' => strtolower((string) $this->input('product_type', 'simple')),
        ]);

        if ($this->has('variants') && is_array($this->input('variants'))) {
            $variants = array_map(function ($v) {
                if (isset($v['status'])) {
                    $v['status'] = strtolower((string) $v['status']);
                }
                if (isset($v['barcodes']) && is_array($v['barcodes'])) {
                    $v['barcodes'] = array_map(function ($b) {
                        if (isset($b['barcode_type'])) {
                            $type = strtoupper((string) $b['barcode_type']);
                            if (in_array($type, ['EAN13', 'EAN-13', 'EAN_13'])) $type = 'EAN';
                            if (in_array($type, ['UPCA', 'UPC-A'])) $type = 'UPC';
                            $b['barcode_type'] = $type;
                        }
                        return $b;
                    }, $v['barcodes']);
                }
                return $v;
            }, $this->input('variants'));

            $this->merge(['variants' => $variants]);
        }
    }

    public function rules(): array
    {
        return [
            'company_id' => ['nullable', 'integer'],
            'business_unit_id' => ['nullable', 'integer'],
            'category_id' => ['required', 'integer'],
            'brand_id' => ['nullable', 'integer'],
            'unit_id' => ['required', 'integer'],
            'name' => ['required', 'string', 'max:255'],
            'product_code' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'product_type' => ['required', 'string', Rule::in(['simple', 'variable', 'service', 'combo'])],
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
            'variants.*.barcodes' => ['nullable', 'array'],
            'variants.*.barcodes.*.barcode' => ['required', 'string', 'max:100'],
            'variants.*.barcodes.*.barcode_type' => ['nullable', 'string'],
            'variants.*.barcodes.*.is_primary' => ['nullable', 'boolean'],
        ];
    }
}
