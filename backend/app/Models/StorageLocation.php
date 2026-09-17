<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class StorageLocation extends Model {
    protected $guarded = [];
    public function warehouse() { return $this->belongsTo(Warehouse::class); }
    public function inventoryBatches() { return $this->hasMany(InventoryBatch::class); }
}
