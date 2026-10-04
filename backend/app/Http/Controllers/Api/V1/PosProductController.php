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

        $warehouseId = $this->resolvePosWarehouseId($request, (int) $companyId);
        $variantIds = $variants->pluck('id');
        $stocks = collect();

        if ($warehouseId) {
            $stocks = \App\Models\Inventory::where('company_id', $companyId)
                ->where('warehouse_id', $warehouseId)
                ->whereIn('product_variant_id', $variantIds)
                ->selectRaw('product_variant_id, SUM(available_quantity) as total_stock')
                ->groupBy('product_variant_id')
                ->pluck('total_stock', 'product_variant_id');
        }

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

        $warehouseId = $this->resolvePosWarehouseId($request, (int) $companyId);
        $stock = 0.0;

        if ($warehouseId) {
            $stock = (float) \App\Models\Inventory::where('company_id', $companyId)
                ->where('warehouse_id', $warehouseId)
                ->where('product_variant_id', $variant->id)
                ->sum('available_quantity');
        }

        $variant->available_stock = $stock;
        
        return response()->json(['success' => true, 'data' => $variant]);
    }

    private function resolvePosWarehouseId(Request $request, int $companyId): ?int
    {
        if ($request->filled('pos_session_id')) {
            $session = \App\Models\PosSession::where('company_id', $companyId)
                ->where('id', $request->get('pos_session_id'))
                ->first();
            if ($session && $session->warehouse_id) {
                return (int) $session->warehouse_id;
            }
        }

        if ($request->filled('pos_terminal_id')) {
            $terminal = \App\Models\PosTerminal::where('company_id', $companyId)
                ->where('id', $request->get('pos_terminal_id'))
                ->first();
            if ($terminal && $terminal->warehouse_id) {
                return (int) $terminal->warehouse_id;
            }
        }

        if ($request->filled('warehouse_id')) {
            $whId = (int) $request->get('warehouse_id');
            $whExists = \App\Models\Warehouse::where('company_id', $companyId)
                ->where('id', $whId)
                ->exists();
            if ($whExists) {
                return $whId;
            }
        }

        $user = $request->user();
        if ($user) {
            $activeSession = \App\Models\PosSession::where('company_id', $companyId)
                ->where('cashier_id', $user->id)
                ->where('status', 'OPEN')
                ->latest('id')
                ->first();
            if ($activeSession && $activeSession->warehouse_id) {
                return (int) $activeSession->warehouse_id;
            }
        }

        return null;
    }
}
