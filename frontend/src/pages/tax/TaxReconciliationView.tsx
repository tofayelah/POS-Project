import React, { useState, useEffect } from 'react';
import {
  Scale,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { taxApi } from '../../api/tax';
import { TaxPeriod, TaxReconciliation } from '../../types/tax';

export const TaxReconciliationView: React.FC = () => {
  const [periods, setPeriods] = useState<TaxPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [reconciliation, setReconciliation] = useState<TaxReconciliation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchReconciliation(selectedPeriodId);
    } else {
      setReconciliation(null);
    }
  }, [selectedPeriodId]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const res = await taxApi.getPeriods();
      if (res.data.success && res.data.data.length > 0) {
        setPeriods(res.data.data);
        // Default to first period
        setSelectedPeriodId(res.data.data[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load tax periods');
    } finally {
      setLoading(false);
    }
  };

  const fetchReconciliation = async (periodId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await taxApi.getReconciliation(periodId);
      if (res.data.success) {
        setReconciliation(res.data.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load reconciliation record');
    } finally {
      setLoading(false);
    }
  };

  const handleRunReconciliation = async () => {
    if (!selectedPeriodId) return;
    try {
      setReconciling(true);
      setError(null);
      setSuccessMessage(null);
      const res = await taxApi.reconcilePeriod(selectedPeriodId);
      if (res.data.success) {
        setReconciliation(res.data.data);
        setSuccessMessage('Tax reconciliation completed successfully.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Reconciliation execution failed.');
    } finally {
      setReconciling(false);
    }
  };

  const formatCurrency = (val: number | undefined | null) => {
    const num = Number(val || 0);
    return `৳${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tax Subledger vs GL Reconciliation</h1>
              <p className="text-sm text-gray-500">
                Automated double-entry audit between tax subledger and General Ledger balances
              </p>
            </div>
          </div>
        </div>

        {/* Action and Period selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedPeriodId || ''}
              onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
              className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading || reconciling}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.period_name} ({p.period_start} to {p.period_end}) - [{p.status}]
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunReconciliation}
            disabled={!selectedPeriodId || reconciling}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${reconciling ? 'animate-spin' : ''}`} />
            {reconciling ? 'Reconciling...' : 'Run Reconciliation'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Period Summary Banner */}
      {selectedPeriod && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Active Period</span>
              <p className="font-semibold text-gray-900">{selectedPeriod.period_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Date Range: </span>
              <span className="font-medium text-gray-800">
                {selectedPeriod.period_start} ~ {selectedPeriod.period_end}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Status: </span>
              <span
                className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                  selectedPeriod.status === 'CLOSED'
                    ? 'bg-purple-100 text-purple-700'
                    : selectedPeriod.status === 'FILED'
                    ? 'bg-blue-100 text-blue-700'
                    : selectedPeriod.status === 'OPEN'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {selectedPeriod.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Main Card */}
      {reconciliation ? (
        <div className="space-y-6">
          {/* Status Header */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              reconciliation.status === 'RECONCILED'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {reconciliation.status === 'RECONCILED' ? (
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              )}
              <div>
                <h3 className="font-bold text-base">
                  Reconciliation Status: {reconciliation.status}
                </h3>
                <p className="text-xs opacity-80">
                  Audit Ref: {reconciliation.reconciliation_number} • Date: {reconciliation.reconciled_date}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-75">Net VAT Payable</span>
              <p className="text-xl font-bold">{formatCurrency(reconciliation.net_tax_payable)}</p>
            </div>
          </div>

          {/* 3-Way Audit Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Output VAT Box */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">Output VAT Audit (Sales)</h3>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    Math.abs(reconciliation.output_vat_difference) < 0.01
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {Math.abs(reconciliation.output_vat_difference) < 0.01 ? 'MATCHED' : 'DISCREPANCY'}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                  <span className="text-gray-500">Subledger Total (tax_transactions):</span>
                  <span className="font-mono font-medium text-gray-900">
                    {formatCurrency(reconciliation.output_vat_subledger)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                  <span className="text-gray-500">General Ledger (GL VAT Payable Credit):</span>
                  <span className="font-mono font-medium text-gray-900">
                    {formatCurrency(reconciliation.output_vat_gl)}
                  </span>
                </div>
                <div className="flex justify-between py-2 bg-gray-50 px-3 rounded-lg">
                  <span className="font-medium text-gray-700">Audit Variance:</span>
                  <span
                    className={`font-mono font-bold ${
                      Math.abs(reconciliation.output_vat_difference) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(reconciliation.output_vat_difference)}
                  </span>
                </div>
              </div>
            </div>

            {/* Input VAT Box */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">Input VAT Audit (Purchases)</h3>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    Math.abs(reconciliation.input_vat_difference) < 0.01
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {Math.abs(reconciliation.input_vat_difference) < 0.01 ? 'MATCHED' : 'DISCREPANCY'}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                  <span className="text-gray-500">Subledger Total (tax_transactions):</span>
                  <span className="font-mono font-medium text-gray-900">
                    {formatCurrency(reconciliation.input_vat_subledger)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-gray-100">
                  <span className="text-gray-500">General Ledger (GL Input VAT Debit):</span>
                  <span className="font-mono font-medium text-gray-900">
                    {formatCurrency(reconciliation.input_vat_gl)}
                  </span>
                </div>
                <div className="flex justify-between py-2 bg-gray-50 px-3 rounded-lg">
                  <span className="font-medium text-gray-700">Audit Variance:</span>
                  <span
                    className={`font-mono font-bold ${
                      Math.abs(reconciliation.input_vat_difference) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(reconciliation.input_vat_difference)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Adjustments & Net Position Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
              Tax Adjustments & Net Tax Settlement Position
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 font-medium">Net Output Tax</span>
                <p className="text-lg font-bold text-gray-800 mt-1">
                  {formatCurrency(reconciliation.output_vat_subledger)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 font-medium">Less Eligible Input Tax</span>
                <p className="text-lg font-bold text-emerald-600 mt-1">
                  -{formatCurrency(reconciliation.input_vat_subledger)}
                </p>
              </div>
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                <span className="text-xs text-indigo-700 font-medium">Net Payable to NBR</span>
                <p className="text-lg font-bold text-indigo-900 mt-1">
                  {formatCurrency(reconciliation.net_tax_payable)}
                </p>
              </div>
            </div>
          </div>

          {/* Discrepancy Exceptions Table */}
          {reconciliation.exceptions && reconciliation.exceptions.length > 0 && (
            <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-rose-50 px-5 py-3 border-b border-rose-200 flex items-center gap-2 text-rose-800 font-semibold text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Detected Discrepancy Exceptions ({reconciliation.exceptions.length})
              </div>
              <div className="divide-y divide-gray-100">
                {reconciliation.exceptions.map((ex, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        {ex.type}
                      </span>
                      <p className="text-sm text-gray-800 mt-1">{ex.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400">Variance</span>
                      <p className="font-mono font-bold text-rose-600">{formatCurrency(ex.difference)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-700">No Reconciliation Audit Run Yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
            Click "Run Reconciliation" above to execute an automated audit between your Tax Subledger and General
            Ledger for this tax period.
          </p>
        </div>
      )}
    </div>
  );
};

export default TaxReconciliationView;
