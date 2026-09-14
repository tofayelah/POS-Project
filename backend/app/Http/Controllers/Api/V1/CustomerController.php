<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Models\Customer;
use App\Models\AuditLog;
use App\Services\CustomerLedgerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    protected $ledgerService;

    public function __construct(CustomerLedgerService $ledgerService)
    {
        $this->ledgerService = $ledgerService;
    }

    public function index(Request $request)
    {
        $this->authorize('customers.view');
        $companyId = $request->attributes->get('company_id');
        
        $query = Customer::with(['group'])->where('company_id', $companyId);
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('customer_group_id')) {
            $query->where('customer_group_id', $request->customer_group_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('customer_code', 'like', '%' . $search . '%')
                  ->orWhere('mobile', 'like', '%' . $search . '%')
                  ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        $customers = $query->latest()->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $customers
        ]);
    }

    public function store(StoreCustomerRequest $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $customer = DB::transaction(function() use ($request, $companyId) {
            $customer = Customer::create([
                'company_id' => $companyId,
                'business_unit_id' => $request->business_unit_id,
                'customer_group_id' => $request->customer_group_id,
                'customer_code' => $request->customer_code,
                'name' => $request->name,
                'mobile' => $request->mobile,
                'alternate_mobile' => $request->alternate_mobile,
                'email' => $request->email,
                'address' => $request->address,
                'city' => $request->city,
                'country' => $request->country,
                'credit_limit' => $request->credit_limit,
                'payment_terms' => $request->payment_terms,
                'status' => $request->status ?? 'ACTIVE',
                'notes' => $request->notes,
                'created_by' => $request->user()->id,
                'opening_balance' => 0 // Set in ledger
            ]);

            AuditLog::log(
                $request->user(), 
                $companyId, 
                'CUSTOMER_CREATED', 
                $customer, 
                null, 
                ['customer_code' => $customer->customer_code, 'name' => $customer->name]
            );

            if ($request->has('opening_balance_amount') && $request->opening_balance_amount > 0) {
                $debit = $request->opening_balance_direction === 'DEBIT' ? $request->opening_balance_amount : 0;
                $credit = $request->opening_balance_direction === 'CREDIT' ? $request->opening_balance_amount : 0;
                
                $this->ledgerService->postTransaction(
                    $companyId,
                    $customer->id,
                    'OPENING_BALANCE',
                    $debit,
                    $credit,
                    $request->opening_balance_date ?: now(),
                    Customer::class,
                    $customer->id,
                    'OB-' . $customer->customer_code,
                    'Initial Opening Balance',
                    $request->user()->id
                );
                
                AuditLog::log(
                    $request->user(), 
                    $companyId, 
                    'CUSTOMER_OPENING_BALANCE_CREATED', 
                    $customer, 
                    null, 
                    ['amount' => $request->opening_balance_amount, 'direction' => $request->opening_balance_direction]
                );
            }

            return $customer;
        });

        return response()->json([
            'success' => true,
            'message' => 'Customer created successfully',
            'data' => $customer->load('group')
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $this->authorize('customers.view');
        $companyId = $request->attributes->get('company_id');
        
        $customer = Customer::with(['group'])->where('company_id', $companyId)->findOrFail($id);

        $currentBalance = \App\Models\CustomerLedger::where('company_id', $companyId)
                ->where('customer_id', $id)
                ->selectRaw('COALESCE(SUM(debit - credit), 0) as balance')
                ->value('balance');
                
        $customer->current_balance = $currentBalance ?: 0;

        return response()->json([
            'success' => true,
            'data' => $customer
        ]);
    }

    public function update(UpdateCustomerRequest $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        
        $customer = Customer::where('company_id', $companyId)->findOrFail($id);
        
        $customer->update([
            'business_unit_id' => $request->business_unit_id,
            'customer_group_id' => $request->customer_group_id,
            'customer_code' => $request->customer_code,
            'name' => $request->name,
            'mobile' => $request->mobile,
            'alternate_mobile' => $request->alternate_mobile,
            'email' => $request->email,
            'address' => $request->address,
            'city' => $request->city,
            'country' => $request->country,
            'credit_limit' => $request->credit_limit,
            'payment_terms' => $request->payment_terms,
            'status' => $request->status,
            'notes' => $request->notes,
            'updated_by' => $request->user()->id
        ]);

        AuditLog::log(
            $request->user(), 
            $companyId, 
            'CUSTOMER_UPDATED', 
            $customer, 
            null, 
            ['customer_code' => $customer->customer_code]
        );

        return response()->json([
            'success' => true,
            'message' => 'Customer updated successfully',
            'data' => $customer->fresh('group')
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $this->authorize('customers.delete');
        $companyId = $request->attributes->get('company_id');
        
        $customer = Customer::where('company_id', $companyId)->findOrFail($id);
        
        if ($customer->ledgers()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete customer with ledger history. Consider deactivating instead.'
            ], 422);
        }

        $customer->delete();

        return response()->json([
            'success' => true,
            'message' => 'Customer deleted successfully'
        ]);
    }

    public function search(Request $request)
    {
        $this->authorize('customers.view');
        $companyId = $request->attributes->get('company_id');
        $search = $request->get('q');
        
        if (!$search || strlen($search) < 2) {
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }

        $customers = Customer::with(['group'])
            ->where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->where(function($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('customer_code', 'like', '%' . $search . '%')
                  ->orWhere('mobile', 'like', '%' . $search . '%')
                  ->orWhere('email', 'like', '%' . $search . '%');
            })
            ->limit(20)
            ->get();
            
        // Optionally attach balances if needed for POS later.
        
        return response()->json([
            'success' => true,
            'data' => $customers
        ]);
    }
}
