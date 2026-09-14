<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Barcode;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class ProductService
{
    /**
     * Atomically create a Product along with its variants, attribute combinations, and barcodes.
     * Enforces ALL-SUCCESS or FULL-ROLLBACK transaction safety.
     */
    public function createProduct(array $data, ?int $userId = null): Product
    {
        return DB::transaction(function () use ($data, $userId) {
            $variantsData = $data['variants'] ?? [];
            unset($data['variants']);

            $data['created_by'] = $userId;
            $data['updated_by'] = $userId;

            $product = Product::create($data);

            $this->validateAndSyncVariants($product, $variantsData, $userId, isCreate: true);

            // Audit log
            AuditLog::create([
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'company_id' => $product->company_id,
                'user_id' => $userId,
                'event' => 'PRODUCT_CREATED',
                'auditable_type' => Product::class,
                'auditable_id' => $product->id,
                'new_values' => [
                    'name' => $product->name,
                    'product_type' => $product->product_type,
                    'variants_count' => count($variantsData),
                ],
            ]);

            return $product->load(['category', 'brand', 'unit', 'variants.attributeValues', 'variants.barcodes']);
        });
    }

    /**
     * Atomically update a product and its variants.
     */
    public function updateProduct(Product $product, array $data, ?int $userId = null): Product
    {
        return DB::transaction(function () use ($product, $data, $userId) {
            $oldValues = [
                'name' => $product->name,
                'category_id' => $product->category_id,
                'status' => $product->status,
            ];

            $variantsData = $data['variants'] ?? null;
            unset($data['variants']);

            $data['updated_by'] = $userId;
            $product->update($data);

            if ($variantsData !== null) {
                $this->validateAndSyncVariants($product, $variantsData, $userId, isCreate: false);
            }

            // Audit log
            AuditLog::create([
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'company_id' => $product->company_id,
                'user_id' => $userId,
                'event' => 'PRODUCT_UPDATED',
                'auditable_type' => Product::class,
                'auditable_id' => $product->id,
                'old_values' => $oldValues,
                'new_values' => [
                    'name' => $product->name,
                    'category_id' => $product->category_id,
                    'status' => $product->status,
                ],
            ]);

            return $product->load(['category', 'brand', 'unit', 'variants.attributeValues', 'variants.barcodes']);
        });
    }

    /**
     * Enforce combination uniqueness and SKU uniqueness across variants.
     */
    protected function validateAndSyncVariants(Product $product, array $variantsData, ?int $userId, bool $isCreate): void
    {
        $seenCombinations = [];
        $seenSkus = [];

        foreach ($variantsData as $index => $vData) {
            $sku = trim($vData['sku'] ?? '');
            if (in_array($sku, $seenSkus)) {
                throw new ConflictHttpException("Duplicate SKU '{$sku}' found in the request payload.");
            }
            $seenSkus[] = $sku;

            // Check attribute combinations
            $attrValueIds = $vData['attribute_value_ids'] ?? [];
            sort($attrValueIds); // Deterministic ordering
            $comboKey = implode('-', $attrValueIds);

            if (isset($seenCombinations[$comboKey])) {
                throw new ConflictHttpException("Duplicate attribute combination detected for variant '{$vData['variant_name']}'.");
            }
            $seenCombinations[$comboKey] = true;

            // Check SKU uniqueness in database
            $existingVariantQuery = ProductVariant::where('sku', $sku);
            if (! empty($vData['id'])) {
                $existingVariantQuery->where('id', '!=', $vData['id']);
            }
            if ($existingVariantQuery->exists()) {
                throw new ConflictHttpException("The SKU '{$sku}' is already in use by another product variant.");
            }

            // Check combination uniqueness in database
            $existingComboQuery = ProductVariant::where('product_id', $product->id)
                ->where('attribute_signature', $comboKey);
            if (! empty($vData['id'])) {
                $existingComboQuery->where('id', '!=', $vData['id']);
            }
            if ($existingComboQuery->exists()) {
                throw new ConflictHttpException("The attribute combination for variant '{$vData['variant_name']}' already exists in this product.");
            }

            // Save variant
            $variantAttributes = [
                'sku' => $sku,
                'variant_name' => $vData['variant_name'],
                'attribute_signature' => $comboKey,
                'cost_price' => $vData['cost_price'] ?? 0,
                'selling_price' => $vData['selling_price'] ?? 0,
                'wholesale_price' => $vData['wholesale_price'] ?? $vData['selling_price'] ?? 0,
                'mrp' => $vData['mrp'] ?? $vData['selling_price'] ?? 0,
                'tax_rate' => $vData['tax_rate'] ?? null,
                'status' => $vData['status'] ?? 'active',
                'updated_by' => $userId,
            ];

            if (! empty($vData['id'])) {
                $variant = ProductVariant::where('product_id', $product->id)->findOrFail($vData['id']);
                $variant->update($variantAttributes);
            } else {
                $variantAttributes['product_id'] = $product->id;
                $variantAttributes['created_by'] = $userId;
                $variant = ProductVariant::create($variantAttributes);
            }

            // Sync attribute values
            if (! empty($attrValueIds)) {
                $syncPayload = [];
                $attrValues = \App\Models\AttributeValue::whereIn('id', $attrValueIds)->get();
                foreach ($attrValues as $av) {
                    $syncPayload[$av->id] = ['attribute_id' => $av->attribute_id];
                }
                $variant->attributeValues()->sync($syncPayload);
            }

            // Save barcodes if provided
            if (! empty($vData['barcodes'])) {
                foreach ($vData['barcodes'] as $bData) {
                    $bCode = trim($bData['barcode'] ?? '');
                    if (empty($bCode)) continue;

                    // Barcode conflict check
                    $existingBarcode = Barcode::where('barcode', $bCode);
                    if (! empty($bData['id'])) {
                        $existingBarcode->where('id', '!=', $bData['id']);
                    }
                    if ($existingBarcode->exists()) {
                        throw new ConflictHttpException("The barcode '{$bCode}' is already assigned to another variant.");
                    }

                    if (! empty($bData['is_primary'])) {
                        Barcode::where('product_variant_id', $variant->id)->update(['is_primary' => false]);
                    }

                    Barcode::updateOrCreate(
                        ['product_variant_id' => $variant->id, 'barcode' => $bCode],
                        [
                            'barcode_type' => $bData['barcode_type'] ?? 'EAN',
                            'is_primary' => ! empty($bData['is_primary']),
                            'status' => $bData['status'] ?? 'active',
                            'created_by' => $userId,
                            'updated_by' => $userId,
                        ]
                    );
                }
            }
        }
    }
}
