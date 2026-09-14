<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Services\AccountingService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class JournalEntryController extends Controller
{
    protected $accountingService;

    public function __construct(AccountingService $accountingService)
    {
        $this->accountingService = $accountingService;
    }

    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $query = JournalEntry::where('company_id', $companyId)
            ->with(['lines.account']);

        if ($request->has('journal_number')) {
            $query->where('journal_number', 'like', '%' . $request->journal_number . '%');
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('start_date')) {
            $query->where('journal_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('journal_date', '<=', $request->end_date);
        }
        
        $journals = $query->orderBy('journal_date', 'desc')->orderBy('id', 'desc')->paginate($request->per_page ?? 20);
            
        return response()->json(['success' => true, 'data' => $journals]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'journal_date' => 'required|date',
            'description' => 'required|string',
            'reference_type' => 'nullable|string',
            'reference_id' => 'nullable|integer',
            'idempotency_key' => 'nullable|string',
            'source' => 'nullable|string|in:MANUAL,SYSTEM,OPENING_BALANCE',
            
            'lines' => 'required|array|min:2',
            'lines.*.account_id' => [
                'required',
                'exists:accounts,id',
                Rule::exists('accounts', 'id')->where('company_id', $companyId)
            ],
            'lines.*.description' => 'nullable|string',
            'lines.*.debit' => 'nullable|numeric|min:0',
            'lines.*.credit' => 'nullable|numeric|min:0',
            'lines.*.business_unit_id' => ['nullable', 'exists:business_units,id', Rule::exists('business_units', 'id')->where('company_id', $companyId)],
            'lines.*.branch_id' => ['nullable', 'exists:branches,id', Rule::exists('branches', 'id')->where('company_id', $companyId)],
            'lines.*.warehouse_id' => ['nullable', 'exists:warehouses,id', Rule::exists('warehouses', 'id')->where('company_id', $companyId)],
            'lines.*.reference' => 'nullable|string',
        ]);
        
        // Default to MANUAL if not provided
        $validated['source'] = $validated['source'] ?? 'MANUAL';
        
        try {
            $journal = $this->accountingService->createJournal($companyId, $validated, $request->user()->id);
            return response()->json(['success' => true, 'data' => $journal], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $journal = JournalEntry::where('company_id', $companyId)
            ->with(['lines.account', 'creator', 'poster', 'reverser', 'fiscalYear', 'accountingPeriod'])
            ->findOrFail($id);
            
        return response()->json(['success' => true, 'data' => $journal]);
    }
    
    public function update(Request $request, $id)
    {
        return response()->json(['success' => false, 'message' => 'Not implemented. Use reversal for posted journals.'], 501);
    }

    public function postJournal(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        try {
            $journal = $this->accountingService->postJournal($companyId, $id, $request->user()->id);
            return response()->json(['success' => true, 'data' => $journal]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }

    public function cancelJournal(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        try {
            $journal = $this->accountingService->cancelJournal($companyId, $id, $request->user()->id);
            return response()->json(['success' => true, 'data' => $journal]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }
    
    public function reverseJournal(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'reversal_date' => 'nullable|date',
        ]);
        
        try {
            $journal = $this->accountingService->reverseJournal($companyId, $id, $request->user()->id, $validated['reversal_date'] ?? null);
            return response()->json(['success' => true, 'data' => $journal]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }
}
