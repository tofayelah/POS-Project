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
        $query = PurchaseOrder::with(['supplier', 'warehouse', 'items.product', 'items.variant'])
            ->where('company_id', $companyId);
        
        if ($request->filled('status') && strtoupper($request->status) !== 'ALL') {
            $query->where('status', strtoupper($request->status));
        }

        if ($request->filled('supplier_id') && $request->supplier_id !== 'ALL') {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('warehouse_id') && $request->warehouse_id !== 'ALL') {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $query->where(function ($q) use ($term) {
                $q->where('po_number', 'like', $term)
                  ->orWhereHas('supplier', function ($sq) use ($term) {
                      $sq->where('name', 'like', $term)
                         ->orWhere('supplier_code', 'like', $term);
                  })
                  ->orWhereHas('warehouse', function ($wq) use ($term) {
                      $wq->where('name', 'like', $term);
                  });
            });
        }

        $query->orderBy('id', 'desc');

        if ($request->boolean('all')) {
            return response()->json([
                'success' => true,
                'data' => $query->get()
            ]);
        }
        
        $perPage = (int) $request->get('per_page', 15);
        return response()->json([
            'success' => true,
            'data' => $query->paginate($perPage)
        ]);
    }

    public static function generateUniquePoNumber($companyId): string
    {
        $year = date('Y');
        $orders = PurchaseOrder::where('company_id', $companyId)
            ->where('po_number', 'LIKE', "PO-{$year}-%")
            ->pluck('po_number');
            
        $maxNum = 0;
        foreach ($orders as $numStr) {
            if (preg_match('/^PO-\d{4}-(\d+)$/i', $numStr, $matches)) {
                $n = (int)$matches[1];
                if ($n > $maxNum) {
                    $maxNum = $n;
                }
            }
        }
        
        $nextNum = $maxNum + 1;
        $candidate = "PO-{$year}-" . str_pad((string)$nextNum, 4, '0', STR_PAD_LEFT);
        while (PurchaseOrder::where('company_id', $companyId)
            ->where('po_number', $candidate)
            ->exists()) {
            $nextNum++;
            $candidate = "PO-{$year}-" . str_pad((string)$nextNum, 4, '0', STR_PAD_LEFT);
        }
        
        return $candidate;
    }

    public function nextNumber(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $poNumber = self::generateUniquePoNumber($companyId);
        
        return response()->json([
            'success' => true,
            'data' => [
                'po_number' => $poNumber
            ]
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'business_unit_id' => 'nullable|integer',
            'branch_id' => 'nullable|integer',
            'po_number' => 'nullable|string|max:50',
            'order_date' => 'required|date',
            'expected_date' => 'nullable|date',
            'shipping_cost' => 'nullable|numeric|min:0',
            'other_cost' => 'nullable|numeric|min:0',
            'discount_total' => 'nullable|numeric|min:0',
            'tax_total' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0',
        ]);

        if (empty($validated['po_number'])) {
            $validated['po_number'] = self::generateUniquePoNumber($companyId);
        } else {
            $candidate = strtoupper(trim($validated['po_number']));
            if (PurchaseOrder::where('company_id', $companyId)->where('po_number', $candidate)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => "Purchase order number '{$candidate}' already exists."
                ], 422);
            }
            $validated['po_number'] = $candidate;
        }
        
        return DB::transaction(function () use ($validated, $request, $companyId) {
            $shippingCost = (float)($validated['shipping_cost'] ?? 0);
            $otherCost = (float)($validated['other_cost'] ?? 0);
            $headerDiscount = (float)($validated['discount_total'] ?? 0);
            $headerTax = (float)($validated['tax_total'] ?? 0);

            $po = PurchaseOrder::create([
                'company_id' => $companyId,
                'business_unit_id' => $validated['business_unit_id'] ?? null,
                'branch_id' => $validated['branch_id'] ?? null,
                'supplier_id' => $validated['supplier_id'],
                'warehouse_id' => $validated['warehouse_id'],
                'po_number' => $validated['po_number'],
                'order_date' => $validated['order_date'],
                'expected_date' => $validated['expected_date'] ?? null,
                'status' => 'DRAFT',
                'shipping_cost' => $shippingCost,
                'other_cost' => $otherCost,
                'discount_total' => $headerDiscount,
                'tax_total' => $headerTax,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user() ? $request->user()->id : null,
                'grand_total' => 0,
                'subtotal' => 0,
            ]);
            
            $subtotal = 0;
            foreach ($validated['items'] as $item) {
                $qty = (float)$item['quantity'];
                $cost = (float)$item['unit_cost'];
                $itemDiscount = (float)($item['discount'] ?? 0);
                $itemTax = (float)($item['tax'] ?? 0);
                $lineTotal = round(($qty * $cost) - $itemDiscount + $itemTax, 4);
                $subtotal += $lineTotal;
                
                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'],
                    'quantity' => $qty,
                    'unit_cost' => $cost,
                    'discount' => $itemDiscount,
                    'tax' => $itemTax,
                    'line_total' => $lineTotal,
                    'pending_quantity' => $qty,
                    'received_quantity' => 0,
                ]);
            }
            
            $grandTotal = round($subtotal + $shippingCost + $otherCost - $headerDiscount + $headerTax, 4);
            $po->update([
                'subtotal' => $subtotal,
                'grand_total' => $grandTotal
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Purchase order created successfully',
                'data' => $po->load(['items.product', 'items.variant', 'supplier', 'warehouse'])
            ], 201);
        });
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $po = PurchaseOrder::with(['items.product', 'items.variant', 'supplier', 'warehouse'])
            ->where('company_id', $companyId)
            ->findOrFail($id);
        
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
            'approved_by' => $request->user() ? $request->user()->id : null,
            'approved_at' => now(),
        ]);
        
        return response()->json([
            'success' => true, 
            'message' => 'Purchase order approved successfully',
            'data' => $po->load(['items.product', 'items.variant', 'supplier', 'warehouse'])
        ]);
    }

    public function cancel(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $po = PurchaseOrder::where('company_id', $companyId)->findOrFail($id);
        
        if (in_array($po->status, ['FULLY_RECEIVED', 'CANCELLED'])) {
            return response()->json([
                'success' => false, 
                'message' => "PO cannot be cancelled when status is {$po->status}"
            ], 409);
        }
        
        $po->update([
            'status' => 'CANCELLED',
        ]);
        
        return response()->json([
            'success' => true, 
            'message' => 'Purchase order cancelled successfully',
            'data' => $po->load(['items.product', 'items.variant', 'supplier', 'warehouse'])
        ]);
    }
}
