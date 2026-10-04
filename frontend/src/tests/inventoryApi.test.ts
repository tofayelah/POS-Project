import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api/axios';
import {
  getInventory,
  getLowStock,
  getStockMovements,
  recordOpeningStock,
  adjustStock,
  adjustmentIn,
  adjustmentOut,
  recordDamageLoss,
  directTransfer,
  getTransfers,
  getTransfer,
  createTransfer,
  submitTransfer,
  approveTransfer,
  shipTransfer,
  receiveTransfer,
  cancelTransfer,
  getWarehouses,
  getWarehouse,
  getStorageLocations,
  getStorageLocation,
  createStorageLocation,
  updateStorageLocation,
  deleteStorageLocation,
  getStockBatches,
  createStockBatch,
} from '../api/inventory';
import type {
  OpeningStockPayload,
  StockAdjustmentPayload,
  AdjustmentInPayload,
  AdjustmentOutPayload,
  DamageLossPayload,
  DirectTransferPayload,
  CreateTransferPayload,
  ReceiveTransferPayload,
  CreateStorageLocationPayload,
  UpdateStorageLocationPayload,
  CreateStockBatchPayload,
} from '../api/inventory';

describe('Inventory API Client & Data Contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Inventory list request
  it('1. performs inventory list request to /inventory', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          current_page: 1,
          data: [
            {
              id: 101,
              company_id: 1,
              warehouse_id: 2,
              product_id: 10,
              product_variant_id: 20,
              quantity: '45.5000',
              reserved_quantity: '0.0000',
              available_quantity: '45.5000',
              average_cost: '250.0000',
              total_value: '11375.0000',
            },
          ],
          total: 1,
          per_page: 15,
          last_page: 1,
        },
      },
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockResponse);

    const result = await getInventory();

    expect(getSpy).toHaveBeenCalledWith('/inventory', { params: undefined });
    expect(result.success).toBe(true);
    expect(result.data.data).toHaveLength(1);
    expect(result.data.data[0].id).toBe(101);
  });

  // 2. Inventory filtering
  it('2. sends correct filter parameters for inventory list', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { current_page: 2, data: [], total: 0, per_page: 25, last_page: 1 },
      },
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockResponse);

    const filters = {
      warehouse_id: 3,
      product_id: 12,
      product_variant_id: 45,
      search: 'Cotton Polo',
      per_page: 25,
      page: 2,
    };

    const result = await getInventory(filters);

    expect(getSpy).toHaveBeenCalledWith('/inventory', { params: filters });
    expect(result.data.current_page).toBe(2);
  });

  // 3. Stock movement request
  it('3. requests stock movements audit log from /inventory/movements', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          current_page: 1,
          data: [
            {
              id: 501,
              company_id: 1,
              warehouse_id: 2,
              product_id: 10,
              product_variant_id: 20,
              movement_type: 'STOCK_IN',
              quantity: '100.0000',
              unit_cost: '120.0000',
              total_cost: '12000.0000',
              quantity_before: '0.0000',
              quantity_after: '100.0000',
              reference_type: 'PURCHASE',
              reference_id: 1,
              reference_number: 'PO-2026-001',
            },
          ],
          total: 1,
          per_page: 25,
          last_page: 1,
        },
      },
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockResponse);

    const result = await getStockMovements({ warehouse_id: 2, movement_type: 'STOCK_IN' });

    expect(getSpy).toHaveBeenCalledWith('/inventory/movements', {
      params: { warehouse_id: 2, movement_type: 'STOCK_IN' },
    });
    expect(result.data.data[0].movement_type).toBe('STOCK_IN');
  });

  // 4. Stock adjustment request
  it('4. posts stock adjustment to /inventory/adjustments', async () => {
    const payload: StockAdjustmentPayload = {
      company_id: 1,
      warehouse_id: 2,
      product_variant_id: 20,
      type: 'add',
      quantity: 5.5,
      reason: 'Physical count discrepancy found extra',
      notes: 'Audited during Q3 stocktaking',
    };

    const mockResponse = {
      data: {
        success: true,
        message: 'Stock adjusted successfully.',
        data: { id: 601, quantity: '5.5000', movement_type: 'ADJUSTMENT_IN' },
      },
    };

    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce(mockResponse);

    const result = await adjustStock(payload);

    expect(postSpy).toHaveBeenCalledWith('/inventory/adjustments', payload);
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(601);
  });

  // 5. Stock transfer request
  it('5. creates stock transfer draft via /inventory/transfers', async () => {
    const payload: CreateTransferPayload = {
      company_id: 1,
      source_warehouse_id: 1,
      destination_warehouse_id: 2,
      notes: 'Replenishing Gulshan retail branch',
      items: [
        { product_variant_id: 20, quantity: 15.25, notes: 'Medium size' },
        { product_variant_id: 21, quantity: 10.0, notes: 'Large size' },
      ],
    };

    const mockResponse = {
      data: {
        success: true,
        message: 'Transfer created successfully.',
        data: {
          id: 701,
          transfer_number: 'TRF-ABCD1234',
          status: 'draft',
          items: payload.items,
        },
      },
    };

    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce(mockResponse);

    const result = await createTransfer(payload);

    expect(postSpy).toHaveBeenCalledWith('/inventory/transfers', payload);
    expect(result.data.transfer_number).toBe('TRF-ABCD1234');
    expect(result.data.status).toBe('draft');
  });

  // 6. Warehouse request
  it('6. fetches warehouses from /warehouses', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: [
          { id: 1, name: 'Central Warehouse', code: 'WH-CENTRAL', warehouse_type: 'MAIN' },
          { id: 2, name: 'Gulshan Branch WH', code: 'WH-GULSHAN', warehouse_type: 'BRANCH' },
        ],
      },
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockResponse);

    const result = await getWarehouses();

    expect(getSpy).toHaveBeenCalledWith('/warehouses');
    expect(result.data).toHaveLength(2);
    expect(result.data[0].code).toBe('WH-CENTRAL');
  });

  // 7. Storage location request
  it('7. fetches storage locations from /storage-locations', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: [
          { id: 1, warehouse_id: 1, code: 'A1-R1', name: 'Aisle 1 Rack 1', is_active: true },
          { id: 2, warehouse_id: 1, code: 'A1-R2', name: 'Aisle 1 Rack 2', is_active: true },
        ],
      },
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockResponse);

    const result = await getStorageLocations({ warehouse_id: 1, is_active: true });

    expect(getSpy).toHaveBeenCalledWith('/storage-locations', {
      params: { warehouse_id: 1, is_active: true },
    });
    expect(result.data).toHaveLength(2);
  });

  // 8. Correct query serialization
  it('8. ensures correct serialization for all query-based methods', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [] } });

    await getInventory({ warehouse_id: 5, search: 'Test' });
    expect(getSpy).toHaveBeenLastCalledWith('/inventory', { params: { warehouse_id: 5, search: 'Test' } });

    await getStockMovements({ product_variant_id: 10, per_page: 50 });
    expect(getSpy).toHaveBeenLastCalledWith('/inventory/movements', {
      params: { product_variant_id: 10, per_page: 50 },
    });

    await getTransfers({ status: 'shipped', source_warehouse_id: 2 });
    expect(getSpy).toHaveBeenLastCalledWith('/inventory/transfers', {
      params: { status: 'shipped', source_warehouse_id: 2 },
    });

    await getStockBatches({ variant_id: 99, status: 'ACTIVE' });
    expect(getSpy).toHaveBeenLastCalledWith('/stock-batches', {
      params: { variant_id: 99, status: 'ACTIVE' },
    });
  });

  // 9. Correct request payload
  it('9. ensures correct payload formats for opening stock, adjustments, and transfers', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true } });

    // Opening stock
    const opening: OpeningStockPayload = {
      company_id: 1,
      warehouse_id: 2,
      product_variant_id: 10,
      quantity: 100.5,
      unit_cost: 50.25,
      notes: 'Initial inventory intake',
    };
    await recordOpeningStock(opening);
    expect(postSpy).toHaveBeenLastCalledWith('/inventory/opening-stock', opening);

    // Adjustment In
    const adjIn: AdjustmentInPayload = {
      company_id: 1,
      warehouse_id: 2,
      product_variant_id: 10,
      quantity: 10.75,
      unit_cost: 48.0,
      reference_type: 'AUDIT',
      reference_id: 101,
      reference_number: 'AUD-001',
      reason: 'Recount surplus',
    };
    await adjustmentIn(adjIn);
    expect(postSpy).toHaveBeenLastCalledWith('/inventory/adjustments/in', adjIn);

    // Adjustment Out
    const adjOut: AdjustmentOutPayload = {
      company_id: 1,
      warehouse_id: 2,
      product_variant_id: 10,
      quantity: 2.25,
      reference_type: 'DAMAGE',
      reference_id: 102,
      reference_number: 'DMG-001',
      reason: 'Water leak damage',
    };
    await adjustmentOut(adjOut);
    expect(postSpy).toHaveBeenLastCalledWith('/inventory/adjustments/out', adjOut);

    // Damage / Loss
    const dmg: DamageLossPayload = {
      company_id: 1,
      warehouse_id: 2,
      product_variant_id: 10,
      type: 'loss',
      quantity: 1.0,
      reason: 'Expired items disposed',
    };
    await recordDamageLoss(dmg);
    expect(postSpy).toHaveBeenLastCalledWith('/inventory/damage-loss', dmg);

    // Direct Transfer
    const direct: DirectTransferPayload = {
      company_id: 1,
      source_warehouse_id: 1,
      destination_warehouse_id: 2,
      product_variant_id: 10,
      quantity: 25.0,
      reference_type: 'QUICK_TRANSFER',
      reference_id: 99,
      reference_number: 'TRF-DIR-01',
      reason: 'Urgent store replenishment',
    };
    await directTransfer(direct);
    expect(postSpy).toHaveBeenLastCalledWith('/inventory/transfers/direct', direct);
  });

  // 10. API error propagation (401)
  it('10. propagates 401 Unauthenticated error without swallowing', async () => {
    const error401 = {
      response: {
        status: 401,
        data: { success: false, message: 'Unauthenticated.' },
      },
    };

    vi.spyOn(api, 'get').mockRejectedValueOnce(error401);

    await expect(getInventory()).rejects.toMatchObject({
      response: { status: 401 },
    });
  });

  // 11. 403 propagation
  it('11. propagates 403 Forbidden error on cross-tenant access', async () => {
    const error403 = {
      response: {
        status: 403,
        data: { success: false, message: 'Forbidden: You do not have access to this company.' },
      },
    };

    vi.spyOn(api, 'post').mockRejectedValueOnce(error403);

    await expect(
      adjustStock({
        company_id: 999, // Unauthorized company
        warehouse_id: 1,
        product_variant_id: 1,
        type: 'add',
        quantity: 10,
        reason: 'Unauthorized test',
      })
    ).rejects.toMatchObject({
      response: { status: 403 },
    });
  });

  // 12. 409 propagation
  it('12. propagates 409 Conflict error for business constraint violations', async () => {
    const error409 = {
      response: {
        status: 409,
        data: {
          success: false,
          message: "Fractional quantities are not allowed for unit 'Piece'.",
        },
      },
    };

    vi.spyOn(api, 'post').mockRejectedValueOnce(error409);

    await expect(
      recordOpeningStock({
        company_id: 1,
        warehouse_id: 1,
        product_variant_id: 1,
        quantity: 2.5, // Fractional quantity for integer unit
      })
    ).rejects.toMatchObject({
      response: {
        status: 409,
        data: { message: "Fractional quantities are not allowed for unit 'Piece'." },
      },
    });
  });

  // 13. Decimal quantities preserved
  it('13. preserves decimal precision without rounding or integer conversion', async () => {
    const decimalPayload: OpeningStockPayload = {
      company_id: 1,
      warehouse_id: 1,
      product_variant_id: 5,
      quantity: 12.3754, // Precision to 4 decimals
      unit_cost: 1599.995,
    };

    const mockResponse = {
      data: {
        success: true,
        data: {
          id: 1,
          quantity: '12.3754',
          unit_cost: '1599.9950',
          total_cost: '19799.1381',
        },
      },
    };

    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce(mockResponse);

    const result = await recordOpeningStock(decimalPayload);

    // Quantity passed to API must remain exact float, not integer
    expect(postSpy).toHaveBeenCalledWith('/inventory/opening-stock', expect.objectContaining({
      quantity: 12.3754,
      unit_cost: 1599.995,
    }));

    // Output must preserve exact decimal values
    expect(result.data.quantity).toBe('12.3754');
    expect(parseFloat(result.data.quantity)).toBeCloseTo(12.3754, 4);
    expect(parseFloat(result.data.total_cost)).toBeCloseTo(19799.1381, 4);
  });

  // 14. No fake inventory fallback
  it('14. never returns fake inventory fallback on API failure', async () => {
    const error500 = {
      response: {
        status: 500,
        data: { success: false, message: 'Internal Server Error' },
      },
    };

    vi.spyOn(api, 'get').mockRejectedValueOnce(error500);

    // Must throw, NOT return available_stock = 0 or empty object
    let caughtError: unknown = null;
    try {
      await getInventory();
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect((caughtError as { response: { status: number } }).response.status).toBe(500);
  });

  // 15. Axios/auth architecture reused
  it('15. reuses existing Axios client instance and handles transfer workflow endpoints', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true } });
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true } });
    const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } });
    const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ data: { success: true } });

    // Workflow actions
    await getTransfer(42);
    expect(getSpy).toHaveBeenCalledWith('/inventory/transfers/42');

    await submitTransfer(42);
    expect(postSpy).toHaveBeenCalledWith('/inventory/transfers/42/submit');

    await approveTransfer(42);
    expect(postSpy).toHaveBeenCalledWith('/inventory/transfers/42/approve');

    await shipTransfer(42);
    expect(postSpy).toHaveBeenCalledWith('/inventory/transfers/42/ship');

    const receivePayload: ReceiveTransferPayload = {
      items: [{ item_id: 1, received_quantity: 10 }],
    };
    await receiveTransfer(42, receivePayload);
    expect(postSpy).toHaveBeenCalledWith('/inventory/transfers/42/receive', receivePayload);

    await cancelTransfer(42);
    expect(postSpy).toHaveBeenCalledWith('/inventory/transfers/42/cancel');

    // Storage location CRUD
    const locPayload: CreateStorageLocationPayload = {
      warehouse_id: 1,
      code: 'BIN-101',
      name: 'Bin 101',
    };
    await createStorageLocation(locPayload);
    expect(postSpy).toHaveBeenCalledWith('/storage-locations', locPayload);

    const updateLocPayload: UpdateStorageLocationPayload = { name: 'Bin 101 Updated' };
    await updateStorageLocation(5, updateLocPayload);
    expect(putSpy).toHaveBeenCalledWith('/storage-locations/5', updateLocPayload);

    await deleteStorageLocation(5);
    expect(deleteSpy).toHaveBeenCalledWith('/storage-locations/5');

    // Stock batch
    const batchPayload: CreateStockBatchPayload = {
      product_id: 1,
      variant_id: 2,
      batch_no: 'BATCH-2026-X',
    };
    await createStockBatch(batchPayload);
    expect(postSpy).toHaveBeenCalledWith('/stock-batches', batchPayload);
  });
});
