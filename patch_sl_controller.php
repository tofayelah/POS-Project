<?php
$content = file_get_contents('backend/app/Http/Controllers/Api/V1/StorageLocationController.php');
$content = str_replace(
    "'warehouse_id' => 'required|exists:warehouses,id',",
    "'warehouse_id' => [
                'required',
                Rule::exists('warehouses', 'id')->where(function (\$query) use (\$request) {
                    return \$query->where('company_id', \$request->attributes->get('company_id'));
                }),
            ],",
    $content
);
file_put_contents('backend/app/Http/Controllers/Api/V1/StorageLocationController.php', $content);
