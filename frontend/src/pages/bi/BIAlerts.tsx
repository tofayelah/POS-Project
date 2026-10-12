import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { BiAlert } from '../../types/bi';
import { formatDate } from '../../utils/format';

export const BIAlerts: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<BiAlert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [actionNotes, setActionNotes] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const resp = await biApi.getAlerts();
      setAlerts(resp.data.data);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const resp = await biApi.evaluateAlerts();
      setAlerts(resp.data.data);
    } catch (err) {
      console.error('Failed to evaluate alerts', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      const notes = actionNotes[id] || undefined;
      await biApi.acknowledgeAlert(id, notes);
      await loadAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      const notes = actionNotes[id] || undefined;
      await biApi.resolveAlert(id, notes);
      await loadAlerts();
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity && a.severity !== filterSeverity) return false;
    return true;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-rose-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              {t('bi.alerts')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time threshold monitoring, anomaly detection, and management exceptions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-900"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="INFO">Info Only</option>
          </select>
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${evaluating ? 'animate-spin' : ''}`} />
            Evaluate Real-Time
          </button>
        </div>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50 p-5 rounded-xl border border-red-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Critical Alerts</span>
            <div className="text-2xl font-bold text-red-700 mt-1">{criticalCount}</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Warning Alerts</span>
            <div className="text-2xl font-bold text-amber-700 mt-1">{warningCount}</div>
          </div>
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>

        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">System Health</span>
            <div className="text-lg font-bold text-emerald-700 mt-1">
              {criticalCount === 0 ? 'Optimal Performance' : 'Attention Required'}
            </div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-rose-600" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">All Clear!</h3>
          <p className="text-sm text-gray-500 mt-1">
            No management alerts or threshold breaches have been detected.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-6 rounded-xl border transition shadow-sm bg-white ${
                alert.severity === 'CRITICAL'
                  ? 'border-red-300'
                  : alert.severity === 'WARNING'
                  ? 'border-amber-300'
                  : 'border-blue-300'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : alert.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-mono text-gray-400">{alert.code}</span>
                    <span className="text-xs text-gray-400">• {formatDate(alert.created_at)}</span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 pt-1">
                    {alert.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {alert.message}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-2">
                    <span>
                      Metric: <strong className="text-gray-700">{alert.metric}</strong>
                    </span>
                    <span>
                      Current: <strong className="text-rose-600">{alert.current_value}</strong>
                    </span>
                    <span>
                      Threshold ({alert.threshold_type}): <strong className="text-gray-700">{alert.threshold_value}</strong>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add resolution note..."
                    value={actionNotes[alert.id] || ''}
                    onChange={(e) =>
                      setActionNotes({ ...actionNotes, [alert.id]: e.target.value })
                    }
                    className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 w-full sm:w-48"
                  />
                  {alert.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleAcknowledge(Number(alert.id))}
                      className="px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition whitespace-nowrap"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(Number(alert.id))}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition whitespace-nowrap shadow-sm"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
