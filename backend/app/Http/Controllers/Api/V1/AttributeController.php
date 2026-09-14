<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AttributeRequest;
use App\Http\Resources\AttributeResource;
use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class AttributeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Attribute::with(['values' => function ($q) {
            $q->orderBy('sort_order');
        }]);

        $query->where('company_id', $request->attributes->get('company_id'));

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'ilike', "%{$search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $attributes = $query->orderBy('sort_order')->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => AttributeResource::collection($attributes),
        ]);
    }

    public function store(AttributeRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $data = $request->validated();
        $data['company_id'] = $request->attributes->get('company_id');
            $values = $data['values'] ?? [];
            unset($data['values']);

            $data['created_by'] = $request->user()?->id;
            $data['updated_by'] = $request->user()?->id;

            $attribute = Attribute::create($data);

            $seenValues = [];
            foreach ($values as $valData) {
                $valStr = trim($valData['value'] ?? '');
                if (empty($valStr)) continue;

                if (in_array(strtolower($valStr), $seenValues)) {
                    throw new ConflictHttpException("Duplicate attribute value '{$valStr}' in request.");
                }
                $seenValues[] = strtolower($valStr);

                AttributeValue::create([
                    'attribute_id' => $attribute->id,
                    'value' => $valStr,
                    'code' => $valData['code'] ?? Str::slug($valStr),
                    'sort_order' => $valData['sort_order'] ?? 0,
                    'created_by' => $request->user()?->id,
                    'updated_by' => $request->user()?->id,
                ]);
            }

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $attribute->company_id,
                'user_id' => $request->user()?->id,
                'event' => 'ATTRIBUTE_CREATED',
                'auditable_type' => Attribute::class,
                'auditable_id' => $attribute->id,
                'new_values' => ['name' => $attribute->name, 'values_count' => count($values)],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Attribute created successfully.',
                'data' => new AttributeResource($attribute->load('values')),
            ], 201);
        });
    }

    public function show(Attribute $attribute): JsonResponse
    {
        abort_if($attribute->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $attribute->load('values');
        return response()->json([
            'success' => true,
            'data' => new AttributeResource($attribute),
        ]);
    }

    public function update(AttributeRequest $request, Attribute $attribute): JsonResponse
    {
        abort_if($attribute->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        return DB::transaction(function () use ($request, $attribute) {
            $data = $request->validated();
        $data['company_id'] = $request->attributes->get('company_id');
            $values = $data['values'] ?? null;
            unset($data['values']);

            $data['updated_by'] = $request->user()?->id;
            $attribute->update($data);

            if ($values !== null) {
                $seenValues = [];
                $keptIds = [];

                foreach ($values as $valData) {
                    $valStr = trim($valData['value'] ?? '');
                    if (empty($valStr)) continue;

                    if (in_array(strtolower($valStr), $seenValues)) {
                        throw new ConflictHttpException("Duplicate attribute value '{$valStr}'.");
                    }
                    $seenValues[] = strtolower($valStr);

                    if (! empty($valData['id'])) {
                        $val = AttributeValue::where('attribute_id', $attribute->id)->findOrFail($valData['id']);
                        $val->update([
                            'value' => $valStr,
                            'code' => $valData['code'] ?? Str::slug($valStr),
                            'sort_order' => $valData['sort_order'] ?? 0,
                            'updated_by' => $request->user()?->id,
                        ]);
                        $keptIds[] = $val->id;
                    } else {
                        $val = AttributeValue::create([
                            'attribute_id' => $attribute->id,
                            'value' => $valStr,
                            'code' => $valData['code'] ?? Str::slug($valStr),
                            'sort_order' => $valData['sort_order'] ?? 0,
                            'created_by' => $request->user()?->id,
                            'updated_by' => $request->user()?->id,
                        ]);
                        $keptIds[] = $val->id;
                    }
                }
            }

            AuditLog::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $attribute->company_id,
                'user_id' => $request->user()?->id,
                'event' => 'ATTRIBUTE_UPDATED',
                'auditable_type' => Attribute::class,
                'auditable_id' => $attribute->id,
                'new_values' => ['name' => $attribute->name],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Attribute updated successfully.',
                'data' => new AttributeResource($attribute->fresh('values')),
            ]);
        });
    }

    public function destroy(Request $request, Attribute $attribute): JsonResponse
    {
        abort_if($attribute->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');
        $attribute->delete();

        AuditLog::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $attribute->company_id,
            'user_id' => $request->user()?->id,
            'event' => 'ATTRIBUTE_STATUS_CHANGED',
            'auditable_type' => Attribute::class,
            'auditable_id' => $attribute->id,
            'new_values' => ['status' => 'deleted'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Attribute deleted successfully.',
        ]);
    }
}
