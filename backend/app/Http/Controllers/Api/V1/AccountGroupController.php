<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AccountGroup;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountGroupController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $groups = AccountGroup::where('company_id', $companyId)
            ->with('parent')
            ->orderBy('code')
            ->get();
            
        return response()->json(['success' => true, 'data' => $groups]);
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
                Rule::unique('account_groups')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId);
                })
            ],
            'account_type' => 'required|in:ASSET,LIABILITY,EQUITY,REVENUE,EXPENSE',
            'parent_id' => [
                'nullable',
                'exists:account_groups,id',
                Rule::exists('account_groups', 'id')->where('company_id', $companyId)
            ],
            'description' => 'nullable|string',
        ]);
        
        // If parent is set, type should ideally match, but let's allow flexibility unless strictly needed
        $validated['company_id'] = $companyId;
        
        $group = AccountGroup::create($validated);
        
        return response()->json(['success' => true, 'data' => $group], 201);
    }
}
