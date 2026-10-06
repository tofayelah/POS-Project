<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        return $user->hasRole('Super Admin')
            || $user->hasRole('Cashier')
            || $user->hasRole('Manager')
            || $user->hasPermission('customers.create');
    }

    public function rules(): array
    {
        $companyId = $this->attributes->get('company_id')
            ?? $this->header('X-Company-ID')
            ?? $this->user()?->companies()->first()?->id;

        return [
            'customer_code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('customers')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId)->whereNull('deleted_at');
                })
            ],
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'customer_type' => 'nullable|string|in:RETAIL,WHOLESALE,CORPORATE',
            'mobile' => 'nullable|string|max:20',
            'alternate_mobile' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'billing_address' => 'nullable|string',
            'shipping_address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'bin_number' => 'nullable|string|max:50',
            'tin_number' => 'nullable|string|max:50',
            'customer_group_id' => [
                'nullable',
                Rule::exists('customer_groups', 'id')->where('company_id', $companyId)->whereNull('deleted_at')
            ],
            'business_unit_id' => [
                'nullable',
                Rule::exists('business_units', 'id')->where('company_id', $companyId)
            ],
            'credit_limit' => 'nullable|numeric|min:0',
            'credit_days' => 'nullable|integer|min:0',
            'credit_status' => 'nullable|string|in:ACTIVE,ON_HOLD,BLOCKED',
            'credit_hold_reason' => 'nullable|string',
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
