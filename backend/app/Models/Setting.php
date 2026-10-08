<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Setting extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'is_system' => 'boolean',
        'is_editable' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope query to a specific company.
     */
    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    /**
     * Scope query to a specific branch (or global null).
     */
    public function scopeForBranch($query, ?int $branchId = null)
    {
        if ($branchId === null) {
            return $query->whereNull('branch_id');
        }
        return $query->where('branch_id', $branchId);
    }

    /**
     * Scope query to a specific logical group.
     */
    public function scopeInGroup($query, string $group)
    {
        return $query->where('group', $group);
    }

    /**
     * Return typed value according to the type column.
     */
    public function getTypedValueAttribute()
    {
        return self::castValue($this->value, $this->type);
    }

    /**
     * Cast raw value to declared type.
     */
    public static function castValue(?string $value, string $type)
    {
        if ($value === null) {
            return null;
        }

        return match ($type) {
            'boolean', 'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'integer', 'int' => (int) $value,
            'decimal', 'float', 'double' => (float) $value,
            'json', 'array' => json_decode($value, true) ?? [],
            default => $value,
        };
    }

    /**
     * Convert any typed value into serialized storage string.
     */
    public static function serializeValue(mixed $value, string $type): ?string
    {
        if ($value === null) {
            return null;
        }

        return match ($type) {
            'boolean', 'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN) ? '1' : '0',
            'json', 'array' => is_string($value) ? $value : json_encode($value),
            default => (string) $value,
        };
    }
}
