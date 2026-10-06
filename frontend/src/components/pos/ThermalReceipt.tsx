import React from 'react';

export interface ReceiptItem {
  id: number | string;
  barcode: string;
  sku?: string;
  name: string;
  variant_name?: string;
  price: number;
  qty: number;
  discountPercent: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotal?: number;
  condition?: string;
}

export interface ReceiptData {
  companyName: string;
  branchName?: string;
  address?: string;
  binNo?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  invoiceNo: string;
  dateTime: string;
  cashierName: string;
  terminalName?: string;
  customerName: string;
  customerMobile?: string;
  customerCode?: string;
  saleType?: string;
  items: ReceiptItem[];
  subtotal: number;
  discountPercent?: number;
  discountAmount: number;
  vatAmount: number;
  netTotal: number;
  cashPaid?: number;
  paidAmount: number;
  changeReturn: number;
  dueAmount?: number;
  paymentMethod?: string;
  payments?: Array<{ method: string; amount: number; transaction_ref?: string }>;
  previousPoints?: number;
  pointsRedeemed?: number;
  pointsEarned?: number;
  pointsBalance?: number;
  notes?: string;
  // Phase 5.5 enhancements
  paperSize?: '58mm' | '80mm' | 'a4';
  isReprint?: boolean;
  reprintCount?: number;
  sessionNumber?: string;
  receiptType?: 'SALE' | 'SALES_RETURN';
  returnNo?: string;
  originalInvoiceNo?: string;
  refundTotal?: number;
  customerCreditAmount?: number;
  cashRefundAmount?: number;
  storeCreditAmount?: number;
  pointsReversed?: number;
}

interface ThermalReceiptProps {
  data: ReceiptData | null;
  paperSize?: '58mm' | '80mm' | 'a4';
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ data, paperSize: propPaperSize }) => {
  if (!data) return null;

  const paperSize = propPaperSize || data.paperSize || '80mm';
  const is58mm = paperSize === '58mm';
  const isReturn = data.receiptType === 'SALES_RETURN';
  const totalQty = data.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div
      id="pos-thermal-receipt"
      className={`thermal-receipt-container font-mono text-black bg-white select-none mx-auto leading-tight ${
        is58mm ? 'max-w-[58mm] p-2 text-[10px]' : 'max-w-[80mm] p-3 text-xs'
      }`}
    >
      {/* Reprint Banner */}
      {data.isReprint && (
        <div className="mb-2 py-1 px-1 border-2 border-black font-black text-center text-[10px] tracking-widest uppercase bg-slate-100">
          *** REPRINT COPY {data.reprintCount ? `(#${data.reprintCount})` : ''} ***
        </div>
      )}

      {/* Store Header */}
      <div className="text-center mb-2 border-b border-dashed border-black pb-2 space-y-0.5">
        {data.logoUrl && (
          <div className="flex justify-center mb-1">
            <img src={data.logoUrl} alt="Logo" className="max-h-8 object-contain" />
          </div>
        )}
        <h1 className={`${is58mm ? 'text-xs' : 'text-sm'} font-black uppercase tracking-wider`}>
          {data.companyName}
        </h1>
        {data.branchName && (
          <p className={`${is58mm ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase`}>{data.branchName}</p>
        )}
        {data.address && <p className="text-[9px] text-slate-800">{data.address}</p>}
        {data.phone && <p className="text-[9px]">Tel: {data.phone}</p>}
        {data.website && <p className="text-[9px] text-slate-700">{data.website}</p>}
        {data.binNo && <p className="text-[9px] font-bold">BIN / VAT: {data.binNo}</p>}
        {data.terminalName && <p className="text-[9px] text-slate-700">Terminal: {data.terminalName}</p>}

        <div className="mt-1 inline-block px-2 py-0.5 border border-black font-black text-[9px] tracking-widest uppercase bg-slate-50">
          {isReturn ? 'Sales Return & Refund Voucher' : 'Tax Invoice / Sales Slip'}
        </div>
      </div>

      {/* Invoice / Return Meta */}
      <div className="text-[9.5px] border-b border-dashed border-black pb-2 mb-2 space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>{isReturn ? 'RETURN #:' : 'INVOICE #:'}</span>
          <span>{isReturn ? (data.returnNo || data.invoiceNo) : data.invoiceNo}</span>
        </div>
        {isReturn && data.originalInvoiceNo && (
          <div className="flex justify-between text-slate-800">
            <span>ORIGINAL INV:</span>
            <span className="font-semibold">{data.originalInvoiceNo}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Date & Time:</span>
          <span>{data.dateTime}</span>
        </div>
        {data.sessionNumber && (
          <div className="flex justify-between">
            <span>Shift / Session:</span>
            <span className="font-mono">{data.sessionNumber}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Sale Type:</span>
          <span className="font-semibold uppercase">{data.saleType || (isReturn ? 'SALES RETURN' : 'RETAIL / COUNTER SALE')}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier:</span>
          <span>{data.cashierName}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-dotted border-slate-300">
          <span>Customer:</span>
          <span className="font-bold">{data.customerName || 'Walk-in Customer'}</span>
        </div>
        {data.customerMobile && (
          <div className="flex justify-between">
            <span>Mobile:</span>
            <span>{data.customerMobile}</span>
          </div>
        )}
        {data.customerCode && (
          <div className="flex justify-between">
            <span>Cust Code:</span>
            <span className="font-mono">{data.customerCode}</span>
          </div>
        )}
      </div>

      {/* Itemized Table */}
      {is58mm ? (
        /* 58mm COMPACT 2-LINE ITEM LAYOUT */
        <div className="text-[9px] border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between font-bold uppercase border-b border-black pb-1 mb-1">
            <span>Item / Qty</span>
            <span>Total</span>
          </div>
          <div className="space-y-1.5">
            {data.items.map((item, index) => {
              const calculatedLineTotal =
                item.lineTotal !== undefined
                  ? item.lineTotal
                  : item.price * item.qty * (1 - (item.discountPercent || 0) / 100);

              return (
                <div key={index} className="border-b border-dotted border-slate-200 pb-1">
                  <div className="font-bold leading-tight break-words">{item.name}</div>
                  {item.variant_name && item.variant_name !== item.name && (
                    <div className="text-[8.5px] text-slate-700 italic">[{item.variant_name}]</div>
                  )}
                  <div className="flex justify-between items-baseline pt-0.5">
                    <span className="text-slate-800">
                      {item.qty} x ৳{item.price.toFixed(2)}
                    </span>
                    <span className="font-bold">৳{calculatedLineTotal.toFixed(2)}</span>
                  </div>
                  {((item.discountAmount && item.discountAmount > 0) || (item.taxAmount && item.taxAmount > 0)) && (
                    <div className="text-[8px] text-slate-600 flex justify-between">
                      {item.discountAmount && item.discountAmount > 0 ? (
                        <span>Dis: -৳{item.discountAmount.toFixed(2)}</span>
                      ) : <span />}
                      {item.taxAmount && item.taxAmount > 0 ? (
                        <span>VAT: +৳{item.taxAmount.toFixed(2)}</span>
                      ) : <span />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 80mm STANDARD ITEMIZED TABLE */
        <table className="w-full text-left text-[10px] border-b border-dashed border-black pb-2 mb-2">
          <thead>
            <tr className="border-b border-black font-bold uppercase">
              <th className="py-1">Description</th>
              <th className="py-1 text-center">Qty</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.items.map((item, index) => {
              const calculatedLineTotal =
                item.lineTotal !== undefined
                  ? item.lineTotal
                  : item.price * item.qty * (1 - (item.discountPercent || 0) / 100);
              return (
                <tr key={index} className="align-top">
                  <td className="py-1 pr-1">
                    <div className="font-bold leading-tight break-words">{item.name}</div>
                    {item.variant_name && item.variant_name !== item.name && (
                      <div className="text-[9px] text-slate-700 italic">[{item.variant_name}]</div>
                    )}
                    <div className="text-[9px] text-slate-600">
                      {item.barcode ? `BC: ${item.barcode}` : item.sku ? `SKU: ${item.sku}` : ''}
                    </div>
                    {((item.discountAmount && item.discountAmount > 0) || (item.taxAmount && item.taxAmount > 0)) && (
                      <div className="text-[9px] text-slate-600">
                        {item.discountAmount && item.discountAmount > 0 && (
                          <span>Dis: -৳{item.discountAmount.toFixed(2)} </span>
                        )}
                        {item.taxAmount && item.taxAmount > 0 && <span>VAT: +৳{item.taxAmount.toFixed(2)}</span>}
                      </div>
                    )}
                  </td>
                  <td className="py-1 text-center font-bold">{item.qty}</td>
                  <td className="py-1 text-right">৳{item.price.toFixed(2)}</td>
                  <td className="py-1 text-right font-bold">৳{calculatedLineTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Summary Totals */}
      <div className="text-[10px] space-y-1 border-b border-dashed border-black pb-2 mb-2 font-mono">
        <div className="flex justify-between">
          <span>Total Items / Qty:</span>
          <span className="font-bold">
            {data.items.length} / {totalQty}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Gross Subtotal:</span>
          <span>৳{data.subtotal.toFixed(2)}</span>
        </div>
        {data.discountAmount > 0 && (
          <div className="flex justify-between font-bold text-slate-900">
            <span>
              Special Discount {data.discountPercent && data.discountPercent > 0 ? `(${data.discountPercent.toFixed(2)}%)` : ''}:
            </span>
            <span>-৳{data.discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>VAT / Tax Total:</span>
          <span>৳{data.vatAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-xs font-black border-t border-black pt-1 mt-1">
          <span>{isReturn ? 'TOTAL REFUND:' : 'NET PAYABLE / TOTAL:'}</span>
          <span>৳{(isReturn && data.refundTotal !== undefined ? data.refundTotal : data.netTotal).toFixed(2)}</span>
        </div>
      </div>

      {/* Loyalty Points Section (When Applicable) */}
      {(Boolean(data.pointsRedeemed) || Boolean(data.pointsEarned) || data.pointsBalance !== undefined || Boolean(data.pointsReversed)) && (
        <div className="text-[9.5px] border-b border-dashed border-black pb-2 mb-2 space-y-0.5 bg-slate-50 p-1.5 rounded">
          <div className="font-bold uppercase text-[9px] text-slate-800">Loyalty Rewards Summary</div>
          {data.previousPoints !== undefined && (
            <div className="flex justify-between text-slate-700">
              <span>Previous Points:</span>
              <span>{data.previousPoints} pts</span>
            </div>
          )}
          {Boolean(data.pointsRedeemed) && (
            <div className="flex justify-between font-semibold text-slate-900">
              <span>Points Redeemed:</span>
              <span>-{data.pointsRedeemed} pts (৳{data.pointsRedeemed})</span>
            </div>
          )}
          {Boolean(data.pointsEarned) && (
            <div className="flex justify-between font-semibold text-slate-900">
              <span>Points Earned:</span>
              <span>+{data.pointsEarned} pts</span>
            </div>
          )}
          {Boolean(data.pointsReversed) && (
            <div className="flex justify-between font-semibold text-red-700">
              <span>Points Reversed:</span>
              <span>-{data.pointsReversed} pts</span>
            </div>
          )}
          {data.pointsBalance !== undefined && (
            <div className="flex justify-between font-bold border-t border-dotted border-slate-300 pt-0.5">
              <span>Current Points Balance:</span>
              <span>{data.pointsBalance} pts</span>
            </div>
          )}
        </div>
      )}

      {/* Payment / Refund Breakdown */}
      <div className="text-[10px] space-y-1 border-b border-dashed border-black pb-2 mb-2 font-mono">
        <div className="flex justify-between font-semibold">
          <span>{isReturn ? 'Refund Breakdown:' : 'Payment Method:'}</span>
          <span className="uppercase">{data.paymentMethod || (isReturn ? 'REFUND' : 'CASH')}</span>
        </div>

        {data.payments && data.payments.length > 0 && (
          <div className="py-0.5 border-t border-dotted border-slate-300 space-y-0.5">
            {data.payments.map((p, idx) => (
              <div key={idx} className="flex justify-between pl-1">
                <span>{p.method}:</span>
                <span>৳{Number(p.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {isReturn ? (
          <>
            {data.cashRefundAmount !== undefined && data.cashRefundAmount > 0 && (
              <div className="flex justify-between font-semibold">
                <span>Cash Refunded:</span>
                <span>৳{data.cashRefundAmount.toFixed(2)}</span>
              </div>
            )}
            {data.customerCreditAmount !== undefined && data.customerCreditAmount > 0 && (
              <div className="flex justify-between font-semibold">
                <span>Store Credit Issued:</span>
                <span>৳{data.customerCreditAmount.toFixed(2)}</span>
              </div>
            )}
          </>
        ) : (
          <>
            {data.storeCreditAmount !== undefined && data.storeCreditAmount > 0 && (
              <div className="flex justify-between text-slate-800">
                <span>Store Credit Used:</span>
                <span>৳{data.storeCreditAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-0.5">
              <span>Total Paid:</span>
              <span className="font-bold">৳{data.paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Change Return:</span>
              <span>৳{data.changeReturn.toFixed(2)}</span>
            </div>
            {data.dueAmount !== undefined && data.dueAmount > 0.0001 && (
              <div className="flex justify-between font-bold text-slate-900">
                <span>Due Amount:</span>
                <span>৳{data.dueAmount.toFixed(2)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Receipt Footer & Barcode */}
      <div className="text-center text-[9px] space-y-1 pt-1">
        <div className="tracking-[3px] text-xs font-black my-1 font-mono">
          *{isReturn ? (data.returnNo || data.invoiceNo) : data.invoiceNo}*
        </div>
        <p className="font-bold uppercase tracking-wider">
          {isReturn ? '*** SALES RETURN & REFUND VOUCHER ***' : '*** THANK YOU FOR SHOPPING WITH US ***'}
        </p>
        <p>{isReturn ? 'Refund processed according to store return policy.' : 'Goods sold can be exchanged within 7 days upon presenting this sales slip.'}</p>
        {!isReturn && <p>Warranty claims subject to manufacturer terms.</p>}
        {data.phone && <p className="font-semibold">Customer Helpline: {data.phone}</p>}
        <div className="border-t border-dotted border-black pt-1 space-y-0.5">
          <p className="font-bold tracking-wider text-[8px] uppercase">*** COMPUTER GENERATED INVOICE ***</p>
          <p className="text-[8px] text-slate-600">Powered by RetailCore POS ERP V2</p>
        </div>
      </div>
    </div>
  );
};
