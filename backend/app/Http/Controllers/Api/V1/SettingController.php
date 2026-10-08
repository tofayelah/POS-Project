<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SystemSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SettingController extends Controller
{
    public function __construct(
        protected SystemSettingsService $settingsService
    ) {}

    /**
     * Get all settings or filter by query parameters.
     */
    public function index(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        $group = $request->query('group');
        if ($group) {
            if (!isset(SystemSettingsService::GROUPS[$group])) {
                return response()->json([
                    'success' => false,
                    'message' => "Unknown settings group: {$group}",
                ], 404);
            }

            $groupSettings = $this->settingsService->getGroupSettings($companyId, $group, $branchId, true);
            return response()->json([
                'success' => true,
                'data' => [
                    'group' => $group,
                    'settings' => $groupSettings,
                ],
            ]);
        }

        $allSettings = $this->settingsService->getAllSettings($companyId, $branchId, true);
        $groups = $this->settingsService->getGroups();

        return response()->json([
            'success' => true,
            'data' => [
                'groups' => $groups,
                'settings' => $allSettings,
            ],
        ]);
    }

    /**
     * Get metadata of all 20 logical setting groups.
     */
    public function getGroups(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->settingsService->getGroups(),
        ]);
    }

    /**
     * Show settings for a specific group.
     */
    public function showGroup(Request $request, string $group): JsonResponse
    {
        if (!isset(SystemSettingsService::GROUPS[$group])) {
            return response()->json([
                'success' => false,
                'message' => "Unknown settings group: {$group}",
            ], 404);
        }

        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        $settings = $this->settingsService->getGroupSettings($companyId, $group, $branchId, true);

        return response()->json([
            'success' => true,
            'data' => [
                'group' => $group,
                'meta' => SystemSettingsService::GROUPS[$group],
                'settings' => $settings,
            ],
        ]);
    }

    /**
     * Update settings for a specific group.
     */
    public function updateGroup(Request $request, string $group): JsonResponse
    {
        if (!isset(SystemSettingsService::GROUPS[$group])) {
            return response()->json([
                'success' => false,
                'message' => "Unknown settings group: {$group}",
            ], 404);
        }

        $user = $request->user();
        $this->authorizeGroupUpdate($user, $group);

        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        $payload = $request->input('settings', $request->all());
        if (isset($payload['settings']) && is_array($payload['settings'])) {
            $payload = $payload['settings'];
        }

        try {
            $updated = $this->settingsService->updateGroupSettings(
                $companyId,
                $group,
                $payload,
                $user?->id,
                $branchId
            );

            return response()->json([
                'success' => true,
                'message' => "Settings for {$group} updated successfully.",
                'data' => [
                    'group' => $group,
                    'settings' => $updated,
                ],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'The given settings data was invalid.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to save settings: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show single key within a group.
     */
    public function showKey(Request $request, string $group, string $key): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);

        $val = $this->settingsService->get($companyId, $group, $key, null, $branchId);

        return response()->json([
            'success' => true,
            'data' => [
                'group' => $group,
                'key' => $key,
                'value' => $val,
            ],
        ]);
    }

    /**
     * Update single key within a group.
     */
    public function updateKey(Request $request, string $group, string $key): JsonResponse
    {
        $user = $request->user();
        $this->authorizeGroupUpdate($user, $group);

        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);
        $value = $request->input('value');

        try {
            $setting = $this->settingsService->set(
                $companyId,
                $group,
                $key,
                $value,
                $user?->id,
                $branchId
            );

            return response()->json([
                'success' => true,
                'message' => "Setting {$group}.{$key} updated successfully.",
                'data' => [
                    'group' => $group,
                    'key' => $key,
                    'value' => $setting->typed_value,
                ],
            ]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update setting: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Preview next sequential document number without committing sequence increment.
     */
    public function previewNumbering(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|string',
        ]);

        $companyId = $this->resolveCompanyId($request);
        $branchId = $this->resolveBranchId($request);
        $type = $request->input('type');

        $preview = $this->settingsService->previewDocumentNumber($companyId, $type, $branchId);

        return response()->json([
            'success' => true,
            'data' => [
                'type' => $type,
                'preview' => $preview,
            ],
        ]);
    }

    /**
     * Get system and runtime information.
     */
    public function systemInfo(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->settingsService->getSystemInfo(),
        ]);
    }

    /**
     * Fallback for legacy update endpoint (PUT /api/v1/settings).
     */
    public function update(Request $request): JsonResponse
    {
        $group = $request->input('group', 'general');
        return $this->updateGroup($request, $group);
    }

    /**
     * Resolve effective company ID from request attributes or authenticated user.
     */
    protected function resolveCompanyId(Request $request): int
    {
        $companyId = $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->user()?->company_id;

        return (int) ($companyId ?: 1);
    }

    /**
     * Resolve optional branch ID from headers or query parameters.
     */
    protected function resolveBranchId(Request $request): ?int
    {
        $branchId = $request->header('X-Branch-ID')
            ?? $request->query('branch_id')
            ?? $request->input('branch_id');

        return $branchId ? (int) $branchId : null;
    }

    /**
     * Check if user is authorized to modify settings for a given group.
     */
    protected function authorizeGroupUpdate($user, string $group): void
    {
        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        if ($user->hasRole('Super Admin') || $user->hasRole('Admin')) {
            return;
        }

        $specificPermission = SystemSettingsService::GROUPS[$group]['permission'] ?? null;
        if ($specificPermission && $user->hasPermission($specificPermission)) {
            return;
        }

        if ($user->hasPermission('settings.update')) {
            // General update permission allowed for non-critical groups
            $criticalGroups = ['security', 'accounting', 'vat', 'maintenance', 'audit'];
            if (!in_array($group, $criticalGroups)) {
                return;
            }
        }

        abort(403, "Unauthorized. You lack permission to configure {$group} settings.");
    }
}
