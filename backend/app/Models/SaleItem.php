<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'product_id',
        'product_variant_id',
        'sku_snapshot',
        'barcode_snapshot',
        'product_name_snapshot',
        'variant_description_snapshot',
        'quantity',
        'unit_price',
        'discount',
        'tax',
        'line_total',
        'unit_cost_snapshot',
        'total_cost_snapshot',
    ];

    public function product() { return $this->belongsTo(Product::class); }
    public function variant() { return $this->belongsTo(ProductVariant::class, 'product_variant_id'); }
    public function sale() { return $this->belongsTo(Sale::class); }
}
