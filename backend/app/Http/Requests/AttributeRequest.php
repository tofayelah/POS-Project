<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AttributeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $attributeId = $this->route('attribute') ? (is_object($this->route('attribute')) ? $this->route('attribute')->id : $this->route('attribute')) : null;
        $companyId = $this->input('company_id', $this->user()?->company_ids[0] ?? 1);

        return [
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('attributes', 'name')
                    ->where('company_id', $companyId)
                    ->whereNull('deleted_at')
                    ->ignore($attributeId),
            ],
            'code' => ['nullable', 'string', 'max:50'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],
            'values' => ['nullable', 'array'],
            'values.*.id' => ['nullable', 'integer'],
            'values.*.value' => ['required_with:values', 'string', 'max:100'],
            'values.*.code' => ['nullable', 'string', 'max:50'],
            'values.*.sort_order' => ['nullable', 'integer'],
        ];
    }
}
