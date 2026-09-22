<?php

namespace App\Http\Requests;

use App\Models\StorageLocation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStorageLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->attributes->get('company_id');

        $locationParam = $this->route('storageLocation') ?? $this->route('id');
        $locationId = $locationParam instanceof StorageLocation ? $locationParam->id : $locationParam;
        
        $existing = $locationParam instanceof StorageLocation ? $locationParam : StorageLocation::find($locationId);
        $warehouseId = $this->input('warehouse_id', $existing?->warehouse_id);

        return [
            'warehouse_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId ?: 0)->whereNull('deleted_at');
                }),
            ],
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('storage_locations')->where(function ($query) use ($warehouseId) {
                    return $query->where('warehouse_id', $warehouseId);
                })->ignore($locationId),
            ],
            'name' => [
                'sometimes',
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
