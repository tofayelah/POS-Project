import React, { useState } from 'react';
import { Printer, X, CheckCircle, RotateCcw, FileText, Smartphone } from 'lucide-react';
import { CartItem } from '../../api/pos';
import { Customer } from '../../api/customers';

interface PosReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: {
    invoiceNumber: string;
    saleDate: string;
    items: CartItem[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
    paidAmount: number;
    changeAmount: number;
    paymentMethod: string;
    cardType?: string;
    cardBank?: string;
    customer: Customer | null;
    cashierName: string;
    terminalName: string;
    notes?: string;
  } | null;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyBin?: string;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({
  isOpen,
  onClose,
  saleData,
  companyName = 'RETAILCORE POS_ERP',
  companyAddress = 'Dhaka, Bangladesh',
  companyPhone = '+880 1700-000000',
  companyBin = 'BIN-0012345678-0101',
}) => {
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');
  const [printError, setPrintError] = useState<string | null>(null);

  if (!isOpen || !saleData) return null;

  const handlePrint = (format: 'thermal' | 'a4') => {
    setPrintFormat(format);
    setPrintError(null);
    try {
      setTimeout(() => {
        try {
          window.print();
        } catch (e: any) {
          setPrintError('Print dialog could not be opened. You can retry with Reprint.');
        }
      }, 50);
    } catch (e: any) {
      setPrintError('Printing error: ' + (e.message || 'Unknown printer error'));
    }
  };

  const handleReprint = () => {
    handlePrint(printFormat);
  };

  const totalQty = saleData.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Dynamic print stylesheet for switching between 80mm thermal and A4 formats */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #pos-receipt-printable, #pos-receipt-printable * {
            visibility: visible;
          }
          #pos-receipt-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: ${printFormat === 'thermal' ? '80mm' : '100%'};
            margin: 0;
            padding: ${printFormat === 'thermal' ? '4mm' : '15mm'};
            background: white !important;
            color: black !important;
          }
          @page {
            size: ${printFormat === 'thermal' ? '80mm auto' : 'A4'};
            margin: ${printFormat === 'thermal' ? '0mm' : '10mm'};
          }
        }
      `}</style>

      <div
        className={`bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh] transition-all ${
          printFormat === 'a4' ? 'max-w-3xl w-full' : 'max-w-md w-full'
        }`}
      >
        {/* Modal Action Header (hidden in print) */}
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Sale Completed — Receipt Ready</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Format Selector Pills */}
            <div className="bg-slate-800 p-0.5 rounded flex items-center border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  printFormat === 'thermal'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Thermal (80mm)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  printFormat === 'a4'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                A4 Invoice
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={() => handlePrint(printFormat)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Print ({printFormat === 'thermal' ? '80mm' : 'A4'})
            </button>

            {/* Reprint Button */}
            <button
              type="button"
              onClick={handleReprint}
              title="Reprint receipt"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded flex items-center gap-1 transition-colors border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reprint
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Warning / Error Message if any */}
        {printError && (
          <div className="bg-amber-50 px-4 py-2 text-xs text-amber-800 border-b border-amber-200 flex justify-between items-center print:hidden">
            <span>{printError}</span>
            <button onClick={() => setPrintError(null)} className="text-amber-900 font-bold ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* PRINTABLE RECEIPT CONTENT AREA                           */}
        {/* ======================================================== */}
        <div className="p-6 bg-white overflow-y-auto print:p-0 print:m-0" id="pos-receipt-printable">
          {printFormat === 'thermal' ? (
            /* ------------------------------------------------------ */
            /* 80mm THERMAL RECEIPT LAYOUT                            */
            /* ------------------------------------------------------ */
            <div className="font-mono text-xs text-slate-900 leading-tight space-y-3">
              {/* Company Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-400">
                <h1 className="font-bold text-base uppercase tracking-wider">{companyName}</h1>
                <p className="text-[11px] text-slate-600 mt-0.5">{companyAddress}</p>
                <p className="text-[11px] text-slate-600">Tel: {companyPhone}</p>
                <p className="text-[11px] font-semibold text-slate-700">BIN / VAT Reg: {companyBin}</p>
                <div className="mt-1.5 inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-bold text-[10px]">
                  TAX INVOICE / RETAIL RECEIPT
                </div>
              </div>

              {/* Metadata */}
              <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice No:</span>
                  <span className="font-bold text-slate-900">{saleData.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time:</span>
                  <span>{saleData.saleDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Terminal:</span>
                  <span>{saleData.terminalName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cashier:</span>
                  <span>{saleData.cashierName}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-dotted border-slate-300">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold">{saleData.customer ? saleData.customer.name : 'Walk-in Customer'}</span>
                </div>
                {saleData.customer?.mobile && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mobile:</span>
                    <span>{saleData.customer.mobile}</span>
                  </div>
                )}
              </div>

              {/* Itemized Table */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <div className="grid grid-cols-12 font-bold text-[11px] pb-1 border-b border-slate-300">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                <div className="divide-y divide-dotted divide-slate-200 mt-1">
                  {saleData.items.map((item, idx) => (
                    <div key={item.id || idx} className="py-1 text-[11px]">
                      <div className="grid grid-cols-12">
                        <span className="col-span-6 font-medium truncate">{item.name}</span>
                        <span className="col-span-2 text-right">{item.quantity.toFixed(2)}</span>
                        <span className="col-span-2 text-right">{item.unit_price.toFixed(2)}</span>
                        <span className="col-span-2 text-right font-bold">
                          {(item.quantity * item.unit_price).toFixed(2)}
                        </span>
                      </div>
                      {(item.discount_amount > 0 || item.tax_amount > 0) && (
                        <div className="text-[10px] text-slate-500 pl-2">
                          {item.discount_amount > 0 && <span>Dis: -৳{item.discount_amount.toFixed(2)} </span>}
                          {item.tax_amount > 0 && <span>VAT: +৳{item.tax_amount.toFixed(2)}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary / Totals */}
              <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Gross Total:</span>
                  <span>৳ {saleData.subtotal.toFixed(2)}</span>
                </div>
                {saleData.discountTotal > 0 && (
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>Special Discount:</span>
                    <span>-৳ {saleData.discountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>VAT / Tax Total:</span>
                  <span>৳ {saleData.taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-400">
                  <span>NET PAYABLE:</span>
                  <span>৳ {saleData.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Mode:</span>
                  <span className="font-semibold uppercase">
                    {saleData.paymentMethod} {saleData.cardType ? `(${saleData.cardType})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Paid Amount:</span>
                  <span className="font-bold">৳ {saleData.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Change / Return:</span>
                  <span>৳ {saleData.changeAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Statistics */}
              <div className="py-2 text-[10px] text-slate-500 flex justify-between border-b border-dashed border-slate-300">
                <span>Total Items: {saleData.items.length}</span>
                <span>Total Quantity: {totalQty.toFixed(2)}</span>
              </div>

              {/* Footer */}
              <div className="text-center pt-3 text-[10px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Thank you for shopping with us!</p>
                <p>Exchange possible within 7 days with original receipt.</p>
                <p className="text-[9px] text-slate-400 mt-2">*** RETAILCORE ENTERPRISE POS SYSTEM ***</p>
                <div className="pt-2 flex justify-center">
                  <div className="tracking-[3px] text-[13px] font-bold py-1 px-3 border border-slate-300 bg-slate-50 font-mono">
                    *{saleData.invoiceNumber}*
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ------------------------------------------------------ */
            /* A4 FULL INVOICE LAYOUT                                 */
            /* ------------------------------------------------------ */
            <div className="font-sans text-xs text-slate-800 leading-normal space-y-6">
              {/* Header: Company & Invoice Info */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div>
                  <h1 className="font-extrabold text-2xl tracking-tight text-slate-900">{companyName}</h1>
                  <p className="text-xs text-slate-600 mt-1">{companyAddress}</p>
                  <p className="text-xs text-slate-600">Phone: {companyPhone}</p>
                  <p className="text-xs font-semibold text-slate-700">BIN / VAT Registration: {companyBin}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-bold text-sm px-3 py-1 rounded uppercase tracking-wider mb-2">
                    Tax Invoice
                  </div>
                  <p className="font-mono text-xs">
                    <strong>Invoice #:</strong> {saleData.invoiceNumber}
                  </p>
                  <p className="text-xs">
                    <strong>Date:</strong> {saleData.saleDate}
                  </p>
                  <p className="text-xs">
                    <strong>Terminal:</strong> {saleData.terminalName}
                  </p>
                  <p className="text-xs">
                    <strong>Cashier:</strong> {saleData.cashierName}
                  </p>
                </div>
              </div>

              {/* Bill To Customer Section */}
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200 flex justify-between">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1">Billed To:</h4>
                  <p className="font-bold text-sm text-slate-900">
                    {saleData.customer ? saleData.customer.name : 'Walk-in Customer'}
                  </p>
                  {saleData.customer?.mobile && <p className="text-xs text-slate-600">Phone: {saleData.customer.mobile}</p>}
                  {saleData.customer?.address && <p className="text-xs text-slate-600">Address: {saleData.customer.address}</p>}
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1">Payment Method:</h4>
                  <p className="font-semibold text-slate-900 uppercase">
                    {saleData.paymentMethod} {saleData.cardType ? `(${saleData.cardType})` : ''}
                  </p>
                  {saleData.cardBank && <p className="text-xs text-slate-600">Bank: {saleData.cardBank}</p>}
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                  <tr>
                    <th className="py-2 px-2 border border-slate-300 text-center w-8">#</th>
                    <th className="py-2 px-3 border border-slate-300">Item Description</th>
                    <th className="py-2 px-2 border border-slate-300">Barcode / SKU</th>
                    <th className="py-2 px-2 border border-slate-300 text-right w-16">Qty</th>
                    <th className="py-2 px-2 border border-slate-300 text-right w-20">Unit Rate</th>
                    <th className="py-2 px-2 border border-slate-300 text-right w-16">Dis.</th>
                    <th className="py-2 px-2 border border-slate-300 text-right w-16">VAT</th>
                    <th className="py-2 px-3 border border-slate-300 text-right w-24">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {saleData.items.map((item, index) => (
                    <tr key={item.id || index} className="even:bg-slate-50/50">
                      <td className="py-2 px-2 border border-slate-300 text-center font-mono">{index + 1}</td>
                      <td className="py-2 px-3 border border-slate-300">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        {item.variant_name && item.variant_name !== item.sku && (
                          <div className="text-[11px] text-slate-500">Variant: {item.variant_name}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 font-mono text-[11px] text-slate-600">
                        {item.barcode || item.sku}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-right font-mono font-semibold">
                        {item.quantity.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-right font-mono">
                        ৳{item.unit_price.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-right font-mono text-slate-600">
                        {item.discount_amount > 0 ? `৳${item.discount_amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-right font-mono text-slate-600">
                        {item.tax_amount > 0 ? `৳${item.tax_amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-right font-mono font-bold text-slate-900">
                        ৳{item.line_total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Calculation Totals */}
              <div className="flex justify-between items-start pt-2">
                <div className="w-1/2 space-y-1 text-xs text-slate-600">
                  <p>
                    <strong>Total Items:</strong> {saleData.items.length} | <strong>Total Quantity:</strong>{' '}
                    {totalQty.toFixed(2)}
                  </p>
                  {saleData.notes && (
                    <p className="bg-slate-50 p-2 border border-slate-200 rounded">
                      <strong>Remarks:</strong> {saleData.notes}
                    </p>
                  )}
                  <div className="pt-4 text-[11px] text-slate-500 space-y-0.5">
                    <p>• Goods sold can be exchanged within 7 days upon presentation of original invoice.</p>
                    <p>• Warranty claims are subject to manufacturer terms.</p>
                  </div>
                </div>

                <div className="w-5/12 bg-slate-50 p-3 rounded-md border border-slate-200 font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Gross Subtotal:</span>
                    <span>৳ {saleData.subtotal.toFixed(2)}</span>
                  </div>
                  {saleData.discountTotal > 0 && (
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Total Discount:</span>
                      <span>-৳ {saleData.discountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>VAT / Tax Total:</span>
                    <span>৳ {saleData.taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-300">
                    <span>GRAND TOTAL:</span>
                    <span>৳ {saleData.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-dotted border-slate-300 text-slate-700">
                    <span>Paid Amount:</span>
                    <span>৳ {saleData.paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Change Return:</span>
                    <span>৳ {saleData.changeAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-12 flex justify-between items-end text-xs text-slate-600">
                <div className="text-center w-40 border-t border-slate-400 pt-1">
                  Customer Signature
                </div>
                <div className="text-center w-40 border-t border-slate-400 pt-1">
                  Authorized Signature
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions (hidden in print) */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center print:hidden">
          <span className="text-xs text-slate-500">Press Esc or Close to start new sale</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrint(printFormat)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded shadow-xs transition-colors"
            >
              Done / Next Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
