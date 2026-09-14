<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseCategoryController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $categories = ExpenseCategory::where('company_id', $companyId)
            ->with('parent')
            ->orderBy('name')
            ->get();
            
        return response()->json(['success' => true, 'data' => $categories]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('expense_categories')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId);
                })
            ],
            'parent_id' => [
                'nullable',
                'exists:expense_categories,id',
                Rule::exists('expense_categories', 'id')->where('company_id', $companyId)
            ],
            'description' => 'nullable|string',
        ]);
        
        $validated['company_id'] = $companyId;
        $validated['created_by'] = $request->user()->id;
        
        $category = ExpenseCategory::create($validated);
        
        AuditLog::log($companyId, $request->user()->id, 'EXPENSE_CATEGORY_CREATED', $category->id, 'ExpenseCategory', "Created Expense Category {$category->name}");
        
        return response()->json(['success' => true, 'data' => $category], 201);
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $category = ExpenseCategory::where('company_id', $companyId)
            ->with(['parent', 'children'])
            ->findOrFail($id);
            
        return response()->json(['success' => true, 'data' => $category]);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $category = ExpenseCategory::where('company_id', $companyId)->findOrFail($id);
        
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('expense_categories')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId);
                })->ignore($category->id)
            ],
            'parent_id' => [
                'nullable',
                'exists:expense_categories,id',
                Rule::exists('expense_categories', 'id')->where('company_id', $companyId),
                function ($attribute, $value, $fail) use ($category) {
                    if ($value == $category->id) {
                        $fail('A category cannot be its own parent.');
                    }
                },
            ],
            'description' => 'nullable|string',
        ]);
        
        $validated['updated_by'] = $request->user()->id;
        
        $category->update($validated);
        
        AuditLog::log($companyId, $request->user()->id, 'EXPENSE_CATEGORY_UPDATED', $category->id, 'ExpenseCategory', "Updated Expense Category {$category->name}");
        
        return response()->json(['success' => true, 'data' => $category]);
    }

    public function activate(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $category = ExpenseCategory::where('company_id', $companyId)->findOrFail($id);
        
        $category->status = 'ACTIVE';
        $category->updated_by = $request->user()->id;
        $category->save();
        
        AuditLog::log($companyId, $request->user()->id, 'EXPENSE_CATEGORY_ACTIVATED', $category->id, 'ExpenseCategory', "Activated Expense Category {$category->name}");
        
        return response()->json(['success' => true, 'message' => 'Category activated successfully']);
    }

    public function deactivate(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $category = ExpenseCategory::where('company_id', $companyId)->findOrFail($id);
        
        $category->status = 'INACTIVE';
        $category->updated_by = $request->user()->id;
        $category->save();
        
        AuditLog::log($companyId, $request->user()->id, 'EXPENSE_CATEGORY_DEACTIVATED', $category->id, 'ExpenseCategory', "Deactivated Expense Category {$category->name}");
        
        return response()->json(['success' => true, 'message' => 'Category deactivated successfully']);
    }
}
