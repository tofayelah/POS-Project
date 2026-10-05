<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoleController extends Controller
{
    /**
     * List all roles with permission count and user count.
     */
    public function index(Request $request)
    {
        $query = Role::withCount(['permissions', 'users'])->with('permissions:id,name,group');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $roles = $query->orderBy('id')->get();

        return response()->json([
            'success' => true,
            'data' => $roles,
        ]);
    }

    /**
     * Get single role details with permissions and users count.
     */
    public function show($id)
    {
        $role = Role::withCount(['users', 'permissions'])
            ->with(['permissions:id,name,group'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $role,
        ]);
    }

    /**
     * Create a new role.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name',
            'description' => 'nullable|string|max:255',
            'permission_ids' => 'nullable|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $user = $request->user();
            $companyId = $user ? ($user->company_id ?? $user->companies()->first()?->id) : null;

            $role = Role::create([
                'name' => trim($validated['name']),
                'description' => isset($validated['description']) ? trim($validated['description']) : null,
            ]);

            if (!empty($validated['permission_ids'])) {
                $role->permissions()->sync($validated['permission_ids']);
            }

            AuditLog::log($companyId, $user?->id, 'ROLE_CREATED', $role->id, 'Role', "Created role {$role->name}");

            return response()->json([
                'success' => true,
                'message' => 'Role created successfully.',
                'data' => $role->load(['permissions:id,name,group'])->loadCount(['permissions', 'users']),
            ], 201);
        });
    }

    /**
     * Update an existing role.
     */
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name,' . $role->id,
            'description' => 'nullable|string|max:255',
            'permission_ids' => 'nullable|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        // System role protection: "Super Admin" name cannot be altered
        if (strtolower($role->name) === 'super admin' && strtolower(trim($validated['name'])) !== 'super admin') {
            return response()->json([
                'success' => false,
                'message' => 'System protected role "Super Admin" cannot be renamed.',
            ], 422);
        }

        return DB::transaction(function () use ($role, $validated, $request) {
            $user = $request->user();
            $companyId = $user ? ($user->company_id ?? $user->companies()->first()?->id) : null;

            $oldValues = $role->only(['name', 'description']);

            $role->update([
                'name' => trim($validated['name']),
                'description' => isset($validated['description']) ? trim($validated['description']) : null,
            ]);

            if (array_key_exists('permission_ids', $validated)) {
                $role->permissions()->sync($validated['permission_ids'] ?? []);
            }

            AuditLog::log(
                $companyId,
                $user?->id,
                'ROLE_UPDATED',
                $role->id,
                'Role',
                "Updated role {$role->name}",
                $oldValues,
                $role->only(['name', 'description'])
            );

            return response()->json([
                'success' => true,
                'message' => 'Role updated successfully.',
                'data' => $role->fresh(['permissions:id,name,group'])->loadCount(['permissions', 'users']),
            ]);
        });
    }

    /**
     * Delete an existing role (with safety protections).
     */
    public function destroy(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        // Protected system roles cannot be deleted
        if (in_array(strtolower($role->name), ['super admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => "Protected system role '{$role->name}' cannot be deleted.",
            ], 422);
        }

        // Active user assignment protection
        $assignedUserCount = $role->users()->count();
        if ($assignedUserCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete role '{$role->name}' because it is assigned to {$assignedUserCount} user(s). Reassign users first.",
            ], 422);
        }

        return DB::transaction(function () use ($role, $request) {
            $user = $request->user();
            $companyId = $user ? ($user->company_id ?? $user->companies()->first()?->id) : null;

            $roleName = $role->name;
            $roleId = $role->id;

            $role->permissions()->detach();
            $role->delete();

            AuditLog::log($companyId, $user?->id, 'ROLE_DELETED', $roleId, 'Role', "Deleted role {$roleName}");

            return response()->json([
                'success' => true,
                'message' => "Role '{$roleName}' deleted successfully.",
            ]);
        });
    }

    /**
     * Get permissions assigned to a role.
     */
    public function permissions($id)
    {
        $role = Role::with('permissions:id,name,group')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $role->permissions,
        ]);
    }

    /**
     * Sync permissions to a role.
     */
    public function syncPermissions(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'permission_ids' => 'present|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        return DB::transaction(function () use ($role, $validated, $request) {
            $user = $request->user();
            $companyId = $user ? ($user->company_id ?? $user->companies()->first()?->id) : null;

            $oldPerms = $role->permissions()->pluck('name')->toArray();

            $role->permissions()->sync($validated['permission_ids']);

            $newPerms = $role->fresh('permissions')->permissions->pluck('name')->toArray();

            AuditLog::log(
                $companyId,
                $user?->id,
                'ROLE_PERMISSIONS_SYNCED',
                $role->id,
                'Role',
                "Synced permissions for role {$role->name} (" . count($newPerms) . " permissions)",
                ['permissions' => $oldPerms],
                ['permissions' => $newPerms]
            );

            return response()->json([
                'success' => true,
                'message' => "Permissions updated for role '{$role->name}'.",
                'data' => $role->fresh('permissions:id,name,group'),
            ]);
        });
    }
}
