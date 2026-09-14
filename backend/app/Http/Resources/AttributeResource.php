<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttributeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'company_id' => $this->company_id,
            'name' => $this->name,
            'code' => $this->code,
            'status' => $this->status,
            'sort_order' => $this->sort_order,
            'values' => $this->values ? $this->values->map(fn($v) => [
                'id' => $v->id,
                'uuid' => $v->uuid,
                'value' => $v->value,
                'code' => $v->code,
                'sort_order' => $v->sort_order,
                'status' => $v->status,
            ]) : [],
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
