<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerPointLedger;
use App\Services\LoyaltyService;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    public function __construct(
        protected LoyaltyService $loyaltyService
    ) {}

    public function getSettings(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $settings = $this->loyaltyService->getSettings($companyId);

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    public function updateSettings(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        $validated = $request->validate([
            'earning_spend_per_point' => 'numeric|min:1',
            'earning_points_awarded' => 'numeric|min:0.01',
            'redemption_point_value' => 'numeric|min:0.01',
            'min_redemption_points' => 'numeric|min:0',
            'is_active' => 'boolean',
            'disallow_earn_on_discount' => 'boolean',
            'disallow_earn_on_redemption' => 'boolean',
            'disallow_discount_with_redemption' => 'boolean',
        ]);

        $settings = $this->loyaltyService->updateSettings($companyId, $validated);

        return response()->json([
            'success' => true,
            'message' => 'Loyalty program settings updated successfully.',
            'data' => $settings,
        ]);
    }

    public function customerPoints(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $customer = Customer::where('company_id', $companyId)->findOrFail($id);

        $recentLedger = CustomerPointLedger::where('company_id', $companyId)
            ->where('customer_id', $id)
            ->orderBy('id', 'desc')
            ->limit(10)
            ->get();

        $settings = $this->loyaltyService->getSettings($companyId);

        return response()->json([
            'success' => true,
            'data' => [
                'customer_id' => $customer->id,
                'customer_name' => $customer->name,
                'points_balance' => (float) $customer->points_balance,
                'redemption_value' => round((float) $customer->points_balance * (float) $settings->redemption_point_value, 2),
                'min_redemption_points' => (float) $settings->min_redemption_points,
                'can_redeem' => ((float) $customer->points_balance >= (float) $settings->min_redemption_points) && $settings->is_active,
                'recent_ledger' => $recentLedger,
            ],
        ]);
    }

    public function customerPointLedger(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        Customer::where('company_id', $companyId)->findOrFail($id);

        $ledger = CustomerPointLedger::where('company_id', $companyId)
            ->where('customer_id', $id)
            ->with(['creator:id,name', 'sale:id,invoice_number'])
            ->orderBy('id', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $ledger,
        ]);
    }

    public function adjustPoints(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $customer = Customer::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'points' => 'required|numeric|not_in:0',
            'reason' => 'required|string|max:255',
        ]);

        $ledger = $this->loyaltyService->adjustPoints(
            $companyId,
            $customer->id,
            (float) $validated['points'],
            $validated['reason'],
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Points adjusted successfully.',
            'data' => [
                'customer_id' => $customer->id,
                'points_balance' => (float) $customer->fresh()->points_balance,
                'ledger_entry' => $ledger,
            ],
        ]);
    }
}
