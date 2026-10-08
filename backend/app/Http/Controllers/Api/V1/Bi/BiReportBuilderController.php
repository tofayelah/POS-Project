<?php

namespace App\Http\Controllers\Api\V1\Bi;

use App\Http\Controllers\Controller;
use App\Models\BiSavedReport;
use App\Services\Bi\BiReportBuilderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BiReportBuilderController extends Controller
{
    public function __construct(
        protected BiReportBuilderService $reportBuilder
    ) {}

    protected function getCompanyId(Request $request): int
    {
        return $request->attributes->get('company_id') ?? auth()->user()->company_id;
    }

    public function catalog(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->reportBuilder->getDatasetCatalog(),
        ]);
    }

    public function execute(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $config = $request->validate([
            'dataset' => 'required|string',
            'dimensions' => 'nullable|array',
            'metrics' => 'nullable|array',
            'filters' => 'nullable|array',
            'sort_by' => 'nullable|string',
            'sort_direction' => 'nullable|string|in:asc,desc,ASC,DESC',
            'limit' => 'nullable|integer|max:500',
        ]);

        $result = $this->reportBuilder->executeReport($companyId, $config);

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }

    public function export(Request $request)
    {
        $companyId = $this->getCompanyId($request);
        $config = $request->validate([
            'dataset' => 'required|string',
            'dimensions' => 'nullable|array',
            'metrics' => 'nullable|array',
            'filters' => 'nullable|array',
            'sort_by' => 'nullable|string',
            'sort_direction' => 'nullable|string|in:asc,desc,ASC,DESC',
            'format' => 'nullable|string|in:csv,json',
        ]);

        $format = $config['format'] ?? 'csv';

        if ($format === 'json') {
            $data = $this->reportBuilder->executeReport($companyId, $config);
            return response()->json($data);
        }

        $csv = $this->reportBuilder->exportCsv($companyId, $config);
        $filename = 'bi_report_' . $config['dataset'] . '_' . date('Ymd_His') . '.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function savedReports(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $userId = auth()->id();

        $reports = $this->reportBuilder->listSavedReports($companyId, $userId);

        return response()->json([
            'status' => 'success',
            'data' => $reports,
        ]);
    }

    public function storeSavedReport(Request $request): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $userId = auth()->id();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'dataset' => 'required|string',
            'dimensions' => 'required|array',
            'metrics' => 'required|array',
            'filters' => 'nullable|array',
            'group_by' => 'nullable|array',
            'sort_by' => 'nullable|string',
            'sort_direction' => 'nullable|string|in:asc,desc',
            'chart_type' => 'nullable|string',
            'is_public' => 'nullable|boolean',
            'schedule_frequency' => 'nullable|string|in:DAILY,WEEKLY,MONTHLY',
            'schedule_recipients' => 'nullable|array',
        ]);

        $report = $this->reportBuilder->saveReport($companyId, $userId, $validated);

        return response()->json([
            'status' => 'success',
            'data' => $report,
            'message' => 'Custom report configuration saved successfully.',
        ], Response::HTTP_CREATED);
    }

    public function runSavedReport(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $report = BiSavedReport::where('company_id', $companyId)->findOrFail($id);

        $report->update(['last_run_at' => now()]);

        $result = $this->reportBuilder->executeReport($companyId, [
            'dataset' => $report->dataset,
            'dimensions' => $report->dimensions,
            'metrics' => $report->metrics,
            'filters' => $report->filters,
            'sort_by' => $report->sort_by,
            'sort_direction' => $report->sort_direction,
        ]);

        return response()->json([
            'status' => 'success',
            'report' => $report,
            'data' => $result,
        ]);
    }

    public function updateSavedReport(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $userId = auth()->id();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'dimensions' => 'nullable|array',
            'metrics' => 'nullable|array',
            'filters' => 'nullable|array',
            'chart_type' => 'nullable|string',
            'is_public' => 'nullable|boolean',
            'schedule_frequency' => 'nullable|string|in:DAILY,WEEKLY,MONTHLY',
            'schedule_recipients' => 'nullable|array',
        ]);

        $report = $this->reportBuilder->updateReport($companyId, $userId, $id, $validated);

        return response()->json([
            'status' => 'success',
            'data' => $report,
            'message' => 'Saved report updated successfully.',
        ]);
    }

    public function destroySavedReport(Request $request, int $id): JsonResponse
    {
        $companyId = $this->getCompanyId($request);
        $userId = auth()->id();

        $this->reportBuilder->deleteReport($companyId, $userId, $id);

        return response()->json([
            'status' => 'success',
            'message' => 'Saved report deleted successfully.',
        ]);
    }
}
