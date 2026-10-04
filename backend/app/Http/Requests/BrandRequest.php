<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        $userCompanyId = $this->attributes->get('company_id') ?? $this->user()?->company_id;
        $brand = $this->route('brand');
        if ($brand) {
            $b = is_object($brand) ? $brand : \App\Models\Brand::find($brand);
            if ($b && $userCompanyId && (int) $b->company_id !== (int) $userCompanyId) {
                return false;
            }
        }

        if ($this->has('company_id') && $userCompanyId && (int) $this->input('company_id') !== (int) $userCompanyId) {
            return false;
        }

        return true;
    }

    protected function prepareForValidation(): void
    {
        $userCompanyId = $this->attributes->get('company_id') ?? $this->user()?->company_id;
        if (!$this->has('company_id') && $userCompanyId) {
            $this->merge(['company_id' => $userCompanyId]);
        }
    }

    public function rules(): array
    {
        $brandId = $this->route('brand') ? (is_object($this->route('brand')) ? $this->route('brand')->id : $this->route('brand')) : null;
        $companyId = $this->input('company_id', $this->attributes->get('company_id') ?? $this->user()?->company_id ?? 1);

        return [
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('brands', 'name')
                    ->where('company_id', $companyId)
                    ->whereNull('deleted_at')
                    ->ignore($brandId),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],
        ];
    }
}
