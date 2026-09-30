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
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0',
            'sale_discount' => 'nullable|numeric|min:0',
            'discount_total' => 'nullable|numeric|min:0',
            'tax_total' => 'nullable|numeric|min:0',
            'grand_total' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500'
        ]);
        
        $validated['cashier_id'] = $request->user()->id;
        
        try {
            $sale = $this->salesService->holdSale($companyId, $validated);
            return response()->json(['success' => true, 'data' => $sale], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function held(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $sessionId = $request->get('pos_session_id');

        $query = Sale::with(['customer', 'items.variant.product', 'terminal'])
            ->where('company_id', $companyId)
            ->where('status', 'HELD');

        if ($sessionId) {
            $query->where('pos_session_id', $sessionId);
        }

        $heldSales = $query->orderBy('id', 'desc')->get();
        return response()->json(['success' => true, 'data' => $heldSales]);
    }

    public function destroyHeld(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $sale = Sale::where('company_id', $companyId)
            ->where('status', 'HELD')
            ->findOrFail($id);

        DB::transaction(function () use ($sale) {
            $sale->items()->delete();
            $sale->delete();
        });

        return response()->json(['success' => true, 'message' => 'Held sale discarded successfully']);
    }
}
