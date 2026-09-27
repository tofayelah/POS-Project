import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Server, GitBranch, RefreshCw, Database, CheckCircle2, 
  AlertTriangle, XCircle, Clock, ShieldCheck, Cpu
} from 'lucide-react';
import { fetchSystemStatus } from '../../api/system';
import { getComparisonBadge, formatShortCommit } from '../../utils/version';
import { format } from 'date-fns';

export function SystemStatusCard() {
  const { data: status, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['system-status'],
    queryFn: fetchSystemStatus,
    refetchInterval: 60000, // Automatic poll every 60s
    staleTime: 30000,
  });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading && !status) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-36 bg-slate-200 rounded"></div>
          <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
        </div>
        <div className="space-y-4 flex-1">
          <div className="h-10 bg-slate-100 rounded-xl"></div>
          <div className="h-10 bg-slate-100 rounded-xl"></div>
          <div className="h-10 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-6 flex flex-col justify-between h-full bg-rose-50/30">
        <div>
          <div className="flex items-center gap-3 mb-4 text-rose-700">
            <XCircle className="w-6 h-6 shrink-0" />
            <h3 className="font-extrabold text-lg text-slate-900">System Status</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Unable to communicate with the system status endpoint. Check your network or server availability.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-rose-200 rounded-xl text-sm font-bold text-rose-700 hover:bg-rose-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Status Check
        </button>
      </div>
    );
  }

  // Derive badges from comparison
  const githubBadge = status.github.status === 'connected'
    ? (status.comparison.github_vs_live === 'UP_TO_DATE' 
        ? { label: 'Latest', dotColor: 'bg-emerald-500', badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
        : { label: 'Active', dotColor: 'bg-indigo-500', badgeClass: 'bg-indigo-50 border-indigo-200 text-indigo-700' })
    : { label: 'Unavailable', dotColor: 'bg-slate-400', badgeClass: 'bg-slate-50 border-slate-200 text-slate-500' };

  const aiStudioBadge = status.ai_studio.status === 'reported'
    ? getComparisonBadge(status.comparison.github_vs_ai_studio)
    : { label: 'Not Reported', dotColor: 'bg-slate-400', badgeClass: 'bg-slate-50 border-slate-200 text-slate-500' };

  const liveBadge = status.comparison.github_vs_live === 'UP_TO_DATE'
    ? { label: 'Latest', dotColor: 'bg-emerald-500', badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
    : status.comparison.github_vs_live === 'OUTDATED'
      ? { label: 'Outdated', dotColor: 'bg-amber-500', badgeClass: 'bg-amber-50 border-amber-200 text-amber-700' }
      : { label: 'Live Server', dotColor: 'bg-emerald-500', badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700' };

  const backendBadge = status.live.backend.status === 'healthy'
    ? { label: 'Healthy', dotColor: 'bg-emerald-500', badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
    : { label: 'Unhealthy', dotColor: 'bg-rose-500', badgeClass: 'bg-rose-50 border-rose-200 text-rose-700' };

  const frontendBadge = status.comparison.backend_vs_frontend === 'SYNCHRONIZED'
    ? { label: 'Synced', dotColor: 'bg-emerald-500', badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
    : { label: 'Mismatch', dotColor: 'bg-rose-500', badgeClass: 'bg-rose-50 border-rose-200 text-rose-700' };

  const databaseBadge = status.live.database.status === 'healthy'
    ? { label: 'Healthy', dotColor: 'bg-emerald-500', badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
    : { label: 'Unhealthy', dotColor: 'bg-rose-500', badgeClass: 'bg-rose-50 border-rose-200 text-rose-700' };

  const formatTimestamp = (ts: string | null | undefined) => {
    if (!ts) return 'Not Recorded';
    try {
      return format(new Date(ts), 'dd MMM yyyy, hh:mm a');
    } catch {
      return ts;
    }
  };

  const isSyncHealthy = status.comparison.backend_vs_frontend === 'SYNCHRONIZED' &&
    status.live.database.status === 'healthy' &&
    (status.comparison.github_vs_live === 'UP_TO_DATE' || status.comparison.github_vs_live === 'UNKNOWN');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
      {/* Card Header */}
      <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 leading-tight">System Status</h3>
            <p className="text-xs text-slate-500 font-medium">Environment & Deployment Synchronization</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            {status.environment}
          </span>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 ${isSyncHealthy ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            <span className={`w-2 h-2 rounded-full ${isSyncHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {isSyncHealthy ? 'Healthy' : 'Attention'}
          </span>
        </div>
      </div>

      {/* Main Grid: Environments & Repositories */}
      <div className="space-y-4 mb-5">
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Environment Sync</div>
        
        <div className="grid grid-cols-1 gap-2.5">
          {/* GitHub */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition">
            <div className="flex items-center gap-2.5">
              <GitBranch className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-700">GitHub</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                {formatShortCommit(status.github.commit)}
              </span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-md border flex items-center gap-1.5 ${githubBadge.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${githubBadge.dotColor}`}></span>
                {githubBadge.label}
              </span>
            </div>
          </div>

          {/* AI Studio */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-700">AI Studio</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                {formatShortCommit(status.ai_studio.commit)}
              </span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-md border flex items-center gap-1.5 ${aiStudioBadge.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${aiStudioBadge.dotColor}`}></span>
                {aiStudioBadge.label}
              </span>
            </div>
          </div>

          {/* Live Server */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-700">Live Server</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {formatShortCommit(status.live.commit)}
              </span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-md border flex items-center gap-1.5 ${liveBadge.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${liveBadge.dotColor}`}></span>
                {liveBadge.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Component Level Health */}
      <div className="space-y-4 mb-5 pt-3 border-t border-slate-100">
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Services & Health</div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Backend */}
          <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 font-medium">Backend</span>
              <span className={`text-[11px] font-bold ${backendBadge.badgeClass} px-1.5 py-0.5 rounded border`}>
                {backendBadge.label}
              </span>
            </div>
            <div className="font-mono text-xs font-extrabold text-slate-800">
              {formatShortCommit(status.live.backend.version)}
            </div>
          </div>

          {/* Frontend */}
          <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 font-medium">Frontend</span>
              <span className={`text-[11px] font-bold ${frontendBadge.badgeClass} px-1.5 py-0.5 rounded border`}>
                {frontendBadge.label}
              </span>
            </div>
            <div className="font-mono text-xs font-extrabold text-slate-800">
              {formatShortCommit(status.live.frontend.version)}
            </div>
          </div>

          {/* Database */}
          <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Database</span>
              </div>
              <span className={`text-[11px] font-bold ${databaseBadge.badgeClass} px-1.5 py-0.5 rounded border`}>
                {databaseBadge.label}
              </span>
            </div>
            <div className="text-xs font-extrabold text-slate-800">
              {status.live.database.status === 'healthy' ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          {/* API */}
          <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 font-medium">API</span>
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                Online
              </span>
            </div>
            <div className="text-xs font-extrabold text-slate-800">
              Healthy ({status.live.backend.api_version || 'v1'})
            </div>
          </div>
        </div>
      </div>

      {/* Deployment & Commit Meta */}
      <div className="space-y-3 pt-3 border-t border-slate-100 flex-1">
        {status.live.deployed_at && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Last Deployment</span>
            <span className="font-bold text-slate-700">{formatTimestamp(status.live.deployed_at)}</span>
          </div>
        )}

        {status.github.commit_message && (
          <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase mb-1">Latest Commit</span>
            <span className="text-slate-700 font-medium line-clamp-1">{status.github.commit_message}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last Checked:
          </span>
          <span>{formatTimestamp(status.checked_at)}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 mt-2 border-t border-slate-100">
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
          {isFetching ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>
    </div>
  );
}
