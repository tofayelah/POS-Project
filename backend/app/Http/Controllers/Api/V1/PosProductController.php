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
        
        $variants = ProductVariant::with(['product', 'barcodes'])
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
            ->limit(20)
            ->get();
            
        return response()->json(['success' => true, 'data' => $variants]);
    }
    
    public function barcode(Request $request, $barcode)
    {
        $companyId = $request->attributes->get('company_id');
        
        $variant = ProductVariant::with(['product', 'barcodes'])
            ->whereHas('product', function($q) use ($companyId) {
                $q->where('company_id', $companyId)
                  ->whereRaw('LOWER(status) = ?', ['active']);
            })
            ->whereRaw('LOWER(status) = ?', ['active'])
            ->whereHas('barcodes', function($bq) use ($barcode) {
                $bq->where('barcode', $barcode);
            })
            ->first();
            
        if (!$variant) {
            return response()->json(['success' => false, 'message' => 'Product not found'], 404);
        }
        
        return response()->json(['success' => true, 'data' => $variant]);
    }
}
