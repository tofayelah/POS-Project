import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Play,
  Save,
  Download,
  Filter,
  Layers,
  Database,
  CheckSquare,
  Square,
  RefreshCw,
  Table,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { formatNumber } from '../../utils/format';

export const ReportBuilder: React.FC = () => {
  const { t } = useTranslation();
  const [datasets, setDatasets] = useState<any>({});
  const [selectedDataset, setSelectedDataset] = useState<string>('sales');
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['date', 'branch']);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['orders_count', 'gross_sales', 'net_sales']);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  const [running, setRunning] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);

  // Save report dialog
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [reportName, setReportName] = useState<string>('');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string>('');

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const resp = await biApi.getDatasets();
      setDatasets(resp.data.data);
    } catch (err) {
      console.error('Failed to load datasets catalog', err);
    }
  };

  const handleDatasetChange = (key: string) => {
    setSelectedDataset(key);
    const cat = datasets[key];
    if (cat) {
      const dims = Object.keys(cat.dimensions || {});
      const mets = Object.keys(cat.metrics || {});
      setSelectedDimensions(dims.slice(0, 2));
      setSelectedMetrics(mets.slice(0, 3));
    }
    setResults(null);
  };

  const toggleDimension = (dimKey: string) => {
    if (selectedDimensions.includes(dimKey)) {
      setSelectedDimensions(selectedDimensions.filter((d) => d !== dimKey));
    } else {
      setSelectedDimensions([...selectedDimensions, dimKey]);
    }
  };

  const toggleMetric = (metKey: string) => {
    if (selectedMetrics.includes(metKey)) {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== metKey));
    } else {
      setSelectedMetrics([...selectedMetrics, metKey]);
    }
  };

  const handleRunReport = async () => {
    if (selectedMetrics.length === 0) {
      alert('Please select at least one metric to compute.');
      return;
    }
    setRunning(true);
    try {
      const resp = await biApi.runReport({
        dataset: selectedDataset,
        dimensions: selectedDimensions,
        metrics: selectedMetrics,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setResults(resp.data.data);
    } catch (err) {
      console.error('Failed to execute report', err);
    } finally {
      setRunning(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const resp = await biApi.exportReport({
        dataset: selectedDataset,
        dimensions: selectedDimensions,
        metrics: selectedMetrics,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        format,
      });

      const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedDataset}_report_${new Date().toISOString().slice(0, 10)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export report', err);
    }
  };

  const handleSaveReport = async () => {
    if (!reportName.trim()) return;
    setSaving(true);
    try {
      await biApi.saveReport({
        name: reportName,
        description: reportDesc,
        dataset: selectedDataset,
        config: {
          dimensions: selectedDimensions,
          metrics: selectedMetrics,
          date_from: dateFrom,
          date_to: dateTo,
        },
      });
      setShowSaveModal(false);
      setReportName('');
      setReportDesc('');
      setSaveSuccess('Report configuration saved successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to save report', err);
    } finally {
      setSaving(false);
    }
  };

  const activeDatasetObj = datasets[selectedDataset];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bi.reportBuilder')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Build, pivot, and execute custom ad-hoc management reports across all authoritative ERP domains.
          </p>
        </div>

        {saveSuccess && (
          <div className="text-sm text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-emerald-200">
            {saveSuccess}
          </div>
        )}
      </div>

      {/* Dataset & Query Config Panel */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
        {/* Step 1: Dataset Selection */}
        <div>
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
            1. Select Data Domain
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(datasets).map(([key, item]: [string, any]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleDatasetChange(key)}
                className={`p-3 rounded-lg border text-left transition ${
                  selectedDataset === key
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-semibold shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="text-sm">{item.name}</div>
                <div className="text-[11px] text-gray-500 line-clamp-1">{item.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Dimensions & Metrics */}
        {activeDatasetObj && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            {/* Dimensions */}
            <div>
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
                2. Group Dimensions (Rows)
              </label>
              <div className="space-y-2">
                {Object.entries(activeDatasetObj.dimensions || {}).map(([dKey, dObj]: [string, any]) => {
                  const isChecked = selectedDimensions.includes(dKey);
                  return (
                    <button
                      key={dKey}
                      type="button"
                      onClick={() => toggleDimension(dKey)}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 w-full text-left"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                      <span>{dObj.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metrics */}
            <div>
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
                3. Aggregate Metrics (Values)
              </label>
              <div className="space-y-2">
                {Object.entries(activeDatasetObj.metrics || {}).map(([mKey, mObj]: [string, any]) => {
                  const isChecked = selectedMetrics.includes(mKey);
                  return (
                    <button
                      key={mKey}
                      type="button"
                      onClick={() => toggleMetric(mKey)}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 w-full text-left"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                      <span>{mObj.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Date Filtering & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">Date Bounds:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunReport}
              disabled={running}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
              Run Query
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition"
            >
              <Save className="w-4 h-4" />
              Save Report
            </button>
            {results && (
              <>
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-medium rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm font-medium rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                  JSON
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results Table Section */}
      {results && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Table className="w-5 h-5 text-indigo-500" />
              Report Results ({results.count} Rows)
            </h2>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 sticky top-0">
                <tr>
                  {results.columns &&
                    results.columns.map((col: string) => (
                      <th key={col} className="py-2.5 px-3 font-semibold uppercase text-xs tracking-wider">
                        {col.replace('_', ' ')}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {results.rows && results.rows.length > 0 ? (
                  results.rows.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      {results.columns.map((col: string) => (
                        <td key={col} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                          {typeof row[col] === 'number' ? formatNumber(row[col]) : row[col] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={results.columns?.length || 1} className="py-8 text-center text-gray-500">
                      No records matched the selected query parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Save Custom Report</h3>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Report Title
              </label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g. Monthly Branch Profitability Analysis"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Description (Optional)
              </label>
              <textarea
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder="Brief summary of what this report reveals..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReport}
                disabled={saving || !reportName.trim()}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
