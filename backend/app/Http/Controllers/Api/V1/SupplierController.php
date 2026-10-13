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
                  ->orWhere('short_name', 'like', $term)
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

    /**
     * Generate standard short name abbreviation from supplier name
     * Multiword: first letter of each word (acronym words like TM retain their letters, e.g. TM International -> TMI)
     * Single word: first 3 letters uppercase (e.g. Square -> SQU)
     */
    public static function generateShortName(string $name): string
    {
        $name = trim($name);
        if (empty($name)) {
            return '';
        }

        $cleaned = preg_replace('/[^\p{L}\p{N}\s-]/u', ' ', $name);
        $words = array_values(array_filter(preg_split('/[\s-]+/', $cleaned)));

        if (empty($words)) {
            return '';
        }

        if (count($words) === 1) {
            return strtoupper(substr($words[0], 0, 3));
        }

        $result = '';
        foreach ($words as $word) {
            if (strlen($word) >= 2 && strlen($word) <= 4 && ctype_upper($word)) {
                $result .= $word;
            } else {
                $first = mb_substr($word, 0, 1);
                if (ctype_alnum($first)) {
                    $result .= strtoupper($first);
                }
            }
        }

        return substr($result, 0, 10);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'business_unit_id' => 'nullable|integer',
            'contact_person' => 'nullable|string|max:255',
            'contact_designation' => 'nullable|string|max:100',
            'designation' => 'nullable|string|max:100',
            'mobile' => 'nullable|string|max:50',
            'contact_phone' => 'nullable|string|max:50',
            'alternate_mobile' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:100',
            'bank_account_no' => 'nullable|string|max:100',
            'bank_branch' => 'nullable|string|max:100',
            'opening_balance' => 'nullable|numeric|min:0',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:ACTIVE,INACTIVE,active,inactive',
        ]);

        $name = trim($validated['name']);
        $validated['name'] = $name;

        // Duplicate name validation within tenant scope
        $duplicateName = Supplier::where('company_id', $companyId)
            ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower($name)])
            ->exists();
        if ($duplicateName) {
            return response()->json([
                'success' => false,
                'message' => "A supplier with the name '{$name}' already exists in your company."
            ], 422);
        }

        // Supplier Code is authoritative and generated by the server
        $validated['supplier_code'] = self::generateUniqueSupplierCode($companyId);

        // Auto-generate short name if not provided
        if (empty($validated['short_name'])) {
            $validated['short_name'] = self::generateShortName($name);
        } else {
            $validated['short_name'] = strtoupper(trim($validated['short_name']));
        }

        // Support designation and contact phone mappings
        if (isset($validated['designation']) && empty($validated['contact_designation'])) {
            $validated['contact_designation'] = trim($validated['designation']);
        }
        if (isset($validated['contact_phone']) && empty($validated['alternate_mobile'])) {
            $validated['alternate_mobile'] = trim($validated['contact_phone']);
        }
        if (isset($validated['alternate_mobile']) && empty($validated['contact_phone'])) {
            $validated['contact_phone'] = trim($validated['alternate_mobile']);
        }

        // Strip any client-supplied current_balance or read-only values
        unset($validated['current_balance'], $validated['balance']);

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
            'name' => 'sometimes|required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'business_unit_id' => 'nullable|integer',
            'contact_person' => 'nullable|string|max:255',
            'contact_designation' => 'nullable|string|max:100',
            'designation' => 'nullable|string|max:100',
            'mobile' => 'nullable|string|max:50',
            'contact_phone' => 'nullable|string|max:50',
            'alternate_mobile' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:100',
            'bank_account_no' => 'nullable|string|max:100',
            'bank_branch' => 'nullable|string|max:100',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:ACTIVE,INACTIVE,active,inactive',
        ]);

        // Never permit altering supplier_code, company_id, opening_balance, or current_balance in update
        unset(
            $validated['supplier_code'],
            $validated['company_id'],
            $validated['opening_balance'],
            $validated['current_balance'],
            $validated['balance']
        );

        if (isset($validated['name'])) {
            $name = trim($validated['name']);
            $duplicateName = Supplier::where('company_id', $companyId)
                ->where('id', '!=', $supplier->id)
                ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower($name)])
                ->exists();
            if ($duplicateName) {
                return response()->json([
                    'success' => false,
                    'message' => "A supplier with the name '{$name}' already exists in your company."
                ], 422);
            }
            $validated['name'] = $name;
        }

        // If short_name provided, normalize it; otherwise preserve existing short_name
        if (isset($validated['short_name']) && $validated['short_name'] !== null) {
            $validated['short_name'] = strtoupper(trim($validated['short_name']));
        }

        // Support designation and contact phone mappings
        if (isset($validated['designation']) && empty($validated['contact_designation'])) {
            $validated['contact_designation'] = trim($validated['designation']);
        }
        if (isset($validated['contact_phone']) && empty($validated['alternate_mobile'])) {
            $validated['alternate_mobile'] = trim($validated['contact_phone']);
        }
        if (isset($validated['alternate_mobile']) && empty($validated['contact_phone'])) {
            $validated['contact_phone'] = trim($validated['alternate_mobile']);
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

    public function balance(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id')
            ?? ($request->user() ? $request->user()->companies()->first()?->id : null);

        $supplier = Supplier::where('company_id', $companyId)->findOrFail($id);

        $purchasesTotal = (float) \App\Models\Purchase::where('supplier_id', $supplier->id)
            ->where('company_id', $companyId)
            ->where('status', 'POSTED')
            ->sum('grand_total');

        $paidTotal = (float) \App\Models\PaymentAllocation::join('purchases', 'purchases.id', '=', 'payment_allocations.allocatable_id')
            ->where(function ($q) {
                $q->where('payment_allocations.allocatable_type', 'Purchase')
                  ->orWhere('payment_allocations.allocatable_type', \App\Models\Purchase::class);
            })
            ->where('purchases.supplier_id', $supplier->id)
            ->where('purchases.company_id', $companyId)
            ->where('purchases.status', 'POSTED')
            ->sum('payment_allocations.amount');

        $openingBalance = (float) ($supplier->opening_balance ?? 0);

        $latestLedger = SupplierLedger::where('company_id', $companyId)
            ->where('supplier_id', $supplier->id)
            ->orderBy('id', 'desc')
            ->first();

        $calculatedFallback = round($openingBalance + $purchasesTotal - $paidTotal, 4);
        $balance = $latestLedger ? (float) $latestLedger->balance_after : $calculatedFallback;

        return response()->json([
            'success' => true,
            'data' => [
                'supplier_id' => $supplier->id,
                'supplier_code' => $supplier->supplier_code,
                'name' => $supplier->name,
                'opening_balance' => $openingBalance,
                'total_purchases' => $purchasesTotal,
                'total_paid' => $paidTotal,
                'balance' => $balance,
            ]
        ]);
    }
}
