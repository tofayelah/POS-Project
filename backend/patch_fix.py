import os

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

    content = content.replace("\\$query", "$query")
    content = content.replace("\\$request", "$request")

    with open(file, 'w') as f:
        f.write(content)

print("Done fixing backslashes.")
