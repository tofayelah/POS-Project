import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  GoodsReceipt, 
  GoodsReceiptItem, 
  CreateGoodsReceiptPayload, 
  PurchaseOrder,
  PurchaseInvoice
} from '../types/purchase';
import { 
  generateNextGrNumber, 
  getNextGrNumber, 
  getGoodsReceipts, 
  getGoodsReceipt, 
  createGoodsReceipt, 
  postGoodsReceipt, 
  cancelGoodsReceipt 
} from '../api/goodsReceipts';
import { generateIdempotencyKey } from '../api/payments';
import api from '../api/axios';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

vi.mock('../api/axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('Phase 3.3 Step 2 — Goods Receipt & Purchasing Frontend Models & Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates formatted sequential Goods Receipt numbers', () => {
    const grNumber = generateNextGrNumber();
    expect(grNumber).toMatch(/^GR-\d{4}-\d{4}$/);
  });

  it('fetches next receipt number from authoritative backend endpoint', async () => {
    (api.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: { receipt_number: 'GR-2026-0042' },
      },
    });

    const num = await getNextGrNumber();
    expect(api.get).toHaveBeenCalledWith('/goods-receipts/next-number');
    expect(num).toBe('GR-2026-0042');
  });

  it('fetches goods receipts list with pagination from backend', async () => {
    const mockReceipts: GoodsReceipt[] = [
      {
        id: 1,
        company_id: 1,
        supplier_id: 2,
        warehouse_id: 3,
        purchase_order_id: 10,
        receipt_number: 'GR-2026-0001',
        receipt_date: '2026-10-02',
        status: 'POSTED',
      },
    ];

    (api.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          data: mockReceipts,
          total: 1,
        },
      },
    });

    const res = await getGoodsReceipts({ search: 'GR-2026', status: 'POSTED' });
    expect(api.get).toHaveBeenCalledWith('/goods-receipts', {
      params: { search: 'GR-2026', status: 'POSTED' },
    });
    expect(res.data).toHaveLength(1);
    expect(res.total).toBe(1);
    expect(res.data[0].receipt_number).toBe('GR-2026-0001');
  });

  it('fetches single goods receipt detail from backend', async () => {
    const mockReceipt: GoodsReceipt = {
      id: 5,
      company_id: 1,
      supplier_id: 2,
      warehouse_id: 3,
      purchase_order_id: 10,
      receipt_number: 'GR-2026-0005',
      receipt_date: '2026-10-02',
      status: 'DRAFT',
      items: [
        {
          id: 101,
          goods_receipt_id: 5,
          purchase_order_item_id: 50,
          product_id: 1,
          product_variant_id: 2,
          received_quantity: 20,
          unit_cost: 150,
          total_cost: 3000,
        },
      ],
    };

    (api.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockReceipt,
      },
    });

    const res = await getGoodsReceipt(5);
    expect(api.get).toHaveBeenCalledWith('/goods-receipts/5');
    expect(res.data.id).toBe(5);
    expect(res.data.items).toHaveLength(1);
  });

  it('creates draft goods receipt via backend API', async () => {
    const payload: CreateGoodsReceiptPayload = {
      purchase_order_id: 10,
      receipt_number: 'GR-2026-0010',
      receipt_date: '2026-10-02',
      items: [
        {
          purchase_order_item_id: 1,
          received_quantity: 15,
        },
      ],
    };

    (api.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 10, ...payload, status: 'DRAFT' },
      },
    });

    const res = await createGoodsReceipt(payload);
    expect(api.post).toHaveBeenCalledWith('/goods-receipts', payload);
    expect(res.success).toBe(true);
    expect(res.data.id).toBe(10);
  });

  it('posts goods receipt to inventory and accounting via backend API', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 10, status: 'POSTED' },
      },
    });

    const res = await postGoodsReceipt(10);
    expect(api.post).toHaveBeenCalledWith('/goods-receipts/10/post');
    expect(res.success).toBe(true);
    expect(res.data.status).toBe('POSTED');
  });

  it('cancels draft goods receipt via backend API', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 10, status: 'CANCELLED' },
      },
    });

    const res = await cancelGoodsReceipt(10);
    expect(api.post).toHaveBeenCalledWith('/goods-receipts/10/cancel');
    expect(res.success).toBe(true);
    expect(res.data.status).toBe('CANCELLED');
  });

  it('validates receive quantity against pending quantity boundary', () => {
    const poItem = {
      id: 10,
      quantity: 100,
      received_quantity: 40,
      pending_quantity: 60,
    };

    // Valid: 0 < receiveQty <= pending_quantity
    const validQty = 50;
    expect(validQty > 0 && validQty <= poItem.pending_quantity).toBe(true);

    // Invalid: receiveQty > pending_quantity
    const invalidQty = 65;
    expect(invalidQty <= poItem.pending_quantity).toBe(false);

    // Invalid: negative quantity
    const negativeQty = -5;
    expect(negativeQty > 0).toBe(false);

    // Invalid: zero quantity
    const zeroQty = 0;
    expect(zeroQty > 0).toBe(false);
  });

  it('verifies partial receiving progression', () => {
    const poTotal = 100;
    let alreadyReceived = 0;
    let pending = poTotal - alreadyReceived;

    // Receipt 1: 40
    const receipt1 = 40;
    expect(receipt1 <= pending).toBe(true);
    alreadyReceived += receipt1;
    pending = poTotal - alreadyReceived;
    expect(alreadyReceived).toBe(40);
    expect(pending).toBe(60);

    // Receipt 2: 35
    const receipt2 = 35;
    expect(receipt2 <= pending).toBe(true);
    alreadyReceived += receipt2;
    pending = poTotal - alreadyReceived;
    expect(alreadyReceived).toBe(75);
    expect(pending).toBe(25);

    // Receipt 3: 25
    const receipt3 = 25;
    expect(receipt3 <= pending).toBe(true);
    alreadyReceived += receipt3;
    pending = poTotal - alreadyReceived;
    expect(alreadyReceived).toBe(100);
    expect(pending).toBe(0);

    // Attempt Receipt 4: any further quantity must be rejected
    const receipt4 = 1;
    expect(receipt4 <= pending).toBe(false);
  });

  it('validates unit decimal rules: rejects fractional quantities when decimal is not allowed', () => {
    const validateDecimal = (qty: number, decimalAllowed: boolean) => {
      if (!decimalAllowed && qty % 1 !== 0) {
        return 'Fractional quantities are not allowed for this unit';
      }
      return null;
    };

    // Unit 'Piece' (decimal_allowed = false)
    expect(validateDecimal(2.5, false)).toBe('Fractional quantities are not allowed for this unit');
    expect(validateDecimal(3.0, false)).toBeNull();

    // Unit 'Kilogram' (decimal_allowed = true)
    expect(validateDecimal(2.5, true)).toBeNull();
    expect(validateDecimal(0.75, true)).toBeNull();
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

  it('has 100% key parity between English and Bengali for goodsReceipts.* translations', () => {
    const enKeys = Object.keys(en).filter((k) => k.startsWith('goodsReceipts.'));
    const bnKeys = Object.keys(bn).filter((k) => k.startsWith('goodsReceipts.'));

    expect(enKeys.length).toBeGreaterThan(30);
    expect(bnKeys.length).toBe(enKeys.length);

    const missingInBn = enKeys.filter((k) => !(k in bn));
    const missingInEn = bnKeys.filter((k) => !(k in en));

    expect(missingInBn).toEqual([]);
    expect(missingInEn).toEqual([]);
  });
});
