import os
import re

files_to_patch = {
    'backend/app/Http/Controllers/Api/V1/SupplierController.php': 'supplier',
    'backend/app/Http/Controllers/Api/V1/CustomerController.php': 'customer',
    'backend/app/Http/Controllers/Api/V1/ExpenseController.php': 'expense',
    'backend/app/Http/Controllers/Api/V1/SaleController.php': 'sale',
    'backend/app/Http/Controllers/Api/V1/PurchaseController.php': 'purchase',
    'backend/app/Http/Controllers/Api/V1/SalesReturnController.php': 'salesReturn',
    'backend/app/Http/Controllers/Api/V1/ExchangeController.php': 'exchange',
    'backend/app/Http/Controllers/Api/V1/PosSessionController.php': 'posSession'
}

for file, var_name in files_to_patch.items():
    if not os.path.exists(file):
        continue
    with open(file, 'r') as f:
        content = f.read()
    
    def add_abort(match):
        func_sig = match.group(1)
        if "abort_if(" in content[match.end():match.end()+150]:
            return func_sig
        return f"{func_sig}\n        abort_if(${var_name}->company_id !== request()->attributes->get('company_id'), 403, 'Unauthorized.');"
        
    content = re.sub(rf"(public function show\([^)]+\${var_name}[^)]*\)(?:\s*:\s*JsonResponse)?\s*{{)", add_abort, content)
    content = re.sub(rf"(public function update\([^)]+\${var_name}[^)]*\)(?:\s*:\s*JsonResponse)?\s*{{)", add_abort, content)
    content = re.sub(rf"(public function destroy\([^)]+\${var_name}[^)]*\)(?:\s*:\s*JsonResponse)?\s*{{)", add_abort, content)
    content = re.sub(rf"(public function approve\([^)]+\${var_name}[^)]*\)(?:\s*:\s*JsonResponse)?\s*{{)", add_abort, content)
    content = re.sub(rf"(public function complete\([^)]+\${var_name}[^)]*\)(?:\s*:\s*JsonResponse)?\s*{{)", add_abort, content)
    content = re.sub(rf"(public function void\([^)]+\${var_name}[^)]*\)(?:\s*:\s*JsonResponse)?\s*{{)", add_abort, content)

    with open(file, 'w') as f:
        f.write(content)

print("Done patching IDOR 2.")
