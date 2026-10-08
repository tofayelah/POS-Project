import React, { useEffect, useState } from 'react';
import {
  Users,
  Briefcase,
  DollarSign,
  RefreshCw,
  Building2,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { biApi } from '../../api/bi';
import { HrBiData } from '../../types/bi';
import { formatCurrency, formatNumber } from '../../utils/format';

export const HRBI: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<HrBiData | null>(null);

  useEffect(() => {
    loadHrBi();
  }, []);

  const loadHrBi = async () => {
    setLoading(true);
    try {
      const resp = await biApi.getHrBi();
      setData(resp.data.data);
    } catch (err) {
      console.error('Failed to load HR BI', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary;
  const depts = data?.by_department;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bi.hrBi')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('bi.subtitle')}
          </p>
        </div>

        <button
          onClick={loadHrBi}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-rose-600" />
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Total Headcount
              </span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatNumber(summary?.total_employees || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {summary?.active_employees || 0} active employees
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Total Payroll Spend
              </span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(summary?.total_payroll_spend || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Average Salary
              </span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(summary?.average_salary || 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Departments
              </span>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {depts?.length || 0}
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-rose-500" />
              Department Workforce & Salary Distribution
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Department</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Headcount</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Payroll Spend</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Avg Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {depts && depts.length > 0 ? (
                    depts.map((d) => (
                      <tr key={d.department_id}>
                        <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{d.department_name}</td>
                        <td className="py-2.5 px-3 text-right">{formatNumber(d.employee_count)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-600">{formatCurrency(d.total_salary)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-500">
                          {formatCurrency(d.employee_count > 0 ? d.total_salary / d.employee_count : 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">
                        {t('common.noData')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
