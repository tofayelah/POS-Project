import React, { useState, useEffect, useCallback } from 'react';
import { Printer, X, Download, Check, ExternalLink, ShieldCheck, FileText } from 'lucide-react';
import { numberToWordsBDT } from './PurchaseOrderPrintModal';

export interface PurchaseVoucherData {
  voucher_no: string;
  status?: string;
  invoice_date?: string;
  due_date?: string;
  challan_no?: string;
  supplier_invoice_number?: string;
  po_reference?: string;
  purchase_order_id?: number | string;
  warehouse_name?: string;
  warehouse_code?: string;
  supplier_name?: string;
  supplier_code?: string;
  supplier_phone?: string;
  supplier_email?: string;
  supplier_address?: string;
  supplier_bin?: string;
  payment_method?: string;
  amount_paid?: number;
  due_payable?: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  shipping?: number;
  other_cost?: number;
  grand_total?: number;
  notes?: string;
  items: Array<{
    id?: string | number;
    product_name: string;
    variant_name?: string;
    sku?: string;
    barcode?: string;
    unit_name?: string;
    quantity: number;
    unit_cost: number;
    discount?: number;
    tax?: number;
    line_total: number;
    selling_price?: number;
  }>;
}

export interface PurchaseVoucherPrintModalProps {
  voucher: PurchaseVoucherData;
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
    if (isNaN(d.getTime())) return dateStr.split('T')[0];
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr.split('T')[0];
  }
}

// Generates self-contained, modern executive Purchase Voucher HTML with 100% embedded CSS
export function generateVoucherDocumentHtml(
  voucher: PurchaseVoucherData,
  company?: PurchaseVoucherPrintModalProps['company']
): string {
  const netGrandTotal = Number(voucher.grand_total || 0);
  const items = voucher.items || [];
  const totalQty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const subtotal = voucher.subtotal ?? items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_cost || 0), 0);
  const totalDiscount = Number(voucher.discount || 0);
  const totalTax = Number(voucher.tax || 0);
  const shippingCost = Number(voucher.shipping || 0);
  const otherCost = Number(voucher.other_cost || 0);
  const amountPaid = Number(voucher.amount_paid || 0);
  const duePayable = Number(voucher.due_payable ?? Math.max(0, netGrandTotal - amountPaid));

  const compName = company?.name || 'RetailCore ERP Ltd';
  const compAddr = company?.address || 'Motijheel Commercial Area, Dhaka-1000, Bangladesh';
  const compPhone = company?.phone || '+880 2 9887766';
  const compEmail = company?.email || 'accounts@retailcore.com';
  const compBin = company?.tax_number || 'BIN-001928374-0101';

  const supName = voucher.supplier_name || 'Selected Vendor';
  const supCode = voucher.supplier_code || 'SUP-0001';
  const supAddr = voucher.supplier_address || 'Dhaka, Bangladesh';
  const supContact = voucher.supplier_phone || '01711000000';
  const supEmail = voucher.supplier_email || 'vendor@example.com';
  const supBin = voucher.supplier_bin || 'BIN-002847192-0202';

  const whName = voucher.warehouse_name || 'Main Central Warehouse';
  const whCode = voucher.warehouse_code || 'WH-CENTRAL';

  const voucherDateFormatted = formatDate(voucher.invoice_date || new Date().toISOString().split('T')[0]);
  const dueDateFormatted = voucher.due_date ? formatDate(voucher.due_date) : 'As per terms';
  const challanNo = voucher.challan_no || voucher.supplier_invoice_number || 'CHALLAN-901';
  const poRef = voucher.po_reference || (voucher.purchase_order_id ? `PO-${voucher.purchase_order_id}` : 'Direct Purchase');
  const paymentMethod = voucher.payment_method || 'CREDIT';
  const voucherStatus = voucher.status || 'DRAFT';

  const statusBg =
    voucherStatus === 'POSTED' ? '#dcfce7' :
    voucherStatus === 'APPROVED' ? '#dcfce7' :
    voucherStatus === 'CANCELLED' ? '#ffe4e6' : '#fef3c7';

  const statusColor =
    voucherStatus === 'POSTED' ? '#15803d' :
    voucherStatus === 'APPROVED' ? '#15803d' :
    voucherStatus === 'CANCELLED' ? '#be123c' : '#b45309';

  const rowsHtml = items.length === 0
    ? `<tr><td colspan="9" style="text-align:center; padding: 24px; color: #64748b; font-weight: 600;">No items specified in this voucher.</td></tr>`
    : items.map((it, idx) => {
        const lineTotal = Number(it.line_total || (Number(it.quantity) * Number(it.unit_cost) - Number(it.discount || 0) + Number(it.tax || 0)));
        const barcodeDisplay = it.barcode || it.sku || '-';
        const unitName = it.unit_name || 'pcs';
        const discDisplay = it.discount && Number(it.discount) > 0 ? `৳${Number(it.discount).toFixed(2)}` : '-';
        const taxDisplay = it.tax && Number(it.tax) > 0 ? `৳${Number(it.tax).toFixed(2)}` : '0%';

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; ${idx % 2 === 1 ? 'background: #f8fafc;' : 'background: #ffffff;'}">
            <td style="padding: 8px 6px; text-align: center; color: #475569; font-weight: 700; border-right: 1px solid #e2e8f0;">${idx + 1}</td>
            <td style="padding: 8px 10px; border-right: 1px solid #e2e8f0;">
              <div style="font-weight: 800; color: #0f172a; font-size: 12px;">${it.product_name}</div>
              ${it.variant_name ? `<div style="font-size: 10px; color: #64748b; margin-top: 1px;">Variant: ${it.variant_name}</div>` : ''}
            </td>
            <td style="padding: 8px 8px; font-family: ui-monospace, monospace; color: #334155; font-size: 10px; font-weight: 700; border-right: 1px solid #e2e8f0;">
              ${barcodeDisplay}
            </td>
            <td style="padding: 8px 6px; text-align: center; color: #475569; font-weight: 600; border-right: 1px solid #e2e8f0;">
              ${unitName}
            </td>
            <td style="padding: 8px 6px; text-align: center; font-weight: 900; color: #0f172a; font-size: 12px; border-right: 1px solid #e2e8f0; background: rgba(99,102,241,0.04);">
              ${it.quantity}
            </td>
            <td style="padding: 8px 10px; text-align: right; font-family: ui-monospace, monospace; font-weight: 700; color: #0f172a; border-right: 1px solid #e2e8f0;">
              ৳${Number(it.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td style="padding: 8px 8px; text-align: right; font-family: ui-monospace, monospace; color: #64748b; border-right: 1px solid #e2e8f0;">
              ${discDisplay}
            </td>
            <td style="padding: 8px 8px; text-align: center; font-family: ui-monospace, monospace; color: #475569; border-right: 1px solid #e2e8f0;">
              ${taxDisplay}
            </td>
            <td style="padding: 8px 10px; text-align: right; font-family: ui-monospace, monospace; font-weight: 900; color: #0f172a; font-size: 12px; background: rgba(99,102,241,0.04);">
              ৳${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        `;
      }).join('');

  return `
    <div style="font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #ffffff; width: 100%; max-width: 210mm; margin: 0 auto; line-height: 1.4; box-sizing: border-box;">
      
      <!-- TOP EXECUTIVE HEADER -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 12px;">
        <tr>
          <!-- COMPANY BRANDING -->
          <td style="vertical-align: top; width: 55%;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <div style="display: inline-block; background: #4338ca; color: #ffffff; font-weight: 900; font-size: 14px; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px;">
                RETAILCORE
              </div>
              <span style="font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px;">
                ${compName}
              </span>
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
              ${compAddr}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
              <strong>Phone:</strong> ${compPhone} &bull; <strong>Email:</strong> ${compEmail}
            </div>
            <div style="font-size: 11px; color: #0f172a; font-weight: 700;">
              <strong>VAT Registration / BIN:</strong> <span style="font-family: ui-monospace, monospace; color: #4338ca;">${compBin}</span>
            </div>
          </td>

          <!-- VOUCHER BADGE & METADATA -->
          <td style="vertical-align: top; width: 45%; text-align: right;">
            <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
              RETAILCORE POS_ERP — PURCHASE VOUCHER
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px; font-weight: 600;">
              Material Receiving Report (MRR) & Accounts Payable Voucher
            </div>
            <table style="border-collapse: collapse; margin-left: auto; font-size: 11px; text-align: left;">
              <tr>
                <td style="padding: 2px 8px; color: #64748b; font-weight: 700;">Voucher No:</td>
                <td style="padding: 2px 8px; font-family: ui-monospace, monospace; font-weight: 900; color: #4338ca; font-size: 13px;">${voucher.voucher_no}</td>
              </tr>
              <tr>
                <td style="padding: 2px 8px; color: #64748b; font-weight: 700;">Voucher Date:</td>
                <td style="padding: 2px 8px; font-weight: 800; color: #0f172a;">${voucherDateFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 2px 8px; color: #64748b; font-weight: 700;">Challan / Bill No:</td>
                <td style="padding: 2px 8px; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">${challanNo}</td>
              </tr>
              <tr>
                <td style="padding: 2px 8px; color: #64748b; font-weight: 700;">PO Reference:</td>
                <td style="padding: 2px 8px; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">${poRef}</td>
              </tr>
              <tr>
                <td style="padding: 2px 8px; color: #64748b; font-weight: 700;">Posting Status:</td>
                <td style="padding: 2px 8px;">
                  <span style="display: inline-block; background: ${statusBg}; color: ${statusColor}; font-size: 10px; font-weight: 900; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
                    ${voucherStatus}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- 2-COLUMN PARTIES: SUPPLIER / VENDOR & RECEIVING WAREHOUSE -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 16px;">
        <tr>
          <!-- SUPPLIER / VENDOR CARD -->
          <td style="width: 50%; vertical-align: top; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #4338ca; letter-spacing: 0.5px;">Vendor / Supplier Profile</span>
              <span style="background: #f1f5f9; color: #475569; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${supCode}</span>
            </div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-bottom: 4px;">${supName}</div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">${supAddr}</div>
            <div style="font-size: 11px; color: #334155; margin-bottom: 2px;">
              <strong>Phone:</strong> ${supContact} &bull; <strong>Email:</strong> ${supEmail}
            </div>
            <div style="font-size: 11px; color: #0f172a; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0;">
              <strong>Vendor BIN / Tax ID:</strong> <span style="font-family: ui-monospace, monospace; font-weight: 700;">${supBin}</span>
            </div>
          </td>

          <!-- SHIP TO / RECEIVING DESTINATION CARD -->
          <td style="width: 50%; vertical-align: top; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px;">Receiving Warehouse & Terms</span>
              <span style="background: #f1f5f9; color: #475569; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${whCode}</span>
            </div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-bottom: 4px;">${whName}</div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">Tejgaon Industrial Area Receiving Dock, Gate 2</div>
            <div style="font-size: 11px; color: #334155; margin-bottom: 2px;">
              <strong>Payment Method:</strong> <span style="font-weight: 800; color: #4338ca;">${paymentMethod}</span> &bull; <strong>Due Date:</strong> ${dueDateFormatted}
            </div>
            <div style="font-size: 11px; color: #0f172a; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0;">
              <strong>Authorized Organization:</strong> ${compName}
            </div>
          </td>
        </tr>
      </table>

      <!-- ITEMIZED PURCHASE LINE ITEMS TABLE -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 900;">
            <th style="padding: 8px 6px; text-align: center; width: 32px; border-right: 1px solid #334155;">#</th>
            <th style="padding: 8px 10px; text-align: left; border-right: 1px solid #334155;">Item Description & Specifications</th>
            <th style="padding: 8px 8px; text-align: left; width: 120px; border-right: 1px solid #334155;">Barcode / SKU</th>
            <th style="padding: 8px 6px; text-align: center; width: 50px; border-right: 1px solid #334155;">Unit</th>
            <th style="padding: 8px 6px; text-align: center; width: 50px; border-right: 1px solid #334155;">Qty</th>
            <th style="padding: 8px 10px; text-align: right; width: 95px; border-right: 1px solid #334155;">Rate (৳)</th>
            <th style="padding: 8px 8px; text-align: right; width: 75px; border-right: 1px solid #334155;">Disc (৳)</th>
            <th style="padding: 8px 8px; text-align: center; width: 60px; border-right: 1px solid #334155;">VAT</th>
            <th style="padding: 8px 10px; text-align: right; width: 110px;">Line Total (৳)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- 2-COLUMN LOWER SECTION: WORDS/TERMS ON LEFT, FINANCIAL TOTALS ON RIGHT -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <!-- LEFT COLUMN: AMOUNT IN WORDS & PAYMENT DETAILS -->
          <td style="width: 55%; vertical-align: top; padding-right: 16px;">
            <!-- Amount In Words Highlight Box -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #166534; display: block; margin-bottom: 2px;">
                Total Amount in Words
              </span>
              <div style="font-size: 13px; font-weight: 900; color: #14532d; font-style: italic;">
                "${numberToWordsBDT(netGrandTotal)}"
              </div>
            </div>

            <!-- Payment Allocation Box -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 11px;">
              <div style="font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 4px;">Payment Allocation & Terms:</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #64748b;">Method / Channel:</span>
                <span style="font-weight: 800; color: #0f172a;">${paymentMethod}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #64748b;">Paid Now:</span>
                <span style="font-weight: 800; color: #15803d; font-family: ui-monospace, monospace;">৳${amountPaid.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Due Payable Balance:</span>
                <span style="font-weight: 800; color: #be123c; font-family: ui-monospace, monospace;">৳${duePayable.toFixed(2)}</span>
              </div>
            </div>

            <!-- Notes if present -->
            ${voucher.notes ? `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; font-size: 11px;">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; display: block;">Notes / Remarks</span>
                <div style="color: #1e293b; margin-top: 2px;">${voucher.notes}</div>
              </div>
            ` : ''}

            <!-- Commercial Declaration -->
            <div style="font-size: 9px; color: #64748b; line-height: 1.4; border-left: 2px solid #cbd5e1; padding-left: 8px;">
              Goods received in sound merchantable condition in accordance with Challan No. ${challanNo}. Ledger posting has been reflected in Accounts Payable and Inventory Movement register.
            </div>
          </td>

          <!-- RIGHT COLUMN: FINANCIAL BREAKDOWN -->
          <td style="width: 45%; vertical-align: top;">
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr>
                  <td style="padding: 4px 0; color: #475569; font-weight: 600;">Total Lines / Total Qty:</td>
                  <td style="padding: 4px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">${items.length} Lines / ${totalQty} Pcs</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #475569; font-weight: 600;">Gross Purchase Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">৳${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                ${totalDiscount > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #b91c1c; font-weight: 600;">Total Discount (-):</td>
                    <td style="padding: 4px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #b91c1c;">-৳${totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                ${totalTax > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #475569; font-weight: 600;">Total Tax / VAT (+):</td>
                    <td style="padding: 4px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">৳${totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                ${shippingCost > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #475569; font-weight: 600;">Shipping / Freight (+):</td>
                    <td style="padding: 4px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">৳${shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                ${otherCost > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #475569; font-weight: 600;">Other Expenses (+):</td>
                    <td style="padding: 4px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">৳${otherCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                <tr style="border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a;">
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase;">Net Grand Total:</td>
                  <td style="padding: 8px 0; text-align: right; font-size: 15px; font-family: ui-monospace, monospace; font-weight: 900; color: #4338ca;">৳${netGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0 2px; color: #15803d; font-weight: 700;">Paid Amount (-):</td>
                  <td style="padding: 5px 0 2px; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #15803d;">৳${amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="padding: 2px 0 4px; color: #be123c; font-weight: 800;">Outstanding Payable Due:</td>
                  <td style="padding: 2px 0 4px; text-align: right; font-family: ui-monospace, monospace; font-weight: 900; color: #be123c;">৳${duePayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- 4-COLUMN OFFICIAL SIGNATURE BLOCK -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 36px; padding-top: 12px; font-size: 10px; color: #475569; text-align: center;">
        <tr>
          <td style="width: 25%; padding: 0 10px;">
            <div style="border-top: 1px dashed #94a3b8; padding-top: 6px; font-weight: 800; color: #0f172a;">Prepared By</div>
            <div style="font-size: 9px; color: #64748b;">Store Officer / Data Entry</div>
          </td>
          <td style="width: 25%; padding: 0 10px;">
            <div style="border-top: 1px dashed #94a3b8; padding-top: 6px; font-weight: 800; color: #0f172a;">Inspected / Verified By</div>
            <div style="font-size: 9px; color: #64748b;">Quality / Inventory Control</div>
          </td>
          <td style="width: 25%; padding: 0 10px;">
            <div style="border-top: 1px dashed #94a3b8; padding-top: 6px; font-weight: 800; color: #0f172a;">Accounts Payable Officer</div>
            <div style="font-size: 9px; color: #64748b;">Ledger & Bill Audited</div>
          </td>
          <td style="width: 25%; padding: 0 10px;">
            <div style="border-top: 1px dashed #94a3b8; padding-top: 6px; font-weight: 800; color: #0f172a;">Authorized Signatory</div>
            <div style="font-size: 9px; color: #64748b;">Purchase Head / Director</div>
          </td>
        </tr>
      </table>

      <!-- FOOTER AUDIT TIMESTAMP -->
      <div style="margin-top: 24px; padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
        <span>RetailCore POS_ERP &bull; System-Generated Authoritative Document &bull; Valid without physical stamp</span>
        <span>Generated: ${new Date().toLocaleString('en-GB')}</span>
      </div>
    </div>
  `;
}

export const PurchaseVoucherPrintModal: React.FC<PurchaseVoucherPrintModalProps> = ({
  voucher,
  company,
  onClose,
}) => {
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);
  const voucherDocHtml = generateVoucherDocumentHtml(voucher, company);

  const handlePrint = useCallback(() => {
    setPrintFeedback('Activating print preview for installed printer...');
    try {
      window.focus();
      setTimeout(() => {
        try {
          window.print();
        } catch (err: any) {
          console.warn('Native window.print() failed, opening new tab:', err);
          handleOpenInNewTab();
        }
      }, 50);
    } catch (e: any) {
      console.warn('Print error, falling back:', e);
      window.print();
    }
  }, [voucher, company]);

  const handleOpenInNewTab = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Purchase Voucher ${voucher.voucher_no}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 16px;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      body { padding: 0 !important; }
      @page { size: A4 portrait; margin: 8mm; }
    }
  </style>
</head>
<body onload="window.focus(); setTimeout(function(){ window.print(); }, 250);">
  ${voucherDocHtml}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setPrintFeedback('Opened standalone modern print preview tab with installed printer.');
  };

  const handleDownloadHtml = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Purchase Voucher ${voucher.voucher_no}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      body { padding: 0 !important; }
      @page { size: A4 portrait; margin: 8mm; }
    }
  </style>
</head>
<body onload="window.focus(); window.print()">
  ${voucherDocHtml}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Purchase_Voucher_${voucher.voucher_no}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setPrintFeedback('Downloaded modern printable HTML voucher. Ready for archive or printing.');
  };

  // Keyboard shortcut listener for Ctrl+P / Cmd+P and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrint, onClose]);

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Isolated Print Rules for window.print() */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #retailcore-printable-voucher, #retailcore-printable-voucher * {
            visibility: visible !important;
          }
          #retailcore-printable-voucher {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait !important;
            margin: 8mm !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-300 print:border-none print:shadow-none print:max-w-none print:max-h-none">
        
        {/* Modal Top Control Bar (Hidden during printing) */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap justify-between items-center gap-3 no-print border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-inner">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm uppercase tracking-wide text-white">
                  RETAILCORE POS_ERP — PURCHASE VOUCHER
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {voucher.status || 'DRAFT'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">Voucher Ref: {voucher.voucher_no} &bull; A4 Paper Format</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn_print_voucher_direct"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              title="Print Document or Save as PDF using your installed printer (Ctrl + P)"
            >
              <Printer className="w-4 h-4" /> Print Document (A4)
            </button>
            <button
              type="button"
              id="btn_print_voucher_new_tab"
              onClick={handleOpenInNewTab}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Open full page modern print preview in new tab with your installed printer"
            >
              <ExternalLink className="w-4 h-4 text-indigo-400" /> Open in New Tab & Print
            </button>
            <button
              type="button"
              id="btn_download_voucher_html"
              onClick={handleDownloadHtml}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Download standalone HTML file with modern styling"
            >
              <Download className="w-4 h-4" /> Download HTML
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback / Helper Banner (Hidden during printing) */}
        {printFeedback && (
          <div className="bg-emerald-50 text-emerald-900 text-xs px-4 py-2 border-b border-emerald-200 font-medium flex justify-between items-center no-print">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              {printFeedback}
            </span>
            <span className="text-slate-500 text-[11px]">
              Shortcut: <strong>Ctrl + P</strong> to print &bull; <strong>Esc</strong> to close
            </span>
          </div>
        )}

        {/* Modern Printable Document Body */}
        <div
          id="retailcore-printable-voucher"
          className="p-6 sm:p-10 overflow-y-auto bg-white print:p-0"
          dangerouslySetInnerHTML={{ __html: voucherDocHtml }}
        />
      </div>
    </div>
  );
};
