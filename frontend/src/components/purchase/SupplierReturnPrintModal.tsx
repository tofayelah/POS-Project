import React, { useRef } from 'react';
import { Printer, X, Download, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { SupplierReturn } from '../../types/purchase';
import { numberToWordsBDT } from './PurchaseOrderPrintModal';

export interface SupplierReturnPrintModalProps {
  returnData: SupplierReturn;
  company?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    tax_number?: string;
  };
  onClose: () => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const SupplierReturnPrintModal: React.FC<SupplierReturnPrintModalProps> = ({
  returnData,
  company,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const companyName = company?.name || 'RETAILCORE ENTERPRISE POS & ERP';
  const companyAddress = company?.address || 'Corporate Headquarters, Motijheel C/A, Dhaka-1000';
  const companyPhone = company?.phone || '+880 2-9568123 / +880 1711-000000';
  const companyEmail = company?.email || 'accounts@retailcore-erp.com';
  const companyTaxNumber = company?.tax_number || 'BIN: 001928374-0101 (Registered under VAT Act 2012)';

  const grandTotal = returnData.grand_total || 0;
  const inWords = numberToWordsBDT ? numberToWordsBDT(grandTotal) : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Container */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Debit Note / Supplier Return Voucher
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                  {returnData.return_number}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Standard A4 ERP Print Format for Supplier Returns</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print A4 Voucher
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (A4) */}
        <div className="overflow-y-auto p-6 bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printRef}
            id="printable-supplier-return-voucher"
            className="bg-white p-8 w-full max-w-[210mm] min-h-[297mm] shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-8 print:w-full print:max-w-none text-slate-900 font-sans"
          >
            {/* Header / Company Info */}
            <div className="border-b-2 border-slate-900 pb-5 mb-5">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight">{companyName}</h1>
                  <p className="text-xs text-slate-600 mt-1">{companyAddress}</p>
                  <p className="text-xs text-slate-600">Tel: {companyPhone} | Email: {companyEmail}</p>
                  <p className="text-xs font-mono font-medium text-slate-700 mt-0.5">{companyTaxNumber}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-rose-700 text-white px-3 py-1 rounded text-xs font-black tracking-wider uppercase mb-1">
                    DEBIT NOTE / PURCHASE RETURN
                  </div>
                  <div className="text-lg font-black text-slate-900 font-mono tracking-tight">
                    {returnData.return_number}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Date: <span className="font-bold text-slate-800">{formatDate(returnData.return_date)}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Status:{' '}
                    <span className="font-bold uppercase px-1.5 py-0.5 bg-slate-100 rounded text-slate-800">
                      {returnData.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Document References & Supplier Details */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-5">
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Issued To / Supplier
                </span>
                <p className="text-sm font-bold text-slate-900">{returnData.supplier_name || 'N/A'}</p>
                {returnData.supplier?.supplier_code && (
                  <p className="text-slate-600 mt-0.5">Supplier Code: <span className="font-mono font-bold text-slate-800">{returnData.supplier.supplier_code}</span></p>
                )}
                {returnData.supplier?.mobile && (
                  <p className="text-slate-600">Contact: {returnData.supplier.mobile}</p>
                )}
                {returnData.supplier?.address && (
                  <p className="text-slate-600">Address: {returnData.supplier.address}</p>
                )}
                {returnData.supplier?.current_balance !== undefined && (
                  <p className="text-slate-600 mt-1 font-medium">
                    Current A/P Balance: <span className="font-mono font-bold text-rose-700">৳{Number(returnData.supplier.current_balance).toFixed(2)}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Reference & Accounting Details
                </span>
                <div className="flex justify-between border-b border-slate-200 pb-0.5">
                  <span className="text-slate-600">Original Purchase Bill:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {returnData.purchase_invoice_number || 'Direct Product Return'}
                  </span>
                </div>
                {returnData.supplier_invoice_number && (
                  <div className="flex justify-between border-b border-slate-200 pb-0.5">
                    <span className="text-slate-600">Supplier Challan / Bill #:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {returnData.supplier_invoice_number}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200 pb-0.5">
                  <span className="text-slate-600">Dispatching Warehouse:</span>
                  <span className="font-semibold text-slate-800">
                    {returnData.warehouse_name || 'Central Warehouse (WH-01)'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-0.5">
                  <span className="text-slate-600">Settlement Method:</span>
                  <span className="font-bold text-emerald-800">
                    {returnData.settlement_type === 'PAYABLE_ADJUSTMENT'
                      ? 'Debit Note (Adjust Against Payable)'
                      : returnData.settlement_type === 'CASH_REFUND'
                      ? 'Cash Refund'
                      : returnData.settlement_type === 'BANK_REFUND'
                      ? 'Bank Refund'
                      : 'Store Credit'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">General Return Reason:</span>
                  <span className="font-semibold text-slate-800 uppercase">
                    {returnData.return_reason_general || 'Defective / Damaged'}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-5 overflow-hidden rounded-lg border border-slate-300">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">SL</th>
                    <th className="py-2.5 px-3">Product Description & SKU</th>
                    <th className="py-2.5 px-3 text-center">UOM</th>
                    <th className="py-2.5 px-3 text-right">Return Rate</th>
                    <th className="py-2.5 px-3 text-center">Return Qty</th>
                    <th className="py-2.5 px-3">Return Reason</th>
                    <th className="py-2.5 px-3 text-right">Total (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {returnData.items && returnData.items.length > 0 ? (
                    returnData.items.map((item, idx) => (
                      <tr key={`print-item-${item.id ?? idx}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{item.product_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            SKU: {item.sku} {item.barcode ? `| Barcode: ${item.barcode}` : ''}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700 font-medium">{item.unit_name || 'Pcs'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                          ৳{Number(item.return_rate || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">
                          {item.return_qty}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold uppercase text-slate-800">
                            {item.reason}
                          </span>
                          {item.reason_detail && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5">{item.reason_detail}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ৳{Number(item.line_total || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-500 italic">No line items recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations & In Words */}
            <div className="grid grid-cols-2 gap-6 mb-8 text-xs">
              <div className="space-y-3">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Amount in Words (BDT)
                  </span>
                  <p className="font-bold text-slate-900 mt-1 italic">
                    {inWords ? `${inWords} Only` : `Taka ${grandTotal.toFixed(2)} Only`}
                  </p>
                </div>
                {returnData.notes && (
                  <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                      Auditor & Return Notes:
                    </span>
                    <p className="text-slate-800 mt-1 whitespace-pre-wrap">{returnData.notes}</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Items Subtotal:</span>
                  <span className="font-mono font-bold text-slate-800">
                    ৳{Number(returnData.subtotal || grandTotal).toFixed(2)}
                  </span>
                </div>
                {Number(returnData.discount_deducted || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Discount Deducted:</span>
                    <span className="font-mono font-bold text-slate-800">
                      -৳{Number(returnData.discount_deducted).toFixed(2)}
                    </span>
                  </div>
                )}
                {Number(returnData.tax_amount || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax / VAT Adjusted:</span>
                    <span className="font-mono font-bold text-slate-800">
                      ৳{Number(returnData.tax_amount).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t-2 border-slate-900 pt-2 text-slate-950">
                  <span>TOTAL DEBIT AMOUNT:</span>
                  <span className="font-mono text-rose-700 text-base">
                    ৳{Number(grandTotal).toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                  <p>
                    <span className="font-bold">Ledger Impact:</span>{' '}
                    {returnData.settlement_type === 'PAYABLE_ADJUSTMENT'
                      ? `Supplier Accounts Payable credited by ৳${Number(grandTotal).toFixed(2)}.`
                      : `Refund collected in full. No open payable liability remaining.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Signature & Seal Footer */}
            <div className="mt-16 pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
              <div>
                <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-800">
                  Prepared By (Store Officer)
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Signature & Date</p>
              </div>
              <div>
                <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-800">
                  Verified & Approved By
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Inventory / Accounts Manager</p>
              </div>
              <div>
                <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-800">
                  Supplier Representative
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Received / Acknowledged With Seal</p>
              </div>
            </div>

            {/* Print Footer Notice */}
            <div className="mt-8 text-center text-[10px] text-slate-400">
              This is a computer-generated ERP Debit Note voucher produced by RetailCore Cloud ERP.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
