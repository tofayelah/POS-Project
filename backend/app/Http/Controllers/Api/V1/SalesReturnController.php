<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SalesReturn;
use App\Services\SalesReturnService;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class SalesReturnController extends Controller
{
    protected $salesReturnService;

    public function __construct(SalesReturnService $salesReturnService)
    {
        $this->salesReturnService = $salesReturnService;
    }

    public function index(Request $request)
    {
        $companyId = $request->attributes->get('company_id');
        $returns = SalesReturn::with(['customer', 'originalSale'])
            ->where('company_id', $companyId)
            ->orderBy('id', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $returns]);
    }

    public function show(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $return = SalesReturn::with(['items.originalSaleItem', 'payments', 'customer', 'originalSale'])
            ->where('company_id', $companyId)
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $return]);
    }

    public function store(Request $request)
    {
        $companyId = $request->attributes->get('company_id');

        if (!$request->user()->can('sales_return.complete')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized to complete a return.'], 403);
        }
        
        $validated = $request->validate([
            'original_sale_id' => 'required|exists:sales,id',
            'return_type' => 'required|in:REFUND,STORE_CREDIT,EXCHANGE',
            'items' => 'required|array|min:1',
            'items.*.original_sale_item_id' => 'required|exists:sale_items,id',
            'items.*.return_quantity' => 'required|numeric|min:0.0001',
            'items.*.condition' => 'nullable|in:RESELLABLE,DAMAGED,DEFECTIVE,OPENED,UNSELLABLE',
            'items.*.inventory_action' => 'nullable|in:RESTORE,WRITE_OFF,PENDING_INSPECTION',
            'items.*.reason' => 'nullable|string',
            'items.*.replacement_product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.replacement_quantity' => 'nullable|numeric|min:0.0001',
            'refund_methods' => 'nullable|array',
            'refund_methods.*.method' => 'required_with:refund_methods|string',
            'refund_methods.*.amount' => 'required_with:refund_methods|numeric|min:0.0001',
            'exchange_payments' => 'nullable|array',
            'exchange_payments.*.method' => 'required_with:exchange_payments|string',
            'exchange_payments.*.amount' => 'required_with:exchange_payments|numeric|min:0.0001',
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
            'idempotency_key' => 'nullable|string'
        ]);

        if (in_array($validated['return_type'], ['REFUND', 'STORE_CREDIT']) && !$request->user()->can('sales_return.refund')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized to issue refunds.'], 403);
        }

        if ($validated['return_type'] === 'EXCHANGE' && !$request->user()->can('sales_return.exchange')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized to process exchanges.'], 403);
        }

        $validated['processed_by'] = $request->user()->id;

        try {
            $return = $this->salesReturnService->processReturn($companyId, $validated);
            return response()->json(['success' => true, 'data' => $return], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }
    }

    public function returnableItems(Request $request, $saleId)
    {
        $companyId = $request->attributes->get('company_id');
        
        $sale = Sale::with('items')->where('company_id', $companyId)->findOrFail($saleId);
        
        if ($sale->status !== 'COMPLETED') {
            return response()->json(['success' => false, 'message' => 'Only completed sales can be returned.'], 409);
        }

        $items = [];
        foreach ($sale->items as $item) {
            $eligible = $this->salesReturnService->getReturnableQuantity($companyId, $item->id);
            if ($eligible > 0) {
                $items[] = [
                    'item' => $item,
                    'eligible_quantity' => $eligible
                ];
            }
        }

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function update(Request $request, $id) {
        if (!$request->user()->can('sales_return.update')) abort(403);
        return response()->json(['message' => 'Not implemented yet'], 501);
    }
    public function approve(Request $request, $id) {
        if (!$request->user()->can('sales_return.approve')) abort(403);
        return response()->json(['message' => 'Not implemented yet'], 501);
    }
    public function complete(Request $request, $id) {
        if (!$request->user()->can('sales_return.complete')) abort(403);
        return response()->json(['message' => 'Not implemented yet'], 501);
    }
    public function cancel(Request $request, $id) {
        if (!$request->user()->can('sales_return.cancel')) abort(403);
        return response()->json(['message' => 'Not implemented yet'], 501);
    }
    public function refund(Request $request, $id) {
        if (!$request->user()->can('sales_return.refund')) abort(403);
        return response()->json(['message' => 'Not implemented yet'], 501);
    }
    public function exchange(Request $request, $id) {
        if (!$request->user()->can('sales_return.exchange')) abort(403);
        return response()->json(['message' => 'Not implemented yet'], 501);
    }
}
