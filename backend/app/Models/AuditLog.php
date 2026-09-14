<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AuditLog extends Model {
    protected $guarded = ['id'];
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];
    public function auditable() { return $this->morphTo(); }
    public function user() { return $this->belongsTo(User::class); }
}
