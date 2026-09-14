#!/bin/bash
cat << 'PHP_EOF' > backend/app/Http/Controllers/Api/V1/AuthController.php
<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
class AuthController extends Controller {
    public function login(Request $request) {
        return response()->json(['success' => false, 'message' => 'Not implemented static stub'], 501);
    }
    public function logout(Request $request) {
        return response()->json(['success' => true]);
    }
    public function me(Request $request) {
        return response()->json(['success' => true, 'data' => []]);
    }
}
PHP_EOF

cat << 'PHP_EOF' > backend/app/Http/Controllers/Api/V1/UserController.php
<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
class UserController extends Controller {
    public function index() { return response()->json(['success' => true, 'data' => []]); }
}
PHP_EOF

cat << 'PHP_EOF' > backend/app/Http/Controllers/Api/V1/RoleController.php
<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
class RoleController extends Controller {
    public function index() { return response()->json(['success' => true, 'data' => []]); }
}
PHP_EOF

cat << 'PHP_EOF' > backend/app/Http/Controllers/Api/V1/BusinessUnitController.php
<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
class BusinessUnitController extends Controller {
    public function index() { return response()->json(['success' => true, 'data' => []]); }
}
PHP_EOF

cat << 'PHP_EOF' > backend/app/Http/Controllers/Api/V1/BranchController.php
<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
class BranchController extends Controller {
    public function index() { return response()->json(['success' => true, 'data' => []]); }
}
PHP_EOF

cat << 'PHP_EOF' > backend/app/Http/Controllers/Api/V1/WarehouseController.php
<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
class WarehouseController extends Controller {
    public function index() { return response()->json(['success' => true, 'data' => []]); }
}
PHP_EOF

cat << 'PHP_EOF' > backend/app/Http/Controllers/Api/V1/SettingController.php
<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
class SettingController extends Controller {
    public function index() { return response()->json(['success' => true, 'data' => []]); }
    public function update() { return response()->json(['success' => true]); }
}
PHP_EOF

cat << 'PHP_EOF' > backend/app/Http/Controllers/Api/V1/AuditLogController.php
<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
class AuditLogController extends Controller {
    public function index() { return response()->json(['success' => true, 'data' => []]); }
}
PHP_EOF

cat << 'PHP_EOF' > backend/app/Http/Controllers/Api/V1/DashboardController.php
<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
class DashboardController extends Controller {
    public function metrics() { return response()->json(['success' => true, 'data' => []]); }
}
PHP_EOF
