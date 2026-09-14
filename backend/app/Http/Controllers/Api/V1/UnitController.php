<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UnitRequest;
use App\Http\Resources\UnitResource;
use App\Models\AuditLog;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UnitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Unit::withCount('products');

        $query->where('company_id', $request->attributes->get('company_id'));

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('short_code', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->boolean('all')) {
            $units = $query->orderBy('name')->get();
            return response()->json([
                'success' => true,
                'data' => UnitResource::collection($units),
            ]);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $units = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => UnitResource::collection($units->items()),
            'meta' => [
                'current_page' => $units->currentPage(),
                'last_page' => $units->lastPage(),
                'per_page' => $units->perPage(),
                'total' => $units->total(),
            ],
        ]);
    }

    public function store(UnitRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['company_id'] = $request->attributes->get('company_id');
        $data['created_by'] = $request->user()?->id;
        $data['updated_by'] = $request->user()?->id;

        $unit = Unit::create($data);

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $unit->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'UNIT_CREATED',
            'auditable_type' => Unit::class,
            'auditable_id' => $unit->id,
            'new_values' => ['name' => $unit->name, 'short_code' => $unit->short_code],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Unit created successfully.',
            'data' => new UnitResource($unit),
        ], 201);
    }

    public function show(Unit $unit): JsonResponse
    {
        abort_if($unit->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $unit->loadCount('products');
        return response()->json([
            'success' => true,
            'data' => new UnitResource($unit),
        ]);
    }

    public function update(UnitRequest $request, Unit $unit): JsonResponse
    {
        abort_if($unit->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $oldValues = ['name' => $unit->name, 'short_code' => $unit->short_code, 'status' => $unit->status];
        $data = $request->validated();
        $data['company_id'] = $request->attributes->get('company_id');
        $data['updated_by'] = $request->user()?->id;

        $unit->update($data);

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $unit->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'UNIT_UPDATED',
            'auditable_type' => Unit::class,
            'auditable_id' => $unit->id,
            'old_values' => $oldValues,
            'new_values' => ['name' => $unit->name, 'short_code' => $unit->short_code, 'status' => $unit->status],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Unit updated successfully.',
            'data' => new UnitResource($unit->fresh()),
        ]);
    }

    public function destroy(Request $request, Unit $unit): JsonResponse
    {
        abort_if($unit->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        if ($unit->products()->exists()) {
            $unit->update(['status' => 'inactive', 'updated_by' => $request->user()?->id]);
            return response()->json([
                'success' => true,
                'message' => 'Unit has associated products; status changed to inactive.',
            ]);
        }

        $unit->delete();

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $unit->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'UNIT_STATUS_CHANGED',
            'auditable_type' => Unit::class,
            'auditable_id' => $unit->id,
            'new_values' => ['status' => 'deleted'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Unit deleted successfully.',
        ]);
    }
}
