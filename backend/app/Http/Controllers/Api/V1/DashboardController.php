<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
class DashboardController extends Controller {
    public function metrics() { return response()->json(['success' => true, 'data' => []]); }
}
