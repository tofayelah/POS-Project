import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  Search,
  RefreshCw,
  Filter,
  Eye,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Globe,
  Database,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { auditApi, AuditLog, AuditLogFilters } from '../../api/audit';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';

export function AuditLogList() {
  const { t } = useTranslation();
  const { hasRole, hasPermission } = useAuth();

  // Search & filter states
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Detail modal state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Compute effective date range based on preset or custom input
  const computedDateRange = useMemo(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (datePreset === 'today') {
      const todayStr = formatDate(today);
      return { from: todayStr, to: todayStr };
    }
    if (datePreset === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = formatDate(yesterday);
      return { from: yestStr, to: yestStr };
    }
    if (datePreset === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      return { from: formatDate(past), to: formatDate(today) };
    }
    if (datePreset === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      return { from: formatDate(past), to: formatDate(today) };
    }
    if (datePreset === 'custom') {
      return { from: dateFrom, to: dateTo };
    }
    return { from: '', to: '' };
  }, [datePreset, dateFrom, dateTo]);

  // Date range validation
  const isDateRangeInvalid = useMemo(() => {
    if (computedDateRange.from && computedDateRange.to) {
      return computedDateRange.from > computedDateRange.to;
    }
    return false;
  }, [computedDateRange]);

  // Query audit logs with pagination and filters
  const queryFilters: AuditLogFilters = useMemo(() => {
    const filters: AuditLogFilters = {
      page,
      per_page: perPage,
      sort: sortField,
      direction: sortDirection,
    };
    if (activeSearch.trim()) filters.search = activeSearch.trim();
    if (moduleFilter) filters.module = moduleFilter;
    if (actionFilter) filters.action = actionFilter;
    if (computedDateRange.from && !isDateRangeInvalid) filters.date_from = computedDateRange.from;
    if (computedDateRange.to && !isDateRangeInvalid) filters.date_to = computedDateRange.to;
    return filters;
  }, [page, perPage, sortField, sortDirection, activeSearch, moduleFilter, actionFilter, computedDateRange, isDateRangeInvalid]);

  const {
    data: auditData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['audit-logs', queryFilters],
    queryFn: () => auditApi.getAuditLogs(queryFilters),
  });

  const logs = auditData?.data || [];
  const meta = auditData?.meta || { current_page: 1, per_page: perPage, total: 0, last_page: 1 };

  // Handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setModuleFilter('');
    setActionFilter('');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleOpenDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setSelectedLog(null);
    setIsDetailModalOpen(false);
  };

  // Helper formatting for events badge
  const getEventBadgeClass = (event: string) => {
    const ev = event.toLowerCase();
    if (ev.includes('create') || ev.includes('login') || ev.includes('post') || ev.includes('approv')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (ev.includes('delete') || ev.includes('destroy') || ev.includes('fail') || ev.includes('cancel') || ev.includes('void')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (ev.includes('update') || ev.includes('edit') || ev.includes('change') || ev.includes('assign')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    if (ev.includes('export') || ev.includes('sync') || ev.includes('import')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Format entity type to human friendly string
  const formatEntityType = (type: string | null) => {
    if (!type) return '—';
    const parts = type.split('\\');
    const className = parts[parts.length - 1];
    return className.replace(/([A-Z])/g, ' $1').trim();
  };

  // Format value for display in diff comparison
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-7 h-7 text-indigo-600" />
              {t('audit.title', 'Audit Logs & Governance')}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('audit.readOnly', 'Read-Only Record')}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {t('audit.subtitle', 'Tamper-evident trail of all critical system events, financial operations, and security modifications')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Date Range Invalid Alert */}
      {isDateRangeInvalid && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>The "From Date" cannot be later than the "To Date". Please adjust your date filter.</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Search & Main Selects */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Free Text Search */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('audit.search', 'Search events, entities, users, or IP addresses...')}
              className="w-full pl-10 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setActiveSearch('');
                  setPage(1);
                }}
                className="absolute right-12 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition"
            >
              Search
            </button>
          </form>

          {/* Module Filter */}
          <div className="md:col-span-3">
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">{t('audit.allModules', 'All Modules')}</option>
              <option value="rbac">{t('audit.moduleRbac', 'Security & RBAC')}</option>
              <option value="sales">{t('audit.moduleSales', 'Sales & POS')}</option>
              <option value="purchase">{t('audit.moduleProcurement', 'Procurement')}</option>
              <option value="accounting">{t('audit.moduleAccounting', 'Accounting & Finance')}</option>
              <option value="inventory">{t('audit.moduleInventory', 'Inventory')}</option>
              <option value="customer">{t('audit.moduleCustomers', 'Customers & CRM')}</option>
              <option value="expense">{t('audit.moduleExpenses', 'Expenses')}</option>
              <option value="organization">{t('audit.moduleOrganization', 'Organization')}</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="md:col-span-3">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">{t('audit.allActions', 'All Actions')}</option>
              <option value="created">created</option>
              <option value="updated">updated</option>
              <option value="deleted">deleted</option>
              <option value="login">login</option>
              <option value="failed_login">failed_login</option>
              <option value="logout">logout</option>
              <option value="password_change">password_change</option>
              <option value="role_change">role_change</option>
              <option value="permission_change">permission_change</option>
              <option value="status_change">status_change</option>
              <option value="export">export</option>
              <option value="sync">sync</option>
            </select>
          </div>

          {/* Clear Button */}
          <div className="md:col-span-1 flex items-center justify-end">
            <button
              onClick={handleClearFilters}
              title={t('audit.clearFilters', 'Clear Filters')}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Calendar className="w-3.5 h-3.5" />
            {t('audit.dateRange', 'Date Range')}:
          </span>

          {(['all', 'today', 'yesterday', '7days', '30days', 'custom'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setDatePreset(preset);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                datePreset === preset
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset === 'all' && t('audit.dateAll', 'All Time')}
              {preset === 'today' && t('audit.dateToday', 'Today')}
              {preset === 'yesterday' && t('audit.dateYesterday', 'Yesterday')}
              {preset === '7days' && t('audit.date7Days', 'Last 7 Days')}
              {preset === '30days' && t('audit.date30Days', 'Last 30 Days')}
              {preset === 'custom' && t('audit.dateCustom', 'Custom Range')}
            </button>
          ))}

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                placeholder={t('audit.dateFrom', 'From Date')}
              />
              <span className="text-slate-400 text-xs">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                placeholder={t('audit.dateTo', 'To Date')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Table / Content */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Loading audit log records...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800">Error loading audit logs</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {(error as any)?.response?.data?.message || 'An unexpected error occurred while fetching audit logs.'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800">{t('audit.noLogs', 'No audit logs found')}</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {t('audit.noLogsDesc', 'No activity logs match your current filter criteria.')}
            </p>
            {(activeSearch || moduleFilter || actionFilter || datePreset !== 'all') && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" />
                {t('audit.clearFilters', 'Clear Filters')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-medium text-xs">
                <tr>
                  <th className="py-3 px-4">{t('audit.timestamp', 'Timestamp')}</th>
                  <th className="py-3 px-4">{t('audit.event', 'Event / Action')}</th>
                  <th className="py-3 px-4">{t('audit.entity', 'Entity')}</th>
                  <th className="py-3 px-4">{t('audit.user', 'Actor')}</th>
                  <th className="py-3 px-4">{t('audit.ip', 'IP Address')}</th>
                  <th className="py-3 px-4 text-right">{t('audit.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>

                    {/* Event Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getEventBadgeClass(
                          log.event
                        )}`}
                      >
                        {log.event}
                      </span>
                    </td>

                    {/* Entity / Target */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800 text-xs">
                          {formatEntityType(log.auditable_type)}
                        </span>
                        {log.auditable_id && (
                          <span className="text-slate-400 font-mono text-[11px]">
                            #{log.auditable_id}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <UserIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate max-w-[160px]">
                          <div className="text-xs font-medium text-slate-800 truncate">
                            {log.user?.name || (log.user_id ? `User #${log.user_id}` : 'System')}
                          </div>
                          {log.user?.email && (
                            <div className="text-[11px] text-slate-400 truncate">{log.user.email}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* IP Address */}
                    <td className="py-3 px-4 text-xs text-slate-600 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.ip_address || '—'}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetail(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        title={t('audit.viewDetails', 'View Details')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('audit.viewDetails', 'View')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && logs.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-slate-200 rounded-md py-1 px-2 bg-white text-xs text-slate-700"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-400 ml-2">
                Showing {Math.min((page - 1) * perPage + 1, meta.total)} to{' '}
                {Math.min(page * perPage, meta.total)} of {meta.total} records
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">
                Page {meta.current_page} of {meta.last_page || 1}
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="p-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, meta.last_page))}
                  disabled={page >= meta.last_page}
                  className="p-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 border-l border-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getEventBadgeClass(
                      selectedLog.event
                    )}`}
                  >
                    {selectedLog.event}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    {t('audit.detailTitle', 'Audit Log Record Details')}
                  </h2>
                  <span className="text-xs font-mono text-slate-400">#{selectedLog.id}</span>
                </div>
                <p className="text-xs text-slate-500">
                  UUID: <span className="font-mono text-slate-600">{selectedLog.uuid}</span>
                </p>
              </div>
              <button
                onClick={handleCloseDetail}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('audit.timestamp', 'Timestamp')}
                  </div>
                  <div className="text-xs font-mono text-slate-700 mt-1">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('audit.user', 'Actor')}
                  </div>
                  <div className="text-xs font-medium text-slate-800 mt-1 truncate">
                    {selectedLog.user?.name || (selectedLog.user_id ? `User #${selectedLog.user_id}` : 'System')}
                  </div>
                  {selectedLog.user?.email && (
                    <div className="text-[11px] text-slate-500 truncate">{selectedLog.user.email}</div>
                  )}
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('audit.entity', 'Entity Target')}
                  </div>
                  <div className="text-xs font-medium text-slate-800 mt-1">
                    {formatEntityType(selectedLog.auditable_type)}
                    {selectedLog.auditable_id ? ` #${selectedLog.auditable_id}` : ''}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    {selectedLog.auditable_type || '—'}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('audit.ip', 'IP Address')}
                  </div>
                  <div className="text-xs font-mono text-slate-700 mt-1">
                    {selectedLog.ip_address || '—'}
                  </div>
                  {selectedLog.company && (
                    <div className="text-[11px] text-slate-500 truncate">
                      {selectedLog.company.name} ({selectedLog.company.code})
                    </div>
                  )}
                </div>
              </div>

              {/* User Agent String */}
              {selectedLog.user_agent && (
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60 font-mono">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">
                    User Agent:
                  </span>
                  <span className="break-all">{selectedLog.user_agent}</span>
                </div>
              )}

              {/* State Changes / Payload Diff */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Attribute Changes & State Payload
                  </h3>
                  <span className="text-[11px] text-slate-400 italic">
                    {t('audit.sensitiveMasked', 'Sensitive data masked automatically')}
                  </span>
                </div>

                {/* Diff View when both old and new exist */}
                {selectedLog.old_values && selectedLog.new_values ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-1/3">Field</th>
                          <th className="py-2.5 px-3 w-1/3 text-rose-700 bg-rose-50/50">
                            {t('audit.beforeValues', 'Previous State (Before)')}
                          </th>
                          <th className="py-2.5 px-3 w-1/3 text-emerald-700 bg-emerald-50/50">
                            {t('audit.afterValues', 'Updated State (After)')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Array.from(
                          new Set([
                            ...Object.keys(selectedLog.old_values),
                            ...Object.keys(selectedLog.new_values),
                          ])
                        ).map((key) => {
                          const oldVal = selectedLog.old_values?.[key];
                          const newVal = selectedLog.new_values?.[key];
                          const isChanged = formatValue(oldVal) !== formatValue(newVal);

                          return (
                            <tr
                              key={key}
                              className={isChanged ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'}
                            >
                              <td className="py-2 px-3 font-mono font-medium text-slate-700">
                                {key}
                              </td>
                              <td className="py-2 px-3 font-mono text-rose-700 bg-rose-50/20 break-all">
                                {formatValue(oldVal)}
                              </td>
                              <td className="py-2 px-3 font-mono text-emerald-700 bg-emerald-50/20 break-all">
                                {formatValue(newVal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : selectedLog.new_values ? (
                  /* Create event - only new values */
                  <div className="border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50/10">
                    <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-200 text-emerald-800 text-xs font-semibold">
                      {t('audit.afterValues', 'Created Attributes (New Values)')}
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-800 overflow-x-auto max-h-60">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                ) : selectedLog.old_values ? (
                  /* Delete event - only old values */
                  <div className="border border-rose-200 rounded-xl overflow-hidden bg-rose-50/10">
                    <div className="bg-rose-50 px-3 py-2 border-b border-rose-200 text-rose-800 text-xs font-semibold">
                      {t('audit.beforeValues', 'Deleted Attributes (Old Values)')}
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-800 overflow-x-auto max-h-60">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                ) : (
                  /* No payload */
                  <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                    {t('audit.noStateChange', 'No state payload captured for this event.')}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                {t('audit.readOnlyNotice', 'Audit logs are immutable and permanently recorded.')}
              </span>
              <button
                onClick={handleCloseDetail}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition cursor-pointer"
              >
                {t('audit.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogList;
