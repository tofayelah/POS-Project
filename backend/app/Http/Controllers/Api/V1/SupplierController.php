<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\SupplierLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $query = Supplier::where('company_id', $companyId);
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        return response()->json([
            'success' => true,
            'data' => $query->paginate(15)
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'supplier_code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email',
            'mobile' => 'nullable|string',
            'opening_balance' => 'numeric|min:0',
        ]);
        
        $validated['company_id'] = $companyId;
        $validated['created_by'] = $request->user()->id;
        
        return DB::transaction(function () use ($validated, $request, $companyId) {
            $supplier = Supplier::create($validated);
            
            if ($supplier->opening_balance > 0) {
                SupplierLedger::create([
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'supplier_id' => $supplier->id,
                    'transaction_type' => 'OPENING_BALANCE',
                    'credit' => $supplier->opening_balance,
                    'balance_after' => $supplier->opening_balance,
                    'transaction_date' => now(),
                    'created_by' => $request->user()->id,
                ]);
            }
            
            return response()->json([
                'success' => true,
                'data' => $supplier
            ], 201);
        });
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $supplier = Supplier::where('company_id', $companyId)->findOrFail($id);
        
        return response()->json([
            'success' => true,
            'data' => $supplier
        ]);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $supplier = Supplier::where('company_id', $companyId)->findOrFail($id);
        
        $validated = $request->validate([
            'name' => 'string|max:255',
            'email' => 'nullable|email',
            'mobile' => 'nullable|string',
            'status' => 'in:ACTIVE,INACTIVE'
        ]);
        
        $validated['updated_by'] = $request->user()->id;
        $supplier->update($validated);
        
        return response()->json([
            'success' => true,
            'data' => $supplier
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $supplier = Supplier::where('company_id', $companyId)->findOrFail($id);
        $supplier->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Supplier deleted'
        ]);
    }
}
