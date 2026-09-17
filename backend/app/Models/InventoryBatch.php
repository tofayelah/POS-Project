<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class InventoryBatch extends Model {
    protected $guarded = [];
    public function inventory() { return $this->belongsTo(Inventory::class); }
    public function stockBatch() { return $this->belongsTo(StockBatch::class); }
    public function storageLocation() { return $this->belongsTo(StorageLocation::class); }
}
