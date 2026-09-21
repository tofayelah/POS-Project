<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStorageLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->attributes->get('company_id');

        return [
            'warehouse_id' => [
                'required',
                'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId ?: 0)->whereNull('deleted_at');
                }),
            ],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('storage_locations')->where(function ($query) {
                    return $query->where('warehouse_id', $this->warehouse_id);
                }),
            ],
            'name' => [
                'required',
                'string',
                'max:150',
            ],
            'description' => [
                'nullable',
                'string',
                'max:1000',
            ],
            'is_active' => [
                'nullable',
                'boolean',
            ],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (!$this->attributes->get('company_id')) {
                $validator->errors()->add('company_id', 'Company scope could not be determined.');
            }
        });
    }
}
