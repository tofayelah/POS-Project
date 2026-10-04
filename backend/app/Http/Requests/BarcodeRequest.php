<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BarcodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $barcodeId = $this->route('barcode') ? (is_object($this->route('barcode')) ? $this->route('barcode')->id : $this->route('barcode')) : null;
        $companyId = $this->attributes->get('company_id')
            ?? $this->user()?->company_id
            ?? ($this->product_variant_id ? \App\Models\ProductVariant::where('id', $this->product_variant_id)->value('company_id') : null)
            ?? ($barcodeId ? \App\Models\Barcode::where('id', $barcodeId)->value('company_id') : null);

        return [
            'product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'barcode' => [
                'required',
                'string',
                'max:100',
                Rule::unique('barcodes', 'barcode')
                    ->where(function ($q) use ($companyId) {
                        return $companyId ? $q->where('company_id', $companyId) : $q;
                    })
                    ->ignore($barcodeId),
            ],
            'barcode_type' => ['nullable', 'string', Rule::in(['EAN', 'UPC', 'Internal', 'Supplier', 'Other'])],
            'is_primary' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],
        ];
    }
}
