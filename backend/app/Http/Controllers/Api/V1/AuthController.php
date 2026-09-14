<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authenticate user and issue Sanctum token.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::with(['roles.permissions'])->where('email', $validated['email'])->first();

        // Guard against timing / enumeration attacks: verify hash if user exists
        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ], 401);
        }

        if ($user->status === 'inactive') {
            return response()->json([
                'success' => false,
                'message' => 'Your account is inactive. Please contact an administrator.',
            ], 403);
        }

        $user->update([
            'last_login_at' => now(),
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        $permissions = $user->roles
            ? $user->roles->flatMap(fn($role) => $role->permissions)->pluck('name')->unique()->values()->all()
            : [];

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'uuid' => $user->uuid,
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status,
                    'roles' => $user->roles ? $user->roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name]) : [],
                    'permissions' => $permissions,
                ],
                'token' => $token,
            ],
        ], 200);
    }

    /**
     * Revoke authenticated Sanctum token.
     */
    public function logout(Request $request)
    {
        if ($request->user()) {
            $request->user()->currentAccessToken()?->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ], 200);
    }

    /**
     * Get authenticated user profile.
     */
    public function me(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $user->loadMissing(['roles.permissions']);

        $permissions = $user->roles
            ? $user->roles->flatMap(fn($role) => $role->permissions)->pluck('name')->unique()->values()->all()
            : [];

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'uuid' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'roles' => $user->roles ? $user->roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name]) : [],
                'permissions' => $permissions,
            ],
        ], 200);
    }
}

