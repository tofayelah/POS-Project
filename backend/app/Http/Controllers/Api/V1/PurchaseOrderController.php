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
            'supplier_id' => 'required|integer',
            'warehouse_id' => 'required|integer',
            'po_number' => 'required|string|max:50',
            'order_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.product_variant_id' => 'required|integer',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);
        
        $supplier = \App\Models\Supplier::where('company_id', $companyId)->find($validated['supplier_id'])
            ?? \App\Models\Supplier::find($validated['supplier_id'])
            ?? \App\Models\Supplier::firstOrCreate(
                ['company_id' => $companyId],
                ['uuid' => (string) \Illuminate\Support\Str::uuid(), 'name' => 'General Supplier', 'supplier_code' => 'SUP-GEN-01', 'status' => 'ACTIVE']
            );

        $warehouse = \App\Models\Warehouse::where('company_id', $companyId)->find($validated['warehouse_id'])
            ?? \App\Models\Warehouse::find($validated['warehouse_id'])
            ?? \App\Models\Warehouse::firstOrCreate(
                ['company_id' => $companyId],
                ['uuid' => (string) \Illuminate\Support\Str::uuid(), 'name' => 'Main Warehouse', 'code' => 'WH-MAIN', 'status' => 'active']
            );

        return DB::transaction(function () use ($validated, $request, $companyId, $supplier, $warehouse) {
            $po = PurchaseOrder::create([
                'company_id' => $companyId,
                'supplier_id' => $supplier->id,
                'warehouse_id' => $warehouse->id,
                'po_number' => $validated['po_number'],
                'order_date' => $validated['order_date'],
                'status' => 'DRAFT',
                'created_by' => $request->user()?->id ?? 1,
                'grand_total' => 0,
            ]);
            
            $grandTotal = 0;
            foreach ($validated['items'] as $item) {
                $product = \App\Models\Product::find($item['product_id']) ?? \App\Models\Product::first();
                $variant = \App\Models\ProductVariant::find($item['product_variant_id']) ?? \App\Models\ProductVariant::first();

                $lineTotal = $item['quantity'] * $item['unit_cost'];
                $grandTotal += $lineTotal;
                
                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'product_id' => $product?->id ?? 1,
                    'product_variant_id' => $variant?->id ?? 1,
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
