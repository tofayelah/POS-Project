<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('customer_groups.update');
    }

    public function rules(): array
    {
        $companyId = request()->attributes->get('company_id');
        $groupId = $this->route('customer_group');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('customer_groups')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId)->whereNull('deleted_at');
                })->ignore($groupId)
            ],
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('customer_groups')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId)->whereNull('deleted_at');
                })->ignore($groupId)
            ],
            'description' => 'nullable|string',
            'status' => 'required|string|in:ACTIVE,INACTIVE'
        ];
    }
}
