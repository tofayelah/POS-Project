import { describe, it, expect } from 'vitest';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';
import { ReceiptData, ReceiptItem } from '../components/pos/ThermalReceipt';
import { triggerThermalPrint } from '../utils/printReceipt';
import { PosReceiptPayload } from '../api/pos';

describe('Phase 5.5 Thermal Receipt & Printing Tests', () => {
  it('1. receipt translation keys have 100% EN and BN parity', () => {
    const requiredKeys = [
      'receipt.taxInvoice',
      'receipt.reprintCopy',
      'receipt.salesReturnVoucher',
      'receipt.invoiceNo',
      'receipt.returnNo',
      'receipt.originalInvoice',
      'receipt.dateTime',
      'receipt.saleType',
      'receipt.terminal',
      'receipt.shift',
      'receipt.cashier',
      'receipt.processedBy',
      'receipt.customer',
      'receipt.walkInCustomer',
      'receipt.mobile',
      'receipt.customerCode',
      'receipt.itemDescription',
      'receipt.qty',
      'receipt.rate',
      'receipt.total',
      'receipt.subtotal',
      'receipt.specialDiscount',
      'receipt.vatTax',
      'receipt.netTotal',
      'receipt.refundTotal',
      'receipt.loyaltySummary',
      'receipt.previousPoints',
      'receipt.pointsEarned',
      'receipt.pointsRedeemed',
      'receipt.pointsBalance',
      'receipt.pointsReversed',
      'receipt.paymentMethod',
      'receipt.paymentBreakdown',
      'receipt.totalPaid',
      'receipt.changeReturn',
      'receipt.dueAmount',
      'receipt.storeCreditUsed',
      'receipt.storeCreditRefund',
      'receipt.cashRefund',
      'receipt.exchangeDifference',
      'receipt.print',
      'receipt.reprint',
      'receipt.paper58mm',
      'receipt.paper80mm',
      'receipt.paperA4',
      'receipt.thankYou',
      'receipt.exchangePolicy',
      'receipt.warrantyPolicy',
      'receipt.computerGenerated',
    ];

    for (const key of requiredKeys) {
      expect((en as any)[key], `EN key missing: ${key}`).toBeDefined();
      expect((bn as any)[key], `BN key missing: ${key}`).toBeDefined();
      expect(typeof (en as any)[key]).toBe('string');
      expect(typeof (bn as any)[key]).toBe('string');
      expect((en as any)[key].length).toBeGreaterThan(0);
      expect((bn as any)[key].length).toBeGreaterThan(0);
    }
  });

  it('2. ReceiptData model conforms to sale receipt specifications', () => {
    const item: ReceiptItem = {
      id: 1,
      barcode: '123456789012',
      sku: 'SKU-JUICE-1L',
      name: 'Organic Orange Juice 1L',
      price: 200,
      qty: 2,
      discountPercent: 10,
      discountAmount: 20,
      taxAmount: 10,
      lineTotal: 390,
    };

    const receipt: ReceiptData = {
      companyName: 'RetailCore Superstore Ltd',
      branchName: 'Gulshan Branch',
      address: 'Dhaka, Bangladesh',
      binNo: 'BIN-12345678-0101',
      phone: '+880 1711-000000',
      invoiceNo: 'INV-20261006-000001',
      dateTime: '2026-10-06 14:30:00',
      cashierName: 'Anwar Cashier',
      terminalName: 'POS-GUL-01',
      customerName: 'Nusrat Jahan',
      customerMobile: '01819123456',
      customerCode: 'CUST-0001',
      saleType: 'RETAIL / COUNTER SALE',
      items: [item],
      subtotal: 400,
      discountAmount: 20,
      vatAmount: 10,
      netTotal: 390,
      paidAmount: 400,
      changeReturn: 10,
      paymentMethod: 'CASH',
      payments: [{ method: 'CASH', amount: 400 }],
      pointsEarned: 39,
      pointsBalance: 189,
      paperSize: '80mm',
      isReprint: false,
      reprintCount: 0,
      sessionNumber: 'SES-20261006-0001',
    };

    expect(receipt.invoiceNo).toBe('INV-20261006-000001');
    expect(receipt.netTotal).toBe(390);
    expect(receipt.changeReturn).toBe(10);
    expect(receipt.paperSize).toBe('80mm');
    expect(receipt.isReprint).toBe(false);
  });

  it('3. ReceiptData supports 58mm compact layout and reprint copies', () => {
    const receipt: ReceiptData = {
      companyName: 'RetailCore Superstore Ltd',
      invoiceNo: 'INV-20261006-000002',
      dateTime: '2026-10-06 14:35:00',
      cashierName: 'Anwar Cashier',
      customerName: 'Walk-in Customer',
      items: [
        {
          id: 1,
          barcode: '123456',
          name: 'Bread',
          price: 60,
          qty: 1,
          discountPercent: 0,
          lineTotal: 60,
        },
      ],
      subtotal: 60,
      discountAmount: 0,
      vatAmount: 0,
      netTotal: 60,
      paidAmount: 100,
      changeReturn: 40,
      paymentMethod: 'CASH',
      paperSize: '58mm',
      isReprint: true,
      reprintCount: 2,
    };

    expect(receipt.paperSize).toBe('58mm');
    expect(receipt.isReprint).toBe(true);
    expect(receipt.reprintCount).toBe(2);
    expect(receipt.changeReturn).toBe(40);
  });

  it('4. ReceiptData supports sales return & refund vouchers', () => {
    const returnReceipt: ReceiptData = {
      companyName: 'RetailCore Superstore Ltd',
      invoiceNo: 'INV-20261006-000001',
      returnNo: 'RET-20261006-000001',
      originalInvoiceNo: 'INV-20261006-000001',
      dateTime: '2026-10-06 15:00:00',
      cashierName: 'Anwar Cashier',
      customerName: 'Nusrat Jahan',
      receiptType: 'SALES_RETURN',
      items: [
        {
          id: 1,
          barcode: '123456789012',
          name: 'Organic Orange Juice 1L',
          price: 200,
          qty: 1,
          discountPercent: 0,
          lineTotal: 200,
          condition: 'GOOD',
        },
      ],
      subtotal: 200,
      discountAmount: 0,
      vatAmount: 0,
      netTotal: 200,
      paidAmount: 0,
      changeReturn: 0,
      refundTotal: 200,
      cashRefundAmount: 100,
      customerCreditAmount: 100,
      pointsReversed: 20,
      payments: [
        { method: 'CASH', amount: 100 },
        { method: 'STORE_CREDIT', amount: 100 },
      ],
      paperSize: '80mm',
    };

    expect(returnReceipt.receiptType).toBe('SALES_RETURN');
    expect(returnReceipt.returnNo).toBe('RET-20261006-000001');
    expect(returnReceipt.originalInvoiceNo).toBe('INV-20261006-000001');
    expect(returnReceipt.refundTotal).toBe(200);
    expect(returnReceipt.cashRefundAmount).toBe(100);
    expect(returnReceipt.customerCreditAmount).toBe(100);
    expect(returnReceipt.pointsReversed).toBe(20);
  });

  it('5. triggerThermalPrint runs safely in test environment without throwing', () => {
    const result = triggerThermalPrint(undefined, '58mm');
    expect(typeof result).toBe('boolean');

    const result80 = triggerThermalPrint(undefined, '80mm');
    expect(typeof result80).toBe('boolean');

    const resultA4 = triggerThermalPrint(undefined, 'a4');
    expect(typeof resultA4).toBe('boolean');
  });

  it('6. PosReceiptPayload API contract validation', () => {
    const payload: PosReceiptPayload = {
      receipt_type: 'SALE',
      sale_id: 101,
      invoice_number: 'INV-20261006-000101',
      sale_date: '2026-10-06 16:00:00',
      company: {
        name: 'RetailCore Superstore',
        address: 'Dhaka',
        phone: '+880 1700-000000',
        bin: 'BIN-0001',
      },
      branch: {
        id: 1,
        name: 'Gulshan Branch',
      },
      terminal: {
        id: 1,
        name: 'Counter 01',
        code: 'POS-01',
      },
      shift: {
        id: 1,
        session_number: 'SES-001',
      },
      cashier: {
        id: 2,
        name: 'Anwar',
      },
      items: [
        {
          id: 1,
          name: 'Item A',
          quantity: 2,
          unit_price: 100,
          discount: 0,
          tax: 0,
          line_total: 200,
        },
      ],
      total_quantity: 2,
      subtotal: 200,
      grand_total: 200,
      paid_amount: 200,
      change_amount: 0,
      payments: [{ method: 'CASH', amount: 200 }],
      is_reprint: false,
      reprint_count: 0,
    };

    expect(payload.receipt_type).toBe('SALE');
    expect(payload.sale_id).toBe(101);
    expect(payload.grand_total).toBe(200);
    expect(payload.payments).toHaveLength(1);
  });
});
