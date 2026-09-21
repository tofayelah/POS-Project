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
        $query = Supplier::where('company_id', $companyId)->with('businessUnit');
        
        if ($request->filled('status')) {
            $query->where('status', strtoupper($request->status));
        }

        if ($request->filled('business_unit_id')) {
            $query->where('business_unit_id', $request->business_unit_id);
        }

        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                  ->orWhere('supplier_code', 'like', $term)
                  ->orWhere('contact_person', 'like', $term)
                  ->orWhere('mobile', 'like', $term)
                  ->orWhere('email', 'like', $term)
                  ->orWhere('city', 'like', $term);
            });
        }

        $query->orderBy('id', 'desc');

        if ($request->boolean('all')) {
            return response()->json([
                'success' => true,
                'data' => $query->get()
            ]);
        }
        
        $perPage = (int) $request->get('per_page', 15);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $paginated
        ]);
    }

    /**
     * Generate guaranteed unique next supplier code for the company
     */
    public static function generateUniqueSupplierCode($companyId): string
    {
        // Query existing codes (including soft-deleted) to prevent any duplicate key violations
        $codes = Supplier::withTrashed()
            ->where('company_id', $companyId)
            ->where('supplier_code', 'LIKE', 'SUP-%')
            ->pluck('supplier_code');

        $maxNum = 0;
        foreach ($codes as $code) {
            if (preg_match('/^SUP-(\d+)$/i', $code, $matches)) {
                $num = (int)$matches[1];
                if ($num > $maxNum) {
                    $maxNum = $num;
                }
            }
        }

        $nextNum = $maxNum + 1;
        $newCode = 'SUP-' . str_pad((string)$nextNum, 4, '0', STR_PAD_LEFT);

        // Fail-safe loop to ensure strictly zero duplicates
        while (Supplier::withTrashed()
            ->where('company_id', $companyId)
            ->where('supplier_code', $newCode)
            ->exists()) {
            $nextNum++;
            $newCode = 'SUP-' . str_pad((string)$nextNum, 4, '0', STR_PAD_LEFT);
        }

        return $newCode;
    }

    /**
     * Endpoint to fetch the next system-generated unique supplier code
     */
    public function nextCode(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $code = self::generateUniqueSupplierCode($companyId);

        return response()->json([
            'success' => true,
            'data' => [
                'supplier_code' => $code
            ]
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'supplier_code' => 'nullable|string|max:50',
            'name' => 'required|string|max:255',
            'business_unit_id' => 'nullable|integer',
            'contact_person' => 'nullable|string|max:255',
            'mobile' => 'nullable|string|max:50',
            'alternate_mobile' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:50',
            'opening_balance' => 'nullable|numeric|min:0',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:ACTIVE,INACTIVE,active,inactive',
        ]);
        
        // Supplier code is required; system automatically generates unique non-duplicate code
        if (empty($validated['supplier_code'])) {
            $validated['supplier_code'] = self::generateUniqueSupplierCode($companyId);
        } else {
            $candidate = strtoupper(trim($validated['supplier_code']));
            // Verify if candidate already exists in company (including soft deleted)
            if (Supplier::withTrashed()->where('company_id', $companyId)->where('supplier_code', $candidate)->exists()) {
                // Auto-generate next unique code to ensure no duplicate collision
                $validated['supplier_code'] = self::generateUniqueSupplierCode($companyId);
            } else {
                $validated['supplier_code'] = $candidate;
            }
        }

        $validated['company_id'] = $companyId;
        $validated['status'] = isset($validated['status']) ? strtoupper($validated['status']) : 'ACTIVE';
        $validated['opening_balance'] = $validated['opening_balance'] ?? 0;
        $validated['credit_limit'] = $validated['credit_limit'] ?? 0;
        $validated['created_by'] = $request->user() ? $request->user()->id : null;
        
        return DB::transaction(function () use ($validated, $request, $companyId) {
            $supplier = Supplier::create($validated);
            
            if ($supplier->opening_balance > 0) {
                SupplierLedger::create([
                    'uuid' => (string) Str::uuid(),
                    'company_id' => $companyId,
                    'supplier_id' => $supplier->id,
                    'transaction_type' => 'OPENING_BALANCE',
                    'credit' => $supplier->opening_balance,
                    'balance_before' => 0,
                    'balance_after' => $supplier->opening_balance,
                    'transaction_date' => now(),
                    'notes' => 'Opening balance entry',
                    'created_by' => $request->user() ? $request->user()->id : null,
                ]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Supplier created successfully',
                'data' => $supplier->load('businessUnit')
            ], 201);
        });
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $supplier = Supplier::where('company_id', $companyId)->with(['businessUnit', 'ledgers'])->findOrFail($id);
        
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
            'supplier_code' => 'nullable|string|max:50',
            'name' => 'required|string|max:255',
            'business_unit_id' => 'nullable|integer',
            'contact_person' => 'nullable|string|max:255',
            'mobile' => 'nullable|string|max:50',
            'alternate_mobile' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:ACTIVE,INACTIVE,active,inactive',
        ]);
        
        if (isset($validated['supplier_code'])) {
            $validated['supplier_code'] = strtoupper(trim($validated['supplier_code']));
            if (Supplier::withTrashed()
                ->where('company_id', $companyId)
                ->where('supplier_code', $validated['supplier_code'])
                ->where('id', '!=', $supplier->id)
                ->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => "Supplier code '{$validated['supplier_code']}' already exists. Codes must be unique."
                ], 422);
            }
        }

        if (isset($validated['status'])) {
            $validated['status'] = strtoupper($validated['status']);
        }

        $validated['updated_by'] = $request->user() ? $request->user()->id : null;
        $supplier->update($validated);
        
        return response()->json([
            'success' => true,
            'message' => 'Supplier updated successfully',
            'data' => $supplier->load('businessUnit')
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $supplier = Supplier::where('company_id', $companyId)->findOrFail($id);
        $supplier->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Supplier deleted successfully'
        ]);
    }
}
