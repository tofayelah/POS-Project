<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
class SettingController extends Controller {
    public function index() { return response()->json(['success' => true, 'data' => []]); }
    public function update() { return response()->json(['success' => true]); }
}
