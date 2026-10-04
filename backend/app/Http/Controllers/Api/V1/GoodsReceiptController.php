<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockBatch;
use App\Models\StorageLocation;
use App\Services\PurchaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GoodsReceiptController extends Controller
{
    protected PurchaseService $purchaseService;

    public function __construct(PurchaseService $purchaseService)
    {
        $this->purchaseService = $purchaseService;
    }

    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $query = GoodsReceipt::with([
            'supplier', 
            'warehouse', 
            'purchaseOrder', 
            'items.product', 
            'items.productVariant', 
            'postedBy', 
            'createdBy'
        ])->where('company_id', $companyId);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('receipt_number', 'ILIKE', "%{$search}%")
                  ->orWhereHas('purchaseOrder', function ($poQ) use ($search) {
                      $poQ->where('po_number', 'ILIKE', "%{$search}%");
                  })
                  ->orWhereHas('supplier', function ($supQ) use ($search) {
                      $supQ->where('name', 'ILIKE', "%{$search}%")
                           ->orWhere('supplier_code', 'ILIKE', "%{$search}%");
                  })
                  ->orWhereHas('warehouse', function ($whQ) use ($search) {
                      $whQ->where('name', 'ILIKE', "%{$search}%");
                  });
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'ALL') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->input('supplier_id'));
        }

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }

        if ($request->filled('purchase_order_id')) {
            $query->where('purchase_order_id', $request->input('purchase_order_id'));
        }

        $query->orderBy('id', 'desc');

        if ($request->boolean('all')) {
            return response()->json([
                'success' => true,
                'data' => $query->get(),
                'total' => $query->count()
            ]);
        }

        $perPage = min(max((int) $request->input('per_page', 15), 1), 100);
        return response()->json([
            'success' => true,
            'data' => $query->paginate($perPage)
        ]);
    }

    public function nextNumber(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $nextNumber = $this->generateUniqueGrNumber((int) $companyId);

        return response()->json([
            'success' => true,
            'data' => [
                'receipt_number' => $nextNumber
            ]
        ]);
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $receipt = GoodsReceipt::where('company_id', $companyId)
            ->with([
                'supplier',
                'warehouse',
                'purchaseOrder.items.productVariant',
                'items.product.unit',
                'items.productVariant',
                'items.storageLocation',
                'items.stockBatch',
                'postedBy',
                'createdBy'
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $receipt
        ]);
    }

    public function store(Request $request)
    {
        $companyId = (int) $request->attributes->get('company_id');

        $validated = $request->validate([
            'purchase_order_id' => 'required|exists:purchase_orders,id',
            'receipt_number' => 'nullable|string|max:50',
            'receipt_date' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.purchase_order_item_id' => 'required|exists:purchase_order_items,id',
            'items.*.received_quantity' => 'required|numeric|gt:0',
            'items.*.storage_location_id' => 'nullable|integer',
            'items.*.stock_batch_id' => 'nullable|integer',
            'items.*.batch_number' => 'nullable|string|max:100',
            'items.*.expiry_date' => 'nullable|date',
            'items.*.notes' => 'nullable|string',
        ]);

        $po = PurchaseOrder::where('company_id', $companyId)->findOrFail($validated['purchase_order_id']);

        if (!in_array($po->status, ['APPROVED', 'PARTIALLY_RECEIVED'])) {
            abort(422, "Purchase Order must be APPROVED or PARTIALLY_RECEIVED to receive goods. Current status: {$po->status}.");
        }

        $receiptNumber = !empty($validated['receipt_number']) ? trim($validated['receipt_number']) : null;
        if (empty($receiptNumber)) {
            $receiptNumber = $this->generateUniqueGrNumber($companyId);
        } else {
            $exists = GoodsReceipt::where('company_id', $companyId)
                ->where('receipt_number', $receiptNumber)
                ->exists();
            if ($exists) {
                abort(422, "Receipt number '{$receiptNumber}' already exists for this company.");
            }
        }

        return DB::transaction(function () use ($validated, $request, $companyId, $po, $receiptNumber) {
            $receipt = GoodsReceipt::create([
                'company_id' => $companyId,
                'supplier_id' => $po->supplier_id,
                'warehouse_id' => $po->warehouse_id,
                'purchase_order_id' => $po->id,
                'receipt_number' => $receiptNumber,
                'receipt_date' => $validated['receipt_date'],
                'notes' => $validated['notes'] ?? null,
                'status' => 'DRAFT',
                'created_by' => $request->user()->id,
            ]);

            foreach ($validated['items'] as $item) {
                $poItem = PurchaseOrderItem::with('product.unit')
                    ->where('id', $item['purchase_order_item_id'])
                    ->where('purchase_order_id', $po->id)
                    ->firstOrFail();

                $receivedQty = (float) $item['received_quantity'];

                // Decimal check based on product unit
                $unit = $poItem->product?->unit;
                if ($unit && !$unit->decimal_allowed) {
                    if (fmod($receivedQty, 1.0) !== 0.0) {
                        abort(422, "Fractional quantities are not allowed for unit '{$unit->name}'.");
                    }
                }

                $storageLocationId = $item['storage_location_id'] ?? null;
                if (!empty($storageLocationId)) {
                    $loc = StorageLocation::where('id', $storageLocationId)
                        ->where('company_id', $companyId)
                        ->where('warehouse_id', $po->warehouse_id)
                        ->first();
                    if (!$loc) {
                        abort(422, "Storage location #{$storageLocationId} does not belong to warehouse #{$po->warehouse_id} or company #{$companyId}.");
                    }
                }

                $stockBatchId = $item['stock_batch_id'] ?? null;
                if (!empty($stockBatchId)) {
                    $batch = StockBatch::where('id', $stockBatchId)
                        ->where('company_id', $companyId)
                        ->where('product_id', $poItem->product_id)
                        ->first();
                    if (!$batch) {
                        abort(422, "Stock batch #{$stockBatchId} does not belong to product #{$poItem->product_id} or company #{$companyId}.");
                    }
                }

                GoodsReceiptItem::create([
                    'goods_receipt_id' => $receipt->id,
                    'purchase_order_item_id' => $poItem->id,
                    'product_id' => $poItem->product_id,
                    'product_variant_id' => $poItem->product_variant_id,
                    'received_quantity' => $receivedQty,
                    'unit_cost' => $poItem->unit_cost,
                    'total_cost' => round($receivedQty * (float) $poItem->unit_cost, 4),
                    'storage_location_id' => $storageLocationId,
                    'stock_batch_id' => $stockBatchId,
                    'batch_number' => $item['batch_number'] ?? null,
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $receipt->load([
                    'items.product.unit',
                    'items.productVariant',
                    'items.storageLocation',
                    'items.stockBatch',
                    'supplier',
                    'warehouse',
                    'purchaseOrder',
                    'createdBy'
                ])
            ], 201);
        });
    }

    public function postReceipt(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $receipt = GoodsReceipt::where('company_id', $companyId)->findOrFail($id);

        $posted = $this->purchaseService->postGoodsReceipt($receipt->id, $request->user()->id);

        return response()->json([
            'success' => true,
            'data' => $posted->load([
                'items.product.unit',
                'items.productVariant',
                'items.storageLocation',
                'items.stockBatch',
                'supplier',
                'warehouse',
                'purchaseOrder',
                'postedBy',
                'createdBy'
            ])
        ]);
    }

    public function cancel(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $receipt = GoodsReceipt::where('company_id', $companyId)->findOrFail($id);

        if ($receipt->status === 'POSTED') {
            abort(409, "Cannot cancel a POSTED Goods Receipt.");
        }

        if ($receipt->status === 'CANCELLED') {
            return response()->json([
                'success' => true,
                'data' => $receipt,
                'message' => 'Goods Receipt is already cancelled.'
            ]);
        }

        $receipt->status = 'CANCELLED';
        $receipt->save();

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $receipt->company_id,
            'user_id' => $request->user()->id,
            'event' => 'GOODS_RECEIPT_CANCELLED',
            'auditable_type' => GoodsReceipt::class,
            'auditable_id' => $receipt->id,
            'new_values' => ['status' => 'CANCELLED'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $receipt,
            'message' => 'Goods Receipt cancelled successfully.'
        ]);
    }

    protected function generateUniqueGrNumber(int $companyId): string
    {
        $year = date('Y');
        $prefix = "GR-{$year}-";

        $latest = GoodsReceipt::where('company_id', $companyId)
            ->where('receipt_number', 'LIKE', "{$prefix}%")
            ->orderBy('id', 'desc')
            ->value('receipt_number');

        $seq = 1;
        if ($latest && preg_match('/GR-\d{4}-(\d+)/', $latest, $matches)) {
            $seq = intval($matches[1]) + 1;
        }

        do {
            $candidate = sprintf("GR-%s-%04d", $year, $seq);
            $exists = GoodsReceipt::where('company_id', $companyId)
                ->where('receipt_number', $candidate)
                ->exists();
            if (!$exists) {
                return $candidate;
            }
            $seq++;
        } while (true);
    }
}
