<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $variantId = $this->route('variant') ? (is_object($this->route('variant')) ? $this->route('variant')->id : $this->route('variant')) : null;
        $companyId = $this->attributes->get('company_id')
            ?? $this->user()?->company_id
            ?? ($this->product_id ? \App\Models\Product::where('id', $this->product_id)->value('company_id') : null)
            ?? ($variantId ? \App\Models\ProductVariant::where('id', $variantId)->value('company_id') : null);

        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'sku' => [
                'required',
                'string',
                'max:100',
                Rule::unique('product_variants', 'sku')
                    ->where(function ($q) use ($companyId) {
                        return $companyId ? $q->where('company_id', $companyId) : $q;
                    })
                    ->ignore($variantId),
            ],
            'variant_name' => ['required', 'string', 'max:255'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'wholesale_price' => ['nullable', 'numeric', 'min:0'],
            'mrp' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],
            'attribute_value_ids' => ['nullable', 'array'],
            'attribute_value_ids.*' => ['integer', 'exists:attribute_values,id'],
        ];
    }
}
