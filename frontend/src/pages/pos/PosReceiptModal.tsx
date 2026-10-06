import React, { useState } from 'react';
import { Printer, X, CheckCircle, RotateCcw, FileText, Smartphone } from 'lucide-react';
import { CartItem, posApi } from '../../api/pos';
import { Customer } from '../../api/customers';

export interface PosReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: {
    invoiceNumber: string;
    saleDate: string;
    items: CartItem[];
    subtotal: number;
    discountTotal: number;
    specialDiscount?: number;
    discountPercent?: number;
    taxTotal: number;
    grandTotal: number;
    paidAmount: number;
    changeAmount: number;
    dueAmount?: number;
    paymentMethod: string;
    cardType?: string;
    cardBank?: string;
    customer: Customer | null;
    cashierName: string;
    terminalName: string;
    branchName?: string;
    saleType?: string;
    notes?: string;
    previousPoints?: number;
    pointsRedeemed?: number;
    pointsEarned?: number;
    customerPointsBalance?: number;
    payments?: Array<{ method: string; amount: number; transaction_ref?: string }>;
    // Phase 5.5 enhancements
    saleId?: number;
    isReprint?: boolean;
    reprintCount?: number;
    sessionNumber?: string;
    receiptType?: 'SALE' | 'SALES_RETURN';
    returnNumber?: string;
    originalInvoiceNumber?: string;
    refundTotal?: number;
    cashRefundAmount?: number;
    customerCreditAmount?: number;
    storeCreditAmount?: number;
    pointsReversed?: number;
  } | null;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyBin?: string;
  companyWebsite?: string;
  companyLogo?: string;
  branchName?: string;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({
  isOpen,
  onClose,
  saleData,
  companyName = 'RETAILCORE POS_ERP',
  companyAddress = 'Dhaka, Bangladesh',
  companyPhone = '+880 1700-000000',
  companyBin = 'BIN-0012345678-0101',
  companyWebsite = 'www.retailcore-erp.com',
  companyLogo,
  branchName,
}) => {
  const [printFormat, setPrintFormat] = useState<'58mm' | '80mm' | 'a4'>('80mm');
  const [printError, setPrintError] = useState<string | null>(null);
  const [isReprintCopy, setIsReprintCopy] = useState<boolean>(Boolean(saleData?.isReprint));
  const [reprintCounter, setReprintCounter] = useState<number>(saleData?.reprintCount || 0);

  if (!isOpen || !saleData) return null;

  const handlePrint = (format: '58mm' | '80mm' | 'a4') => {
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
      setPrintError('Printing error: ' + (e?.message || 'Unknown printer error'));
    }
  };

  const handleReprint = async () => {
    setIsReprintCopy(true);
    setReprintCounter((prev) => prev + 1);
    if (saleData?.saleId) {
      try {
        await posApi.reprintSaleReceipt(saleData.saleId, 'Reprint requested from POS terminal');
      } catch (e) {
        console.warn('Backend reprint audit log notification failed, proceeding with print:', e);
      }
    }
    handlePrint(printFormat);
  };

  const totalQty = saleData.items.reduce((sum, item) => sum + item.quantity, 0);
  const activeBranch = branchName || saleData.branchName || 'Main Branch';
  const customerCode =
    saleData.customer?.customer_code ||
    (saleData.customer?.id ? `CUST-${String(saleData.customer.id).padStart(4, '0')}` : undefined);
  const activeSpecialDiscount =
    saleData.specialDiscount !== undefined ? saleData.specialDiscount : saleData.discountTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Dynamic print stylesheet for switching between 58mm, 80mm thermal and A4 formats */}
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
            width: ${printFormat === '58mm' ? '58mm' : printFormat === '80mm' ? '80mm' : '100%'};
            margin: 0;
            padding: ${printFormat === '58mm' ? '2mm' : printFormat === '80mm' ? '3mm' : '12mm'};
            background: white !important;
            color: black !important;
          }
          @page {
            size: ${printFormat === '58mm' ? '58mm auto' : printFormat === '80mm' ? '80mm auto' : 'A4'};
            margin: ${printFormat === 'a4' ? '10mm' : '0mm'};
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
            <span className="font-semibold text-sm">
              {saleData.receiptType === 'SALES_RETURN' ? 'Return Completed — Voucher Ready' : 'Sale Completed — Sales Slip Ready'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Format Selector Pills */}
            <div className="bg-slate-800 p-0.5 rounded flex items-center border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('58mm')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  printFormat === '58mm'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('80mm')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  printFormat === '80mm'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                80mm
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
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print ({printFormat === '58mm' ? '58mm' : printFormat === '80mm' ? '80mm' : 'A4'})
            </button>

            {/* Reprint Button */}
            <button
              type="button"
              onClick={handleReprint}
              title="Reprint sales slip with audit log tracking"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reprint
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Warning / Error Message if any */}
        {printError && (
          <div className="bg-amber-50 px-4 py-2 text-xs text-amber-800 border-b border-amber-200 flex justify-between items-center print:hidden">
            <span>{printError}</span>
            <button onClick={() => setPrintError(null)} className="text-amber-900 font-bold ml-2 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* PRINTABLE RECEIPT CONTENT AREA                           */}
        {/* ======================================================== */}
        <div className="p-6 bg-white overflow-y-auto print:p-0 print:m-0" id="pos-receipt-printable">
          {printFormat === '58mm' ? (
            /* ------------------------------------------------------ */
            /* 58mm COMPACT THERMAL RECEIPT LAYOUT                     */
            /* ------------------------------------------------------ */
            <div className="font-mono text-[9.5px] text-slate-900 leading-tight space-y-2 max-w-[58mm] mx-auto">
              {(isReprintCopy || saleData.isReprint) && (
                <div className="py-1 px-1 border-2 border-black font-black text-center text-[9px] tracking-widest uppercase bg-slate-100">
                  *** REPRINT COPY {reprintCounter > 0 ? `(#${reprintCounter})` : ''} ***
                </div>
              )}

              {/* Company Header */}
              <div className="text-center pb-1.5 border-b border-dashed border-slate-400 space-y-0.5">
                {companyLogo && (
                  <div className="flex justify-center mb-0.5">
                    <img src={companyLogo} alt="Logo" className="max-h-7 object-contain" />
                  </div>
                )}
                <h1 className="font-black text-xs uppercase tracking-wider">{companyName}</h1>
                {activeBranch && <p className="text-[9px] font-bold uppercase">{activeBranch}</p>}
                <p className="text-[8.5px] text-slate-600">{companyAddress}</p>
                <p className="text-[8.5px] text-slate-600">Tel: {companyPhone}</p>
                <p className="text-[8.5px] font-semibold text-slate-700">BIN: {companyBin}</p>
                <div className="mt-1 inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-bold text-[8.5px] tracking-wide uppercase">
                  {saleData.receiptType === 'SALES_RETURN' ? 'Return & Refund Slip' : 'Tax Invoice / Sales Slip'}
                </div>
              </div>

              {/* Metadata */}
              <div className="py-1 border-b border-dashed border-slate-400 text-[9px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{saleData.receiptType === 'SALES_RETURN' ? 'Return #:' : 'Inv #:'}</span>
                  <span className="font-bold text-slate-900">{saleData.returnNumber || saleData.invoiceNumber}</span>
                </div>
                {saleData.receiptType === 'SALES_RETURN' && saleData.originalInvoiceNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Orig Inv:</span>
                    <span className="font-semibold">{saleData.originalInvoiceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{saleData.saleDate}</span>
                </div>
                {saleData.sessionNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shift:</span>
                    <span className="font-mono">{saleData.sessionNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Cashier:</span>
                  <span>{saleData.cashierName}</span>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-dotted border-slate-300">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold">{saleData.customer ? saleData.customer.name : 'Walk-in'}</span>
                </div>
                {saleData.customer?.mobile && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mobile:</span>
                    <span>{saleData.customer.mobile}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-1 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold text-[9px] pb-0.5 border-b border-slate-300 uppercase">
                  <span>Item / Qty</span>
                  <span>Total</span>
                </div>
                <div className="divide-y divide-dotted divide-slate-200 mt-0.5">
                  {saleData.items.map((item, idx) => {
                    const lineDiscount = item.discount_amount || 0;
                    const lineTax = item.tax_amount || 0;
                    const calculatedLineTotal =
                      item.line_total !== undefined
                        ? item.line_total
                        : item.quantity * item.unit_price - lineDiscount + lineTax;

                    return (
                      <div key={item.id || idx} className="py-1 text-[9px]">
                        <div className="font-medium break-words leading-tight">{item.name}</div>
                        {item.variant_name && item.variant_name !== item.name && (
                          <div className="text-[8px] text-slate-600 italic">[{item.variant_name}]</div>
                        )}
                        <div className="flex justify-between items-baseline pt-0.5">
                          <span className="text-slate-700">
                            {item.quantity} x ৳{item.unit_price.toFixed(2)}
                          </span>
                          <span className="font-bold text-slate-900">৳{calculatedLineTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="py-1 border-b border-dashed border-slate-400 text-[9px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">Items/Qty:</span>
                  <span className="font-bold">{saleData.items.length} / {totalQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal:</span>
                  <span>৳{saleData.subtotal.toFixed(2)}</span>
                </div>
                {activeSpecialDiscount > 0 && (
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Discount:</span>
                    <span>-৳{activeSpecialDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>VAT / Tax:</span>
                  <span>৳{saleData.taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-black pt-1 border-t border-slate-400">
                  <span>{saleData.receiptType === 'SALES_RETURN' ? 'REFUND TOTAL:' : 'NET TOTAL:'}</span>
                  <span>৳{(saleData.receiptType === 'SALES_RETURN' && saleData.refundTotal !== undefined ? saleData.refundTotal : saleData.grandTotal).toFixed(2)}</span>
                </div>
              </div>

              {/* Loyalty */}
              {(Boolean(saleData.pointsRedeemed) || Boolean(saleData.pointsEarned) || saleData.customerPointsBalance !== undefined || Boolean(saleData.pointsReversed)) && (
                <div className="py-1 border-b border-dashed border-slate-400 text-[8.5px] space-y-0.5 bg-slate-50 px-1 rounded">
                  <span className="font-bold block uppercase text-[8px]">Loyalty Summary</span>
                  {Boolean(saleData.pointsRedeemed) && (
                    <div className="flex justify-between">
                      <span>Redeemed:</span>
                      <span>-{saleData.pointsRedeemed} pts</span>
                    </div>
                  )}
                  {Boolean(saleData.pointsEarned) && (
                    <div className="flex justify-between">
                      <span>Earned:</span>
                      <span>+{saleData.pointsEarned} pts</span>
                    </div>
                  )}
                  {Boolean(saleData.pointsReversed) && (
                    <div className="flex justify-between text-red-700">
                      <span>Reversed:</span>
                      <span>-{saleData.pointsReversed} pts</span>
                    </div>
                  )}
                  {saleData.customerPointsBalance !== undefined && (
                    <div className="flex justify-between font-bold border-t border-dotted border-slate-300 pt-0.5">
                      <span>Balance:</span>
                      <span>{saleData.customerPointsBalance} pts</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payments */}
              <div className="py-1 border-b border-dashed border-slate-400 text-[9px] space-y-0.5">
                <div className="flex justify-between font-medium">
                  <span>{saleData.receiptType === 'SALES_RETURN' ? 'Refund:' : 'Method:'}</span>
                  <span className="uppercase">{saleData.paymentMethod || 'CASH'}</span>
                </div>
                {saleData.receiptType === 'SALES_RETURN' ? (
                  <>
                    {saleData.cashRefundAmount !== undefined && saleData.cashRefundAmount > 0 && (
                      <div className="flex justify-between font-semibold">
                        <span>Cash Refund:</span>
                        <span>৳{saleData.cashRefundAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {saleData.customerCreditAmount !== undefined && saleData.customerCreditAmount > 0 && (
                      <div className="flex justify-between font-semibold">
                        <span>Store Credit:</span>
                        <span>৳{saleData.customerCreditAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {saleData.storeCreditAmount !== undefined && saleData.storeCreditAmount > 0 && (
                      <div className="flex justify-between text-slate-800">
                        <span>Store Credit:</span>
                        <span>৳{saleData.storeCreditAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span className="font-bold">৳{saleData.paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Change:</span>
                      <span>৳{saleData.changeAmount.toFixed(2)}</span>
                    </div>
                    {saleData.dueAmount !== undefined && saleData.dueAmount > 0.0001 && (
                      <div className="flex justify-between font-bold">
                        <span>Due:</span>
                        <span>৳{saleData.dueAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="text-center text-[8px] space-y-0.5 pt-1">
                <div className="tracking-[2px] font-bold">*{saleData.returnNumber || saleData.invoiceNumber}*</div>
                <p className="font-bold uppercase">
                  {saleData.receiptType === 'SALES_RETURN' ? '*** SALES RETURN VOUCHER ***' : '*** THANK YOU FOR SHOPPING ***'}
                </p>
                <p>{saleData.receiptType === 'SALES_RETURN' ? 'Refund processed as per policy.' : 'Exchange within 7 days with slip.'}</p>
                <div className="border-t border-dotted border-slate-300 pt-0.5 text-[7.5px] text-slate-500">
                  RetailCore POS ERP
                </div>
              </div>
            </div>
          ) : printFormat === '80mm' ? (
            /* ------------------------------------------------------ */
            /* 80mm THERMAL RECEIPT LAYOUT                            */
            /* ------------------------------------------------------ */
            <div className="font-mono text-xs text-slate-900 leading-tight space-y-3 max-w-[80mm] mx-auto">
              {(isReprintCopy || saleData.isReprint) && (
                <div className="py-1 px-1 border-2 border-black font-black text-center text-[10px] tracking-widest uppercase bg-slate-100">
                  *** REPRINT COPY {reprintCounter > 0 ? `(#${reprintCounter})` : ''} ***
                </div>
              )}
              {/* Company Header */}
              <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                {companyLogo && (
                  <div className="flex justify-center mb-1">
                    <img src={companyLogo} alt="Logo" className="max-h-10 object-contain" />
                  </div>
                )}
                <h1 className="font-bold text-base uppercase tracking-wider">{companyName}</h1>
                {activeBranch && <p className="text-[11px] font-bold uppercase">{activeBranch}</p>}
                <p className="text-[11px] text-slate-600">{companyAddress}</p>
                <p className="text-[11px] text-slate-600">Tel: {companyPhone}</p>
                {companyWebsite && <p className="text-[10px] text-slate-600">{companyWebsite}</p>}
                <p className="text-[11px] font-semibold text-slate-700">BIN / VAT Reg: {companyBin}</p>
                <div className="mt-1.5 inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-bold text-[10px] tracking-wide uppercase">
                  {saleData.receiptType === 'SALES_RETURN' ? 'Sales Return & Refund Voucher' : 'TAX INVOICE / SALES SLIP'}
                </div>
              </div>

              {/* Metadata */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{saleData.receiptType === 'SALES_RETURN' ? 'Return No:' : 'Invoice No:'}</span>
                  <span className="font-bold text-slate-900">{saleData.returnNumber || saleData.invoiceNumber}</span>
                </div>
                {saleData.receiptType === 'SALES_RETURN' && saleData.originalInvoiceNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Original Invoice:</span>
                    <span className="font-semibold text-slate-900">{saleData.originalInvoiceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time:</span>
                  <span>{saleData.saleDate}</span>
                </div>
                {saleData.sessionNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shift / Session:</span>
                    <span className="font-mono">{saleData.sessionNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Sale Type:</span>
                  <span className="font-semibold uppercase">{saleData.saleType || (saleData.receiptType === 'SALES_RETURN' ? 'SALES RETURN' : 'RETAIL / COUNTER SALE')}</span>
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
                {customerCode && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cust Code:</span>
                    <span className="font-mono">{customerCode}</span>
                  </div>
                )}
              </div>

              {/* Itemized Table */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <div className="grid grid-cols-12 font-bold text-[11px] pb-1 border-b border-slate-300">
                  <span className="col-span-6">Item Description</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                <div className="divide-y divide-dotted divide-slate-200 mt-1">
                  {saleData.items.map((item, idx) => {
                    const lineDiscount = item.discount_amount || 0;
                    const lineTax = item.tax_amount || 0;
                    const calculatedLineTotal =
                      item.line_total !== undefined
                        ? item.line_total
                        : item.quantity * item.unit_price - lineDiscount + lineTax;

                    return (
                      <div key={item.id || idx} className="py-1 text-[11px]">
                        <div className="grid grid-cols-12 items-baseline">
                          <div className="col-span-6 pr-1">
                            <span className="font-medium break-words leading-tight">{item.name}</span>
                            {item.variant_name && item.variant_name !== item.name && (
                              <span className="text-[10px] text-slate-600 block italic">[{item.variant_name}]</span>
                            )}
                            <span className="text-[9px] text-slate-500 block">
                              {item.barcode ? `BC: ${item.barcode}` : item.sku ? `SKU: ${item.sku}` : ''}
                            </span>
                          </div>
                          <span className="col-span-2 text-center">{item.quantity}</span>
                          <span className="col-span-2 text-right">৳{item.unit_price.toFixed(2)}</span>
                          <span className="col-span-2 text-right font-bold">
                            ৳{calculatedLineTotal.toFixed(2)}
                          </span>
                        </div>
                        {(lineDiscount > 0 || lineTax > 0) && (
                          <div className="text-[10px] text-slate-500 pl-2">
                            {lineDiscount > 0 && <span>Dis: -৳{lineDiscount.toFixed(2)} </span>}
                            {lineTax > 0 && <span>VAT: +৳{lineTax.toFixed(2)}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary / Totals */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Items / Qty:</span>
                  <span className="font-bold">
                    {saleData.items.length} / {totalQty}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Gross Subtotal:</span>
                  <span>৳ {saleData.subtotal.toFixed(2)}</span>
                </div>
                {activeSpecialDiscount > 0 && (
                  <div className="flex justify-between text-slate-900 font-bold">
                    <span>
                      Special Discount {saleData.discountPercent && saleData.discountPercent > 0 ? `(${saleData.discountPercent.toFixed(2)}%)` : ''}:
                    </span>
                    <span>-৳ {activeSpecialDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>VAT / Tax Total:</span>
                  <span>৳ {saleData.taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-400">
                  <span>NET PAYABLE / TOTAL:</span>
                  <span>৳ {saleData.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Loyalty Points Section */}
              {(Boolean(saleData.pointsRedeemed) ||
                Boolean(saleData.pointsEarned) ||
                saleData.customerPointsBalance !== undefined) && (
                <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5 bg-slate-50 px-2 rounded">
                  <span className="font-bold text-slate-800 block text-[10px] uppercase">Loyalty Rewards Summary</span>
                  {saleData.previousPoints !== undefined && (
                    <div className="flex justify-between text-slate-700">
                      <span>Previous Points:</span>
                      <span>{saleData.previousPoints} pts</span>
                    </div>
                  )}
                  {Boolean(saleData.pointsRedeemed) && (
                    <div className="flex justify-between text-slate-900 font-semibold">
                      <span>Points Redeemed:</span>
                      <span className="font-bold">-{saleData.pointsRedeemed} pts (৳{saleData.pointsRedeemed})</span>
                    </div>
                  )}
                  {Boolean(saleData.pointsEarned) && (
                    <div className="flex justify-between text-slate-900 font-semibold">
                      <span>Points Earned Today:</span>
                      <span className="font-bold">+{saleData.pointsEarned} pts</span>
                    </div>
                  )}
                  {saleData.customerPointsBalance !== undefined && (
                    <div className="flex justify-between text-slate-900 pt-0.5 border-t border-slate-300 font-bold">
                      <span>Points Balance:</span>
                      <span>{saleData.customerPointsBalance} pts</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Breakdown */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Mode:</span>
                  <span className="font-semibold uppercase">
                    {saleData.paymentMethod} {saleData.cardType ? `(${saleData.cardType})` : ''}
                  </span>
                </div>

                {saleData.payments && saleData.payments.length > 0 && (
                  <div className="py-1 border-t border-dotted border-slate-300 space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Tenders:</span>
                    {saleData.payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-[10px] pl-1 font-mono">
                        <span>
                          {p.method}
                          {p.transaction_ref ? ` (${p.transaction_ref})` : ''}:
                        </span>
                        <span>৳ {Number(p.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-600">Total Paid:</span>
                  <span className="font-bold">৳ {saleData.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Change Return:</span>
                  <span>৳ {saleData.changeAmount.toFixed(2)}</span>
                </div>
                {saleData.dueAmount !== undefined && saleData.dueAmount > 0.0001 && (
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Due Amount:</span>
                    <span>৳ {saleData.dueAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-2 text-[10px] text-slate-700 space-y-1">
                <div className="tracking-[3px] text-xs font-black my-1 font-mono">
                  *{saleData.invoiceNumber}*
                </div>
                <p className="font-bold uppercase tracking-wider">*** THANK YOU FOR SHOPPING WITH US ***</p>
                <p>Goods sold can be exchanged within 7 days upon presenting this sales slip.</p>
                <p>Warranty claims subject to manufacturer terms.</p>
                {companyPhone && <p className="font-semibold">Customer Helpline: {companyPhone}</p>}
                <div className="border-t border-dotted border-slate-400 pt-1 space-y-0.5">
                  <p className="font-bold text-[8px] tracking-wider uppercase">*** COMPUTER GENERATED INVOICE ***</p>
                  <p className="text-[8px] text-slate-500">Powered by RetailCore POS ERP V2</p>
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
                  {companyLogo && (
                    <img src={companyLogo} alt="Logo" className="max-h-12 object-contain mb-2" />
                  )}
                  <h1 className="font-extrabold text-2xl tracking-tight text-slate-900">{companyName}</h1>
                  {activeBranch && <p className="text-xs font-bold text-slate-700 uppercase mt-0.5">{activeBranch}</p>}
                  <p className="text-xs text-slate-600 mt-1">{companyAddress}</p>
                  <p className="text-xs text-slate-600">Phone: {companyPhone}</p>
                  {companyWebsite && <p className="text-xs text-slate-600">Website: {companyWebsite}</p>}
                  <p className="text-xs font-semibold text-slate-700">BIN / VAT Registration: {companyBin}</p>
                </div>
                <div className="text-right">
                  {(isReprintCopy || saleData.isReprint) && (
                    <div className="mb-2 py-1 px-3 border-2 border-slate-900 font-bold text-center text-xs tracking-widest uppercase bg-slate-100 text-slate-900 rounded">
                      *** REPRINT COPY {reprintCounter > 0 ? `(#${reprintCounter})` : ''} — AUTHORIZED COPY ***
                    </div>
                  )}
                  <div className="inline-block bg-slate-900 text-white font-bold text-sm px-3 py-1 rounded uppercase tracking-wider mb-2">
                    {saleData.receiptType === 'SALES_RETURN' ? 'Sales Return & Refund Voucher' : 'Tax Invoice / Sales Slip'}
                  </div>
                  <p className="font-mono text-xs">
                    <strong>{saleData.receiptType === 'SALES_RETURN' ? 'Return #:' : 'Invoice #:'}</strong> {saleData.returnNumber || saleData.invoiceNumber}
                  </p>
                  {saleData.receiptType === 'SALES_RETURN' && saleData.originalInvoiceNumber && (
                    <p className="font-mono text-xs">
                      <strong>Original Invoice #:</strong> {saleData.originalInvoiceNumber}
                    </p>
                  )}
                  <p className="text-xs">
                    <strong>Date & Time:</strong> {saleData.saleDate}
                  </p>
                  {saleData.sessionNumber && (
                    <p className="text-xs">
                      <strong>Shift / Session:</strong> <span className="font-mono">{saleData.sessionNumber}</span>
                    </p>
                  )}
                  <p className="text-xs">
                    <strong>Sale Type:</strong> {saleData.saleType || (saleData.receiptType === 'SALES_RETURN' ? 'SALES RETURN' : 'RETAIL / COUNTER SALE')}
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
                  {customerCode && <p className="text-xs text-slate-600">Customer Code: {customerCode}</p>}
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
                  {saleData.items.map((item, index) => {
                    const lineDiscount = item.discount_amount || 0;
                    const lineTax = item.tax_amount || 0;
                    const calculatedLineTotal =
                      item.line_total !== undefined
                        ? item.line_total
                        : item.quantity * item.unit_price - lineDiscount + lineTax;

                    return (
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
                          {item.quantity}
                        </td>
                        <td className="py-2 px-2 border border-slate-300 text-right font-mono">
                          ৳{item.unit_price.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 border border-slate-300 text-right font-mono text-slate-600">
                          {lineDiscount > 0 ? `৳${lineDiscount.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-2 border border-slate-300 text-right font-mono text-slate-600">
                          {lineTax > 0 ? `৳${lineTax.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 text-right font-mono font-bold text-slate-900">
                          ৳{calculatedLineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial Calculation Totals */}
              <div className="flex justify-between items-start pt-2">
                <div className="w-1/2 space-y-1 text-xs text-slate-600">
                  <p>
                    <strong>Total Items:</strong> {saleData.items.length} | <strong>Total Quantity:</strong>{' '}
                    {totalQty}
                  </p>
                  {saleData.notes && (
                    <p className="bg-slate-50 p-2 border border-slate-200 rounded">
                      <strong>Remarks:</strong> {saleData.notes}
                    </p>
                  )}
                  <div className="pt-3 text-[11px] text-slate-500 space-y-0.5">
                    <p>• Goods sold can be exchanged within 7 days upon presentation of original sales slip.</p>
                    <p>• Warranty claims are subject to manufacturer terms and conditions.</p>
                    {companyPhone && <p>• Customer support helpline: {companyPhone}</p>}
                  </div>
                </div>

                <div className="w-5/12 bg-slate-50 p-3 rounded-md border border-slate-200 font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Gross Subtotal:</span>
                    <span>৳ {saleData.subtotal.toFixed(2)}</span>
                  </div>
                  {activeSpecialDiscount > 0 && (
                    <div className="flex justify-between text-slate-900 font-bold">
                      <span>
                        Special Discount {saleData.discountPercent && saleData.discountPercent > 0 ? `(${saleData.discountPercent.toFixed(2)}%)` : ''}:
                      </span>
                      <span>-৳ {activeSpecialDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>VAT / Tax Total:</span>
                    <span>৳ {saleData.taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-300">
                    <span>GRAND TOTAL / NET:</span>
                    <span>৳ {saleData.grandTotal.toFixed(2)}</span>
                  </div>

                  {/* Loyalty Points in A4 */}
                  {(Boolean(saleData.pointsRedeemed) ||
                    Boolean(saleData.pointsEarned) ||
                    saleData.customerPointsBalance !== undefined) && (
                    <div className="py-1 border-t border-dotted border-slate-300 text-[11px] space-y-0.5 text-slate-800">
                      <span className="font-bold block text-[10px] uppercase">Loyalty Rewards</span>
                      {saleData.previousPoints !== undefined && (
                        <div className="flex justify-between">
                          <span>Previous Points:</span>
                          <span>{saleData.previousPoints} pts</span>
                        </div>
                      )}
                      {Boolean(saleData.pointsRedeemed) && (
                        <div className="flex justify-between font-semibold">
                          <span>Loyalty Points Redeemed:</span>
                          <span className="font-bold">-{saleData.pointsRedeemed} pts (৳{saleData.pointsRedeemed})</span>
                        </div>
                      )}
                      {Boolean(saleData.pointsEarned) && (
                        <div className="flex justify-between font-semibold">
                          <span>Points Earned Today:</span>
                          <span className="font-bold">+{saleData.pointsEarned} pts</span>
                        </div>
                      )}
                      {saleData.customerPointsBalance !== undefined && (
                        <div className="flex justify-between font-bold border-t border-dotted border-slate-300 pt-0.5">
                          <span>Current Points Balance:</span>
                          <span>{saleData.customerPointsBalance} pts</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tender details in A4 */}
                  {saleData.payments && saleData.payments.length > 0 && (
                    <div className="py-1 border-t border-dotted border-slate-300 space-y-0.5 text-[11px]">
                      <span className="font-bold text-slate-600 block">Payment Tenders:</span>
                      {saleData.payments.map((p, idx) => (
                        <div key={idx} className="flex justify-between text-slate-700">
                          <span>
                            {p.method}
                            {p.transaction_ref ? ` (${p.transaction_ref})` : ''}:
                          </span>
                          <span>৳ {Number(p.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between pt-1 border-t border-dotted border-slate-300 text-slate-700">
                    <span>Total Paid:</span>
                    <span>৳ {saleData.paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Change Return:</span>
                    <span>৳ {saleData.changeAmount.toFixed(2)}</span>
                  </div>
                  {saleData.dueAmount !== undefined && saleData.dueAmount > 0.0001 && (
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Due Amount:</span>
                      <span>৳ {saleData.dueAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-10 flex justify-between items-end text-xs text-slate-600">
                <div className="text-center w-44 border-t border-slate-400 pt-1">
                  Customer Signature
                </div>
                <div className="text-center w-44 border-t border-slate-400 pt-1">
                  Authorized Signature
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                This is a Computer Generated Tax Invoice / Sales Slip. Powered by RetailCore POS ERP.
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions (hidden in print) */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center print:hidden">
          <span className="text-xs text-slate-500">Press Esc or Done to return to terminal</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrint(printFormat)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer"
            >
              Done / Next Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
