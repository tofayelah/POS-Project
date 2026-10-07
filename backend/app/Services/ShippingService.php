<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\ShippingMethod;
use App\Models\ShippingRate;
use App\Models\ShippingZone;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ShippingService
{
    /**
     * Calculate authoritative shipping rate based on method, zone/destination, and order subtotal.
     */
    public function calculateShipping(
        int $companyId,
        int $shippingMethodId,
        ?string $district = null,
        ?string $division = null,
        float $subtotal = 0.0,
        float $weightKg = 1.0
    ): array {
        $method = ShippingMethod::where('company_id', $companyId)
            ->where('is_active', true)
            ->find($shippingMethodId);

        if (!$method) {
            // Fallback: get first active shipping method or create default standard shipping
            $method = ShippingMethod::firstOrCreate(
                ['company_id' => $companyId, 'code' => 'STANDARD'],
                [
                    'name' => 'Standard Delivery',
                    'carrier_name' => 'Steadfast Courier',
                    'estimated_days' => '2-3 Business Days',
                    'is_active' => true,
                ]
            );
        }

        // Resolve shipping zone based on destination district / division
        $zone = null;
        if ($district || $division) {
            $dest = strtolower($district ?? $division);
            $zones = ShippingZone::where('company_id', $companyId)->where('is_active', true)->get();
            foreach ($zones as $z) {
                $regions = array_map('strtolower', (array)($z->regions ?? []));
                if (in_array($dest, $regions) || in_array('*', $regions)) {
                    $zone = $z;
                    break;
                }
            }
        }

        $baseRate = 60.0; // Default Inside Dhaka
        $isOutsideDhaka = false;
        if ($district && strtolower($district) !== 'dhaka') {
            $isOutsideDhaka = true;
            $baseRate = 120.0;
        }

        $freeThreshold = null;

        if ($zone) {
            $rate = ShippingRate::where('shipping_method_id', $method->id)
                ->where('shipping_zone_id', $zone->id)
                ->first();
            if ($rate) {
                $baseRate = (float) $rate->base_rate;
                $freeThreshold = $rate->free_shipping_threshold ? (float)$rate->free_shipping_threshold : null;
            }
        }

        // Check free shipping threshold
        if ($freeThreshold !== null && $subtotal >= $freeThreshold) {
            $shippingAmount = 0.0;
        } else {
            $shippingAmount = $baseRate;
        }

        return [
            'shipping_method_id' => $method->id,
            'method_name' => $method->name,
            'carrier_name' => $method->carrier_name,
            'estimated_days' => $method->estimated_days,
            'shipping_amount' => round($shippingAmount, 4),
            'free_shipping' => $shippingAmount == 0.0,
        ];
    }

    /**
     * List active shipping methods with rates for storefront.
     */
    public function getAvailableMethods(int $companyId, ?string $district = null, float $subtotal = 0.0): array
    {
        $methods = ShippingMethod::where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->get();

        if ($methods->isEmpty()) {
            $methods = collect([
                ShippingMethod::create([
                    'company_id' => $companyId,
                    'name' => 'Standard Home Delivery',
                    'code' => 'STANDARD',
                    'carrier_name' => 'Steadfast Courier',
                    'estimated_days' => '2-3 Business Days',
                    'is_active' => true,
                ])
            ]);
        }

        return $methods->map(function ($m) use ($companyId, $district, $subtotal) {
            return $this->calculateShipping($companyId, $m->id, $district, null, $subtotal);
        })->toArray();
    }
}
