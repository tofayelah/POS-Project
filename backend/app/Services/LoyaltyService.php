<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerPointLedger;
use App\Models\LoyaltySetting;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class LoyaltyService
{
    /**
     * Get or initialize loyalty settings for a company.
     */
    public function getSettings(int $companyId): LoyaltySetting
    {
        $setting = LoyaltySetting::where('company_id', $companyId)->first();

        if (!$setting) {
            $setting = LoyaltySetting::create([
                'company_id' => $companyId,
                'earning_spend_per_point' => 100.0000,
                'earning_points_awarded' => 1.0000,
                'redemption_point_value' => 1.0000,
                'min_redemption_points' => 400.0000,
                'is_active' => true,
                'disallow_earn_on_discount' => true,
                'disallow_earn_on_redemption' => true,
                'disallow_discount_with_redemption' => true,
            ]);
        }

        return $setting;
    }

    /**
     * Update loyalty settings for a company.
     */
    public function updateSettings(int $companyId, array $data): LoyaltySetting
    {
        return LoyaltySetting::updateOrCreate(
            ['company_id' => $companyId],
            [
                'earning_spend_per_point' => $data['earning_spend_per_point'] ?? 100.0000,
                'earning_points_awarded' => $data['earning_points_awarded'] ?? 1.0000,
                'redemption_point_value' => $data['redemption_point_value'] ?? 1.0000,
                'min_redemption_points' => $data['min_redemption_points'] ?? 400.0000,
                'is_active' => isset($data['is_active']) ? (bool)$data['is_active'] : true,
                'disallow_earn_on_discount' => isset($data['disallow_earn_on_discount']) ? (bool)$data['disallow_earn_on_discount'] : true,
                'disallow_earn_on_redemption' => isset($data['disallow_earn_on_redemption']) ? (bool)$data['disallow_earn_on_redemption'] : true,
                'disallow_discount_with_redemption' => isset($data['disallow_discount_with_redemption']) ? (bool)$data['disallow_discount_with_redemption'] : true,
            ]
        );
    }

    /**
     * Calculate points earned for a purchase.
     * Rules:
     * - If any discount is applied, earned points = 0.
     * - If point redemption is used, earned points = 0.
     * - 1 Point per eligible ৳100 spent (floor).
     */
    public function calculatePointsEarned(int $companyId, float $subtotal, float $discountTotal, float $pointsRedeemed): float
    {
        $settings = $this->getSettings($companyId);

        if (!$settings->is_active) {
            return 0.0;
        }

        if ($settings->disallow_earn_on_discount && $discountTotal > 0.0001) {
            return 0.0;
        }

        if ($settings->disallow_earn_on_redemption && $pointsRedeemed > 0.0001) {
            return 0.0;
        }

        $spendPerPoint = (float) $settings->earning_spend_per_point;
        if ($spendPerPoint <= 0) {
            return 0.0;
        }

        $pointsAwarded = (float) $settings->earning_points_awarded;
        $units = floor($subtotal / $spendPerPoint);

        return max(0.0, round($units * $pointsAwarded, 4));
    }

    /**
     * Validate redemption parameters against customer balance and program rules.
     */
    public function validateRedemption(int $companyId, Customer $customer, float $pointsRedeemed, float $discountTotal, float $grandTotal): void
    {
        if ($pointsRedeemed <= 0) {
            return;
        }

        $settings = $this->getSettings($companyId);

        if (!$settings->is_active) {
            throw new ConflictHttpException("Customer loyalty program is currently disabled.");
        }

        if ($settings->disallow_discount_with_redemption && $discountTotal > 0.0001) {
            throw new ConflictHttpException("Discounts and loyalty point redemption cannot be combined in the same transaction.");
        }

        $minThreshold = (float) $settings->min_redemption_points;
        $customerBalance = (float) $customer->points_balance;

        if ($customerBalance < $minThreshold) {
            throw new ConflictHttpException("Customer has {$customerBalance} points. A minimum balance of {$minThreshold} points is required to redeem.");
        }

        if ($pointsRedeemed < $minThreshold) {
            throw new ConflictHttpException("Minimum redemption is {$minThreshold} points. Attempted: {$pointsRedeemed}.");
        }

        if ($pointsRedeemed > $customerBalance) {
            throw new ConflictHttpException("Redemption points ({$pointsRedeemed}) exceed available balance ({$customerBalance}).");
        }

        $redemptionValue = round($pointsRedeemed * (float)$settings->redemption_point_value, 4);
        if ($redemptionValue > ($grandTotal + 0.0001)) {
            throw new ConflictHttpException("Redemption value (৳{$redemptionValue}) exceeds sale grand total (৳{$grandTotal}).");
        }
    }

    /**
     * Deduct points for redemption during a sale atomically.
     */
    public function redeemPoints(int $companyId, int $customerId, float $points, int $saleId, string $invoiceNumber, ?int $userId = null): CustomerPointLedger
    {
        $customer = Customer::where('company_id', $companyId)
            ->where('id', $customerId)
            ->lockForUpdate()
            ->firstOrFail();

        $balanceBefore = (float) $customer->points_balance;
        if ($balanceBefore < $points) {
            throw new ConflictHttpException("Insufficient loyalty points balance.");
        }

        $balanceAfter = round($balanceBefore - $points, 4);
        $customer->points_balance = $balanceAfter;
        $customer->save();

        return CustomerPointLedger::create([
            'company_id' => $companyId,
            'customer_id' => $customerId,
            'sale_id' => $saleId,
            'transaction_type' => 'REDEEM',
            'points' => -$points,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'reference_number' => $invoiceNumber,
            'description' => "Redeemed {$points} points for sale {$invoiceNumber}",
            'created_by' => $userId,
        ]);
    }

    /**
     * Award earned points to customer atomically after sale completion.
     */
    public function earnPoints(int $companyId, int $customerId, float $points, int $saleId, string $invoiceNumber, ?int $userId = null): ?CustomerPointLedger
    {
        if ($points <= 0) {
            return null;
        }

        $customer = Customer::where('company_id', $companyId)
            ->where('id', $customerId)
            ->lockForUpdate()
            ->firstOrFail();

        $balanceBefore = (float) $customer->points_balance;
        $balanceAfter = round($balanceBefore + $points, 4);
        $customer->points_balance = $balanceAfter;
        $customer->save();

        return CustomerPointLedger::create([
            'company_id' => $companyId,
            'customer_id' => $customerId,
            'sale_id' => $saleId,
            'transaction_type' => 'EARN',
            'points' => $points,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'reference_number' => $invoiceNumber,
            'description' => "Earned {$points} points from sale {$invoiceNumber}",
            'created_by' => $userId,
        ]);
    }

    /**
     * Manual adjustment of customer loyalty points by administrator.
     */
    public function adjustPoints(int $companyId, int $customerId, float $points, string $reason, ?int $userId = null): CustomerPointLedger
    {
        return DB::transaction(function () use ($companyId, $customerId, $points, $reason, $userId) {
            $customer = Customer::where('company_id', $companyId)
                ->where('id', $customerId)
                ->lockForUpdate()
                ->firstOrFail();

            $balanceBefore = (float) $customer->points_balance;
            $balanceAfter = max(0.0, round($balanceBefore + $points, 4));
            $customer->points_balance = $balanceAfter;
            $customer->save();

            return CustomerPointLedger::create([
                'company_id' => $companyId,
                'customer_id' => $customerId,
                'sale_id' => null,
                'transaction_type' => 'ADJUSTMENT',
                'points' => $points,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_number' => 'ADJ-' . time(),
                'description' => $reason,
                'created_by' => $userId,
            ]);
        });
    }
}
