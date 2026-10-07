import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  AlertCircle,
  Building,
  CheckCircle2
} from 'lucide-react';
import { taxApi } from '../../api/tax';
import { TaxPeriod, VatSummaryReport, MushakReportFoundation } from '../../types/tax';

export const TaxReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'MUSHAK_9_1'>('SUMMARY');
  const [periods, setPeriods] = useState<TaxPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  // Data states
  const [summaryData, setSummaryData] = useState<VatSummaryReport | null>(null);
  const [mushakData, setMushakData] = useState<MushakReportFoundation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      if (activeTab === 'SUMMARY') {
        fetchSummary(selectedPeriodId);
      } else {
        fetchMushak(selectedPeriodId);
      }
    }
  }, [selectedPeriodId, activeTab]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const res = await taxApi.getPeriods();
      if (res.data.success && res.data.data.length > 0) {
        setPeriods(res.data.data);
        setSelectedPeriodId(res.data.data[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load periods');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (periodId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await taxApi.getVatSummary({ tax_period_id: periodId });
      if (res.data.success) {
        setSummaryData(res.data.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load VAT summary report');
    } finally {
      setLoading(false);
    }
  };

  const fetchMushak = async (periodId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await taxApi.getMushakFoundation(periodId);
      if (res.data.success) {
        setMushakData(res.data.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load Mushak 9.1 foundation');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number | undefined | null) => {
    const num = Number(val || 0);
    return `৳${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bangladesh VAT & Tax Reports</h1>
            <p className="text-sm text-gray-500">
              NBR statutory returns, Mushak 9.1 return foundation, and monthly VAT settlement summaries
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriodId || ''}
            onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
            className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.period_name} ({p.period_start} ~ {p.period_end})
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200 print:hidden">
        <button
          onClick={() => setActiveTab('SUMMARY')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            activeTab === 'SUMMARY'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          VAT Executive Summary
        </button>
        <button
          onClick={() => setActiveTab('MUSHAK_9_1')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            activeTab === 'MUSHAK_9_1'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          NBR Mushak-9.1 Return Foundation
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: EXECUTIVE VAT SUMMARY */}
      {activeTab === 'SUMMARY' && summaryData && (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Gross Output VAT (Sales)
              </span>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summaryData.total_output_vat)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                From {formatCurrency(summaryData.total_sales_taxable)} sales base
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Eligible Input VAT (Purchases)
              </span>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                {formatCurrency(summaryData.total_input_vat)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                From {formatCurrency(summaryData.total_purchase_taxable)} procurement base
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Net VAT Payable
              </span>
              <div className="text-2xl font-bold text-indigo-700 mt-2">
                {formatCurrency(summaryData.net_vat_payable)}
              </div>
              <div className="text-xs text-gray-400 mt-1">Output VAT − Input VAT ± Adjustments</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Closing Liability Position
              </span>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summaryData.closing_vat_liability)}
              </div>
              <div className="text-xs text-emerald-600 mt-1">
                Paid: {formatCurrency(summaryData.total_settlements)}
              </div>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">VAT Liability & Credit Breakdown</h3>
              <span className="text-xs text-gray-500">
                Total Transaction Volume: {summaryData.transaction_count}
              </span>
            </div>
            <div className="p-5">
              <table className="min-w-full text-sm divide-y divide-gray-100">
                <tbody className="divide-y divide-gray-100 font-mono">
                  <tr>
                    <td className="py-2.5 text-gray-600 font-sans">Total Taxable Sales Supplies</td>
                    <td className="py-2.5 text-right font-medium text-gray-900">
                      {formatCurrency(summaryData.total_sales_taxable)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-gray-600 font-sans pl-4">└ Gross Output VAT</td>
                    <td className="py-2.5 text-right font-medium text-gray-900">
                      {formatCurrency(summaryData.total_output_vat)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-gray-600 font-sans pl-4">└ Supplementary Duty (SD) Collected</td>
                    <td className="py-2.5 text-right font-medium text-gray-900">
                      {formatCurrency(summaryData.total_output_sd)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-gray-600 font-sans pl-4">└ Less Sales Return VAT Reversals</td>
                    <td className="py-2.5 text-right font-medium text-rose-600">
                      -{formatCurrency(summaryData.total_return_reversals)}
                    </td>
                  </tr>
                  <tr className="bg-gray-50 font-bold">
                    <td className="py-2.5 text-gray-800 font-sans">Net Output Tax (A)</td>
                    <td className="py-2.5 text-right text-gray-900">
                      {formatCurrency(summaryData.net_output_vat)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 text-gray-600 font-sans">Total Taxable Procurement / Purchases</td>
                    <td className="py-2.5 text-right font-medium text-gray-900">
                      {formatCurrency(summaryData.total_purchase_taxable)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-gray-600 font-sans pl-4">└ Eligible Input Tax Credit (VAT)</td>
                    <td className="py-2.5 text-right font-medium text-emerald-600">
                      {formatCurrency(summaryData.total_input_vat)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-gray-600 font-sans pl-4">└ Supplementary Duty (SD) on Inputs</td>
                    <td className="py-2.5 text-right font-medium text-emerald-600">
                      {formatCurrency(summaryData.total_input_sd)}
                    </td>
                  </tr>
                  <tr className="bg-gray-50 font-bold">
                    <td className="py-2.5 text-gray-800 font-sans">Total Input Tax Credit (B)</td>
                    <td className="py-2.5 text-right text-emerald-700">
                      {formatCurrency(summaryData.total_input_vat + summaryData.total_input_sd)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 text-gray-600 font-sans">Statutory Adjustments (Increasing / Decreasing) (C)</td>
                    <td className="py-2.5 text-right font-medium text-gray-900">
                      {formatCurrency(summaryData.total_adjustments)}
                    </td>
                  </tr>

                  <tr className="bg-indigo-50 font-bold text-base">
                    <td className="py-3 text-indigo-950 font-sans">Net VAT Payable for Period [ (A) − (B) + (C) ]</td>
                    <td className="py-3 text-right text-indigo-900 font-bold">
                      {formatCurrency(summaryData.net_vat_payable)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 text-gray-600 font-sans">Treasury Challan Payments Deposited</td>
                    <td className="py-2.5 text-right font-medium text-emerald-600">
                      -{formatCurrency(summaryData.total_settlements)}
                    </td>
                  </tr>

                  <tr className="bg-gray-100 font-bold text-base">
                    <td className="py-3 text-gray-900 font-sans">Closing Balance Due (Government Treasury)</td>
                    <td className="py-3 text-right text-gray-900">
                      {formatCurrency(summaryData.closing_vat_liability)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NBR MUSHAK 9.1 FOUNDATION REPORT */}
      {activeTab === 'MUSHAK_9_1' && mushakData && (
        <div className="bg-white border border-gray-300 rounded-xl p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Government / NBR Header */}
          <div className="text-center border-b pb-6 space-y-1">
            <span className="text-xs uppercase font-bold tracking-widest text-gray-500">
              Government of the People's Republic of Bangladesh • National Board of Revenue
            </span>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">FORM MUSHAK-9.1</h2>
            <p className="text-sm font-semibold text-gray-600">
              Value Added Tax Return Foundation [Rule 47(1)]
            </p>
            <div className="text-xs text-gray-400 mt-1">
              Generated in accordance with Value Added Tax and Supplementary Duty Act, 2012
            </div>
          </div>

          {/* Taxpayer Information Block */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div>
              <div className="font-semibold text-gray-800">
                1. Taxpayer's Legal Name: <span className="font-bold">{mushakData.taxpayer.legal_name}</span>
              </div>
              <div className="mt-1 text-gray-600">
                Trade Name: <span className="font-medium">{mushakData.taxpayer.trade_name}</span>
              </div>
              <div className="mt-1 text-gray-600">
                Address: <span className="font-medium">{mushakData.taxpayer.address}</span>
              </div>
            </div>
            <div>
              <div className="font-mono text-gray-800">
                2. Business Identification Number (BIN):{' '}
                <span className="font-bold tracking-wider">{mushakData.taxpayer.bin}</span>
              </div>
              <div className="mt-1 font-mono text-gray-600">
                TIN: <span className="font-medium">{mushakData.taxpayer.tin}</span>
              </div>
              <div className="mt-1 text-gray-600">
                Commissionerate / Circle: {mushakData.taxpayer.commissionerate} / {mushakData.taxpayer.tax_circle}
              </div>
              <div className="mt-1 text-gray-600">
                Tax Period: {mushakData.period.name} ({mushakData.period.start_date} ~ {mushakData.period.end_date})
              </div>
            </div>
          </div>

          {/* Part 3: Goods & Services Supply (Sales) */}
          <div className="space-y-2">
            <div className="bg-gray-100 px-3 py-1.5 font-bold text-xs text-gray-800 uppercase tracking-wider border-l-4 border-indigo-600">
              Part 3: Supply of Goods and Services (Sales)
            </div>
            <table className="min-w-full text-xs border border-gray-200 divide-y divide-gray-200 font-mono">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-2 text-left font-sans">Description</th>
                  <th className="p-2 text-right">Value (৳)</th>
                  <th className="p-2 text-right">Supplementary Duty (৳)</th>
                  <th className="p-2 text-right">Output VAT (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-2 font-sans">Standard Rated Supplies (15% / Configured)</td>
                  <td className="p-2 text-right">
                    {formatCurrency(mushakData.mushak_9_1_parts.part_3_goods_services_supply.standard_rated_supplies)}
                  </td>
                  <td className="p-2 text-right">
                    {formatCurrency(mushakData.mushak_9_1_parts.part_3_goods_services_supply.supplementary_duty)}
                  </td>
                  <td className="p-2 text-right font-bold text-indigo-900">
                    {formatCurrency(mushakData.mushak_9_1_parts.part_3_goods_services_supply.output_vat)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Part 4: Purchases / Inputs */}
          <div className="space-y-2">
            <div className="bg-gray-100 px-3 py-1.5 font-bold text-xs text-gray-800 uppercase tracking-wider border-l-4 border-emerald-600">
              Part 4: Purchase / Input Details
            </div>
            <table className="min-w-full text-xs border border-gray-200 divide-y divide-gray-200 font-mono">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-2 text-left font-sans">Description</th>
                  <th className="p-2 text-right">Value (৳)</th>
                  <th className="p-2 text-right">Supplementary Duty (৳)</th>
                  <th className="p-2 text-right">Input VAT (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-2 font-sans">Standard Rated Inputs / Purchases</td>
                  <td className="p-2 text-right">
                    {formatCurrency(mushakData.mushak_9_1_parts.part_4_purchases_inputs.standard_rated_inputs)}
                  </td>
                  <td className="p-2 text-right">
                    {formatCurrency(mushakData.mushak_9_1_parts.part_4_purchases_inputs.input_sd)}
                  </td>
                  <td className="p-2 text-right font-bold text-emerald-700">
                    {formatCurrency(mushakData.mushak_9_1_parts.part_4_purchases_inputs.input_vat)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Part 5: Adjustments */}
          <div className="space-y-2">
            <div className="bg-gray-100 px-3 py-1.5 font-bold text-xs text-gray-800 uppercase tracking-wider border-l-4 border-amber-600">
              Part 5: Increasing and Decreasing Adjustments
            </div>
            <table className="min-w-full text-xs border border-gray-200 divide-y divide-gray-200 font-mono">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-2 font-sans text-gray-700">Increasing Adjustments (Debit Notes / Under-reporting)</td>
                  <td className="p-2 text-right font-medium">
                    {formatCurrency(mushakData.mushak_9_1_parts.part_5_adjustments.increasing_adjustments)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-sans text-gray-700">Decreasing Adjustments (Credit Notes / Reversals)</td>
                  <td className="p-2 text-right font-medium text-rose-600">
                    -{formatCurrency(mushakData.mushak_9_1_parts.part_5_adjustments.decreasing_adjustments)}
                  </td>
                </tr>
                <tr className="bg-gray-50 font-bold">
                  <td className="p-2 font-sans text-gray-900">Net Adjustments</td>
                  <td className="p-2 text-right">
                    {formatCurrency(mushakData.mushak_9_1_parts.part_5_adjustments.net_adjustment)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Part 6: Net Tax Calculation & Settlement */}
          <div className="space-y-2">
            <div className="bg-gray-100 px-3 py-1.5 font-bold text-xs text-gray-800 uppercase tracking-wider border-l-4 border-blue-600">
              Part 6: Net Tax Calculation & Government Treasury Settlement
            </div>
            <table className="min-w-full text-xs border border-gray-200 divide-y divide-gray-200 font-mono">
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-indigo-50 font-bold">
                  <td className="p-2.5 font-sans text-indigo-950">Net VAT Payable for Return Period</td>
                  <td className="p-2.5 text-right text-indigo-900 text-sm">
                    {formatCurrency(mushakData.mushak_9_1_parts.part_6_net_tax_calculation.net_payable_amount)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans text-gray-700">Treasury Challan Deposited</td>
                  <td className="p-2.5 text-right text-emerald-600 font-semibold">
                    -{formatCurrency(mushakData.mushak_9_1_parts.part_6_net_tax_calculation.treasury_payments)}
                  </td>
                </tr>
                <tr className="bg-gray-100 font-bold">
                  <td className="p-2.5 font-sans text-gray-900">Closing Balance Payable to NBR</td>
                  <td className="p-2.5 text-right text-gray-900 text-sm">
                    {formatCurrency(mushakData.mushak_9_1_parts.part_6_net_tax_calculation.closing_payable)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Statutory Disclaimer & Signature Footer */}
          <div className="pt-6 border-t border-gray-200 text-xs text-gray-500 space-y-4">
            <p className="italic">{mushakData.legal_disclaimer}</p>
            <div className="flex justify-between pt-8 text-gray-700">
              <div>
                <div className="border-t border-gray-400 w-48 text-center pt-1">Prepared By / Accountant</div>
              </div>
              <div>
                <div className="border-t border-gray-400 w-48 text-center pt-1">Authorized Signatory / MD</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReports;
