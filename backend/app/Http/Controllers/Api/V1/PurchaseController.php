<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Services\PurchaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    protected PurchaseService $purchaseService;

    public function __construct(PurchaseService $purchaseService)
    {
        $this->purchaseService = $purchaseService;
    }

    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $query = Purchase::with(['supplier', 'purchaseOrder'])->where('company_id', $companyId);
        
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
            'supplier_invoice_number' => 'required|string|max:100',
            'invoice_date' => 'required|date',
            'grand_total' => 'required|numeric|min:0',
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

        return DB::transaction(function () use ($validated, $request, $companyId, $supplier) {
            $purchase = Purchase::create([
                'company_id' => $companyId,
                'supplier_id' => $supplier->id,
                'supplier_invoice_number' => $validated['supplier_invoice_number'],
                'invoice_date' => $validated['invoice_date'],
                'status' => 'DRAFT',
                'created_by' => $request->user()?->id ?? 1,
                'grand_total' => $validated['grand_total'],
            ]);
            
            foreach ($validated['items'] as $item) {
                $product = \App\Models\Product::find($item['product_id']) ?? \App\Models\Product::first();
                $variant = \App\Models\ProductVariant::find($item['product_variant_id']) ?? \App\Models\ProductVariant::first();

                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $product?->id ?? 1,
                    'product_variant_id' => $variant?->id ?? 1,
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                    'line_total' => $item['quantity'] * $item['unit_cost'],
                ]);
            }
            
            return response()->json([
                'success' => true,
                'data' => $purchase->load('items')
            ], 201);
        });
    }

    public function postPurchase(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $purchase = Purchase::where('company_id', $companyId)->findOrFail($id);
        
        $posted = $this->purchaseService->postPurchaseInvoice($purchase->id, $request->user()->id);
        
        return response()->json([
            'success' => true,
            'data' => $posted
        ]);
    }
}
