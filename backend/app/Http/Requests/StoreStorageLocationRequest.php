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
        $companyId = $this->attributes->get('company_id')
            ?? $this->input('company_id')
            ?? $this->header('X-Company-ID');

        return [
            'warehouse_id' => [
                'required',
                'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($companyId) {
                    if ($companyId) {
                        $query->where('company_id', $companyId);
                    }
                }),
            ],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('storage_locations', 'code')->where(function ($query) {
                    return $query->where('warehouse_id', $this->input('warehouse_id'));
                }),
            ],
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
