<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SalesService;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    protected $salesService;
    
    public function __construct(SalesService $salesService)
    {
        $this->salesService = $salesService;
    }
    
    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $sales = Sale::with(['customer', 'terminal'])
            ->where('company_id', $companyId)
            ->orderBy('id', 'desc')
            ->paginate(20);
            
        return response()->json(['success' => true, 'data' => $sales]);
    }
    
    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $sale = Sale::with(['items.variant.product', 'payments', 'customer', 'terminal', 'session'])
            ->where('company_id', $companyId)
            ->findOrFail($id);
            
        return response()->json(['success' => true, 'data' => $sale]);
    }
    
    public function complete(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'pos_session_id' => 'required|exists:pos_sessions,id',
            'customer_id' => 'nullable|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0',
            'sale_discount' => 'nullable|numeric|min:0',
            'payments' => 'nullable|array',
            'payments.*.method' => 'required|string',
            'payments.*.amount' => 'required|numeric|min:0'
        ]);
        
        $validated['cashier_id'] = $request->user()->id;
        
        try {
            $sale = $this->salesService->completeSale($companyId, $validated);
            return response()->json(['success' => true, 'data' => $sale], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }
    
    public function hold(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $validated = $request->validate([
            'pos_session_id' => 'required|exists:pos_sessions,id',
            'customer_id' => 'nullable|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_price' => 'required|numeric|min:0'
        ]);
        
        $validated['cashier_id'] = $request->user()->id;
        
        try {
            $sale = $this->salesService->holdSale($companyId, $validated);
            return response()->json(['success' => true, 'data' => $sale], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
