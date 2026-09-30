<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use Illuminate\Http\Request;

class PosProductController extends Controller
{
    public function search(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $query = $request->get('q') ?? $request->get('query');
        
        $variants = ProductVariant::with(['product.category', 'barcodes'])
            ->whereHas('product', function($q) use ($companyId) {
                $q->where('company_id', $companyId)
                  ->whereRaw('LOWER(status) = ?', ['active']);
            })
            ->whereRaw('LOWER(status) = ?', ['active'])
            ->when($query, function($q) use ($query) {
                $q->where(function($sub) use ($query) {
                    $sub->where('sku', 'ilike', "%{$query}%")
                        ->orWhere('variant_name', 'ilike', "%{$query}%")
                        ->orWhereHas('barcodes', function($bq) use ($query) {
                            $bq->where('barcode', 'ilike', "%{$query}%");
                        })
                        ->orWhereHas('product', function($pq) use ($query) {
                            $pq->where('name', 'ilike', "%{$query}%");
                        });
                });
            })
            ->limit(25)
            ->get();

        $variantIds = $variants->pluck('id');
        $stocks = \App\Models\Inventory::where('company_id', $companyId)
            ->whereIn('product_variant_id', $variantIds)
            ->selectRaw('product_variant_id, SUM(available_quantity) as total_stock')
            ->groupBy('product_variant_id')
            ->pluck('total_stock', 'product_variant_id');

        $variants->each(function($v) use ($stocks) {
            $v->available_stock = (float) ($stocks[$v->id] ?? 0);
        });
            
        return response()->json(['success' => true, 'data' => $variants]);
    }
    
    public function barcode(Request $request, $barcode)
    {
        $companyId = $request->attributes->get('company_id');
        
        $variant = ProductVariant::with(['product.category', 'barcodes'])
            ->whereHas('product', function($q) use ($companyId) {
                $q->where('company_id', $companyId)
                  ->whereRaw('LOWER(status) = ?', ['active']);
            })
            ->whereRaw('LOWER(status) = ?', ['active'])
            ->where(function($q) use ($barcode) {
                $q->whereHas('barcodes', function($bq) use ($barcode) {
                    $bq->where('barcode', $barcode);
                })->orWhere('sku', $barcode);
            })
            ->first();
            
        if (!$variant) {
            return response()->json(['success' => false, 'message' => 'Product not found'], 404);
        }

        $stock = \App\Models\Inventory::where('company_id', $companyId)
            ->where('product_variant_id', $variant->id)
            ->sum('available_quantity');
        $variant->available_stock = (float) $stock;
        
        return response()->json(['success' => true, 'data' => $variant]);
    }
}
