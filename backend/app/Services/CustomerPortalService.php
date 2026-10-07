<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\ProductReview;
use App\Models\Sale;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;

class CustomerPortalService
{
    public function __construct(
        protected LoyaltyService $loyaltyService,
        protected StoreCreditService $storeCreditService
    ) {}

    /**
     * Register a new online customer.
     */
    public function registerCustomer(int $companyId, array $data): array
    {
        return DB::transaction(function () use ($companyId, $data) {
            $email = strtolower(trim($data['email'] ?? ''));
            $mobile = trim($data['mobile'] ?? '');

            if (empty($email) && empty($mobile)) {
                throw new ConflictHttpException("Email or mobile is required for registration.");
            }

            // Check if user exists
            if (!empty($email) && User::where('email', $email)->exists()) {
                throw new ConflictHttpException("An account with this email already exists.");
            }

            $user = User::create([
                'name' => $data['name'],
                'email' => $email ?: ('cust_' . time() . '@retailcore.local'),
                'password' => Hash::make($data['password']),
                'company_id' => $companyId,
            ]);

            // Link or create customer
            $customer = null;
            if (!empty($mobile)) {
                $customer = Customer::where('company_id', $companyId)->where('mobile', $mobile)->first();
            }

            if ($customer) {
                $customer->update(['user_id' => $user->id]);
            } else {
                $customer = Customer::create([
                    'company_id' => $companyId,
                    'user_id' => $user->id,
                    'customer_code' => 'CUST-' . date('Ymd') . '-' . rand(1000, 9999),
                    'name' => $data['name'],
                    'email' => $email,
                    'mobile' => $mobile,
                    'status' => 'ACTIVE',
                ]);
            }

            $token = $user->createToken('customer-auth-token')->plainTextToken;

            AuditLog::log(
                $companyId,
                $user->id,
                'CUSTOMER_REGISTERED',
                $customer->id,
                'Customer',
                "Customer {$customer->name} registered online account."
            );

            return [
                'token' => $token,
                'customer' => $customer,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
            ];
        });
    }

    /**
     * Authenticate customer with email/mobile and password.
     */
    public function loginCustomer(int $companyId, string $identifier, string $password): array
    {
        $user = User::where(function ($q) use ($identifier) {
            $q->where('email', $identifier);
        })->first();

        // If not found by email, check customer by mobile
        if (!$user) {
            $customer = Customer::where('company_id', $companyId)->where('mobile', $identifier)->first();
            if ($customer && $customer->user_id) {
                $user = User::find($customer->user_id);
            }
        }

        if (!$user || !Hash::check($password, $user->password)) {
            throw new UnauthorizedHttpException('Basic', 'Invalid login credentials.');
        }

        $customer = Customer::where('company_id', $companyId)->where('user_id', $user->id)->first();
        if (!$customer) {
            // Auto link or create customer record
            $customer = Customer::create([
                'company_id' => $companyId,
                'user_id' => $user->id,
                'customer_code' => 'CUST-' . date('Ymd') . '-' . rand(1000, 9999),
                'name' => $user->name,
                'email' => $user->email,
                'status' => 'ACTIVE',
            ]);
        }

        $token = $user->createToken('customer-auth-token')->plainTextToken;

        return [
            'token' => $token,
            'customer' => $customer,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ];
    }

    /**
     * Get customer profile with balances (loyalty, store credit, ledgers).
     */
    public function getCustomerProfile(int $companyId, int $customerId): array
    {
        $customer = Customer::with('addresses')->where('company_id', $companyId)->findOrFail($customerId);

        $storeCreditBalance = $this->storeCreditService->getBalance($companyId, $customer->id);
        $pointsBalance = (float)($customer->points_balance ?? 0);

        return [
            'id' => $customer->id,
            'customer_code' => $customer->customer_code,
            'name' => $customer->name,
            'email' => $customer->email,
            'mobile' => $customer->mobile,
            'addresses' => $customer->addresses,
            'store_credit_balance' => $storeCreditBalance,
            'points_balance' => $pointsBalance,
        ];
    }

    /**
     * Add or update customer address.
     */
    public function saveAddress(int $customerId, array $data, ?int $addressId = null): CustomerAddress
    {
        return DB::transaction(function () use ($customerId, $data, $addressId) {
            $customer = Customer::findOrFail($customerId);

            if (!empty($data['is_default_shipping'])) {
                CustomerAddress::where('customer_id', $customer->id)->update(['is_default_shipping' => false]);
            }
            if (!empty($data['is_default_billing'])) {
                CustomerAddress::where('customer_id', $customer->id)->update(['is_default_billing' => false]);
            }

            if ($addressId) {
                $address = CustomerAddress::where('customer_id', $customer->id)->findOrFail($addressId);
                $address->update($data);
                return $address;
            }

            return CustomerAddress::create(array_merge($data, ['customer_id' => $customer->id]));
        });
    }

    /**
     * Delete customer address safely.
     */
    public function deleteAddress(int $customerId, int $addressId): bool
    {
        return CustomerAddress::where('customer_id', $customerId)->where('id', $addressId)->delete() > 0;
    }

    /**
     * Omnichannel order history for a customer (POS + E-commerce).
     */
    public function getCustomerOrders(int $companyId, int $customerId, int $perPage = 15)
    {
        return Sale::with(['items.product', 'shipments', 'onlinePaymentTransactions'])
            ->where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Toggle wishlist item.
     */
    public function toggleWishlist(int $customerId, int $productId, ?int $variantId = null): array
    {
        $existing = Wishlist::where('customer_id', $customerId)
            ->where('product_id', $productId)
            ->where('product_variant_id', $variantId)
            ->first();

        if ($existing) {
            $existing->delete();
            return ['status' => 'removed', 'is_in_wishlist' => false];
        }

        Wishlist::create([
            'customer_id' => $customerId,
            'product_id' => $productId,
            'product_variant_id' => $variantId,
        ]);

        return ['status' => 'added', 'is_in_wishlist' => true];
    }

    /**
     * Submit a product review.
     */
    public function submitReview(int $companyId, int $customerId, int $productId, array $data): ProductReview
    {
        // Verified buyer check: check if customer has a COMPLETED sale containing this product
        $isVerified = Sale::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->where('status', 'COMPLETED')
            ->whereHas('items', function ($q) use ($productId) {
                $q->where('product_id', $productId);
            })
            ->exists();

        $review = ProductReview::create([
            'company_id' => $companyId,
            'product_id' => $productId,
            'customer_id' => $customerId,
            'rating' => min(5, max(1, (int)$data['rating'])),
            'review_title' => $data['title'] ?? null,
            'review_text' => $data['comment'] ?? null,
            'is_verified_purchase' => $isVerified,
            'status' => 'PENDING', // requires admin approval
        ]);

        return $review;
    }
}
