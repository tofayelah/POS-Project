import os
import re

files_to_patch = [
    'backend/app/Http/Controllers/Api/V1/BrandController.php',
    'backend/app/Http/Controllers/Api/V1/ProductController.php',
    'backend/app/Http/Controllers/Api/V1/UnitController.php',
    'backend/app/Http/Controllers/Api/V1/InventoryController.php',
    'backend/app/Http/Controllers/Api/V1/TransferController.php',
    'backend/app/Http/Controllers/Api/V1/AttributeController.php',
    'backend/app/Http/Controllers/Api/V1/CategoryController.php'
]

for file in files_to_patch:
    if not os.path.exists(file):
        continue
    with open(file, 'r') as f:
        content = f.read()

    # Replace $request->input('company_id') with $request->attributes->get('company_id')
    content = content.replace("$request->input('company_id')", "$request->attributes->get('company_id')")
    
    # Optional: if they use $request->filled('company_id'), we might want to just enforce it always.
    # Actually, we should enforce it for all queries. Let's see if we can just leave it as attributes->get,
    # but wait, if it's conditional, it means it's an optional filter. 
    # Let's fix the conditionals: if ($request->filled('company_id')) is now useless because it's always in attributes.
    content = re.sub(r"if \(\$request->filled\('company_id'\)\) \{\s*\$query->where\('company_id',\s*\$request->attributes->get\('company_id'\)\);\s*\}", 
                     "\$query->where('company_id', \$request->attributes->get('company_id'));", content)

    with open(file, 'w') as f:
        f.write(content)

print("Done patching.")
