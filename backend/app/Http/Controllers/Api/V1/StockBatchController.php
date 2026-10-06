<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\StockBatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockBatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $query = StockBatch::with(['product', 'variant', 'supplier', 'inventoryBatches.warehouse', 'inventoryBatches.storageLocation'])
            ->where('company_id', $companyId);

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }

        if ($request->filled('variant_id')) {
            $query->where('variant_id', $request->input('variant_id'));
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('expiry_status')) {
            $status = $request->input('expiry_status');
            $days = (int) $request->input('days_to_expiry', 30);
            if ($status === 'expired') {
                $query->whereNotNull('exp_date')->where('exp_date', '<', now());
            } elseif ($status === 'near_expiry') {
                $query->whereNotNull('exp_date')
                    ->where('exp_date', '>=', now())
                    ->where('exp_date', '<=', now()->addDays($days));
            } elseif ($status === 'active') {
                $query->where('status', 'ACTIVE')
                    ->where(function ($q) {
                        $q->whereNull('exp_date')->orWhere('exp_date', '>=', now());
                    });
            } elseif ($status === 'blocked') {
                $query->where('status', 'BLOCKED');
            }
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('batch_no', 'ilike', "%{$search}%")
                  ->orWhereHas('product', fn($p) => $p->where('name', 'ilike', "%{$search}%"))
                  ->orWhereHas('variant', fn($v) => $v->where('sku', 'ilike', "%{$search}%")->orWhere('variant_name', 'ilike', "%{$search}%"));
            });
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        return response()->json([
            'success' => true,
            'data' => $query->latest('id')->paginate($perPage)
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $batch = StockBatch::with(['product', 'variant', 'supplier', 'inventoryBatches.warehouse', 'inventoryBatches.storageLocation'])
            ->where('company_id', $companyId)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $batch
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => [
                'required',
                Rule::exists('products', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->attributes->get('company_id'));
                }),
            ],
            'variant_id' => [
                'required',
                Rule::exists('product_variants', 'id')->where(function ($query) use ($request) {
                    return $query->where('product_id', $request->product_id);
                }),
            ],
            'supplier_id' => [
                'nullable',
                Rule::exists('suppliers', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->attributes->get('company_id'));
                }),
            ],
            'batch_no' => [
                'required',
                'string',
                'max:100',
                Rule::unique('stock_batches')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->attributes->get('company_id'))
                                 ->where('variant_id', $request->variant_id);
                }),
            ],
            'mfg_date' => 'nullable|date',
            'exp_date' => 'nullable|date',
            'unit_cost' => 'numeric|min:0',
            'status' => 'string|in:ACTIVE,BLOCKED'
        ]);

        $validated['company_id'] = $request->attributes->get('company_id');
        $validated['status'] = $validated['status'] ?? 'ACTIVE';

        $batch = StockBatch::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Stock batch created successfully',
            'data' => $batch
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $batch = StockBatch::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'mfg_date' => 'nullable|date',
            'exp_date' => 'nullable|date',
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier_id' => [
                'nullable',
                Rule::exists('suppliers', 'id')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId);
                }),
            ],
            'status' => 'nullable|string|in:ACTIVE,BLOCKED',
        ]);

        $oldStatus = $batch->status;
        $batch->update($validated);

        if (isset($validated['status']) && $validated['status'] !== $oldStatus && $validated['status'] === 'BLOCKED') {
            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $request->user()?->id,
                'event' => 'BATCH_BLOCKED',
                'auditable_type' => StockBatch::class,
                'auditable_id' => $batch->id,
                'old_values' => ['status' => $oldStatus],
                'new_values' => ['status' => 'BLOCKED', 'reason' => $request->input('reason', 'Manually blocked')],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Stock batch updated successfully',
            'data' => $batch
        ]);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $batch = StockBatch::where('company_id', $companyId)->findOrFail($id);

        $newStatus = $request->input('status');
        if (!$newStatus) {
            $newStatus = $batch->status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        }

        if (!in_array($newStatus, ['ACTIVE', 'BLOCKED'])) {
            return response()->json(['success' => false, 'message' => 'Invalid status'], 422);
        }

        $oldStatus = $batch->status;
        $batch->status = $newStatus;
        $batch->save();

        if ($newStatus === 'BLOCKED' && $oldStatus !== 'BLOCKED') {
            AuditLog::create([
                'company_id' => $companyId,
                'user_id' => $request->user()?->id,
                'event' => 'BATCH_BLOCKED',
                'auditable_type' => StockBatch::class,
                'auditable_id' => $batch->id,
                'old_values' => ['status' => $oldStatus],
                'new_values' => ['status' => 'BLOCKED', 'reason' => $request->input('reason', 'Batch blocked')],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => "Stock batch status changed to {$newStatus}",
            'data' => $batch
        ]);
    }

    public function expiryReport(Request $request): JsonResponse
    {
        $companyId = $request->attributes->get('company_id');
        $days = (int) $request->input('days', 30);

        $expired = StockBatch::with(['product', 'variant', 'inventoryBatches.warehouse'])
            ->where('company_id', $companyId)
            ->whereNotNull('exp_date')
            ->where('exp_date', '<', now())
            ->get();

        $nearExpiry = StockBatch::with(['product', 'variant', 'inventoryBatches.warehouse'])
            ->where('company_id', $companyId)
            ->whereNotNull('exp_date')
            ->where('exp_date', '>=', now())
            ->where('exp_date', '<=', now()->addDays($days))
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'expired' => $expired,
                'near_expiry' => $nearExpiry,
                'summary' => [
                    'expired_count' => $expired->count(),
                    'near_expiry_count' => $nearExpiry->count(),
                    'threshold_days' => $days,
                ]
            ]
        ]);
    }
}
