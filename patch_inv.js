const fs = require('fs');
let code = fs.readFileSync('backend/app/Http/Controllers/Api/V1/InventoryController.php', 'utf8');

if (!code.includes('use Illuminate\\Validation\\Rule;')) {
    code = code.replace(
        "use Illuminate\\Http\\Request;",
        "use Illuminate\\Http\\Request;\nuse Illuminate\\Validation\\Rule;"
    );
}

const ruleWarehouse = `'warehouse_id' => [
                'required', 'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->company_id);
                }),
            ],`;

const ruleVariant = `'product_variant_id' => [
                'required', 'integer',
                function ($attribute, $value, $fail) use ($request) {
                    $variant = \\App\\Models\\ProductVariant::with('product')->find($value);
                    if (!$variant || $variant->product->company_id != $request->company_id) {
                        $fail('The selected product variant is invalid.');
                    }
                }
            ],`;

const ruleStorage = `'storage_location_id' => [
                'nullable', 'integer',
                Rule::exists('storage_locations', 'id')->where(function ($query) use ($request) {
                    return $query->where('warehouse_id', $request->warehouse_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],`;

const ruleBatch = `'stock_batch_id' => [
                'nullable', 'integer',
                Rule::exists('stock_batches', 'id')->where(function ($query) use ($request) {
                    return $query->where('variant_id', $request->product_variant_id)
                                 ->where('company_id', $request->company_id);
                }),
            ],`;


function replaceRules(methodName) {
    let methodRegex = new RegExp(`public function ${methodName}\\(Request \\$request\\): JsonResponse\\s*\\{[\\s\\S]*?\\$data = \\$request->validate\\(\\[([\\s\\S]*?)\\]\\);`, 'g');
    let match = methodRegex.exec(code);
    if (match) {
        let rulesBlock = match[1];
        let newRulesBlock = rulesBlock
            .replace(/'warehouse_id' => 'required\|integer\|exists:warehouses,id',/, ruleWarehouse)
            .replace(/'product_variant_id' => 'required\|integer\|exists:product_variants,id',/, ruleVariant)
            .replace(/'storage_location_id' => 'nullable\|integer\|exists:storage_locations,id',/, ruleStorage)
            .replace(/'stock_batch_id' => 'nullable\|integer\|exists:stock_batches,id',/, ruleBatch);
        
        code = code.replace(match[0], match[0].replace(match[1], newRulesBlock));
    }
}

replaceRules('openingStock');
replaceRules('adjustStock');
replaceRules('recordDamageLoss');

fs.writeFileSync('backend/app/Http/Controllers/Api/V1/InventoryController.php', code);
