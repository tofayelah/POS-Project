import React, { useEffect, useState } from 'react';
import {
  FileText,
  Play,
  Trash2,
  Calendar,
  Layers,
  RefreshCw,
  Table,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { BiSavedReport } from '../../types/bi';
import { formatDate, formatNumber } from '../../utils/format';

export const SavedReports: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [reports, setReports] = useState<BiSavedReport[]>([]);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [activeResults, setActiveResults] = useState<{ report: BiSavedReport; data: any } | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const resp = await biApi.getSavedReports();
      setReports(resp.data.data);
    } catch (err) {
      console.error('Failed to load saved reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async (report: BiSavedReport) => {
    setExecutingId(report.id);
    try {
      const resp = await biApi.runSavedReport(report.id);
      setActiveResults({ report, data: resp.data.data });
    } catch (err) {
      console.error('Failed to run saved report', err);
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this saved report?')) return;
    try {
      await biApi.deleteSavedReport(id);
      await loadReports();
      if (activeResults?.report.id === id) {
        setActiveResults(null);
      }
    } catch (err) {
      console.error('Failed to delete report', err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bi.savedReports')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Access pre-configured management reports, saved analytics templates, and recurring query snapshots.
          </p>
        </div>

        <button
          onClick={loadReports}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Saved Reports Found</h3>
          <p className="text-sm text-gray-500 mt-1">
            Design a custom query in the Report Builder and click "Save Report" to preserve it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                    {report.dataset}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(report.created_at)}</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {report.name}
                </h3>
                {report.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {report.description}
                  </p>
                )}

                <div className="text-xs text-gray-500 pt-1 space-y-0.5">
                  <div>
                    Dimensions: <span className="font-medium text-gray-700 dark:text-gray-300">{report.config?.dimensions?.join(', ') || 'None'}</span>
                  </div>
                  <div>
                    Metrics: <span className="font-medium text-gray-700 dark:text-gray-300">{report.config?.metrics?.join(', ') || 'None'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => handleRun(report)}
                  disabled={executingId === report.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 shadow-sm"
                >
                  <Play className={`w-3.5 h-3.5 ${executingId === report.id ? 'animate-spin' : ''}`} />
                  Execute Report
                </button>

                <button
                  onClick={() => handleDelete(report.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Execution Results View */}
      {activeResults && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Table className="w-5 h-5 text-indigo-500" />
              {activeResults.report.name} — Execution Results ({activeResults.data?.count || 0} Rows)
            </h2>
            <button
              onClick={() => setActiveResults(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 sticky top-0">
                <tr>
                  {activeResults.data?.columns &&
                    activeResults.data.columns.map((col: string) => (
                      <th key={col} className="py-2.5 px-3 font-semibold uppercase text-xs tracking-wider">
                        {col.replace('_', ' ')}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {activeResults.data?.rows && activeResults.data.rows.length > 0 ? (
                  activeResults.data.rows.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      {activeResults.data.columns.map((col: string) => (
                        <td key={col} className="py-2 px-3 text-gray-800 dark:text-gray-200">
                          {typeof row[col] === 'number' ? formatNumber(row[col]) : row[col] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={activeResults.data?.columns?.length || 1} className="py-8 text-center text-gray-500">
                      No records found for this saved report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
