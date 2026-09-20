const fs = require('fs');
let code = fs.readFileSync('backend/app/Http/Controllers/Api/V1/StorageLocationController.php', 'utf8');

code = code.replace(
    "'warehouse_id' => 'required|exists:warehouses,id',",
    `'warehouse_id' => [
                'required',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($request) {
                    return $query->where('company_id', $request->attributes->get('company_id'));
                }),
            ],`
);

fs.writeFileSync('backend/app/Http/Controllers/Api/V1/StorageLocationController.php', code);
