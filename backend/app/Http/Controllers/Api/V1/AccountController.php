<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $accounts = Account::where('company_id', $companyId)
            ->with(['parent', 'group'])
            ->orderBy('account_code')
            ->get();
            
        return response()->json(['success' => true, 'data' => $accounts]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'account_name' => 'required|string|max:255',
            'account_code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('accounts')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId);
                })
            ],
            'account_type' => 'required|in:ASSET,LIABILITY,EQUITY,REVENUE,EXPENSE,COGS',
            'normal_balance' => 'required|in:DEBIT,CREDIT',
            'parent_id' => [
                'nullable',
                'exists:accounts,id',
                Rule::exists('accounts', 'id')->where('company_id', $companyId)
            ],
            'account_group_id' => [
                'nullable',
                'exists:account_groups,id',
                Rule::exists('account_groups', 'id')->where('company_id', $companyId)
            ],
            'description' => 'nullable|string',
            'allow_manual_posting' => 'boolean',
        ]);
        
        $validated['company_id'] = $companyId;
        $validated['created_by'] = $request->user()->id;
        $validated['is_system'] = false; // Cannot manually create system accounts
        $validated['is_active'] = true;
        
        $account = Account::create($validated);
        
        AuditLog::log($companyId, $request->user()->id, 'ACCOUNT_CREATED', $account->id, 'Account', "Created Account {$account->account_code}");
        
        return response()->json(['success' => true, 'data' => $account], 201);
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $account = Account::where('company_id', $companyId)
            ->with(['parent', 'group', 'children'])
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $account]);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $account = Account::where('company_id', $companyId)->findOrFail($id);

        $rules = [
            'account_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'allow_manual_posting' => 'boolean',
            'parent_id' => [
                'nullable',
                Rule::exists('accounts', 'id')->where('company_id', $companyId),
            ],
            'account_group_id' => [
                'nullable',
                Rule::exists('account_groups', 'id')->where('company_id', $companyId),
            ],
        ];

        // If not system account and has no journal entries, allow updating code and type
        $hasJournalLines = \App\Models\JournalEntryLine::where('account_id', $account->id)->exists();
        if (!$account->is_system && !$hasJournalLines) {
            $rules['account_code'] = [
                'required',
                'string',
                'max:255',
                Rule::unique('accounts')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId);
                })->ignore($account->id),
            ];
            $rules['account_type'] = 'required|in:ASSET,LIABILITY,EQUITY,REVENUE,EXPENSE,COGS';
            $rules['normal_balance'] = 'required|in:DEBIT,CREDIT';
        }

        $validated = $request->validate($rules);
        $account->update($validated);
        $account->updated_by = $request->user()->id;
        $account->save();

        AuditLog::log($companyId, $request->user()->id, 'ACCOUNT_UPDATED', $account->id, 'Account', "Updated Account {$account->account_code}");

        return response()->json(['success' => true, 'data' => $account->load(['parent', 'group'])]);
    }

    public function activate(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $account = Account::where('company_id', $companyId)->findOrFail($id);
        $account->is_active = true;
        $account->updated_by = $request->user()->id;
        $account->save();
        
        AuditLog::log($companyId, $request->user()->id, 'ACCOUNT_ACTIVATED', $account->id, 'Account', "Activated Account {$account->account_code}");
        
        return response()->json(['success' => true, 'data' => $account]);
    }

    public function deactivate(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $account = Account::where('company_id', $companyId)->findOrFail($id);

        if ($account->is_system) {
            return response()->json([
                'success' => false,
                'message' => 'System accounts cannot be deactivated.'
            ], 422);
        }

        $account->is_active = false;
        $account->updated_by = $request->user()->id;
        $account->save();
        
        AuditLog::log($companyId, $request->user()->id, 'ACCOUNT_DEACTIVATED', $account->id, 'Account', "Deactivated Account {$account->account_code}");
        
        return response()->json(['success' => true, 'data' => $account]);
    }

    public function destroy(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $account = Account::where('company_id', $companyId)->findOrFail($id);

        if ($account->is_system) {
            return response()->json([
                'success' => false,
                'message' => 'System accounts cannot be deleted.'
            ], 422);
        }

        $hasJournalLines = \App\Models\JournalEntryLine::where('account_id', $account->id)->exists();
        if ($hasJournalLines) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete an account with existing journal entries. Deactivate instead.'
            ], 422);
        }

        $code = $account->account_code;
        $account->delete();

        AuditLog::log($companyId, $request->user()->id, 'ACCOUNT_DELETED', $id, 'Account', "Deleted Account {$code}");

        return response()->json(['success' => true, 'message' => "Account {$code} deleted successfully."]);
    }
}
