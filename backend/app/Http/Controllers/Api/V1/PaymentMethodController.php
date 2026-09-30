<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    /**
     * Get all payment methods for the current company.
     * Seeds standard payment methods if none exist for this company.
     */
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        self::ensureDefaultMethodsExist($companyId);

        $methods = PaymentMethod::where('company_id', $companyId)
            ->with(['account:id,account_code,account_name'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $methods,
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:50',
            'type' => 'required|string|in:CASH,CARD,MFS,BANK,POINT',
            'account_id' => 'nullable|exists:accounts,id',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $validated['code'] = strtoupper($validated['code']);
        $validated['company_id'] = $companyId;

        if (PaymentMethod::where('company_id', $companyId)->where('code', $validated['code'])->exists()) {
            return response()->json(['success' => false, 'message' => "Payment method with code '{$validated['code']}' already exists."], 422);
        }

        $method = PaymentMethod::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Payment method created successfully.',
            'data' => $method->load('account:id,account_code,account_name'),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $method = PaymentMethod::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'nullable|string|max:100',
            'type' => 'nullable|string|in:CASH,CARD,MFS,BANK,POINT',
            'account_id' => 'nullable|exists:accounts,id',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $method->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Payment method updated successfully.',
            'data' => $method->load('account:id,account_code,account_name'),
        ]);
    }

    public function toggle(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $method = PaymentMethod::where('company_id', $companyId)->findOrFail($id);
        $method->is_active = !$method->is_active;
        $method->save();

        return response()->json([
            'success' => true,
            'message' => "Payment method " . ($method->is_active ? 'activated' : 'deactivated') . ".",
            'data' => $method,
        ]);
    }

    public static function ensureDefaultMethodsExist(int $companyId): void
    {
        $existing = PaymentMethod::where('company_id', $companyId)->exists();
        if ($existing) {
            return;
        }

        $defaults = [
            ['name' => 'Cash', 'code' => 'CASH', 'type' => 'CASH', 'sort_order' => 1, 'is_active' => true],
            ['name' => 'Credit / Debit Card', 'code' => 'CARD', 'type' => 'CARD', 'sort_order' => 2, 'is_active' => true],
            ['name' => 'bKash', 'code' => 'BKASH', 'type' => 'MFS', 'sort_order' => 3, 'is_active' => true],
            ['name' => 'Nagad', 'code' => 'NAGAD', 'type' => 'MFS', 'sort_order' => 4, 'is_active' => true],
            ['name' => 'Bank Transfer', 'code' => 'BANK', 'type' => 'BANK', 'sort_order' => 5, 'is_active' => true],
            ['name' => 'Loyalty Point Redemption', 'code' => 'POINT_REDEMPTION', 'type' => 'POINT', 'sort_order' => 6, 'is_active' => true],
        ];

        foreach ($defaults as $item) {
            $item['company_id'] = $companyId;
            PaymentMethod::firstOrCreate(
                ['company_id' => $companyId, 'code' => $item['code']],
                $item
            );
        }
    }
}
