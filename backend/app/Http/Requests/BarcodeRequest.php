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

        return [
            'product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'barcode' => [
                'required',
                'string',
                'max:100',
                Rule::unique('barcodes', 'barcode')->ignore($barcodeId),
            ],
            'barcode_type' => ['nullable', 'string', Rule::in(['EAN', 'UPC', 'Internal', 'Supplier', 'Other'])],
            'is_primary' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],
        ];
    }
}
