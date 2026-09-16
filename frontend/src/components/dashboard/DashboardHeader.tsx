import React from 'react';
import { RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  dateRange: string;
  setDateRange: (range: string) => void;
  onRefresh: () => void;
  isFetching: boolean;
}

export function DashboardHeader({ dateRange, setDateRange, onRefresh, isFetching }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Commercial Dashboard</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Real-time overview of your ERP metrics</p>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-4 py-2.5 font-medium shadow-sm outline-none"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7days">Last 7 Days</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_year">This Year</option>
        </select>
        
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 font-medium rounded-lg text-sm px-4 py-2.5 shadow-sm inline-flex items-center gap-2 outline-none disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
