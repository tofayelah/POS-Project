<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Whitelist of allowed sortable columns to prevent SQL injection.
     */
    protected array $allowedSortFields = ['created_at', 'id', 'event'];

    /**
     * Sensitive keys that must be redacted from audit payload responses.
     */
    protected array $sensitiveKeys = [
        'password',
        'password_hash',
        'password_confirmation',
        'token',
        'access_token',
        'refresh_token',
        'remember_token',
        'secret',
        'private_key',
        'api_key',
        'card_number',
        'cvv',
        'authorization',
    ];

    /**
     * List audit logs with server-side pagination, filtering, search, and tenant isolation.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->hasRole('Super Admin');

        // Tenant scope resolution
        $userCompanyIds = [];
        if ($user) {
            $userCompanyIds = $user->companies()->pluck('companies.id')->toArray();
            if ($user->company_id && !in_array((int)$user->company_id, $userCompanyIds)) {
                $userCompanyIds[] = (int)$user->company_id;
            }
        }

        $query = AuditLog::with(['user:id,name,email', 'company:id,name,code']);

        // Tenant Boundary Enforcement
        if (!$isSuperAdmin) {
            if ($request->filled('company_id')) {
                $requestedCompanyId = (int)$request->input('company_id');
                if (!in_array($requestedCompanyId, $userCompanyIds)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Forbidden: You do not have access to this company\'s audit logs.',
                    ], 403);
                }
                $query->where('company_id', $requestedCompanyId);
            } else {
                $query->whereIn('company_id', $userCompanyIds);
            }
        } elseif ($request->filled('company_id')) {
            $query->where('company_id', (int)$request->input('company_id'));
        }

        // User filter
        if ($request->filled('user_id')) {
            $query->where('user_id', (int)$request->input('user_id'));
        }

        // Action/Event filter
        if ($request->filled('action')) {
            $query->where('event', trim($request->input('action')));
        } elseif ($request->filled('event')) {
            $query->where('event', trim($request->input('event')));
        }

        // Module filter (maps to event prefix or model class)
        if ($request->filled('module')) {
            $module = trim($request->input('module'));
            $query->where(function ($q) use ($module) {
                $q->where('auditable_type', 'like', "%{$module}%")
                  ->orWhere('event', 'like', strtoupper($module) . '%');
            });
        }

        // Entity type filter
        if ($request->filled('entity_type')) {
            $entityType = trim($request->input('entity_type'));
            $query->where('auditable_type', 'like', "%{$entityType}%");
        }

        // Entity ID filter
        if ($request->filled('entity_id')) {
            $query->where('auditable_id', (int)$request->input('entity_id'));
        }

        // Date range filter
        if ($request->filled('date_from') || $request->filled('date_to')) {
            $validated = $request->validate([
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
            ]);

            if (!empty($validated['date_from'])) {
                $query->where('created_at', '>=', Carbon::parse($validated['date_from'])->startOfDay());
            }

            if (!empty($validated['date_to'])) {
                $query->where('created_at', '<=', Carbon::parse($validated['date_to'])->endOfDay());
            }
        }

        // Free-text Search
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('event', 'like', "%{$search}%")
                  ->orWhere('auditable_type', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });

                if (is_numeric($search)) {
                    $q->orWhere('auditable_id', (int)$search);
                }
            });
        }

        // Safe Whitelisted Ordering
        $sort = $request->input('sort', 'created_at');
        if (!in_array($sort, $this->allowedSortFields, true)) {
            $sort = 'created_at';
        }

        $direction = strtolower($request->input('direction', 'desc'));
        if (!in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }

        $query->orderBy($sort, $direction)->orderBy('id', 'desc');

        // Bounded Pagination
        $perPage = (int)$request->input('per_page', 25);
        $perPage = max(5, min(100, $perPage));

        $paginator = $query->paginate($perPage);

        // Sanitize sensitive values in results
        $items = collect($paginator->items())->map(function ($log) {
            $log->old_values = $this->maskSensitiveData($log->old_values);
            $log->new_values = $this->maskSensitiveData($log->new_values);
            return $log;
        });

        return response()->json([
            'success' => true,
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * Get single audit log record with full before/after payload and metadata.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->hasRole('Super Admin');

        $log = AuditLog::with(['user:id,name,email', 'company:id,name,code'])->findOrFail($id);

        // Tenant Isolation Check
        if (!$isSuperAdmin) {
            $userCompanyIds = $user->companies()->pluck('companies.id')->toArray();
            if ($user->company_id && !in_array((int)$user->company_id, $userCompanyIds)) {
                $userCompanyIds[] = (int)$user->company_id;
            }

            if ($log->company_id && !in_array((int)$log->company_id, $userCompanyIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Audit log record not found.',
                ], 404);
            }
        }

        // Mask sensitive data in detailed response
        $log->old_values = $this->maskSensitiveData($log->old_values);
        $log->new_values = $this->maskSensitiveData($log->new_values);

        return response()->json([
            'success' => true,
            'data' => $log,
        ]);
    }

    /**
     * Audit logs are append-only. Mutations are strictly rejected.
     */
    public function store()
    {
        return response()->json([
            'success' => false,
            'message' => 'Method Not Allowed: Audit logs are append-only and cannot be created manually via API.',
        ], 405);
    }

    public function update()
    {
        return response()->json([
            'success' => false,
            'message' => 'Method Not Allowed: Audit logs are immutable and cannot be updated.',
        ], 405);
    }

    public function destroy()
    {
        return response()->json([
            'success' => false,
            'message' => 'Method Not Allowed: Audit logs are immutable and cannot be deleted.',
        ], 405);
    }

    /**
     * Recursively masks sensitive fields (passwords, tokens, keys) in audit values.
     */
    protected function maskSensitiveData($data)
    {
        if (!is_array($data)) {
            return $data;
        }

        $masked = [];
        foreach ($data as $key => $val) {
            if (is_string($key) && in_array(strtolower($key), $this->sensitiveKeys, true)) {
                $masked[$key] = '********';
            } elseif (is_array($val)) {
                $masked[$key] = $this->maskSensitiveData($val);
            } else {
                $masked[$key] = $val;
            }
        }

        return $masked;
    }
}
