<?php

namespace App\Http\Requests;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $categoryId = $this->route('category') ? (is_object($this->route('category')) ? $this->route('category')->id : $this->route('category')) : null;
        $companyId = $this->input('company_id', $this->user()?->company_ids[0] ?? 1);

        return [
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories', 'name')
                    ->where('company_id', $companyId)
                    ->whereNull('deleted_at')
                    ->ignore($categoryId),
            ],
            'parent_id' => [
                'nullable',
                'integer',
                'exists:categories,id',
                function ($attribute, $value, $fail) use ($categoryId) {
                    if ($categoryId && (int) $value === (int) $categoryId) {
                        $fail('A category cannot be its own parent.');
                    }
                    if ($categoryId && $value) {
                        $current = Category::find($categoryId);
                        if ($current && $current->isCircularParent((int) $value)) {
                            $fail('Circular category relationship detected.');
                        }
                    }
                },
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
