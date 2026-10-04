<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\GoodsReceipt;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\Warehouse;
use App\Services\PurchaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class PurchaseController extends Controller
{
    public function __construct(
        protected PurchaseService $purchaseService
    ) {}

    protected function getCompanyId(Request $request): int
    {
        $companyId = $request->attributes->get('company_id')
            ?? $request->header('X-Company-Id')
            ?? $request->header('X-Company-ID')
            ?? ($request->user() ? $request->user()->company_id : null);

        if (!$companyId) {
            throw new ConflictHttpException("Company context is required.");
        }

        return (int) $companyId;
    }

    public function index(Request $request)
    {
        $companyId = $this->getCompanyId($request);
        
        $query = Purchase::with([
            'supplier',
            'purchaseOrder',
            'goodsReceipt',
            'warehouse',
            'branch',
            'createdBy',
            'postedBy',
            'items.product',
            'items.productVariant',
            'paymentAllocations.payment'
        ])->where('company_id', $companyId);

        // Search filter
        if ($request->filled('search')) {
            $search = '%' . trim($request->search) . '%';
            $likeOperator = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($search, $likeOperator) {
                $q->where('supplier_invoice_number', $likeOperator, $search)
                  ->orWhereHas('supplier', function ($sq) use ($search, $likeOperator) {
                      $sq->where('name', $likeOperator, $search)
                         ->orWhere('supplier_code', $likeOperator, $search);
                  })
                  ->orWhereHas('purchaseOrder', function ($pq) use ($search, $likeOperator) {
                      $pq->where('po_number', $likeOperator, $search);
                  });
            });
        }

        // Status filter
        if ($request->filled('status') && strtoupper($request->status) !== 'ALL') {
            $query->where('status', strtoupper($request->status));
        }

        // Supplier filter
        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        // Warehouse filter
        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        // Purchase Order filter
        if ($request->filled('purchase_order_id')) {
            $query->where('purchase_order_id', $request->purchase_order_id);
        }

        // Goods Receipt filter
        if ($request->filled('goods_receipt_id')) {
            $query->where('goods_receipt_id', $request->goods_receipt_id);
        }

        // Date range filters
        $dateFrom = $request->query('from_date') ?? $request->query('date_from');
        if (!empty($dateFrom)) {
            $query->whereDate('invoice_date', '>=', $dateFrom);
        }

        $dateTo = $request->query('to_date') ?? $request->query('date_to');
        if (!empty($dateTo)) {
            $query->whereDate('invoice_date', '<=', $dateTo);
        }

        $query->orderBy('id', 'desc');

        if ($request->query('all') === 'true') {
            $purchases = $query->get();
            return response()->json([
                'success' => true,
                'data' => $purchases,
                'total' => $purchases->count(),
            ]);
        }

        $perPage = (int) ($request->per_page ?? 15);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $paginated,
        ]);
    }

    public function show(Request $request, $id)
    {
        $companyId = $this->getCompanyId($request);

        $purchase = Purchase::with([
            'supplier',
            'purchaseOrder',
            'goodsReceipt',
            'warehouse',
            'branch',
            'createdBy',
            'postedBy',
            'items.product',
            'items.productVariant',
            'paymentAllocations.payment'
        ])
        ->where('company_id', $companyId)
        ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $purchase,
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $this->getCompanyId($request);

        $validated = $request->validate([
            'supplier_id' => 'required|integer',
            'supplier_invoice_number' => 'required|string|max:100',
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date',
            'warehouse_id' => 'nullable|integer',
            'business_unit_id' => 'nullable|integer',
            'branch_id' => 'nullable|integer',
            'purchase_order_id' => 'nullable|integer',
            'goods_receipt_id' => 'nullable|integer',
            'shipping_cost' => 'nullable|numeric|min:0',
            'other_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'post_immediately' => 'nullable|boolean',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.product_variant_id' => 'required|integer',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0',
        ]);

        // Supplier multi-tenant validation
        $supplier = Supplier::where('id', $validated['supplier_id'])
            ->where('company_id', $companyId)
            ->first();
        if (!$supplier) {
            return response()->json([
                'success' => false,
                'message' => 'The selected supplier does not belong to your company.',
            ], 422);
        }

        // Duplicate invoice validation (same company + same supplier + same supplier_invoice_number)
        $duplicate = Purchase::where('company_id', $companyId)
            ->where('supplier_id', $supplier->id)
            ->where('supplier_invoice_number', $validated['supplier_invoice_number'])
            ->exists();

        if ($duplicate) {
            return response()->json([
                'success' => false,
                'message' => "A purchase invoice with number '{$validated['supplier_invoice_number']}' already exists for this supplier.",
            ], 422);
        }

        // Warehouse validation
        if (!empty($validated['warehouse_id'])) {
            $warehouse = Warehouse::where('id', $validated['warehouse_id'])
                ->where('company_id', $companyId)
                ->first();
            if (!$warehouse) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected warehouse does not belong to your company.',
                ], 422);
            }
        }

        // Purchase Order validation
        if (!empty($validated['purchase_order_id'])) {
            $po = PurchaseOrder::where('id', $validated['purchase_order_id'])
                ->where('company_id', $companyId)
                ->first();
            if (!$po) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected purchase order does not belong to your company.',
                ], 422);
            }
            if ($po->supplier_id !== $supplier->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Purchase order supplier mismatch.',
                ], 422);
            }
        }

        // Goods Receipt validation
        if (!empty($validated['goods_receipt_id'])) {
            $gr = GoodsReceipt::where('id', $validated['goods_receipt_id'])
                ->where('company_id', $companyId)
                ->first();
            if (!$gr) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected goods receipt does not belong to your company.',
                ], 422);
            }
            if ($gr->supplier_id !== $supplier->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Goods receipt supplier mismatch.',
                ], 422);
            }
        }

        // Calculate authoritative financial totals on server
        $subtotal = 0;
        $discountTotal = 0;
        $taxTotal = 0;
        $calculatedItems = [];

        foreach ($validated['items'] as $item) {
            $qty = (float) $item['quantity'];
            $cost = (float) $item['unit_cost'];
            $discount = (float) ($item['discount'] ?? 0);
            $tax = (float) ($item['tax'] ?? 0);
            $lineTotal = round(($qty * $cost) - $discount + $tax, 4);

            $subtotal += ($qty * $cost);
            $discountTotal += $discount;
            $taxTotal += $tax;

            $calculatedItems[] = [
                'product_id' => $item['product_id'],
                'product_variant_id' => $item['product_variant_id'],
                'quantity' => $qty,
                'unit_cost' => $cost,
                'discount' => $discount,
                'tax' => $tax,
                'line_total' => $lineTotal,
            ];
        }

        $subtotal = round($subtotal, 4);
        $discountTotal = round($discountTotal, 4);
        $taxTotal = round($taxTotal, 4);
        $shippingCost = round((float) ($validated['shipping_cost'] ?? 0), 4);
        $otherCost = round((float) ($validated['other_cost'] ?? 0), 4);
        $grandTotal = round($subtotal - $discountTotal + $taxTotal + $shippingCost + $otherCost, 4);

        return DB::transaction(function () use (
            $companyId,
            $validated,
            $supplier,
            $subtotal,
            $discountTotal,
            $taxTotal,
            $shippingCost,
            $otherCost,
            $grandTotal,
            $calculatedItems,
            $request
        ) {
            $purchase = Purchase::create([
                'company_id' => $companyId,
                'supplier_id' => $supplier->id,
                'supplier_invoice_number' => $validated['supplier_invoice_number'],
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'] ?? null,
                'warehouse_id' => $validated['warehouse_id'] ?? null,
                'business_unit_id' => $validated['business_unit_id'] ?? null,
                'branch_id' => $validated['branch_id'] ?? null,
                'purchase_order_id' => $validated['purchase_order_id'] ?? null,
                'goods_receipt_id' => $validated['goods_receipt_id'] ?? null,
                'subtotal' => $subtotal,
                'discount_total' => $discountTotal,
                'tax_total' => $taxTotal,
                'shipping_cost' => $shippingCost,
                'other_cost' => $otherCost,
                'grand_total' => $grandTotal,
                'status' => 'DRAFT',
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()?->id,
            ]);

            foreach ($calculatedItems as $itemData) {
                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $itemData['product_id'],
                    'product_variant_id' => $itemData['product_variant_id'],
                    'quantity' => $itemData['quantity'],
                    'unit_cost' => $itemData['unit_cost'],
                    'discount' => $itemData['discount'],
                    'tax' => $itemData['tax'],
                    'line_total' => $itemData['line_total'],
                ]);
            }

            if (!empty($validated['post_immediately'])) {
                $purchase = $this->purchaseService->postPurchaseInvoice($purchase->id, $request->user()?->id);
            }

            return response()->json([
                'success' => true,
                'message' => 'Purchase invoice created successfully.',
                'data' => $purchase->load([
                    'items.product',
                    'items.productVariant',
                    'supplier',
                    'warehouse',
                    'purchaseOrder',
                    'goodsReceipt'
                ]),
            ], 201);
        });
    }

    public function postPurchase(Request $request, $id)
    {
        $companyId = $this->getCompanyId($request);
        $purchase = Purchase::where('company_id', $companyId)->findOrFail($id);

        $posted = $this->purchaseService->postPurchaseInvoice($purchase->id, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Purchase invoice posted successfully to accounts payable.',
            'data' => $posted,
        ]);
    }

    public function cancel(Request $request, $id)
    {
        $companyId = $this->getCompanyId($request);
        $purchase = Purchase::where('company_id', $companyId)->findOrFail($id);

        if ($purchase->status === 'POSTED') {
            throw new ConflictHttpException("Cannot cancel a POSTED Purchase Invoice.");
        }

        $purchase->status = 'CANCELLED';
        $purchase->save();

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'user_id' => $request->user()?->id,
            'event' => 'PURCHASE_CANCELLED',
            'auditable_type' => Purchase::class,
            'auditable_id' => $purchase->id,
            'new_values' => ['status' => 'CANCELLED'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Purchase invoice cancelled.',
            'data' => $purchase,
        ]);
    }
}
