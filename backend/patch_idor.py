import os
import re

files_to_patch = {
    'backend/app/Http/Controllers/Api/V1/BrandController.php': 'brand',
    'backend/app/Http/Controllers/Api/V1/ProductController.php': 'product',
    'backend/app/Http/Controllers/Api/V1/UnitController.php': 'unit',
    'backend/app/Http/Controllers/Api/V1/InventoryController.php': 'inventory',
    'backend/app/Http/Controllers/Api/V1/TransferController.php': 'transfer',
    'backend/app/Http/Controllers/Api/V1/AttributeController.php': 'attribute',
    'backend/app/Http/Controllers/Api/V1/CategoryController.php': 'category'
}

for file, var_name in files_to_patch.items():
    if not os.path.exists(file):
        continue
    with open(file, 'r') as f:
        content = f.read()

    # Match public function show(Brand $brand)
    # Match public function update(BrandRequest $request, Brand $brand)
    # Match public function destroy(Request $request, Brand $brand)
    
    # We will just insert the abort_if right after the opening brace of show, update, destroy.
    # Note: the parameter name is usually the same as var_name, or var_name.
    # e.g., `public function show(Brand $brand)`
    
    def add_abort(match):
        func_sig = match.group(1)
        # Try to find the exact variable name if it's there
        return f"{func_sig}\n        abort_if(${var_name}->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');"
        
    content = re.sub(rf"(public function show\([^)]+\${var_name}[^)]*\)(?:\s*:\s*JsonResponse)?\s*{{)", add_abort, content)
    content = re.sub(rf"(public function update\([^)]+\${var_name}[^)]*\)(?:\s*:\s*JsonResponse)?\s*{{)", add_abort, content)
    content = re.sub(rf"(public function destroy\([^)]+\${var_name}[^)]*\)(?:\s*:\s*JsonResponse)?\s*{{)", add_abort, content)

    with open(file, 'w') as f:
        f.write(content)

print("Done patching IDOR.")
