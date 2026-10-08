<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Models\FixedAsset;
use App\Models\FixedAssetCategory;
use App\Models\AssetDisposal;
use App\Services\FixedAssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FixedAssetController extends Controller
{
    public function __construct(
        protected FixedAssetService $fixedAssetService
    ) {}

    // Categories
    public function indexCategories(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $categories = FixedAssetCategory::where('company_id', $companyId)
            ->with(['assetAccount', 'accumulatedDepreciationAccount', 'depreciationExpenseAccount'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'depreciation_method' => 'nullable|string|in:STRAIGHT_LINE',
            'useful_life_months' => 'required|integer|min:1|max:1200',
            'asset_account_id' => 'required|exists:accounts,id',
            'accumulated_depreciation_account_id' => 'required|exists:accounts,id',
            'depreciation_expense_account_id' => 'required|exists:accounts,id',
        ]);

        $category = $this->fixedAssetService->createCategory($companyId, $validated);

        return response()->json([
            'success' => true,
            'message' => 'Asset category created successfully',
            'data' => $category,
        ], 201);
    }

    // Assets
    public function index(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $assets = FixedAsset::where('company_id', $companyId)
            ->with(['category', 'assetAccount', 'accumulatedDepreciationAccount', 'depreciationExpenseAccount', 'costCentre', 'disposal'])
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($asset) {
                $accum = $asset->accumulated_depreciation;
                $bookValue = $asset->book_value;
                $data = $asset->toArray();
                $data['accumulated_depreciation'] = round($accum, 2);
                $data['book_value'] = round($bookValue, 2);
                return $data;
            });

        return response()->json([
            'success' => true,
            'data' => $assets,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'category_id' => 'required|exists:fixed_asset_categories,id',
            'asset_code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'purchase_date' => 'required|date',
            'purchase_cost' => 'required|numeric|min:0.01',
            'residual_value' => 'nullable|numeric|min:0',
            'useful_life_months' => 'nullable|integer|min:1',
            'depreciation_method' => 'nullable|string|in:STRAIGHT_LINE',
            'location' => 'nullable|string|max:255',
            'custodian' => 'nullable|string|max:255',
            'asset_account_id' => 'nullable|exists:accounts,id',
            'accumulated_depreciation_account_id' => 'nullable|exists:accounts,id',
            'depreciation_expense_account_id' => 'nullable|exists:accounts,id',
            'cost_centre_id' => 'nullable|exists:cost_centres,id',
        ]);

        $asset = $this->fixedAssetService->registerAsset($companyId, $validated, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Fixed asset registered successfully',
            'data' => $asset,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $asset = FixedAsset::where('company_id', $companyId)
            ->with(['category', 'assetAccount', 'accumulatedDepreciationAccount', 'depreciationExpenseAccount', 'costCentre', 'depreciationEntries.journalEntry', 'disposal.journalEntry'])
            ->findOrFail($id);

        $data = $asset->toArray();
        $data['accumulated_depreciation'] = round($asset->accumulated_depreciation, 2);
        $data['book_value'] = round($asset->book_value, 2);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function runDepreciation(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'depreciation_date' => 'required|date',
            'accounting_period_id' => 'nullable|exists:accounting_periods,id',
        ]);

        $result = $this->fixedAssetService->runDepreciation(
            $companyId,
            isset($validated['accounting_period_id']) ? (int) $validated['accounting_period_id'] : null,
            $validated['depreciation_date'],
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => "Depreciation run completed: {$result['processed_assets_count']} assets processed",
            'data' => $result,
        ]);
    }

    public function dispose(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $validated = $request->validate([
            'disposal_date' => 'required|date',
            'sale_proceeds' => 'required|numeric|min:0',
            'settlement_account_id' => 'nullable|exists:accounts,id',
            'gain_loss_account_id' => 'nullable|exists:accounts,id',
            'notes' => 'nullable|string',
        ]);

        $disposal = $this->fixedAssetService->disposeAsset($companyId, $id, $validated, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Asset disposed successfully and disposal journal posted',
            'data' => $disposal,
        ]);
    }
}
