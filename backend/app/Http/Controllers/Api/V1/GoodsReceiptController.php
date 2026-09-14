<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Services\PurchaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $query = GoodsReceipt::with(['supplier', 'warehouse', 'purchaseOrder'])->where('company_id', $companyId);
        
        return response()->json([
            'success' => true,
            'data' => $query->paginate(15)
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'purchase_order_id' => 'required|exists:purchase_orders,id',
            'receipt_number' => 'required|string|max:50',
            'receipt_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.purchase_order_item_id' => 'required|exists:purchase_order_items,id',
            'items.*.received_quantity' => 'required|numeric|min:0.0001',
        ]);
        
        $po = \App\Models\PurchaseOrder::where('company_id', $companyId)->findOrFail($validated['purchase_order_id']);
        
        return DB::transaction(function () use ($validated, $request, $companyId, $po) {
            $receipt = GoodsReceipt::create([
                'company_id' => $companyId,
                'supplier_id' => $po->supplier_id,
                'warehouse_id' => $po->warehouse_id,
                'purchase_order_id' => $po->id,
                'receipt_number' => $validated['receipt_number'],
                'receipt_date' => $validated['receipt_date'],
                'status' => 'DRAFT',
                'created_by' => $request->user()->id,
            ]);
            
            foreach ($validated['items'] as $item) {
                $poItem = \App\Models\PurchaseOrderItem::findOrFail($item['purchase_order_item_id']);
                
                GoodsReceiptItem::create([
                    'goods_receipt_id' => $receipt->id,
                    'purchase_order_item_id' => $poItem->id,
                    'product_id' => $poItem->product_id,
                    'product_variant_id' => $poItem->product_variant_id,
                    'received_quantity' => $item['received_quantity'],
                    'unit_cost' => $poItem->unit_cost,
                    'total_cost' => $item['received_quantity'] * $poItem->unit_cost,
                ]);
            }
            
            return response()->json([
                'success' => true,
                'data' => $receipt->load('items')
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
            'data' => $posted
        ]);
    }
}
