<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    /**
     * List all permissions, optionally grouped by module.
     */
    public function index(Request $request)
    {
        $query = Permission::orderBy('group')->orderBy('name');

        if ($request->filled('group')) {
            $query->where('group', $request->input('group'));
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where('name', 'like', "%{$search}%");
        }

        $permissions = $query->get();

        if ($request->boolean('grouped')) {
            $grouped = $permissions->groupBy(function ($perm) {
                if (!empty($perm->group)) {
                    return $perm->group;
                }
                $parts = explode('.', $perm->name);
                return $parts[0] ?? 'general';
            });

            return response()->json([
                'success' => true,
                'data' => $grouped,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $permissions,
        ]);
    }
}
