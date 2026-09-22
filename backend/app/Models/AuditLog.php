<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuditLog extends Model {
    protected $guarded = ['id'];
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];
    public function auditable() { return $this->morphTo(); }
    public function user() { return $this->belongsTo(User::class); }

    public static function log(...$args)
    {
        try {
            $companyId = null;
            $userId = null;
            $event = 'UNKNOWN';
            $auditableType = null;
            $auditableId = null;
            $oldValues = null;
            $newValues = null;

            // Pattern A: ($user, $companyId, $event, $auditableModel, $oldValues, $newValues)
            if (count($args) >= 4 && ($args[0] instanceof User || (isset($args[3]) && $args[3] instanceof Model))) {
                $user = $args[0];
                $userId = $user instanceof Model ? $user->id : (is_numeric($user) ? (int)$user : null);
                $companyId = is_numeric($args[1] ?? null) ? (int)$args[1] : null;
                $event = (string)($args[2] ?? 'UNKNOWN');
                if (isset($args[3]) && $args[3] instanceof Model) {
                    $auditableType = get_class($args[3]);
                    $auditableId = $args[3]->id;
                }
                $oldValues = $args[4] ?? null;
                $newValues = $args[5] ?? null;
            } else {
                // Pattern B: ($companyId, $userId, $event, $auditableId, $auditableType, $message = null, $oldValues = null, $newValues = null)
                $companyId = is_numeric($args[0] ?? null) ? (int)$args[0] : null;
                $userId = is_numeric($args[1] ?? null) ? (int)$args[1] : null;
                $event = (string)($args[2] ?? 'UNKNOWN');
                $auditableId = is_numeric($args[3] ?? null) ? (int)$args[3] : null;
                $auditableType = isset($args[4]) ? (string)$args[4] : null;
                $message = $args[5] ?? null;
                $oldValues = $args[6] ?? null;
                $newValues = $args[7] ?? null;

                if (is_string($message) && $newValues === null) {
                    $newValues = ['message' => $message];
                } elseif (is_string($message) && is_array($newValues)) {
                    $newValues['message'] = $message;
                }
            }

            return static::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'user_id' => $userId,
                'event' => $event,
                'auditable_type' => $auditableType,
                'auditable_id' => $auditableId,
                'old_values' => is_array($oldValues) ? $oldValues : ($oldValues ? (array)$oldValues : null),
                'new_values' => is_array($newValues) ? $newValues : ($newValues ? (array)$newValues : null),
                'ip_address' => request() ? request()->ip() : null,
                'user_agent' => request() ? request()->userAgent() : null,
            ]);
        } catch (\Throwable $e) {
            report($e);
            return null;
        }
    }
}

