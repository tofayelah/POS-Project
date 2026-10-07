<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Sale;
use App\Services\CustomerPortalService;
use App\Services\EcommerceReturnService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerPortalController extends Controller
{
    public function __construct(
        protected CustomerPortalService $portalService,
        protected EcommerceReturnService $returnService
    ) {}

    protected function getCompanyId(Request $request): int
    {
        return (int) ($request->header('X-Company-ID') ?? 1);
    }

    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'nullable|email|max:150',
            'mobile' => 'nullable|string|max:50',
            'password' => 'required|string|min:6',
        ]);

        $companyId = $this->getCompanyId($request);
        $res = $this->portalService->registerCustomer($companyId, $request->all());

        return response()->json($res, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'identifier' => 'required|string',
            'password' => 'required|string',
        ]);

        $companyId = $this->getCompanyId($request);
        $res = $this->portalService->loginCustomer($companyId, $request->input('identifier'), $request->input('password'));

        return response()->json($res);
    }

    public function getProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $customer = $user->customer;
        if (!$customer) {
            return response()->json(['message' => 'No linked customer profile.'], 404);
        }

        $profile = $this->portalService->getCustomerProfile($customer->company_id, $customer->id);
        return response()->json($profile);
    }

    public function getAddresses(Request $request): JsonResponse
    {
        $customer = $request->user()->customer;
        if (!$customer) {
            return response()->json([], 200);
        }
        return response()->json($customer->addresses);
    }

    public function saveAddress(Request $request): JsonResponse
    {
        $request->validate([
            'recipient_name' => 'required|string|max:150',
            'mobile' => 'required|string|max:50',
            'address_line_1' => 'required|string|max:255',
            'city' => 'required|string|max:100',
        ]);

        $customer = $request->user()->customer;
        if (!$customer) {
            return response()->json(['message' => 'Customer profile required.'], 400);
        }

        $address = $this->portalService->saveAddress($customer->id, $request->all(), $request->input('id'));
        return response()->json($address, 201);
    }

    public function deleteAddress(Request $request, int $id): JsonResponse
    {
        $customer = $request->user()->customer;
        if (!$customer) {
            return response()->json(['message' => 'Customer profile required.'], 400);
        }

        $deleted = $this->portalService->deleteAddress($customer->id, $id);
        if (!$deleted) {
            return response()->json(['message' => 'Address not found.'], 404);
        }
        return response()->json(['message' => 'Address deleted.']);
    }

    public function getOrders(Request $request): JsonResponse
    {
        $customer = $request->user()->customer;
        if (!$customer) {
            return response()->json(['data' => []]);
        }

        $orders = $this->portalService->getCustomerOrders($customer->company_id, $customer->id);
        return response()->json($orders);
    }

    public function getOrderDetail(Request $request, int $id): JsonResponse
    {
        $customer = $request->user()->customer;
        if (!$customer) {
            return response()->json(['message' => 'Customer profile required.'], 400);
        }

        $order = Sale::with(['items.product', 'shipments', 'onlinePaymentTransactions'])
            ->where('company_id', $customer->company_id)
            ->where('customer_id', $customer->id)
            ->findOrFail($id);

        return response()->json($order);
    }

    public function toggleWishlist(Request $request): JsonResponse
    {
        $request->validate(['product_id' => 'required|integer']);
        $customer = $request->user()->customer;
        if (!$customer) {
            return response()->json(['message' => 'Customer profile required.'], 400);
        }

        $res = $this->portalService->toggleWishlist($customer->id, (int)$request->input('product_id'), $request->input('product_variant_id'));
        return response()->json($res);
    }

    public function submitReview(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|integer',
            'rating' => 'required|integer|min:1|max:5',
            'title' => 'nullable|string|max:200',
            'comment' => 'nullable|string',
        ]);

        $customer = $request->user()->customer;
        if (!$customer) {
            return response()->json(['message' => 'Customer profile required.'], 400);
        }

        $review = $this->portalService->submitReview($customer->company_id, $customer->id, (int)$request->input('product_id'), $request->all());
        return response()->json($review, 201);
    }

    public function submitReturnRequest(Request $request): JsonResponse
    {
        $request->validate([
            'sale_id' => 'required|integer',
            'items' => 'required|array|min:1',
            'items.*.sale_item_id' => 'required|integer',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'reason' => 'nullable|string',
        ]);

        $customer = $request->user()->customer;
        if (!$customer) {
            return response()->json(['message' => 'Customer profile required.'], 400);
        }

        $return = $this->returnService->processOnlineReturn(
            companyId: $customer->company_id,
            saleId: (int)$request->input('sale_id'),
            items: $request->input('items'),
            returnType: 'CUSTOMER_CREDIT',
            reason: $request->input('reason'),
            userId: $request->user()->id
        );

        return response()->json($return, 201);
    }
}
