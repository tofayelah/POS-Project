<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
class AuditLogController extends Controller {
    public function index() { return response()->json(['success' => true, 'data' => []]); }
}
