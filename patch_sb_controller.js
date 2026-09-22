const fs = require('fs');
let code = fs.readFileSync('backend/app/Http/Controllers/Api/V1/StockBatchController.php', 'utf8');

code = code.replace(
    "'product_id' => 'required|exists:products,id',",
    `'product_id' => [
                'required',
                Rule::exists('products', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->attributes->get('company_id'));
                }),
            ],`
);

code = code.replace(
    "'variant_id' => 'required|exists:product_variants,id',",
    `'variant_id' => [
                'required',
                Rule::exists('product_variants', 'id')->where(function ($query) use ($request) {
                    return $query->where('product_id', $request->product_id);
                }),
            ],`
);

code = code.replace(
    "'supplier_id' => 'nullable|exists:suppliers,id',",
    `'supplier_id' => [
                'nullable',
                Rule::exists('suppliers', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->attributes->get('company_id'));
                }),
            ],`
);

fs.writeFileSync('backend/app/Http/Controllers/Api/V1/StockBatchController.php', code);
