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
        $query = $request->get('q');
        
        $variants = ProductVariant::with('product')
            ->whereHas('product', function($q) use ($companyId, $query) {
                $q->where('company_id', $companyId)
                  ->where('status', 'ACTIVE');
            })
            ->where('status', 'ACTIVE')
            ->where(function($q) use ($query) {
                $q->where('sku', 'like', "%{$query}%")
                  ->orWhere('barcode', 'like', "%{$query}%")
                  ->orWhere('name', 'like', "%{$query}%")
                  ->orWhereHas('product', function($q2) use ($query) {
                      $q2->where('name', 'like', "%{$query}%");
                  });
            })
            ->limit(20)
            ->get();
            
        return response()->json(['success' => true, 'data' => $variants]);
    }
    
    public function barcode(Request $request, $barcode)
    {
        $companyId = $request->attributes->get('company_id');
        
        $variant = ProductVariant::with('product')
            ->whereHas('product', function($q) use ($companyId) {
                $q->where('company_id', $companyId)
                  ->where('status', 'ACTIVE');
            })
            ->where('status', 'ACTIVE')
            ->where('barcode', $barcode)
            ->first();
            
        if (!$variant) {
            return response()->json(['success' => false, 'message' => 'Product not found'], 404);
        }
        
        return response()->json(['success' => true, 'data' => $variant]);
    }
}
