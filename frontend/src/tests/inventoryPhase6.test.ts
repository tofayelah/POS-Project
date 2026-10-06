import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api/axios';
import {
  getStockCounts,
  getStockCount,
  createStockCount,
  startStockCount,
  updateStockCountItems,
  submitStockCount,
  reviewStockCount,
  approveStockCount,
  postStockCount,
  cancelStockCount,
  getStockBatch,
  updateStockBatch,
  toggleStockBatchStatus,
  getStockBatchExpiryReport,
  getInventoryValuation,
  getInventoryReconciliation,
  runInventoryReconciliation,
  getReorderAlerts,
  lookupBarcode,
} from '../api/inventory';

describe('Phase 6: Advanced Inventory & Warehouse Management API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Stock Counts: getStockCounts
  it('1. fetches stock counts list with query params', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          current_page: 1,
          data: [
            { id: 1, count_number: 'SC-2026-0001', status: 'DRAFT', count_type: 'FULL' }
          ]
        }
      }
    };
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue(mockResponse);

    const result = await getStockCounts({ warehouse_id: 2, status: 'DRAFT' });
    expect(getSpy).toHaveBeenCalledWith('/inventory/stock-counts', {
      params: { warehouse_id: 2, status: 'DRAFT' }
    });
    expect(result.data.data[0].count_number).toBe('SC-2026-0001');
  });

  // 2. Stock Counts: getStockCount show
  it('2. fetches single stock count details', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { id: 10, count_number: 'SC-2026-0010', items: [] }
      }
    };
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue(mockResponse);

    const result = await getStockCount(10);
    expect(getSpy).toHaveBeenCalledWith('/inventory/stock-counts/10');
    expect(result.data.id).toBe(10);
  });

  // 3. Stock Counts: createStockCount
  it('3. posts create stock count payload', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { id: 15, count_number: 'SC-2026-0015', status: 'DRAFT' }
      }
    };
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue(mockResponse);

    const payload = {
      warehouse_id: 1,
      count_type: 'FULL' as const,
      auto_populate: true,
      description: 'End of month audit'
    };
    const result = await createStockCount(payload);
    expect(postSpy).toHaveBeenCalledWith('/inventory/stock-counts', payload);
    expect(result.data.id).toBe(15);
  });

  // 4. Stock Counts Lifecycle: start, updateItems, submit, review, approve, post, cancel
  it('4. executes stock count lifecycle state transitions', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true } });

    await startStockCount(10);
    expect(postSpy).toHaveBeenCalledWith('/inventory/stock-counts/10/start');

    await updateStockCountItems(10, { items: [{ id: 101, counted_quantity: 45 }] });
    expect(postSpy).toHaveBeenCalledWith('/inventory/stock-counts/10/items', {
      items: [{ id: 101, counted_quantity: 45 }]
    });

    await submitStockCount(10);
    expect(postSpy).toHaveBeenCalledWith('/inventory/stock-counts/10/submit');

    await reviewStockCount(10);
    expect(postSpy).toHaveBeenCalledWith('/inventory/stock-counts/10/review');

    await approveStockCount(10);
    expect(postSpy).toHaveBeenCalledWith('/inventory/stock-counts/10/approve');

    await postStockCount(10);
    expect(postSpy).toHaveBeenCalledWith('/inventory/stock-counts/10/post');

    await cancelStockCount(10);
    expect(postSpy).toHaveBeenCalledWith('/inventory/stock-counts/10/cancel');
  });

  // 5. Stock Batches: details, update, toggleStatus, expiry report
  it('5. fetches and manages stock batches and quarantine status', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: { id: 5, batch_no: 'BATCH-2026-01', status: 'ACTIVE' } }
    });
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, data: { id: 5, status: 'BLOCKED' } }
    });
    const putSpy = vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: true }
    });

    const batch = await getStockBatch(5);
    expect(getSpy).toHaveBeenCalledWith('/stock-batches/5');
    expect(batch.data.batch_no).toBe('BATCH-2026-01');

    await updateStockBatch(5, { unit_cost: 150 });
    expect(putSpy).toHaveBeenCalledWith('/stock-batches/5', { unit_cost: 150 });

    const toggle = await toggleStockBatchStatus(5, 'BLOCKED', 'Quarantine test');
    expect(postSpy).toHaveBeenCalledWith('/stock-batches/5/toggle-status', {
      status: 'BLOCKED',
      reason: 'Quarantine test'
    });
    expect(toggle.data.status).toBe('BLOCKED');

    await getStockBatchExpiryReport({ days: 30 });
    expect(getSpy).toHaveBeenCalledWith('/stock-batches/expiry-report', {
      params: { days: 30 }
    });
  });

  // 6. Reports: Inventory Valuation
  it('6. requests inventory valuation report with filters', async () => {
    const mockValuation = {
      data: {
        success: true,
        data: [{ inventory_id: 1, cost_valuation: 1000, retail_valuation: 1500 }],
        summary: { total_products: 1, total_cost_valuation: 1000 }
      }
    };
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue(mockValuation);

    const result = await getInventoryValuation({ warehouse_id: 3 });
    expect(getSpy).toHaveBeenCalledWith('/reports/inventory/valuation', {
      params: { warehouse_id: 3 }
    });
    expect(result.data[0].cost_valuation).toBe(1000);
  });

  // 7. Reports: Inventory Reconciliation & Run
  it('7. checks and triggers inventory reconciliation', async () => {
    const mockRecon = {
      data: {
        success: true,
        data: { status: 'HEALTHY', total_inventories_checked: 50, discrepancies_count: 0 }
      }
    };
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue(mockRecon);
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue(mockRecon);

    const getRes = await getInventoryReconciliation({ warehouse_id: 1 });
    expect(getSpy).toHaveBeenCalledWith('/reports/inventory/reconciliation', {
      params: { warehouse_id: 1 }
    });
    expect(getRes.data.status).toBe('HEALTHY');

    const runRes = await runInventoryReconciliation(1);
    expect(postSpy).toHaveBeenCalledWith('/reports/inventory/reconciliation', {
      warehouse_id: 1
    });
    expect(runRes.data.status).toBe('HEALTHY');
  });

  // 8. Alerts & Barcode Lookup
  it('8. fetches reorder alerts and barcode lookup', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: [] }
    });

    await getReorderAlerts({ warehouse_id: 2 });
    expect(getSpy).toHaveBeenCalledWith('/inventory/reorder-alerts', {
      params: { warehouse_id: 2 }
    });

    await lookupBarcode('8901234567890');
    expect(getSpy).toHaveBeenCalledWith('/inventory/barcode-lookup/8901234567890');
  });
});
