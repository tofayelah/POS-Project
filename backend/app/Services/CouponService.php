<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Coupon;
use App\Models\CouponUsage;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CouponService
{
    /**
     * Validate a coupon against current cart subtotal and customer eligibility.
     */
    public function validateCoupon(
        int $companyId,
        string $code,
        float $orderSubtotal,
        ?int $customerId = null
    ): array {
        $coupon = Coupon::where('company_id', $companyId)
            ->where('code', strtoupper(trim($code)))
            ->first();

        if (!$coupon) {
            throw new NotFoundHttpException("Coupon '{$code}' not found.");
        }

        if (!$coupon->is_active) {
            throw new ConflictHttpException("Coupon '{$code}' is inactive.");
        }

        $now = Carbon::now();
        if ($coupon->valid_from && $coupon->valid_from > $now) {
            throw new ConflictHttpException("Coupon is not active yet.");
        }
        if ($coupon->valid_until && $coupon->valid_until < $now) {
            throw new ConflictHttpException("Coupon has expired.");
        }

        if ($coupon->usage_limit && $coupon->usage_count >= $coupon->usage_limit) {
            throw new ConflictHttpException("Coupon usage limit has been reached.");
        }

        if ($coupon->min_order_amount && $orderSubtotal < (float)$coupon->min_order_amount) {
            throw new ConflictHttpException(
                "Order subtotal must be at least ৳" . number_format($coupon->min_order_amount, 2) . " to apply this coupon."
            );
        }

        if ($customerId && $coupon->per_customer_limit) {
            $customerUsages = CouponUsage::where('coupon_id', $coupon->id)
                ->where('customer_id', $customerId)
                ->count();
            if ($customerUsages >= $coupon->per_customer_limit) {
                throw new ConflictHttpException("You have reached the maximum usage limit for this coupon.");
            }
        }

        // Calculate discount
        $discount = 0.0;
        if ($coupon->discount_type === 'PERCENTAGE') {
            $discount = round($orderSubtotal * ((float)$coupon->discount_value / 100), 4);
            if ($coupon->max_discount_amount && $discount > (float)$coupon->max_discount_amount) {
                $discount = (float)$coupon->max_discount_amount;
            }
        } else {
            // FIXED
            $discount = min($orderSubtotal, (float)$coupon->discount_value);
        }

        return [
            'valid' => true,
            'coupon' => $coupon,
            'discount_amount' => round($discount, 4),
        ];
    }

    /**
     * Record coupon usage atomically during checkout.
     */
    public function recordUsage(
        int $companyId,
        int $couponId,
        int $saleId,
        float $discountAmount,
        ?int $customerId = null
    ): CouponUsage {
        return DB::transaction(function () use ($companyId, $couponId, $saleId, $discountAmount, $customerId) {
            $coupon = Coupon::where('company_id', $companyId)->lockForUpdate()->findOrFail($couponId);

            $coupon->increment('usage_count');

            $usage = CouponUsage::create([
                'coupon_id' => $coupon->id,
                'customer_id' => $customerId,
                'sale_id' => $saleId,
                'discount_amount' => $discountAmount,
                'used_at' => Carbon::now(),
            ]);

            return $usage;
        });
    }

    /**
     * Release coupon usage if order is cancelled.
     */
    public function releaseUsage(int $companyId, int $saleId): bool
    {
        return DB::transaction(function () use ($companyId, $saleId) {
            $usages = CouponUsage::where('sale_id', $saleId)->get();
            foreach ($usages as $usage) {
                $coupon = Coupon::where('company_id', $companyId)->find($usage->coupon_id);
                if ($coupon && $coupon->usage_count > 0) {
                    $coupon->decrement('usage_count');
                }
                $usage->delete();
            }
            return true;
        });
    }

    /**
     * Admin: Create a coupon.
     */
    public function createCoupon(int $companyId, array $data, ?int $userId = null): Coupon
    {
        $code = strtoupper(trim($data['code']));
        if (Coupon::where('company_id', $companyId)->where('code', $code)->exists()) {
            throw new ConflictHttpException("Coupon code '{$code}' already exists.");
        }

        $coupon = Coupon::create([
            'company_id' => $companyId,
            'code' => $code,
            'title' => $data['title'] ?? null,
            'discount_type' => strtoupper($data['discount_type'] ?? 'PERCENTAGE'),
            'discount_value' => round((float)$data['discount_value'], 4),
            'min_order_amount' => round((float)($data['min_order_amount'] ?? 0), 4),
            'max_discount_amount' => isset($data['max_discount_amount']) ? round((float)$data['max_discount_amount'], 4) : null,
            'usage_limit' => $data['usage_limit'] ?? null,
            'per_customer_limit' => $data['per_customer_limit'] ?? 1,
            'valid_from' => !empty($data['valid_from']) ? Carbon::parse($data['valid_from']) : null,
            'valid_until' => !empty($data['valid_until']) ? Carbon::parse($data['valid_until']) : null,
            'is_active' => isset($data['is_active']) ? (bool)$data['is_active'] : true,
        ]);

        AuditLog::log(
            $companyId,
            $userId,
            'COUPON_CREATED',
            $coupon->id,
            'Coupon',
            "Created coupon '{$coupon->code}' with discount {$coupon->discount_value} ({$coupon->discount_type})."
        );

        return $coupon;
    }
}
