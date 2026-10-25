import React from 'react';
import { X, Printer, Download, Building2 } from 'lucide-react';
import { useCompany } from '../../../contexts/CompanyContext';

export interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  dateRangeStr?: string;
  dateRange?: string;
  columns?: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
  data?: any[];
  headers?: string[];
  rows?: (string | number)[][];
  summaryFields?: { label: string; value: string | number }[];
  summaryCards?: { label: string; value: any }[];
}

export const PurchaseReportPrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  dateRangeStr,
  dateRange,
  columns,
  data,
  headers,
  rows,
  summaryFields = [],
  summaryCards = [],
}) => {
  const { company } = useCompany();

  const effectiveDateRange = dateRangeStr || dateRange;
  const effectiveSummary = summaryFields.length > 0 
    ? summaryFields 
    : summaryCards.map(c => ({ label: c.label, value: c.value }));

  const effectiveColumns = columns || (headers ? headers.map((h, i) => ({
    key: `col_${i}`,
    label: h,
    align: (h.toLowerCase().includes('amount') || h.toLowerCase().includes('total') || h.toLowerCase().includes('cost') || h.toLowerCase().includes('bdt') || h.toLowerCase().includes('qty') || h.toLowerCase().includes('count') || h.toLowerCase().includes('discount') || h.toLowerCase().includes('vat')) ? ('right' as const) : ('left' as const)
  })) : []);

  const effectiveData = data || (rows ? rows.map(r => {
    const obj: Record<string, any> = {};
    r.forEach((cell, i) => {
      obj[`col_${i}`] = cell;
    });
    return obj;
  }) : []);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header (Non-printable) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-indigo-700" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Print Preview — {title}</h2>
              <p className="text-xs text-slate-500 font-medium">Verified ERP Print Engine (BDT / ৳)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Document
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Body Content */}
        <div className="p-8 overflow-y-auto flex-1 font-sans text-slate-900 bg-white" id="printable-report-area">
          {/* Company ERP Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                  {company?.name || 'RetailCore POS & Enterprise ERP'}
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {company?.address || 'Motijheel Commercial Area, Dhaka-1000, Bangladesh'}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Phone: {company?.phone || '+880 1711-000000'}</span>
                  <span>•</span>
                  <span>BIN / VAT Reg: 000123456-0101</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-black uppercase rounded tracking-wider">
                  Official Procurement Report
                </span>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">Printed on: {currentDate}</p>
                {effectiveDateRange && (
                  <p className="text-xs font-bold text-slate-800 mt-0.5">Period: {effectiveDateRange}</p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-indigo-950 tracking-wide">{title}</h2>
                {subtitle && <p className="text-xs text-slate-600 font-medium">{subtitle}</p>}
              </div>
              <div className="text-xs font-bold text-slate-700">
                Total Records: <span className="text-indigo-900 font-black">{effectiveData.length}</span>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-y-2 border-slate-800 bg-slate-100">
                  <th className="py-2.5 px-2 text-slate-900 font-extrabold uppercase tracking-wider text-[11px] w-8">
                    #
                  </th>
                  {effectiveColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`py-2.5 px-2 text-slate-900 font-extrabold uppercase tracking-wider text-[11px] ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {effectiveData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 print:hover:bg-transparent">
                    <td className="py-2 px-2 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                    {effectiveColumns.map((col) => {
                      const val = row[col.key];
                      const isAmount =
                        col.key.includes('amount') ||
                        col.key.includes('cost') ||
                        col.key.includes('total') ||
                        col.key.includes('gross') ||
                        col.key.includes('tax') ||
                        col.key.includes('discount') ||
                        col.key.includes('paid') ||
                        col.key.includes('due') ||
                        col.key.includes('value');

                      let displayVal = val;
                      if (typeof val === 'number') {
                        displayVal = isAmount
                          ? `৳${val.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : val.toLocaleString();
                      }

                      return (
                        <td
                          key={col.key}
                          className={`py-2 px-2 text-slate-800 font-medium ${
                            col.align === 'right'
                              ? 'text-right font-mono'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {displayVal ?? '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary / Totals Box */}
          {effectiveSummary.length > 0 && (
            <div className="mt-6 p-4 rounded-xl border-2 border-slate-300 bg-slate-50">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                Report Summary Totals
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {effectiveSummary.map((field, idx) => (
                  <div key={idx} className="border-r border-slate-200 last:border-none pr-2">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase block">
                      {field.label}
                    </span>
                    <span className="text-sm font-black text-slate-950 font-mono">
                      {typeof field.value === 'number'
                        ? `৳${field.value.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`
                        : field.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signatures Section */}
          <div className="mt-14 pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="border-b border-dashed border-slate-400 w-36 mx-auto mb-1.5 h-6"></div>
              <p className="font-bold text-slate-800">Prepared By</p>
              <p className="text-[10px] text-slate-500">Procurement Officer</p>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-400 w-36 mx-auto mb-1.5 h-6"></div>
              <p className="font-bold text-slate-800">Verified By</p>
              <p className="text-[10px] text-slate-500">Internal Auditor</p>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-400 w-36 mx-auto mb-1.5 h-6"></div>
              <p className="font-bold text-slate-800">Approved By</p>
              <p className="text-[10px] text-slate-500">Head of Finance / GM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
