<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $query = PurchaseOrder::with(['supplier', 'warehouse'])->where('company_id', $companyId);
        
        return response()->json([
            'success' => true,
            'data' => $query->paginate(15)
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'po_number' => 'required|string|max:50',
            'order_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);
        
        return DB::transaction(function () use ($validated, $request, $companyId) {
            $po = PurchaseOrder::create([
                'company_id' => $companyId,
                'supplier_id' => $validated['supplier_id'],
                'warehouse_id' => $validated['warehouse_id'],
                'po_number' => $validated['po_number'],
                'order_date' => $validated['order_date'],
                'status' => 'DRAFT',
                'created_by' => $request->user()->id,
                'grand_total' => 0,
            ]);
            
            $grandTotal = 0;
            foreach ($validated['items'] as $item) {
                $lineTotal = $item['quantity'] * $item['unit_cost'];
                $grandTotal += $lineTotal;
                
                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'],
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                    'line_total' => $lineTotal,
                    'pending_quantity' => $item['quantity']
                ]);
            }
            
            $po->update(['grand_total' => $grandTotal, 'subtotal' => $grandTotal]);
            
            return response()->json([
                'success' => true,
                'data' => $po->load('items')
            ], 201);
        });
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $po = PurchaseOrder::with(['items', 'supplier', 'warehouse'])->where('company_id', $companyId)->findOrFail($id);
        
        return response()->json([
            'success' => true,
            'data' => $po
        ]);
    }
    
    public function approve(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $po = PurchaseOrder::where('company_id', $companyId)->findOrFail($id);
        
        if ($po->status !== 'DRAFT') {
            return response()->json(['success' => false, 'message' => 'PO must be DRAFT to approve'], 409);
        }
        
        $po->update([
            'status' => 'APPROVED',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);
        
        return response()->json(['success' => true, 'data' => $po]);
    }
}
