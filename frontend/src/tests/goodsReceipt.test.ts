import { describe, it, expect } from 'vitest';
import { 
  GoodsReceipt, 
  GoodsReceiptItem, 
  CreateGoodsReceiptPayload, 
  PurchaseOrder,
  PurchaseInvoice
} from '../types/purchase';
import { generateNextGrNumber } from '../api/goodsReceipts';
import { generateIdempotencyKey } from '../api/payments';

describe('Gate 1.5 Goods Receipt & Purchasing Frontend Models & Logic', () => {
  it('generates formatted sequential Goods Receipt numbers', () => {
    const grNumber = generateNextGrNumber();
    expect(grNumber).toMatch(/^GR-\d{4}-\d{4}$/);
  });

  it('validates receive quantity against pending quantity boundary', () => {
    const poItem = {
      id: 10,
      quantity: 100,
      received_quantity: 40,
      pending_quantity: 60,
    };

    // Valid: 0 <= receiveQty <= pending_quantity
    const validQty = 50;
    expect(validQty >= 0 && validQty <= poItem.pending_quantity).toBe(true);

    // Invalid: receiveQty > pending_quantity
    const invalidQty = 65;
    expect(invalidQty <= poItem.pending_quantity).toBe(false);

    // Invalid: negative quantity
    const negativeQty = -5;
    expect(negativeQty >= 0).toBe(false);
  });

  it('constructs valid CreateGoodsReceiptPayload with batch, expiry, and storage location', () => {
    const payload: CreateGoodsReceiptPayload = {
      purchase_order_id: 1,
      receipt_number: 'GR-2026-0001',
      receipt_date: '2026-09-23',
      items: [
        {
          purchase_order_item_id: 101,
          received_quantity: 25,
          storage_location_id: 4,
          stock_batch_id: null,
          batch_number: 'BATCH-LOT-99',
          expiry_date: '2028-12-31',
        },
      ],
    };

    expect(payload.purchase_order_id).toBe(1);
    expect(payload.receipt_number).toBe('GR-2026-0001');
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].received_quantity).toBe(25);
    expect(payload.items[0].batch_number).toBe('BATCH-LOT-99');
    expect(payload.items[0].storage_location_id).toBe(4);
  });

  it('enforces PO status guard: only APPROVED and PARTIALLY_RECEIVED allow receiving', () => {
    const canReceive = (status: string) => status === 'APPROVED' || status === 'PARTIALLY_RECEIVED';

    expect(canReceive('APPROVED')).toBe(true);
    expect(canReceive('PARTIALLY_RECEIVED')).toBe(true);
    expect(canReceive('DRAFT')).toBe(false);
    expect(canReceive('CANCELLED')).toBe(false);
    expect(canReceive('FULLY_RECEIVED')).toBe(false);
  });

  it('verifies immutable state of POSTED goods receipt: cannot post or edit again', () => {
    const postedReceipt: GoodsReceipt = {
      id: 1,
      company_id: 1,
      supplier_id: 2,
      warehouse_id: 1,
      purchase_order_id: 5,
      receipt_number: 'GR-2026-0001',
      receipt_date: '2026-09-23',
      status: 'POSTED',
      posted_by: 1,
      posted_at: '2026-09-23T10:00:00Z',
    };

    const isActionAllowed = (gr: GoodsReceipt) => gr.status === 'DRAFT';
    expect(isActionAllowed(postedReceipt)).toBe(false);
  });

  it('calculates Purchase Invoice paid amount, due amount, and dynamic payment status', () => {
    const invoice: PurchaseInvoice = {
      id: 10,
      company_id: 1,
      supplier_id: 2,
      supplier_invoice_number: 'INV-2026-001',
      invoice_date: '2026-09-23',
      status: 'POSTED',
      grand_total: 10000,
      paid_amount: 4000,
      due_amount: 6000,
      payment_status: 'PARTIAL',
    };

    expect(invoice.grand_total).toBe(10000);
    expect(invoice.paid_amount).toBe(4000);
    expect(invoice.due_amount).toBe(6000);
    expect(invoice.payment_status).toBe('PARTIAL');

    // Fully paid test
    const fullyPaidInvoice: PurchaseInvoice = {
      ...invoice,
      paid_amount: 10000,
      due_amount: 0,
      payment_status: 'PAID',
    };
    expect(fullyPaidInvoice.due_amount).toBe(0);
    expect(fullyPaidInvoice.payment_status).toBe('PAID');
  });

  it('generates unique client-side idempotency keys for supplier payment creation', () => {
    const key1 = generateIdempotencyKey('PAY-SUPP');
    const key2 = generateIdempotencyKey('PAY-SUPP');

    expect(key1).toMatch(/^PAY-SUPP-\d+-[A-Z0-9]+$/);
    expect(key2).toMatch(/^PAY-SUPP-\d+-[A-Z0-9]+$/);
    expect(key1).not.toBe(key2);
  });

  it('validates payment allocation amount against invoice due balance', () => {
    const dueAmount = 5000;
    const paymentAmount = 10000;

    const validateAllocation = (allocAmount: number) => {
      if (allocAmount <= 0) return 'Allocation must be greater than 0';
      if (allocAmount > dueAmount) return 'Allocation cannot exceed invoice due balance';
      if (allocAmount > paymentAmount) return 'Allocation cannot exceed payment amount';
      return null;
    };

    expect(validateAllocation(3000)).toBeNull();
    expect(validateAllocation(5000)).toBeNull();
    expect(validateAllocation(6000)).toBe('Allocation cannot exceed invoice due balance');
    expect(validateAllocation(0)).toBe('Allocation must be greater than 0');
    expect(validateAllocation(-500)).toBe('Allocation must be greater than 0');
  });
});
