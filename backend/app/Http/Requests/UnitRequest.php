<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $unitId = $this->route('unit') ? (is_object($this->route('unit')) ? $this->route('unit')->id : $this->route('unit')) : null;
        $companyId = $this->input('company_id', $this->user()?->company_ids[0] ?? 1);

        return [
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'name' => ['required', 'string', 'max:100'],
            'short_code' => [
                'required',
                'string',
                'max:20',
                Rule::unique('units', 'short_code')
                    ->where('company_id', $companyId)
                    ->whereNull('deleted_at')
                    ->ignore($unitId),
            ],
            'decimal_allowed' => ['required', 'boolean'],
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],
        ];
    }
}
