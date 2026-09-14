<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class WarehouseController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => []]);
    }

    public function show($id)
    {
        return response()->json(['success' => true, 'data' => ['id' => (int) $id]]);
    }

    public function store(Request $request)
    {
        return response()->json(['success' => true, 'message' => 'Warehouse created.'], 201);
    }

    public function update(Request $request, $id)
    {
        return response()->json(['success' => true, 'message' => 'Warehouse updated.']);
    }

    public function destroy($id)
    {
        return response()->json(['success' => true, 'message' => 'Warehouse deleted.']);
    }
}
