<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\Company;
use App\Models\EcommerceStore;
use App\Models\Warehouse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EcommerceStoreService
{
    /**
     * Get or initialize default store for a company.
     */
    public function getStore(int $companyId, ?string $code = null): EcommerceStore
    {
        if ($code) {
            $store = EcommerceStore::where('company_id', $companyId)
                ->where('code', $code)
                ->first();
            if ($store) {
                return $store;
            }
        }

        $store = EcommerceStore::where('company_id', $companyId)
            ->where('is_active', true)
            ->first();

        if (!$store) {
            $defaultBranch = Branch::where('company_id', $companyId)->first();
            $defaultWarehouse = Warehouse::where('company_id', $companyId)->first();

            $store = EcommerceStore::create([
                'company_id' => $companyId,
                'code' => 'MAIN',
                'name' => 'Main Online Store',
                'currency' => 'BDT',
                'default_branch_id' => $defaultBranch?->id,
                'default_warehouse_id' => $defaultWarehouse?->id,
                'is_active' => true,
                'guest_checkout_enabled' => true,
                'cod_enabled' => true,
                'online_payment_enabled' => true,
                'order_prefix' => 'EC-',
                'settings' => [
                    'theme' => 'default',
                    'contact_email' => 'sales@retailcore.bd',
                    'support_phone' => '+8801700000000',
                    'free_shipping_min' => 1500,
                ],
            ]);
        }

        return $store;
    }

    /**
     * List all stores for a company.
     */
    public function listStores(int $companyId)
    {
        return EcommerceStore::with(['defaultBranch', 'defaultWarehouse'])
            ->where('company_id', $companyId)
            ->orderBy('id', 'asc')
            ->get();
    }

    /**
     * Update store settings.
     */
    public function updateStore(int $companyId, int $storeId, array $data, ?int $userId = null): EcommerceStore
    {
        $store = EcommerceStore::where('company_id', $companyId)->findOrFail($storeId);

        $store->update([
            'name' => $data['name'] ?? $store->name,
            'domain' => $data['domain'] ?? $store->domain,
            'default_branch_id' => $data['default_branch_id'] ?? $store->default_branch_id,
            'default_warehouse_id' => $data['default_warehouse_id'] ?? $store->default_warehouse_id,
            'currency' => $data['currency'] ?? $store->currency,
            'is_active' => isset($data['is_active']) ? (bool)$data['is_active'] : $store->is_active,
            'guest_checkout_enabled' => isset($data['guest_checkout_enabled']) ? (bool)$data['guest_checkout_enabled'] : $store->guest_checkout_enabled,
            'cod_enabled' => isset($data['cod_enabled']) ? (bool)$data['cod_enabled'] : $store->cod_enabled,
            'online_payment_enabled' => isset($data['online_payment_enabled']) ? (bool)$data['online_payment_enabled'] : $store->online_payment_enabled,
            'order_prefix' => $data['order_prefix'] ?? $store->order_prefix,
            'settings' => isset($data['settings']) ? array_merge($store->settings ?? [], $data['settings']) : $store->settings,
        ]);

        AuditLog::log(
            $companyId,
            $userId,
            'ECOMMERCE_STORE_UPDATED',
            $store->id,
            'EcommerceStore',
            "Updated e-commerce store '{$store->name}' settings."
        );

        return $store->fresh(['defaultBranch', 'defaultWarehouse']);
    }
}
