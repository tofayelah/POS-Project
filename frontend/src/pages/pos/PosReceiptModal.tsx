import React from 'react';
import { Printer, X, CheckCircle } from 'lucide-react';
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
  if (!isOpen || !saleData) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalQty = saleData.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Action Header (hidden in print) */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Sale Completed — Receipt Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Print Receipt (Ctrl+P)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 80mm Thermal Receipt Content */}
        <div className="p-6 bg-white overflow-y-auto font-mono text-xs text-slate-900 leading-tight print:p-0 print:m-0" id="pos-thermal-receipt">
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
                    <span className="col-span-2 text-right font-bold">{(item.quantity * item.unit_price).toFixed(2)}</span>
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
              <div className="flex justify-between text-rose-600">
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
              <span className="font-semibold uppercase">{saleData.paymentMethod} {saleData.cardType ? `(${saleData.cardType})` : ''}</span>
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

          {/* Footer & Barcode Simulation */}
          <div className="text-center pt-3 text-[10px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Thank you for shopping with us!</p>
            <p>Exchange possible within 7 days with original receipt.</p>
            <p className="text-[9px] text-slate-400 mt-2">*** RETAILCORE ENTERPRISE POS SYSTEM ***</p>
            <div className="pt-2 flex justify-center">
              <div className="tracking-[3px] text-[13px] font-bold py-1 px-3 border border-slate-300 bg-slate-50">
                *{saleData.invoiceNumber}*
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (hidden in print) */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center print:hidden">
          <span className="text-xs text-slate-500">Press Esc or Close to start new sale</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
          >
            Done / Next Sale
          </button>
        </div>
      </div>
    </div>
  );
};
