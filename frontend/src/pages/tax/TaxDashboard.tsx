import React from 'react';
import { Calculator, Percent, FileCheck } from 'lucide-react';

export const TaxDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <Calculator className="w-7 h-7 text-indigo-600" />
        Tax Engine & VAT Compliance
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border">
          <span className="text-xs text-slate-500 uppercase font-bold">Total Sales Tax Collected</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">$4,850.20</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border">
          <span className="text-xs text-slate-500 uppercase font-bold">Purchase Input VAT</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">$1,220.00</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border">
          <span className="text-xs text-slate-500 uppercase font-bold">Net Tax Payable</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">$3,630.20</p>
        </div>
      </div>
    </div>
  );
};

export const TaxProfileManagement: React.FC = () => (
  <div className="p-6 space-y-6">
    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tax Profiles & Registrations</h1>
    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border"><p className="text-sm text-slate-500">Configure standard VAT profiles, tax IDs, and rates</p></div>
  </div>
);

export const TaxRuleManagement: React.FC = () => (
  <div className="p-6 space-y-6">
    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tax Rules & Calculation Logic</h1>
    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border"><p className="text-sm text-slate-500">Manage item-level and regional tax rates</p></div>
  </div>
);

export const TaxPeriodManagement: React.FC = () => (
  <div className="p-6 space-y-6">
    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tax Periods & Filing</h1>
    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border"><p className="text-sm text-slate-500">Manage monthly/quarterly tax reporting periods</p></div>
  </div>
);

export const TaxTransactionRegister: React.FC = () => (
  <div className="p-6 space-y-6">
    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tax Transaction Register</h1>
    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border"><p className="text-sm text-slate-500">Detailed tax audit trail for sales and purchases</p></div>
  </div>
);

export const TaxReconciliationView: React.FC = () => (
  <div className="p-6 space-y-6">
    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tax Ledger Reconciliation</h1>
    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border"><p className="text-sm text-slate-500">Reconcile output vs input tax entries</p></div>
  </div>
);

export const TaxAdjustmentManagement: React.FC = () => (
  <div className="p-6 space-y-6">
    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tax Adjustments</h1>
    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border"><p className="text-sm text-slate-500">Record manual tax adjustments and credits</p></div>
  </div>
);

export const TaxReports: React.FC = () => (
  <div className="p-6 space-y-6">
    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tax Compliance Reports</h1>
    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border"><p className="text-sm text-slate-500">Export statutory VAT returns and summary reports</p></div>
  </div>
);
