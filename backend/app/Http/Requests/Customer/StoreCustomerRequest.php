<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('customers.create');
    }

    public function rules(): array
    {
        $companyId = request()->attributes->get('company_id');
        
        return [
            'customer_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('customers')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId)->whereNull('deleted_at');
                })
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
            'notes' => 'nullable|string',
            
            // Opening balance properties are checked here initially
            // But they are optional. If present, both are needed (amount + direction)
            'opening_balance_amount' => 'nullable|numeric|min:0.01',
            'opening_balance_direction' => 'required_with:opening_balance_amount|in:DEBIT,CREDIT',
            'opening_balance_date' => 'required_with:opening_balance_amount|date'
        ];
    }
}
