<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SystemBackup;
use App\Services\DatabaseBackupService;
use App\Services\DataResetService;
use App\Services\DemoDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class MaintenanceController extends Controller
{
    public function __construct(
        protected DatabaseBackupService $backupService,
        protected DataResetService $resetService,
        protected DemoDataService $demoService
    ) {}

    /**
     * Maintenance Center dashboard overview.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $companyId = $user?->company_id;

        $dbDriver = config('database.default', 'pgsql');
        $connConfig = config("database.connections.{$dbDriver}", []);
        $safeDbName = $connConfig['database'] ?? 'retailcore';

        $dbVersion = 'Unknown';
        try {
            if ($dbDriver === 'pgsql') {
                $versionRow = DB::select("SELECT version()");
                $dbVersion = $versionRow[0]->version ?? 'PostgreSQL';
            }
        } catch (\Throwable) {
            $dbVersion = 'PostgreSQL';
        }

        $backups = $this->backupService->listBackups($companyId, 10);
        $lastBackup = $backups[0] ?? null;
        $totalBackups = SystemBackup::count();

        $demoStatus = $this->demoService->hasDemoData($companyId);

        $isProduction = app()->environment('production') || config('app.env') === 'production';
        $allowDestructive = (bool) config('maintenance.allow_destructive_reset', false);
        $allowDemo = (bool) config('maintenance.allow_demo_in_production', false);

        return response()->json([
            'success' => true,
            'data' => [
                'database' => [
                    'driver' => $dbDriver,
                    'name' => $safeDbName,
                    'version' => $dbVersion,
                ],
                'environment' => [
                    'app_env' => config('app.env', 'production'),
                    'is_production' => $isProduction,
                    'allow_destructive_reset' => $allowDestructive,
                    'allow_demo_in_production' => $allowDemo,
                ],
                'backups' => [
                    'total_count' => $totalBackups,
                    'last_backup' => $lastBackup,
                    'recent' => $backups,
                ],
                'demo' => $demoStatus,
                'permissions' => [
                    'can_backup' => $user->hasRole('Super Admin') || $user->hasRole('Admin') || $user->hasPermission('maintenance.backup'),
                    'can_reset' => $user->hasRole('Super Admin'),
                    'can_demo' => $user->hasRole('Super Admin') || $user->hasRole('Admin') || $user->hasPermission('maintenance.demo'),
                    'can_demo_remove' => $user->hasRole('Super Admin'),
                ],
            ],
        ]);
    }

    /**
     * Trigger manual database backup.
     */
    public function createBackup(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin') && !$user->hasRole('Admin') && !$user->hasPermission('maintenance.backup')) {
            throw new AccessDeniedHttpException('Unauthorized. You lack permission to create database backups.');
        }

        $note = $request->input('note', 'Manual database backup via Maintenance Center');
        $backup = $this->backupService->createBackup($user, $user->company_id, $note);

        return response()->json([
            'success' => true,
            'message' => 'Database backup completed successfully.',
            'data' => [
                'id' => $backup->id,
                'filename' => $backup->filename,
                'file_size' => $backup->file_size,
                'file_size_human' => $this->backupService->formatFileSize($backup->file_size),
                'checksum' => $backup->checksum,
                'status' => $backup->status,
                'created_at' => $backup->created_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * List recent database backups.
     */
    public function listBackups(Request $request): JsonResponse
    {
        $limit = min((int) $request->input('limit', 20), 100);
        $backups = $this->backupService->listBackups($request->user()?->company_id, $limit);

        return response()->json([
            'success' => true,
            'data' => $backups,
        ]);
    }

    /**
     * Securely download database backup file.
     */
    public function downloadBackup(Request $request, int $id): Response
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin') && !$user->hasRole('Admin') && !$user->hasPermission('maintenance.backup')) {
            throw new AccessDeniedHttpException('Unauthorized. You lack permission to download database backups.');
        }

        $backup = $this->backupService->getBackup($id);
        if (!$backup) {
            abort(404, 'Backup record not found.');
        }

        return $this->backupService->downloadBackup($backup, $user);
    }

    /**
     * Preview record counts for data reset without deleting.
     */
    public function previewReset(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin')) {
            throw new AccessDeniedHttpException('Unauthorized. Data Reset preview requires Super Admin privileges.');
        }

        $preview = $this->resetService->previewReset($user->company_id, $user);

        return response()->json([
            'success' => true,
            'data' => $preview,
        ]);
    }

    /**
     * Execute destructive data reset with multi-step confirmation and safety backup.
     */
    public function executeReset(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin')) {
            throw new AccessDeniedHttpException('Unauthorized. Data Reset requires Super Admin privileges.');
        }

        $request->validate([
            'confirmation_text' => 'required|string',
            'mode' => 'nullable|string|in:TRANSACTIONAL_DATA,DEMO_DATA_RESET',
            'password' => 'nullable|string',
        ]);

        $mode = $request->input('mode', 'TRANSACTIONAL_DATA');
        $confirmationText = $request->input('confirmation_text');
        $password = $request->input('password');

        $result = $this->resetService->executeReset(
            $user,
            $user->company_id,
            $mode,
            $confirmationText,
            $password
        );

        return response()->json([
            'success' => true,
            'message' => 'Transactional data reset completed successfully.',
            'data' => $result,
        ]);
    }

    /**
     * Preview demo data dataset.
     */
    public function previewDemo(Request $request): JsonResponse
    {
        $size = $request->input('size', 'small');
        $preview = $this->demoService->previewDemo($size, $request->user()?->company_id, $request->user());

        return response()->json([
            'success' => true,
            'data' => $preview,
        ]);
    }

    /**
     * Insert realistic demonstration records.
     */
    public function insertDemo(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin') && !$user->hasRole('Admin') && !$user->hasPermission('maintenance.demo')) {
            throw new AccessDeniedHttpException('Unauthorized. You lack permission to insert demo data.');
        }

        $size = $request->input('size', 'small');
        $result = $this->demoService->insertDemo($user->company_id, $size, $user);

        return response()->json([
            'success' => $result['success'] ?? true,
            'message' => $result['message'],
            'data' => $result,
        ]);
    }

    /**
     * Remove demo data records safely.
     */
    public function removeDemo(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin')) {
            throw new AccessDeniedHttpException('Unauthorized. Removing demo data requires Super Admin privileges.');
        }

        $result = $this->demoService->removeDemo($user->company_id, $user);

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data' => $result,
        ]);
    }
}
