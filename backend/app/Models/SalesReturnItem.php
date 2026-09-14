<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesReturnItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sales_return_id',
        'original_sale_item_id',
        'original_product_variant_id',
        'replacement_product_variant_id',
        'sku_snapshot',
        'barcode_snapshot',
        'product_name_snapshot',
        'variant_description_snapshot',
        'original_unit_price',
        'return_quantity',
        'return_unit_price',
        'discount',
        'tax',
        'refund_line_total',
        'condition',
        'inventory_action',
        'reason',
        'replacement_quantity',
        'replacement_unit_price',
        'replacement_line_total',
    ];

    public function salesReturn() { return $this->belongsTo(SalesReturn::class); }
    public function originalSaleItem() { return $this->belongsTo(SaleItem::class, 'original_sale_item_id'); }
    public function originalProductVariant() { return $this->belongsTo(ProductVariant::class, 'original_product_variant_id'); }
    public function replacementProductVariant() { return $this->belongsTo(ProductVariant::class, 'replacement_product_variant_id'); }
}
