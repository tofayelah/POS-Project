import React, { useState, useEffect, useCallback } from 'react';
import { Printer, X, Download, Check, ExternalLink, ShieldCheck } from 'lucide-react';

interface PurchaseOrderPrintModalProps {
  order: {
    po_number: string;
    order_date?: string;
    expected_date?: string;
    status?: string;
    supplier?: {
      name?: string;
      supplier_code?: string;
      mobile?: string;
      email?: string;
      address?: string;
      tax_number?: string;
    };
    warehouse?: {
      name?: string;
      code?: string;
      address?: string;
    };
    items?: Array<{
      id?: string | number;
      product_name?: string;
      variant_name?: string;
      sku?: string;
      barcode?: string;
      purchase_unit?: string;
      quantity: number;
      unit_cost: number;
      discount?: number;
      tax_percent?: number;
      line_total: number;
      item_note?: string;
    }>;
    subtotal?: number;
    discount_total?: number;
    tax_total?: number;
    shipping_cost?: number;
    other_cost?: number;
    grand_total?: number;
    total_amount?: number;
    notes?: string;
    payment_terms?: string;
  };
  company?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    tax_number?: string;
  };
  onClose: () => void;
}

// Convert amount in BDT to words
export function numberToWordsBDT(amount: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num = Math.floor(Math.max(0, amount));
  if (num === 0) return 'Zero Taka Only';

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  return convert(num) + ' Taka Only';
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

// Generates self-contained, modern executive Purchase Order HTML with 100% embedded CSS
export function generatePoDocumentHtml(
  order: PurchaseOrderPrintModalProps['order'],
  company?: PurchaseOrderPrintModalProps['company']
): string {
  const netGrandTotal = Number(order.grand_total || order.total_amount || 0);
  const items = order.items || [];
  const totalQty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const subtotal = order.subtotal ?? items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_cost || 0), 0);
  const totalDiscount = Number(order.discount_total || 0);
  const totalTax = Number(order.tax_total || 0);
  const shippingCost = Number(order.shipping_cost || 0);
  const otherCost = Number(order.other_cost || 0);

  const compName = company?.name || 'RetailCore ERP Ltd';
  const compAddr = company?.address || 'Motijheel Commercial Area, Dhaka-1000, Bangladesh';
  const compPhone = company?.phone || '+880 2 9887766';
  const compEmail = company?.email || 'procurement@retailcore.com';
  const compBin = company?.tax_number || 'BIN-001928374-0101';

  const supName = order.supplier?.name || 'Apex Wholesale Ltd';
  const supCode = order.supplier?.supplier_code || 'SUP-0001';
  const supAddr = order.supplier?.address || 'Dhaka, Bangladesh';
  const supContact = order.supplier?.mobile || '01711000000';
  const supEmail = order.supplier?.email || 'sales@supplier.com';
  const supBin = order.supplier?.tax_number || 'BIN-002847192-0202';

  const whName = order.warehouse?.name || 'Main Central Warehouse';
  const whCode = order.warehouse?.code || 'WH-CENTRAL';
  const whAddr = order.warehouse?.address || 'Tejgaon Industrial Area, Dhaka-1208';

  const poDateFormatted = formatDate(order.order_date);
  const expDateFormatted = order.expected_date ? formatDate(order.expected_date) : 'As per agreement';
  const paymentTerms = order.payment_terms || 'NET_30';
  const poStatus = order.status || 'DRAFT';

  const statusBg =
    poStatus === 'APPROVED' ? '#dcfce7' :
    poStatus === 'SUBMITTED' ? '#e0e7ff' :
    poStatus === 'CANCELLED' ? '#ffe4e6' : '#fef3c7';

  const statusColor =
    poStatus === 'APPROVED' ? '#15803d' :
    poStatus === 'SUBMITTED' ? '#4338ca' :
    poStatus === 'CANCELLED' ? '#be123c' : '#b45309';

  const rowsHtml = items.length === 0
    ? `<tr><td colspan="9" style="text-align:center; padding: 24px; color: #64748b; font-weight: 600;">No items specified in this purchase order.</td></tr>`
    : items.map((it, idx) => {
        const pName = it.product_name || 'Product Item';
        const vName = it.variant_name && it.variant_name !== 'Standard' ? `<div style="font-size: 11px; color: #4338ca; font-weight: 600; margin-top: 2px;">${it.variant_name}</div>` : '';
        const itemNote = it.item_note ? `<div style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 2px;">Note: ${it.item_note}</div>` : '';
        const barcode = it.barcode || '8800000000';
        const sku = it.sku || 'SKU-001';
        const unit = it.purchase_unit || 'Pcs';
        const qty = Number(it.quantity);
        const cost = Number(it.unit_cost);
        const disc = it.discount ? `৳${Number(it.discount).toFixed(2)}` : '-';
        const vat = it.tax_percent ? `${it.tax_percent}%` : '0%';
        const lineTot = Number(it.line_total);

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'}">
            <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #64748b; border-right: 1px solid #e2e8f0;">${idx + 1}</td>
            <td style="padding: 10px 10px; border-right: 1px solid #e2e8f0;">
              <span style="font-weight: 800; color: #0f172a; font-size: 12px; display: block;">${pName}</span>
              ${vName}
              ${itemNote}
            </td>
            <td style="padding: 10px 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #334155; border-right: 1px solid #e2e8f0;">
              <div style="font-weight: 600;">${barcode}</div>
              <div style="font-size: 10px; color: #64748b;">${sku}</div>
            </td>
            <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #475569; border-right: 1px solid #e2e8f0;">${unit}</td>
            <td style="padding: 10px 8px; text-align: center; font-weight: 900; color: #0f172a; font-size: 13px; border-right: 1px solid #e2e8f0;">${qty}</td>
            <td style="padding: 10px 10px; text-align: right; font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 700; color: #1e293b; border-right: 1px solid #e2e8f0;">৳${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 10px 8px; text-align: right; font-family: ui-monospace, monospace; color: #64748b; border-right: 1px solid #e2e8f0;">${disc}</td>
            <td style="padding: 10px 8px; text-align: center; font-family: ui-monospace, monospace; color: #475569; border-right: 1px solid #e2e8f0;">${vat}</td>
            <td style="padding: 10px 10px; text-align: right; font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 900; color: #0f172a; font-size: 13px;">৳${lineTot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `;
      }).join('');

  return `
    <div class="modern-po-wrapper" style="font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #ffffff; width: 100%; max-width: 1000px; margin: 0 auto; box-sizing: border-box; line-height: 1.45;">
      
      <!-- TOP EXECUTIVE BRAND & PO TITLE HEADER -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 3px solid #1e1b4b; padding-bottom: 16px;">
        <tr>
          <td style="vertical-align: top; width: 60%; padding-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <div style="display: inline-block; background: #1e1b4b; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-weight: 900; font-size: 14px; letter-spacing: 0.5px;">RC</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; display: inline-block;">${compName}</h1>
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Enterprise Procurement & Supply Chain Division</div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px; line-height: 1.4;">${compAddr}</div>
            <div style="font-size: 11px; color: #475569;">
              <span style="margin-right: 12px;"><strong>Tel:</strong> ${compPhone}</span>
              <span style="margin-right: 12px;"><strong>Email:</strong> ${compEmail}</span>
            </div>
            <div style="font-size: 11px; color: #0f172a; margin-top: 4px;">
              <strong>BIN / VAT Reg:</strong> <span style="font-family: ui-monospace, monospace; font-weight: 700;">${compBin}</span>
            </div>
          </td>
          <td style="vertical-align: top; width: 40%; text-align: right; padding-bottom: 16px;">
            <div style="display: inline-block; background: #1e1b4b; color: #ffffff; padding: 6px 16px; border-radius: 8px 0 0 8px; font-size: 18px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
              PURCHASE ORDER
            </div>
            <div style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 20px; font-weight: 900; color: #1e1b4b; letter-spacing: 0.5px; margin-bottom: 6px;">
              ${order.po_number}
            </div>
            <div style="margin-bottom: 8px;">
              <span style="display: inline-block; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}40; padding: 3px 12px; border-radius: 9999px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">
                STATUS: ${poStatus}
              </span>
            </div>
            <!-- Barcode Visual Representation -->
            <div style="display: inline-block; padding: 4px 8px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
              <div style="font-family: ui-monospace, monospace; font-size: 12px; letter-spacing: 4px; font-weight: 900; color: #334155;">
                |||| | ||||| || |||| ||| |||||||
              </div>
              <div style="font-size: 9px; font-family: ui-monospace, monospace; color: #64748b; text-align: center; letter-spacing: 1px; margin-top: 2px;">
                ${order.po_number}
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- ORDER METADATA 4-COLUMN STRIP -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 18px;">
        <tr>
          <td style="width: 25%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
            <span style="display: block; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Order Date</span>
            <span style="font-size: 12px; font-weight: 800; color: #0f172a;">${poDateFormatted}</span>
          </td>
          <td style="width: 25%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
            <span style="display: block; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Expected Delivery</span>
            <span style="font-size: 12px; font-weight: 800; color: #0f172a;">${expDateFormatted}</span>
          </td>
          <td style="width: 25%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
            <span style="display: block; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Payment Terms</span>
            <span style="font-size: 12px; font-weight: 800; color: #4338ca;">${paymentTerms}</span>
          </td>
          <td style="width: 25%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
            <span style="display: block; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Billing Currency</span>
            <span style="font-size: 12px; font-weight: 800; color: #0f172a;">BDT (Bangladeshi Taka - ৳)</span>
          </td>
        </tr>
      </table>

      <!-- 2-COLUMN PARTIES SECTION: VENDOR & RECEIVING WAREHOUSE -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 20px;">
        <tr>
          <!-- VENDOR / SUPPLIER CARD -->
          <td style="width: 50%; vertical-align: top; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px;">
              <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1e1b4b; letter-spacing: 0.5px;">Vendor / Supplier (Order To)</span>
              <span style="background: #f1f5f9; color: #475569; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${supCode}</span>
            </div>
            <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 6px;">${supName}</div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px; line-height: 1.4;">${supAddr}</div>
            <div style="font-size: 11px; color: #334155; margin-bottom: 3px;">
              <strong>Contact:</strong> ${supContact} &bull; <strong>Email:</strong> ${supEmail}
            </div>
            <div style="font-size: 11px; color: #0f172a; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
              <strong>Supplier BIN / VAT:</strong> <span style="font-family: ui-monospace, monospace; font-weight: 700;">${supBin}</span>
            </div>
          </td>

          <!-- SHIP TO / WAREHOUSE CARD -->
          <td style="width: 50%; vertical-align: top; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px;">
              <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1e1b4b; letter-spacing: 0.5px;">Ship To / Receiving Destination</span>
              <span style="background: #f1f5f9; color: #475569; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${whCode}</span>
            </div>
            <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 6px;">${whName}</div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px; line-height: 1.4;">${whAddr}</div>
            <div style="font-size: 11px; color: #334155; margin-bottom: 3px;">
              <strong>Delivery Counter:</strong> Gate 2 Receiving Dock &bull; <strong>Hours:</strong> Mon - Thu (9 AM - 6 PM)
            </div>
            <div style="font-size: 11px; color: #0f172a; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
              <strong>Recipient Organization:</strong> ${compName}
            </div>
          </td>
        </tr>
      </table>

      <!-- MODERN ORDERED LINE ITEMS TABLE -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 900;">
            <th style="padding: 10px 8px; text-align: center; width: 36px; border-right: 1px solid #334155;">#</th>
            <th style="padding: 10px 10px; text-align: left; border-right: 1px solid #334155;">Item Description & Specs</th>
            <th style="padding: 10px 8px; text-align: left; width: 130px; border-right: 1px solid #334155;">Barcode / SKU</th>
            <th style="padding: 10px 8px; text-align: center; width: 50px; border-right: 1px solid #334155;">Unit</th>
            <th style="padding: 10px 8px; text-align: center; width: 55px; border-right: 1px solid #334155;">Qty</th>
            <th style="padding: 10px 10px; text-align: right; width: 95px; border-right: 1px solid #334155;">Unit Cost (৳)</th>
            <th style="padding: 10px 8px; text-align: right; width: 75px; border-right: 1px solid #334155;">Disc (৳)</th>
            <th style="padding: 10px 8px; text-align: center; width: 60px; border-right: 1px solid #334155;">VAT</th>
            <th style="padding: 10px 10px; text-align: right; width: 110px;">Line Total (৳)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- 2-COLUMN LOWER SECTION: WORDS/TERMS ON LEFT, FINANCIAL CALCULATIONS ON RIGHT -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <!-- LEFT COLUMN: AMOUNT IN WORDS & TERMS -->
          <td style="width: 55%; vertical-align: top; padding-right: 16px;">
            <!-- Amount In Words Highlight Box -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #166534; display: block; margin-bottom: 2px;">Total Amount in Words</span>
              <div style="font-size: 13px; font-weight: 900; color: #14532d; font-style: italic;">
                "${numberToWordsBDT(netGrandTotal)}"
              </div>
            </div>

            <!-- Notes if present -->
            ${order.notes ? `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Special Order Instructions</span>
                <div style="font-size: 11px; color: #1e293b; line-height: 1.4; white-space: pre-wrap;">${order.notes}</div>
              </div>
            ` : ''}

            <!-- Commercial Terms & Conditions -->
            <div style="border-left: 3px solid #6366f1; padding-left: 10px; font-size: 10px; color: #475569; line-height: 1.5;">
              <div style="font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 3px;">Procurement Terms & Conditions:</div>
              <div>1. Products must be delivered accompanied by official delivery challan referencing <strong>${order.po_number}</strong>.</div>
              <div>2. Mushak 6.3 / VAT tax challan is mandatory upon delivery in compliance with NBR regulations.</div>
              <div>3. Delivery is subject to strict count & QA inspection at destination receiving counter prior to GRN entry.</div>
            </div>
          </td>

          <!-- RIGHT COLUMN: FINANCIAL TOTALS CALCULATION BOX -->
          <td style="width: 45%; vertical-align: top;">
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr>
                  <td style="padding: 5px 0; color: #475569; font-weight: 600;">Total Lines / Total Quantity:</td>
                  <td style="padding: 5px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">${items.length} Lines / ${totalQty} Units</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #475569; font-weight: 600;">Gross Cost Subtotal:</td>
                  <td style="padding: 5px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">৳${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                ${totalDiscount > 0 ? `
                  <tr>
                    <td style="padding: 5px 0; color: #b91c1c; font-weight: 600;">Total Discount (-):</td>
                    <td style="padding: 5px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #b91c1c;">-৳${totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                ${totalTax > 0 ? `
                  <tr>
                    <td style="padding: 5px 0; color: #475569; font-weight: 600;">Total VAT / Tax (+):</td>
                    <td style="padding: 5px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">৳${totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                ${shippingCost > 0 ? `
                  <tr>
                    <td style="padding: 5px 0; color: #475569; font-weight: 600;">Freight / Shipping Cost (+):</td>
                    <td style="padding: 5px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">৳${shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                ${otherCost > 0 ? `
                  <tr>
                    <td style="padding: 5px 0; color: #475569; font-weight: 600;">Other Associated Costs (+):</td>
                    <td style="padding: 5px 0; text-align: right; font-family: ui-monospace, monospace; font-weight: 800; color: #0f172a;">৳${otherCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                <tr style="border-top: 2px solid #0f172a;">
                  <td style="padding: 12px 0 6px 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">NET PO GRAND TOTAL (BDT):</td>
                  <td style="padding: 12px 0 6px 0; text-align: right; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 18px; font-weight: 900; color: #1e1b4b;">৳${netGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- 3-WAY ERP AUTHORIZATION SIGNATURES -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 40px; margin-bottom: 24px;">
        <tr>
          <td style="width: 32%; text-align: center; vertical-align: top;">
            <div style="border-top: 2px solid #94a3b8; width: 85%; margin: 0 auto; padding-top: 8px;">
              <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Prepared By</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Procurement Officer</div>
              <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Sign & Date: _________________</div>
            </div>
          </td>
          <td style="width: 36%; text-align: center; vertical-align: top;">
            <div style="border-top: 2px solid #94a3b8; width: 85%; margin: 0 auto; padding-top: 8px;">
              <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Verified & Checked</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Accounts & Inventory Control</div>
              <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Sign & Date: _________________</div>
            </div>
          </td>
          <td style="width: 32%; text-align: center; vertical-align: top;">
            <div style="border-top: 2px solid #94a3b8; width: 85%; margin: 0 auto; padding-top: 8px;">
              <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Authorized Signatory</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Managing Director / COO</div>
              <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Sign & Date: _________________</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- DOCUMENT SECURITY & AUDIT FOOTER -->
      <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; padding-top: 8px;">
        <tr>
          <td style="font-size: 9px; color: #64748b; font-family: ui-monospace, monospace;">
            Generated from RetailCore POS_ERP • System Date: ${new Date().toLocaleString()}
          </td>
          <td style="font-size: 9px; color: #64748b; font-family: ui-monospace, monospace; text-align: right;">
            Official Document Ref: <strong>${order.po_number}</strong> • Page 1 of 1
          </td>
        </tr>
      </table>

    </div>
  `;
}

export const PurchaseOrderPrintModal: React.FC<PurchaseOrderPrintModalProps> = ({
  order,
  company,
  onClose
}) => {
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  // Modern Document HTML
  const poDocHtml = generatePoDocumentHtml(order, company);

  const handlePrint = useCallback(() => {
    setPrintFeedback('Opening Print Preview with your installed printer...');
    try {
      window.focus();
      setTimeout(() => {
        try {
          window.print();
        } catch (err: any) {
          console.warn('Native window.print() error, opening new tab:', err);
          handleOpenInNewTab();
        }
      }, 50);
    } catch (e: any) {
      console.warn('Print error, falling back:', e);
      window.print();
    }
  }, [order, company]);

  const handleOpenInNewTab = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Purchase Order ${order.po_number}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      body { padding: 0 !important; }
      @page { size: A4 portrait; margin: 10mm; }
    }
  </style>
</head>
<body onload="window.focus(); setTimeout(function(){ window.print(); }, 250);">
  ${poDocHtml}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      // Fallback if popup blocked
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
  <title>Purchase Order ${order.po_number}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
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
      @page { size: A4 portrait; margin: 10mm; }
    }
  </style>
</head>
<body onload="window.focus(); window.print()">
  ${poDocHtml}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Purchase_Order_${order.po_number}.html`;
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
          #retailcore-printable-po, #retailcore-printable-po * {
            visibility: visible !important;
          }
          #retailcore-printable-po {
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
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm uppercase tracking-wide text-white">
                  Purchase Order Modern A4 Voucher
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {order.status || 'DRAFT'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">PO Ref: {order.po_number}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              title="Print Document or Save as PDF using your installed printer (Ctrl + P)"
            >
              <Printer className="w-4 h-4" /> Print Document (A4)
            </button>
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Open full page modern print preview in new tab with your installed printer"
            >
              <ExternalLink className="w-4 h-4 text-indigo-400" /> Open in New Tab & Print
            </button>
            <button
              type="button"
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
          id="retailcore-printable-po"
          className="p-6 sm:p-10 overflow-y-auto bg-white print:p-0"
          dangerouslySetInnerHTML={{ __html: poDocHtml }}
        />
      </div>
    </div>
  );
};
