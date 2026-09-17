<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class StockBatch extends Model {
    protected $guarded = [];
    public function product() { return $this->belongsTo(Product::class); }
    public function variant() { return $this->belongsTo(ProductVariant::class); }
    public function supplier() { return $this->belongsTo(Supplier::class); }
    public function inventoryBatches() { return $this->hasMany(InventoryBatch::class); }
}
