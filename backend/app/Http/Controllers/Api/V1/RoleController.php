<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index()
    {
        $roles = \App\Models\Role::with('permissions')->orderBy('id')->get();
        return response()->json(['success' => true, 'data' => $roles]);
    }

    public function show($id)
    {
        $role = \App\Models\Role::with('permissions')->findOrFail($id);
        return response()->json(['success' => true, 'data' => $role]);
    }

    public function store(Request $request)
    {
        return response()->json(['success' => true, 'message' => 'Role created.'], 201);
    }

    public function update(Request $request, $id)
    {
        return response()->json(['success' => true, 'message' => 'Role updated.']);
    }

    public function destroy($id)
    {
        return response()->json(['success' => true, 'message' => 'Role deleted.']);
    }
}
