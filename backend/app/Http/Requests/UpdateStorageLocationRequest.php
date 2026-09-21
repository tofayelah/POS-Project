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
        $companyId = $this->attributes->get('company_id')
            ?? $this->input('company_id')
            ?? $this->header('X-Company-ID');

        $locationParam = $this->route('storage_location') ?? $this->route('storageLocation');
        $locationId = is_object($locationParam) ? $locationParam->id : $locationParam;

        $targetWarehouseId = $this->input('warehouse_id');
        if (!$targetWarehouseId && $locationId) {
            $existing = StorageLocation::find($locationId);
            $targetWarehouseId = $existing?->warehouse_id;
        }

        return [
            'warehouse_id' => [
                'nullable',
                'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($companyId) {
                    if ($companyId) {
                        $query->where('company_id', $companyId);
                    }
                }),
            ],
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('storage_locations', 'code')->where(function ($query) use ($targetWarehouseId) {
                    if ($targetWarehouseId) {
                        $query->where('warehouse_id', $targetWarehouseId);
                    }
                })->ignore($locationId),
            ],
            'name' => ['nullable', 'string', 'max:150'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
