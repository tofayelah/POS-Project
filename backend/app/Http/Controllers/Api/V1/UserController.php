<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $companyId = $request->query('company_id')
            ?? $request->input('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->attributes->get('company_id');

        if ($companyId) {
            if (!$currentUser->hasRole('Super Admin') && !$currentUser->hasCompanyAccess($companyId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden: You do not have access to this company.'
                ], 403);
            }

            $company = Company::find($companyId);
            if (!$company) {
                return response()->json(['success' => false, 'message' => 'Company not found.'], 404);
            }

            $query = $company->users()->with(['roles:id,name', 'companies:id,name,code']);
        } else {
            if ($currentUser->hasRole('Super Admin')) {
                $query = User::with(['roles:id,name', 'companies:id,name,code']);
            } else {
                $companyIds = $currentUser->companies()->pluck('companies.id');
                $query = User::whereHas('companies', function ($q) use ($companyIds) {
                    $q->whereIn('companies.id', $companyIds);
                })->with(['roles:id,name', 'companies:id,name,code']);
            }
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $users = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    public function show(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $targetUser = User::with([
            'roles:id,name',
            'companies:id,name,code',
            'businessUnits:id,name,code',
            'branches:id,name,code',
            'warehouses:id,name,code'
        ])->findOrFail($id);

        if (!$currentUser->hasRole('Super Admin')) {
            $myCompanyIds = $currentUser->companies()->pluck('companies.id')->toArray();
            $targetCompanyIds = $targetUser->companies()->pluck('companies.id')->toArray();

            if (empty(array_intersect($myCompanyIds, $targetCompanyIds))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden: You do not have access to this user.'
                ], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $targetUser
        ]);
    }

    public function store(Request $request)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'nullable|string',
            'role_id' => 'nullable|exists:roles,id',
            'company_id' => 'nullable|exists:companies,id',
            'status' => 'nullable|in:active,inactive',
        ]);

        $targetCompanyId = $validated['company_id']
            ?? $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? ($currentUser->companies()->first()?->id);

        if (!$currentUser->hasRole('Super Admin')) {
            if (!$targetCompanyId || !$currentUser->hasCompanyAccess($targetCompanyId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden: Cannot create user in unauthorized company.'
                ], 403);
            }
        }

        $user = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => trim($validated['name']),
            'email' => trim(strtolower($validated['email'])),
            'password' => Hash::make($validated['password']),
            'status' => $validated['status'] ?? 'active',
        ]);

        if (!empty($validated['role']) || !empty($validated['role_id'])) {
            $role = !empty($validated['role'])
                ? Role::where('name', $validated['role'])->first()
                : Role::find($validated['role_id']);
            if ($role) {
                if ($role->name === 'Super Admin' && !$currentUser->hasRole('Super Admin')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Forbidden: Only Super Admins can assign the Super Admin role.'
                    ], 403);
                }
                $user->roles()->attach($role->id);
            }
        }

        if ($targetCompanyId) {
            $user->companies()->attach($targetCompanyId);
        }

        return response()->json([
            'success' => true,
            'message' => 'User created successfully.',
            'data' => $user->load(['roles:id,name', 'companies:id,name,code'])
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $targetUser = User::findOrFail($id);

        if (!$currentUser->hasRole('Super Admin')) {
            if ($targetUser->hasRole('Super Admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden: Only Super Admins can modify a Super Admin user.'
                ], 403);
            }

            $myCompanyIds = $currentUser->companies()->pluck('companies.id')->toArray();
            $targetCompanyIds = $targetUser->companies()->pluck('companies.id')->toArray();

            if (empty(array_intersect($myCompanyIds, $targetCompanyIds))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden: You cannot modify a user from another company.'
                ], 403);
            }
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255|unique:users,email,' . $targetUser->id,
            'password' => 'nullable|string|min:6',
            'status' => 'nullable|in:active,inactive',
            'role' => 'nullable|string',
            'role_id' => 'nullable|exists:roles,id',
        ]);

        $updateData = [];
        if (!empty($validated['name'])) {
            $updateData['name'] = trim($validated['name']);
        }
        if (!empty($validated['email'])) {
            $updateData['email'] = trim(strtolower($validated['email']));
        }
        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }
        if (isset($validated['status'])) {
            $updateData['status'] = $validated['status'];
        }

        if (!empty($updateData)) {
            $targetUser->update($updateData);
        }

        if (array_key_exists('role', $validated) || array_key_exists('role_id', $validated)) {
            $role = !empty($validated['role'])
                ? Role::where('name', $validated['role'])->first()
                : (isset($validated['role_id']) ? Role::find($validated['role_id']) : null);
            if ($role) {
                if ($role->name === 'Super Admin' && !$currentUser->hasRole('Super Admin')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Forbidden: Only Super Admins can assign the Super Admin role.'
                    ], 403);
                }
                $targetUser->roles()->sync([$role->id]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'data' => $targetUser->fresh(['roles:id,name', 'companies:id,name,code'])
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $targetUser = User::findOrFail($id);

        if ($currentUser->id === $targetUser->id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete your own account.'
            ], 422);
        }

        if (!$currentUser->hasRole('Super Admin')) {
            if ($targetUser->hasRole('Super Admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden: Only Super Admins can delete a Super Admin user.'
                ], 403);
            }

            $myCompanyIds = $currentUser->companies()->pluck('companies.id')->toArray();
            $targetCompanyIds = $targetUser->companies()->pluck('companies.id')->toArray();

            if (empty(array_intersect($myCompanyIds, $targetCompanyIds))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden: You cannot delete a user from another company.'
                ], 403);
            }
        }

        $targetUser->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully.'
        ]);
    }

    public function companyUsers(Request $request, $companyId)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        if (!$currentUser->hasRole('Super Admin') && !$currentUser->hasCompanyAccess($companyId)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: You do not have access to this company.'
            ], 403);
        }

        $company = Company::findOrFail($companyId);
        $users = $company->users()->with(['roles:id,name', 'companies:id,name,code'])->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    public function assignCompanyUser(Request $request, $companyId)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        if (!$currentUser->hasRole('Super Admin') && !$currentUser->hasCompanyAccess($companyId)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: You do not have access to manage this company.'
            ], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'nullable|string',
            'role_id' => 'nullable|exists:roles,id',
        ]);

        $company = Company::findOrFail($companyId);
        $targetUser = User::findOrFail($validated['user_id']);

        // Attach preserving other company assignments
        $company->users()->syncWithoutDetaching([$targetUser->id]);

        if (!empty($validated['role']) || !empty($validated['role_id'])) {
            $role = !empty($validated['role'])
                ? Role::where('name', $validated['role'])->first()
                : Role::find($validated['role_id']);
            if ($role) {
                $targetUser->roles()->syncWithoutDetaching([$role->id]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => "User '{$targetUser->name}' assigned to '{$company->name}'.",
            'data' => $targetUser->fresh(['roles:id,name', 'companies:id,name,code'])
        ]);
    }

    public function removeCompanyUser(Request $request, $companyId, $userId)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        if (!$currentUser->hasRole('Super Admin') && !$currentUser->hasCompanyAccess($companyId)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: You do not have access to manage this company.'
            ], 403);
        }

        $company = Company::findOrFail($companyId);
        $targetUser = User::findOrFail($userId);

        // Detach from this company only, preserving other company assignments
        $company->users()->detach($targetUser->id);

        return response()->json([
            'success' => true,
            'message' => "User '{$targetUser->name}' removed from '{$company->name}'.",
            'data' => $targetUser->fresh(['roles:id,name', 'companies:id,name,code'])
        ]);
    }

    public function assignCompanyAccess(Request $request)
    {
        $validated = $request->validate([
            'company_id' => 'required|exists:companies,id',
            'user_id' => 'required|exists:users,id',
            'role' => 'nullable|string',
            'role_id' => 'nullable|exists:roles,id',
        ]);

        return $this->assignCompanyUser($request, $validated['company_id']);
    }

    public function removeCompanyAccess(Request $request)
    {
        $validated = $request->validate([
            'company_id' => 'required|exists:companies,id',
            'user_id' => 'required|exists:users,id',
        ]);

        return $this->removeCompanyUser($request, $validated['company_id'], $validated['user_id']);
    }

    public function userRoles(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $targetUser = User::findOrFail($id);

        if (!$currentUser->hasRole('Super Admin')) {
            $myCompanyIds = $currentUser->companies()->pluck('companies.id')->toArray();
            $targetCompanyIds = $targetUser->companies()->pluck('companies.id')->toArray();

            if (empty(array_intersect($myCompanyIds, $targetCompanyIds))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden: You do not have access to this user.'
                ], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $targetUser->roles()->get(),
        ]);
    }

    public function syncUserRoles(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $targetUser = User::findOrFail($id);

        if (!$currentUser->hasRole('Super Admin')) {
            if ($targetUser->hasRole('Super Admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden: Only Super Admins can modify roles of a Super Admin user.'
                ], 403);
            }

            $myCompanyIds = $currentUser->companies()->pluck('companies.id')->toArray();
            $targetCompanyIds = $targetUser->companies()->pluck('companies.id')->toArray();

            if (empty(array_intersect($myCompanyIds, $targetCompanyIds))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden: You cannot modify roles for a user from another company.'
                ], 403);
            }
        }

        $validated = $request->validate([
            'role_ids' => 'present|array',
            'role_ids.*' => 'integer|exists:roles,id',
        ]);

        $superAdminRole = Role::where('name', 'Super Admin')->first();
        if ($superAdminRole && in_array($superAdminRole->id, $validated['role_ids']) && !$currentUser->hasRole('Super Admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: Only Super Admins can assign the Super Admin role.',
            ], 403);
        }
        if ($superAdminRole && $targetUser->roles()->where('roles.id', $superAdminRole->id)->exists()) {
            if (!in_array($superAdminRole->id, $validated['role_ids'])) {
                $otherSuperAdminCount = User::whereHas('roles', function ($q) use ($superAdminRole) {
                    $q->where('roles.id', $superAdminRole->id);
                })->where('id', '!=', $targetUser->id)->count();

                if ($otherSuperAdminCount === 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot remove Super Admin role from the only remaining Super Admin user in the system.',
                    ], 422);
                }
            }
        }

        return \Illuminate\Support\Facades\DB::transaction(function () use ($targetUser, $validated, $currentUser) {
            $companyId = $currentUser->company_id ?? $currentUser->companies()->first()?->id;
            $oldRoles = $targetUser->roles()->pluck('name')->toArray();

            $targetUser->roles()->sync($validated['role_ids']);

            $newRoles = $targetUser->fresh('roles')->roles->pluck('name')->toArray();

            \App\Models\AuditLog::log(
                $companyId,
                $currentUser->id,
                'USER_ROLES_SYNCED',
                $targetUser->id,
                'User',
                "Updated roles for user {$targetUser->name} (" . implode(', ', $newRoles) . ")",
                ['roles' => $oldRoles],
                ['roles' => $newRoles]
            );

            return response()->json([
                'success' => true,
                'message' => "Roles updated for user '{$targetUser->name}'.",
                'data' => $targetUser->fresh(['roles:id,name', 'companies:id,name,code']),
            ]);
        });
    }
}
