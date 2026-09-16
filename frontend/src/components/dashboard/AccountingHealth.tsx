import React from 'react';
import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { DashboardSummary } from './types';

interface AccountingHealthProps {
  health: DashboardSummary['accounting_health'];
}

export function AccountingHealth({ health }: AccountingHealthProps) {
  const isHealthy = health.unbalanced_journals === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
      <div className="mb-6">
        <h3 className="font-extrabold text-lg text-slate-900">Accounting Health</h3>
        <p className="text-sm text-slate-500 font-medium">System ledger integrity</p>
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-6">
        <div className={`flex items-center gap-4 p-4 rounded-xl border ${isHealthy ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
          <div className="shrink-0">
            {isHealthy ? <CheckCircle2 className="w-8 h-8 text-emerald-600" /> : <AlertTriangle className="w-8 h-8 text-amber-600" />}
          </div>
          <div>
            <h4 className="font-bold text-lg">{isHealthy ? 'Accounting Balanced' : 'Accounting Issues Detected'}</h4>
            <p className={`text-sm font-medium ${isHealthy ? 'text-emerald-600' : 'text-amber-700'}`}>
              {isHealthy ? 'All posted journal entries are balanced.' : 'There are unbalanced journal entries requiring attention.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-2 text-slate-500 font-bold text-sm">
              <FileText className="w-4 h-4" />
              Posted Journals
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{health.posted_journals.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-2 text-slate-500 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              Unbalanced
            </div>
            <p className={`text-2xl font-extrabold ${health.unbalanced_journals > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {health.unbalanced_journals.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
