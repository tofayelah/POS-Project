<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryReportController extends Controller
{
    public function stockSummary(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $query = Inventory::where('company_id', $companyId)
            ->with(['product', 'productVariant', 'warehouse']);
            
        // Apply filters
        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }
        
        $sortBy = $request->query('sort_by', 'quantity');
        $sortDirection = $request->query('sort_direction', 'desc');
        
        if (in_array($sortBy, ['quantity', 'unit_cost'])) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->query('per_page', 50);
        $paginator = $query->paginate(in_array($perPage, [25, 50, 100, 250]) ? $perPage : 50);
        
        $totalsQuery = clone $query;
        $totals = [
            'total_quantity' => (float) $totalsQuery->sum('quantity'),
            'total_value' => (float) $totalsQuery->sum(DB::raw('quantity * unit_cost')),
        ];
        
        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage()
            ],
            'summary' => $totals
        ]);
    }

    public function movements(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        
        $query = StockMovement::where('company_id', $companyId)
            ->with(['productVariant.product', 'warehouse', 'createdBy']);
            
        // Apply filters
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }
        if ($request->filled('movement_type')) {
            $query->where('movement_type', $request->movement_type);
        }
        
        $sortBy = $request->query('sort_by', 'created_at');
        $sortDirection = $request->query('sort_direction', 'desc');
        
        if (in_array($sortBy, ['created_at', 'quantity'])) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->query('per_page', 50);
        $paginator = $query->paginate(in_array($perPage, [25, 50, 100, 250]) ? $perPage : 50);
        
        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage()
            ],
            'summary' => []
        ]);
    }
}
