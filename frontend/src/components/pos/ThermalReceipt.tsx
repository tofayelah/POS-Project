import React from 'react';

export interface ReceiptItem {
  id: number;
  barcode: string;
  name: string;
  price: number;
  qty: number;
  discountPercent: number;
}

export interface ReceiptData {
  companyName: string;
  branchName?: string;
  address?: string;
  binNo?: string;
  phone?: string;
  invoiceNo: string;
  dateTime: string;
  cashierName: string;
  customerName: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  netTotal: number;
  cashPaid: number;
  changeReturn: number;
}

interface ThermalReceiptProps {
  data: ReceiptData | null;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div id="pos-thermal-receipt" className="thermal-receipt-container font-mono text-black bg-white p-2 text-xs leading-tight select-none">
      {/* Store Header */}
      <div className="text-center mb-2 border-b border-dashed border-black pb-2">
        <h1 className="text-sm font-black uppercase tracking-wider">{data.companyName}</h1>
        {data.branchName && <p className="text-[10px] font-bold uppercase">{data.branchName}</p>}
        {data.address && <p className="text-[10px]">{data.address}</p>}
        {data.phone && <p className="text-[10px]">Tel: {data.phone}</p>}
        {data.binNo && <p className="text-[10px] font-semibold">VAT REG BIN: {data.binNo}</p>}
      </div>

      {/* Invoice Meta */}
      <div className="text-[10px] border-b border-dashed border-black pb-2 mb-2 space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>INVOICE #: {data.invoiceNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Date: {data.dateTime}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier: {data.cashierName}</span>
          <span>Cust: {data.customerName}</span>
        </div>
      </div>

      {/* Itemized Table */}
      <table className="w-full text-left text-[10px] border-b border-dashed border-black pb-2 mb-2">
        <thead>
          <tr className="border-b border-black font-bold uppercase">
            <th className="py-1">Item Description</th>
            <th className="py-1 text-center">Qty</th>
            <th className="py-1 text-right">Rate</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.items.map((item, index) => {
            const lineTotal = (item.price * item.qty) * (1 - item.discountPercent / 100);
            return (
              <tr key={index} className="align-top">
                <td className="py-1 pr-1">
                  <div className="font-bold">{item.name}</div>
                  <div className="text-[9px] text-slate-700">BC: {item.barcode}</div>
                </td>
                <td className="py-1 text-center font-bold">{item.qty}</td>
                <td className="py-1 text-right">৳{item.price.toFixed(2)}</td>
                <td className="py-1 text-right font-bold">৳{lineTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary Totals */}
      <div className="text-[10px] space-y-1 border-b border-dashed border-black pb-2 mb-2 font-mono">
        <div className="flex justify-between">
          <span>Total Items / Qty:</span>
          <span className="font-bold">{data.items.length} / {data.items.reduce((a, b) => a + b.qty, 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>৳{data.subtotal.toFixed(2)}</span>
        </div>
        {data.discountAmount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Special Discount:</span>
            <span>-৳{data.discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>VAT / Tax (5%):</span>
          <span>৳{data.vatAmount.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-xs font-black border-t border-black pt-1 mt-1">
          <span>NET PAYABLE:</span>
          <span>৳{data.netTotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between pt-1">
          <span>Cash Paid:</span>
          <span className="font-bold">৳{data.cashPaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Change Return:</span>
          <span className="font-bold">৳{data.changeReturn.toFixed(2)}</span>
        </div>
      </div>

      {/* Receipt Footer & Barcode */}
      <div className="text-center text-[9px] space-y-1.5 pt-1">
        <div className="font-mono text-center tracking-widest font-black text-xs my-1">
          ||||| ||| ||||||| ||| ||||| ||
        </div>
        <p className="font-bold">{data.invoiceNo}</p>
        <p className="font-bold uppercase">*** Thank You For Shopping ***</p>
        <p>Please keep this invoice for returns/exchanges within 7 days.</p>
        <p className="text-[8px] text-slate-600 border-t border-dotted border-black pt-1">
          Powered by RetailCore POS ERP V2
        </p>
      </div>
    </div>
  );
};
