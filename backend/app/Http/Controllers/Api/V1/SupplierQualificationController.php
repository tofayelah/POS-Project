<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Services\SupplierQualificationService;
use Illuminate\Http\Request;

class SupplierQualificationController extends Controller
{
    protected SupplierQualificationService $qualificationService;

    public function __construct(SupplierQualificationService $qualificationService)
    {
        $this->qualificationService = $qualificationService;
    }

    public function updateStatus(Request $request, $id)
    {
        $companyId = $request->attributes->get('company_id');
        $supplier = Supplier::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'qualification_status' => 'required|string|in:' . implode(',', SupplierQualificationService::VALID_STATUSES),
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        try {
            $updated = $this->qualificationService->updateQualificationStatus(
                $supplier,
                $validated['qualification_status'],
                $validated['reason'] ?? null,
                $validated['notes'] ?? null,
                $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => "Supplier qualification status updated to {$updated->qualification_status}.",
                'data' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
