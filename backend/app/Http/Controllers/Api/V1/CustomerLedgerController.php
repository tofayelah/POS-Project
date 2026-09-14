<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerLedger;
use App\Models\AuditLog;
use App\Services\CustomerLedgerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerLedgerController extends Controller
{
    protected $ledgerService;

    public function __construct(CustomerLedgerService $ledgerService)
    {
        $this->ledgerService = $ledgerService;
    }

    public function index(Request $request, $customerId)
    {
        $this->authorize('customer_ledger.view');
        $companyId = $request->attributes->get('company_id');
        
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $query = CustomerLedger::where('company_id', $companyId)
            ->where('customer_id', $customerId);

        if ($request->has('start_date')) {
            $query->whereDate('transaction_date', '>=', $request->start_date);
        }
        
        if ($request->has('end_date')) {
            $query->whereDate('transaction_date', '<=', $request->end_date);
        }
        
        if ($request->has('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        $ledgers = $query->orderBy('transaction_date', 'desc')
                         ->orderBy('id', 'desc')
                         ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $ledgers
        ]);
    }

    public function storeOpeningBalance(Request $request, $customerId)
    {
        $this->authorize('customer_ledger.create_opening_balance');
        $companyId = $request->attributes->get('company_id');
        
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'direction' => 'required|string|in:DEBIT,CREDIT',
            'date' => 'required|date',
            'notes' => 'nullable|string'
        ]);

        return DB::transaction(function() use ($request, $companyId, $customerId) {
            $customer = Customer::where('company_id', $companyId)->lockForUpdate()->findOrFail($customerId);
            
            // Check if opening balance already exists
            $exists = CustomerLedger::where('company_id', $companyId)
                ->where('customer_id', $customerId)
                ->where('transaction_type', 'OPENING_BALANCE')
                ->exists();
                
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Opening balance already exists for this customer.'
                ], 422);
            }

            $debit = $request->direction === 'DEBIT' ? $request->amount : 0;
            $credit = $request->direction === 'CREDIT' ? $request->amount : 0;

            $ledger = $this->ledgerService->postTransaction(
                $companyId,
                $customer->id,
                'OPENING_BALANCE',
                $debit,
                $credit,
                $request->date,
                Customer::class,
                $customer->id,
                'OB-' . $customer->customer_code,
                $request->notes ?: 'Initial Opening Balance',
                $request->user()->id
            );

            AuditLog::log(
                $request->user(), 
                $companyId, 
                'CUSTOMER_OPENING_BALANCE_CREATED', 
                $customer, 
                null, 
                ['amount' => $request->amount, 'direction' => $request->direction]
            );

            return response()->json([
                'success' => true,
                'message' => 'Opening balance created successfully',
                'data' => $ledger
            ], 201);
        });
    }

    public function storeAdjustment(Request $request, $customerId)
    {
        $this->authorize('customer_ledger.create_adjustment');
        $companyId = $request->attributes->get('company_id');
        
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'direction' => 'required|string|in:DEBIT,CREDIT',
            'date' => 'required|date',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'required|string'
        ]);

        return DB::transaction(function() use ($request, $companyId, $customerId) {
            $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

            $debit = $request->direction === 'DEBIT' ? $request->amount : 0;
            $credit = $request->direction === 'CREDIT' ? $request->amount : 0;

            $ledger = $this->ledgerService->postTransaction(
                $companyId,
                $customer->id,
                'ADJUSTMENT',
                $debit,
                $credit,
                $request->date,
                null,
                null,
                $request->reference_number,
                $request->notes,
                $request->user()->id
            );

            AuditLog::log(
                $request->user(), 
                $companyId, 
                'CUSTOMER_LEDGER_ADJUSTED', 
                $customer, 
                null, 
                ['amount' => $request->amount, 'direction' => $request->direction, 'notes' => $request->notes]
            );

            return response()->json([
                'success' => true,
                'message' => 'Ledger adjustment created successfully',
                'data' => $ledger
            ], 201);
        });
    }
}
