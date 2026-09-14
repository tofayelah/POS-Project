<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class UserController extends Controller
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
        return response()->json(['success' => true, 'message' => 'User created.'], 201);
    }

    public function update(Request $request, $id)
    {
        return response()->json(['success' => true, 'message' => 'User updated.']);
    }

    public function destroy($id)
    {
        return response()->json(['success' => true, 'message' => 'User deleted.']);
    }
}
