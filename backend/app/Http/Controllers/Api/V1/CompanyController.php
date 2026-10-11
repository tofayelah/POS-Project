<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CompanyController extends Controller
{
    /**
     * Process logo file upload or Base64 data URL and save to server storage disk.
     */
    private function processLogoUpload(Request $request, ?Company $company = null): ?string
    {
        // 1. Handle multipart file upload
        $file = $request->file('logo') ?? $request->file('logo_file') ?? $request->file('image') ?? $request->file('file');

        if ($file) {
            $allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
            $mime = $file->getMimeType();
            $clientExt = strtolower($file->getClientOriginalExtension() ?: '');

            if (!in_array($mime, $allowedMimes) && !in_array($clientExt, ['png', 'jpg', 'jpeg', 'webp'])) {
                throw ValidationException::withMessages([
                    'logo' => ['Invalid image format. Allowed formats: PNG, JPG, JPEG, WebP.']
                ]);
            }

            if ($file->getSize() > 2048 * 1024) {
                throw ValidationException::withMessages([
                    'logo' => ['File size exceeds 2 MB limit. Please select a smaller logo image.']
                ]);
            }

            $ext = $clientExt ?: 'png';
            if ($ext === 'jpeg') $ext = 'jpg';

            $companyIdStr = $company ? (string) $company->id : 'new';
            $filename = 'company_' . $companyIdStr . '_' . time() . '_' . Str::random(8) . '.' . $ext;

            // Remove old logo file if stored on disk
            if ($company && $company->logo_path && str_starts_with($company->logo_path, '/storage/logos/')) {
                $oldRelative = str_replace('/storage/', '', $company->logo_path);
                Storage::disk('public')->delete($oldRelative);
                if (file_exists(public_path('storage/logos/' . basename($company->logo_path)))) {
                    @unlink(public_path('storage/logos/' . basename($company->logo_path)));
                }
            }

            $storedPath = $file->storeAs('logos', $filename, 'public');

            // Mirror file to public_path for instant direct static access
            try {
                $publicDir = public_path('storage/logos');
                if (!file_exists($publicDir)) {
                    @mkdir($publicDir, 0755, true);
                }
                @copy(storage_path('app/public/' . $storedPath), $publicDir . '/' . $filename);
            } catch (\Exception $e) {
                // Ignore fallback copy errors if permissions restricted
            }

            return '/storage/logos/' . $filename;
        }

        // 2. Handle Base64 Data URL string
        $logoInput = $request->input('logo_path') ?? $request->input('logo_url') ?? $request->input('logo');

        if (is_string($logoInput) && str_starts_with($logoInput, 'data:image/')) {
            if (preg_match('/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i', $logoInput, $matches)) {
                $ext = strtolower($matches[1]);
                if ($ext === 'jpeg') $ext = 'jpg';

                $imageData = base64_decode($matches[2]);
                if ($imageData === false) {
                    throw ValidationException::withMessages([
                        'logo_path' => ['Invalid base64 image encoding.']
                    ]);
                }

                if (strlen($imageData) > 2 * 1024 * 1024) {
                    throw ValidationException::withMessages([
                        'logo_path' => ['File size exceeds 2 MB limit. Please select a smaller logo image.']
                    ]);
                }

                $companyIdStr = $company ? (string) $company->id : 'new';
                $filename = 'company_' . $companyIdStr . '_' . time() . '_' . Str::random(8) . '.' . $ext;

                // Remove old logo file if stored on disk
                if ($company && $company->logo_path && str_starts_with($company->logo_path, '/storage/logos/')) {
                    $oldRelative = str_replace('/storage/', '', $company->logo_path);
                    Storage::disk('public')->delete($oldRelative);
                    if (file_exists(public_path('storage/logos/' . basename($company->logo_path)))) {
                        @unlink(public_path('storage/logos/' . basename($company->logo_path)));
                    }
                }

                Storage::disk('public')->put('logos/' . $filename, $imageData);

                // Mirror file to public_path for instant direct static access
                try {
                    $publicDir = public_path('storage/logos');
                    if (!file_exists($publicDir)) {
                        @mkdir($publicDir, 0755, true);
                    }
                    @file_put_contents($publicDir . '/' . $filename, $imageData);
                } catch (\Exception $e) {
                    // Ignore fallback copy errors if permissions restricted
                }

                return '/storage/logos/' . $filename;
            } else {
                throw ValidationException::withMessages([
                    'logo_path' => ['Invalid image format. Allowed formats: PNG, JPG, JPEG, WebP.']
                ]);
            }
        }

        // 3. Explicit removal request
        if ($request->has('logo_path') && (is_null($logoInput) || $logoInput === '' || $logoInput === 'remove')) {
            if ($company && $company->logo_path && str_starts_with($company->logo_path, '/storage/logos/')) {
                $oldRelative = str_replace('/storage/', '', $company->logo_path);
                Storage::disk('public')->delete($oldRelative);
                if (file_exists(public_path('storage/logos/' . basename($company->logo_path)))) {
                    @unlink(public_path('storage/logos/' . basename($company->logo_path)));
                }
            }
            return null;
        }

        // Return existing logo_path or passed string path if already stored
        if (is_string($logoInput) && !empty($logoInput)) {
            return $logoInput;
        }

        return $company ? $company->logo_path : null;
    }

    public function show(Request $request)
    {
        $user = $request->user();
        $routeCompany = $request->route('company');
        
        $specifiedId = ($routeCompany instanceof Company ? $routeCompany->id : $routeCompany)
            ?? $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id');

        if ($specifiedId) {
            $company = Company::find($specifiedId);
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found.',
                ], 404);
            }
        } else {
            $company = ($user ? $user->companies()->first() : null) ?? Company::first();
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found.',
                ], 404);
            }
        }

        if ($user && !$user->hasCompanyAccess($company->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: You do not have access to this company.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $company
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $routeCompany = $request->route('company');

        $specifiedId = ($routeCompany instanceof Company ? $routeCompany->id : $routeCompany)
            ?? $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id');

        if ($specifiedId) {
            $company = Company::find($specifiedId);
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found.'
                ], 404);
            }
        } else {
            $company = ($user ? $user->companies()->first() : null) ?? Company::first();
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found.'
                ], 404);
            }
        }

        if ($user && !$user->hasCompanyAccess($company->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: You do not have access to this company.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'legal_name' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|string|max:255',
            'vat_registration' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'country' => 'nullable|string|max:255',
            'currency_code' => 'nullable|string|max:10',
            'timezone' => 'nullable|string|max:100',
            'logo_path' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated = array_map(function ($val) {
            return is_string($val) ? trim($val) : $val;
        }, $validated);

        if (empty($validated['name'])) {
            return response()->json([
                'success' => false,
                'message' => 'Company name cannot be empty.'
            ], 422);
        }

        // Process logo upload / data URL if present in request
        $processedLogoPath = $this->processLogoUpload($request, $company);
        $validated['logo_path'] = $processedLogoPath;

        // Synchronize vat_registration and tax_number
        if (!empty($validated['vat_registration']) && empty($validated['tax_number'])) {
            $validated['tax_number'] = $validated['vat_registration'];
        } elseif (!empty($validated['tax_number']) && empty($validated['vat_registration'])) {
            $validated['vat_registration'] = $validated['tax_number'];
        }

        $company->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Company profile updated.',
            'data' => $company->fresh()
        ]);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.'
            ], 401);
        }

        if ($user->hasRole('Super Admin')) {
            $companies = Company::orderBy('name')->get();
        } else {
            $companies = $user->companies()->orderBy('name')->get();
        }

        return response()->json([
            'success' => true,
            'data' => $companies
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.'
            ], 401);
        }

        if (!$user->hasRole('Super Admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: Only administrators can create tenant companies.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'legal_name' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:255|unique:companies,code',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|string|max:255',
            'vat_registration' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'country' => 'nullable|string|max:255',
            'currency_code' => 'nullable|string|max:10',
            'timezone' => 'nullable|string|max:100',
            'logo_path' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated = array_map(function ($val) {
            return is_string($val) ? trim($val) : $val;
        }, $validated);

        if (empty($validated['name'])) {
            return response()->json([
                'success' => false,
                'message' => 'Company name cannot be empty.'
            ], 422);
        }

        if (empty($validated['code'])) {
            unset($validated['code']);
        }

        // Process logo upload / data URL if present in request
        $processedLogoPath = $this->processLogoUpload($request, null);
        $validated['logo_path'] = $processedLogoPath;

        // Synchronize vat_registration and tax_number
        if (!empty($validated['vat_registration']) && empty($validated['tax_number'])) {
            $validated['tax_number'] = $validated['vat_registration'];
        } elseif (!empty($validated['tax_number']) && empty($validated['vat_registration'])) {
            $validated['vat_registration'] = $validated['tax_number'];
        }

        // Fallbacks for phone / email if passed as owner_phone / owner_email
        if (empty($validated['phone']) && $request->filled('owner_phone')) {
            $validated['phone'] = trim($request->input('owner_phone'));
        }
        if (empty($validated['email']) && $request->filled('owner_email')) {
            $validated['email'] = trim($request->input('owner_email'));
        }

        // Defaults
        $validated['country'] = !empty($validated['country']) ? $validated['country'] : 'Bangladesh';
        $validated['currency_code'] = !empty($validated['currency_code']) ? $validated['currency_code'] : 'BDT';
        $validated['timezone'] = !empty($validated['timezone']) ? $validated['timezone'] : 'Asia/Dhaka';
        $validated['status'] = !empty($validated['status']) ? $validated['status'] : 'active';

        $company = DB::transaction(function () use ($validated, $user) {
            $company = Company::create($validated);
            $company->users()->syncWithoutDetaching([$user->id]);
            return $company;
        });

        return response()->json([
            'success' => true,
            'message' => "Tenant Company '{$company->name}' created successfully.",
            'data' => $company
        ], 201);
    }

    /**
     * Upload company logo via file or base64.
     */
    public function uploadLogo(Request $request)
    {
        $user = $request->user();
        $routeCompany = $request->route('company');

        $specifiedId = ($routeCompany instanceof Company ? $routeCompany->id : $routeCompany)
            ?? $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id');

        if ($specifiedId) {
            $company = Company::find($specifiedId);
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found.'
                ], 404);
            }
        } else {
            $company = ($user ? $user->companies()->first() : null) ?? Company::first();
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found.'
                ], 404);
            }
        }

        if ($user && !$user->hasCompanyAccess($company->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: You do not have access to this company.'
            ], 403);
        }

        $newLogoPath = $this->processLogoUpload($request, $company);
        $company->update(['logo_path' => $newLogoPath]);

        return response()->json([
            'success' => true,
            'message' => 'Company logo uploaded successfully.',
            'data' => $company->fresh()
        ]);
    }

    /**
     * Remove company logo.
     */
    public function deleteLogo(Request $request)
    {
        $user = $request->user();
        $routeCompany = $request->route('company');

        $specifiedId = ($routeCompany instanceof Company ? $routeCompany->id : $routeCompany)
            ?? $request->attributes->get('company_id')
            ?? $request->header('X-Company-ID')
            ?? $request->header('X-Company-Id');

        if ($specifiedId) {
            $company = Company::find($specifiedId);
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found.'
                ], 404);
            }
        } else {
            $company = ($user ? $user->companies()->first() : null) ?? Company::first();
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found.'
                ], 404);
            }
        }

        if ($user && !$user->hasCompanyAccess($company->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: You do not have access to this company.'
            ], 403);
        }

        if ($company->logo_path && str_starts_with($company->logo_path, '/storage/logos/')) {
            $oldRelative = str_replace('/storage/', '', $company->logo_path);
            Storage::disk('public')->delete($oldRelative);
            if (file_exists(public_path('storage/logos/' . basename($company->logo_path)))) {
                @unlink(public_path('storage/logos/' . basename($company->logo_path)));
            }
        }

        $company->update(['logo_path' => null]);

        return response()->json([
            'success' => true,
            'message' => 'Company logo removed successfully.',
            'data' => $company->fresh()
        ]);
    }
}

