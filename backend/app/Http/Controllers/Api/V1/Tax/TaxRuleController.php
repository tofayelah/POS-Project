<?php

namespace App\Http\Controllers\Api\V1\Tax;

use App\Http\Controllers\Controller;
use App\Services\TaxRuleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxRuleController extends Controller
{
    public function __construct(
        protected TaxRuleService $taxRuleService
    ) {}

    public function categories(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $categories = $this->taxRuleService->getCategories($companyId);

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $category = $this->taxRuleService->createCategory($companyId, $data);

        return response()->json([
            'success' => true,
            'message' => 'Tax category created successfully.',
            'data' => $category,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $rules = $this->taxRuleService->getRules($companyId, $request->all());

        return response()->json([
            'success' => true,
            'data' => $rules,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'tax_category_id' => 'required|integer',
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'rate' => 'required|numeric|min:0',
            'calculation_method' => 'nullable|string|max:50',
            'base_method' => 'nullable|string|max:50',
            'inclusive_allowed' => 'nullable|boolean',
            'exclusive_allowed' => 'nullable|boolean',
            'priority' => 'nullable|integer',
            'effective_from' => 'required|date',
            'effective_to' => 'nullable|date',
            'legal_reference' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:30',
            'components' => 'nullable|array',
        ]);

        $rule = $this->taxRuleService->createRule($companyId, $data, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax rule created successfully.',
            'data' => $rule,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $data = $request->validate([
            'name' => 'nullable|string|max:150',
            'description' => 'nullable|string',
            'rate' => 'nullable|numeric|min:0',
            'calculation_method' => 'nullable|string|max:50',
            'base_method' => 'nullable|string|max:50',
            'inclusive_allowed' => 'nullable|boolean',
            'exclusive_allowed' => 'nullable|boolean',
            'priority' => 'nullable|integer',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date',
            'legal_reference' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:30',
        ]);

        $rule = $this->taxRuleService->updateRule($companyId, $id, $data, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tax rule updated successfully.',
            'data' => $rule,
        ]);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $status = $request->input('status', 'ACTIVE');

        $rule = $status === 'ACTIVE'
            ? $this->taxRuleService->activateRule($companyId, $id, $request->user()->id)
            : $this->taxRuleService->deactivateRule($companyId, $id, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => "Tax rule {$status} successfully.",
            'data' => $rule,
        ]);
    }
}
