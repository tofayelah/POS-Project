<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('customers.update');
    }

    public function rules(): array
    {
        $companyId = request()->attributes->get('company_id');
        $customerId = $this->route('customer');
        
        return [
            'customer_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('customers')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId)->whereNull('deleted_at');
                })->ignore($customerId)
            ],
            'name' => 'required|string|max:255',
            'mobile' => 'nullable|string|max:20',
            'alternate_mobile' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'customer_group_id' => [
                'nullable',
                Rule::exists('customer_groups', 'id')->where('company_id', $companyId)->whereNull('deleted_at')
            ],
            'business_unit_id' => [
                'nullable',
                Rule::exists('business_units', 'id')->where('company_id', $companyId)
            ],
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string|max:50',
            'status' => 'required|string|in:ACTIVE,INACTIVE',
            'notes' => 'nullable|string'
        ];
    }
}
