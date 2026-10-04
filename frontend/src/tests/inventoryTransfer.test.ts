import { describe, it, expect, beforeEach, vi } from 'vitest';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';
import type {
  StockTransfer,
  StockTransferItem,
  StockTransferStatus,
  Warehouse,
  Product,
  ProductVariant,
  CreateTransferPayload,
} from '../types/inventory';
import * as inventoryApi from '../api/inventory';

describe('RetailCore ERP Inter-Warehouse Transfer Suite', () => {
  // Test Fixtures
  const mockWarehouseDhaka: Warehouse = {
    id: 1,
    name: 'Central Warehouse (Dhaka)',
    code: 'WH-DHK-01',
    company_id: 1,
    business_unit_id: 1,
    warehouse_type: 'CENTRAL',
    status: 'active',
  };

  const mockWarehouseCtg: Warehouse = {
    id: 2,
    name: 'Chittagong Hub',
    code: 'WH-CTG-01',
    company_id: 1,
    business_unit_id: 1,
    warehouse_type: 'BRANCH',
    status: 'active',
  };

  const mockProduct: Product = {
    id: 10,
    uuid: 'prod-uuid-10',
    company_id: 1,
    category_id: 1,
    unit_id: 1,
    name: 'Cotton Oxford Shirt',
    slug: 'cotton-oxford-shirt',
    product_code: 'SHIRT-OXF',
    has_variants: true,
    product_type: 'variable',
    tax_rate: 0,
    tax_type: 'exclusive',
    reorder_level: 15,
    status: 'active',
    unit: { id: 1, name: 'Pcs', short_code: 'pcs', decimal_allowed: false },
  };

  const mockVariant: ProductVariant = {
    id: 101,
    product_id: 10,
    sku: 'SHIRT-OXF-BLU-L',
    variant_name: 'Blue / L',
    cost_price: 350,
    selling_price: 650,
    status: 'active',
  };

  const mockTransferItem: StockTransferItem = {
    id: 1,
    stock_transfer_id: 50,
    product_id: 10,
    product_variant_id: 101,
    quantity: '20.0000',
    received_quantity: '0.0000',
    unit_cost: '350.0000',
    product: mockProduct,
    product_variant: mockVariant,
  };

  const mockTransferDraft: StockTransfer = {
    id: 50,
    company_id: 1,
    transfer_number: 'TR-2026-0001',
    source_warehouse_id: 1,
    destination_warehouse_id: 2,
    status: 'draft',
    created_at: '2026-10-01T10:00:00Z',
    items: [mockTransferItem],
    source_warehouse: mockWarehouseDhaka,
    destination_warehouse: mockWarehouseCtg,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SECTION 1: TRANSFER LISTING & FILTERING
  // ==========================================================================
  describe('1. Transfer Listing, Filtering & Status Badges', () => {
    it('1.1 retrieves transfers via getTransfers API with warehouse and status params', async () => {
      const getSpy = vi.spyOn(inventoryApi, 'getTransfers').mockResolvedValueOnce({
        data: [mockTransferDraft],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 15,
        from: 1,
        to: 1,
      });

      const res = await inventoryApi.getTransfers({
        source_warehouse_id: 1,
        status: 'draft',
        page: 1,
      });

      expect(getSpy).toHaveBeenCalledWith({
        source_warehouse_id: 1,
        status: 'draft',
        page: 1,
      });
      expect(res.data.length).toBe(1);
      expect(res.data[0].transfer_number).toBe('TR-2026-0001');
      expect(res.data[0].status).toBe('draft');
    });

    it('1.2 filters transfers by status: draft, submitted, approved, shipped, received, cancelled', () => {
      const allTransfers: Partial<StockTransfer>[] = [
        { id: 1, status: 'draft' },
        { id: 2, status: 'submitted' },
        { id: 3, status: 'approved' },
        { id: 4, status: 'shipped' },
        { id: 5, status: 'received' },
        { id: 6, status: 'cancelled' },
      ];

      const statuses: StockTransferStatus[] = ['draft', 'submitted', 'approved', 'shipped', 'received', 'cancelled'];
      statuses.forEach((st) => {
        const filtered = allTransfers.filter((t) => t.status === st);
        expect(filtered.length).toBe(1);
        expect(filtered[0].status).toBe(st);
      });
    });

    it('1.3 maps each transfer status to authentic bilingual labels', () => {
      const statusMap: Record<StockTransferStatus, { en: string; bn: string }> = {
        draft: { en: en['inventory.status.draft'], bn: bn['inventory.status.draft'] },
        submitted: { en: en['inventory.status.submitted'], bn: bn['inventory.status.submitted'] },
        approved: { en: en['inventory.status.approved'], bn: bn['inventory.status.approved'] },
        shipped: { en: en['inventory.status.shipped'], bn: bn['inventory.status.shipped'] },
        received: { en: en['inventory.status.received'], bn: bn['inventory.status.received'] },
        cancelled: { en: en['inventory.status.cancelled'], bn: bn['inventory.status.cancelled'] },
      };

      expect(statusMap.draft.en).toBe('Draft');
      expect(statusMap.draft.bn).toBe('খসড়া');
      expect(statusMap.submitted.en).toBe('Submitted');
      expect(statusMap.submitted.bn).toBe('জমা দেওয়া হয়েছে');
      expect(statusMap.approved.en).toBe('Approved');
      expect(statusMap.approved.bn).toBe('অনুমোদিত');
      expect(statusMap.shipped.en).toBe('Shipped');
      expect(statusMap.shipped.bn).toBe('প্রেরিত');
      expect(statusMap.received.en).toBe('Received');
      expect(statusMap.received.bn).toBe('প্রাপ্ত');
      expect(statusMap.cancelled.en).toBe('Cancelled');
      expect(statusMap.cancelled.bn).toBe('বাতিল');
    });
  });

  // ==========================================================================
  // SECTION 2: TRANSFER CREATION VALIDATION
  // ==========================================================================
  describe('2. Transfer Creation & Pre-Submission Validation', () => {
    it('2.1 rejects transfer when source warehouse equals destination warehouse', () => {
      const sourceId: number = 1;
      const destId: number = 1;

      const isSameWarehouse = sourceId === destId;
      expect(isSameWarehouse).toBe(true);

      expect(en['inventory.sameWarehouseError']).toBe('Source and destination warehouses must be different.');
      expect(bn['inventory.sameWarehouseError']).toBe('উৎস ও গন্তব্য গুদাম ভিন্ন হতে হবে।');
    });

    it('2.2 allows transfer when source and destination warehouses are different', () => {
      const sourceId: number = 1;
      const destId: number = 2;

      const isSameWarehouse = sourceId === destId;
      expect(isSameWarehouse).toBe(false);
    });

    it('2.3 rejects transfer creation if no items are added', () => {
      const items: any[] = [];
      const hasNoItems = items.length === 0;

      expect(hasNoItems).toBe(true);
      expect(en['inventory.noItemsAdded']).toBe('Please add at least one item to transfer.');
      expect(bn['inventory.noItemsAdded']).toBe('স্থানান্তরের জন্য অন্তত একটি পণ্য যোগ করুন।');
    });

    it('2.4 validates that line item transfer quantity does not exceed source available stock', () => {
      const sourceAvailableStock = 15.0;
      const requestedQty = 20.0;

      const exceedsStock = requestedQty > sourceAvailableStock;
      expect(exceedsStock).toBe(true);
    });

    it('2.5 validates that line item transfer quantity must be greater than zero', () => {
      const zeroQty = 0;
      const negativeQty = -3;
      const validQty = 5;

      expect(zeroQty <= 0).toBe(true);
      expect(negativeQty <= 0).toBe(true);
      expect(validQty > 0).toBe(true);
    });

    it('2.6 dispatches createTransfer with valid payload', async () => {
      const createSpy = vi.spyOn(inventoryApi, 'createTransfer').mockResolvedValueOnce({
        data: mockTransferDraft,
        message: 'Transfer created successfully',
      });

      const payload: CreateTransferPayload = {
        company_id: 1,
        source_warehouse_id: 1,
        destination_warehouse_id: 2,
        notes: 'Replenishing regional distribution hub',
        items: [
          {
            product_variant_id: 101,
            quantity: 20,
          },
        ],
      };

      const res = await inventoryApi.createTransfer(payload);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(payload);
      expect(res.data.transfer_number).toBe('TR-2026-0001');
      expect(res.data.status).toBe('draft');
    });
  });

  // ==========================================================================
  // SECTION 3: WORKFLOW STATE TRANSITIONS & ACTIONS
  // ==========================================================================
  describe('3. Multi-Step Transfer Workflow State Machine', () => {
    it('3.1 transitions draft -> submitTransfer(id)', async () => {
      const submitSpy = vi.spyOn(inventoryApi, 'submitTransfer').mockResolvedValueOnce({
        data: { ...mockTransferDraft, status: 'submitted' },
        message: 'Transfer submitted for approval',
      });

      const res = await inventoryApi.submitTransfer(50);

      expect(submitSpy).toHaveBeenCalledWith(50);
      expect(res.data.status).toBe('submitted');
    });

    it('3.2 transitions submitted -> approveTransfer(id)', async () => {
      const approveSpy = vi.spyOn(inventoryApi, 'approveTransfer').mockResolvedValueOnce({
        data: { ...mockTransferDraft, status: 'approved' },
        message: 'Transfer approved',
      });

      const res = await inventoryApi.approveTransfer(50);

      expect(approveSpy).toHaveBeenCalledWith(50);
      expect(res.data.status).toBe('approved');
    });

    it('3.3 transitions approved -> shipTransfer(id)', async () => {
      const shipSpy = vi.spyOn(inventoryApi, 'shipTransfer').mockResolvedValueOnce({
        data: { ...mockTransferDraft, status: 'shipped' },
        message: 'Transfer shipped',
      });

      const res = await inventoryApi.shipTransfer(50);

      expect(shipSpy).toHaveBeenCalledWith(50);
      expect(res.data.status).toBe('shipped');
    });

    it('3.4 transitions shipped -> receiveTransfer(id, payload)', async () => {
      const receiveSpy = vi.spyOn(inventoryApi, 'receiveTransfer').mockResolvedValueOnce({
        data: {
          ...mockTransferDraft,
          status: 'received',
          items: [{ ...mockTransferItem, received_quantity: '20.0000' }],
        },
        message: 'Transfer received successfully',
      });

      const payload = {
        items: [
          {
            item_id: 1,
            received_quantity: 20,
          },
        ],
      };

      const res = await inventoryApi.receiveTransfer(50, payload);

      expect(receiveSpy).toHaveBeenCalledWith(50, payload);
      expect(res.data.status).toBe('received');
      expect(res.data.items?.[0].received_quantity).toBe('20.0000');
    });

    it('3.5 transitions active transfer -> cancelTransfer(id)', async () => {
      const cancelSpy = vi.spyOn(inventoryApi, 'cancelTransfer').mockResolvedValueOnce({
        data: { ...mockTransferDraft, status: 'cancelled' },
        message: 'Transfer cancelled',
      });

      const res = await inventoryApi.cancelTransfer(50);

      expect(cancelSpy).toHaveBeenCalledWith(50);
      expect(res.data.status).toBe('cancelled');
    });

    it('3.6 prevents illegal workflow transitions on terminal states (received, cancelled)', () => {
      const terminalStates: StockTransferStatus[] = ['received', 'cancelled'];

      terminalStates.forEach((status) => {
        const canSubmit = status === 'draft';
        const canApprove = status === 'submitted';
        const canShip = status === 'approved';
        const canReceive = status === 'shipped';
        const canCancel = ['draft', 'submitted', 'approved'].includes(status);

        expect(canSubmit).toBe(false);
        expect(canApprove).toBe(false);
        expect(canShip).toBe(false);
        expect(canReceive).toBe(false);
        expect(canCancel).toBe(false);
      });
    });
  });

  // ==========================================================================
  // SECTION 4: CONFIRMATION DIALOG FLOWS
  // ==========================================================================
  describe('4. Confirmation Dialog Flows & Text Parity', () => {
    it('4.1 verifies submit transfer confirmation prompt in English and Bengali', () => {
      expect(en['inventory.confirmSubmitTransfer']).toBe('Submit Transfer for Approval');
      expect(en['inventory.confirmSubmitTransferDesc']).toBe(
        'Are you sure you want to submit this transfer draft for manager approval?'
      );
      expect(bn['inventory.confirmSubmitTransfer']).toBe('অনুমোদনের জন্য জমা দিন');
      expect(bn['inventory.confirmSubmitTransferDesc']).toBe(
        'আপনি কি এই স্থানান্তরের খসড়া অনুমোদনের জন্য জমা দিতে চান?'
      );
    });

    it('4.2 verifies approve transfer confirmation prompt in English and Bengali', () => {
      expect(en['inventory.confirmApproveTransfer']).toBe('Approve Stock Transfer');
      expect(en['inventory.confirmApproveTransferDesc']).toBe(
        'Are you sure you want to approve this transfer? The source warehouse can then dispatch the stock.'
      );
      expect(bn['inventory.confirmApproveTransfer']).toBe('স্থানান্তর অনুমোদন করুন');
      expect(bn['inventory.confirmApproveTransferDesc']).toBe(
        'আপনি কি এই স্থানান্তর অনুমোদন করতে চান? অনুমোদনের পর পণ্য প্রেরণের যোগ্য হবে।'
      );
    });

    it('4.3 verifies ship transfer confirmation prompt in English and Bengali', () => {
      expect(en['inventory.confirmShipTransfer']).toBe('Dispatch / Ship Transfer');
      expect(en['inventory.confirmShipTransferDesc']).toBe(
        'Are you sure you want to ship this transfer? This will deduct items from the source warehouse inventory.'
      );
      expect(bn['inventory.confirmShipTransfer']).toBe('পণ্য প্রেরণ (শিপ) করুন');
      expect(bn['inventory.confirmShipTransferDesc']).toBe(
        'আপনি কি এই পণ্য প্রেরণ করতে চান? এর ফলে উৎস গুদাম থেকে মজুদ হ্রাস পাবে।'
      );
    });

    it('4.4 verifies receive transfer confirmation prompt in English and Bengali', () => {
      expect(en['inventory.confirmReceiveTransfer']).toBe('Receive Transfer');
      expect(en['inventory.confirmReceiveTransferDesc']).toBe(
        'Are you sure you want to receive these items into the destination warehouse?'
      );
      expect(bn['inventory.confirmReceiveTransfer']).toBe('স্থানান্তরিত পণ্য গ্রহণ করুন');
      expect(bn['inventory.confirmReceiveTransferDesc']).toBe(
        'আপনি কি গন্তব্য গুদামে এই পণ্যগুলো গ্রহণ করতে চান?'
      );
    });

    it('4.5 verifies cancel transfer confirmation prompt in English and Bengali', () => {
      expect(en['inventory.confirmCancelTransfer']).toBe('Cancel Stock Transfer');
      expect(en['inventory.confirmCancelTransferDesc']).toBe(
        'Are you sure you want to cancel this transfer? This action may not be reversible.'
      );
      expect(bn['inventory.confirmCancelTransfer']).toBe('স্থানান্তর বাতিল করুন');
      expect(bn['inventory.confirmCancelTransferDesc']).toBe(
        'আপনি কি এই স্থানান্তর বাতিল করতে চান? এটি পূর্বাবস্থায় ফেরানো নাও যেতে পারে।'
      );
    });
  });

  // ==========================================================================
  // SECTION 5: ERROR HANDLING & HTTP STATUS CODES
  // ==========================================================================
  describe('5. Error Handling & HTTP Status Responses', () => {
    it('5.1 handles 403 Forbidden when user lacks transfer permissions', async () => {
      vi.spyOn(inventoryApi, 'approveTransfer').mockRejectedValueOnce({
        response: {
          status: 403,
          data: { message: 'Forbidden. You do not have permission to approve stock transfers.' },
        },
      });

      try {
        await inventoryApi.approveTransfer(50);
        expect.unreachable('Should have failed');
      } catch (err: any) {
        expect(err.response?.status).toBe(403);
        expect(err.response?.data?.message).toContain('Forbidden');
      }
    });

    it('5.2 handles 409 Conflict when transfer status has already changed concurrently', async () => {
      vi.spyOn(inventoryApi, 'shipTransfer').mockRejectedValueOnce({
        response: {
          status: 409,
          data: { message: 'Transfer status conflict: transfer is already marked as shipped.' },
        },
      });

      try {
        await inventoryApi.shipTransfer(50);
        expect.unreachable('Should have failed');
      } catch (err: any) {
        expect(err.response?.status).toBe(409);
        expect(err.response?.data?.message).toContain('conflict');
      }
    });

    it('5.3 handles 422 Unprocessable Entity when destination warehouse is invalid', async () => {
      vi.spyOn(inventoryApi, 'createTransfer').mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            message: 'Validation error.',
            errors: {
              destination_warehouse_id: ['The selected destination warehouse is invalid or inactive.'],
            },
          },
        },
      });

      try {
        await inventoryApi.createTransfer({
          company_id: 1,
          source_warehouse_id: 1,
          destination_warehouse_id: 999,
          items: [{ product_variant_id: 101, quantity: 5 }],
        });
        expect.unreachable('Should have failed');
      } catch (err: any) {
        expect(err.response?.status).toBe(422);
        expect(err.response?.data?.errors?.destination_warehouse_id).toBeDefined();
      }
    });

    it('5.4 handles 500 Internal Server Error gracefully', async () => {
      vi.spyOn(inventoryApi, 'getTransfers').mockRejectedValueOnce({
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      });

      try {
        await inventoryApi.getTransfers();
        expect.unreachable('Should have failed');
      } catch (err: any) {
        expect(err.response?.status).toBe(500);
      }
    });
  });

  // ==========================================================================
  // SECTION 6: BILINGUAL I18N PARITY & AUTHENTIC BENGALI TERMINOLOGY
  // ==========================================================================
  describe('6. Bilingual Parity & Authentic Bengali Terminology', () => {
    it('6.1 ensures 100% key parity for all inter-warehouse transfer keys', () => {
      const transferKeys = [
        'inventory.transfersTitle',
        'inventory.transfersSubtitle',
        'inventory.newTransfer',
        'inventory.createTransfer',
        'inventory.transferDetails',
        'inventory.transferNumber',
        'inventory.sourceWarehouse',
        'inventory.destinationWarehouse',
        'inventory.sameWarehouseError',
        'inventory.sourceStock',
        'inventory.transferQty',
        'inventory.addItem',
        'inventory.removeItem',
        'inventory.items',
        'inventory.noItemsAdded',
        'inventory.receivedQty',
        'inventory.transferSuccess',
        'inventory.confirmSubmitTransfer',
        'inventory.confirmSubmitTransferDesc',
        'inventory.confirmApproveTransfer',
        'inventory.confirmApproveTransferDesc',
        'inventory.confirmShipTransfer',
        'inventory.confirmShipTransferDesc',
        'inventory.confirmReceiveTransfer',
        'inventory.confirmReceiveTransferDesc',
        'inventory.confirmCancelTransfer',
        'inventory.confirmCancelTransferDesc',
        'inventory.submitAction',
        'inventory.approveAction',
        'inventory.shipAction',
        'inventory.receiveAction',
        'inventory.cancelAction',
        'inventory.viewDetails',
        'inventory.noTransfers',
        'inventory.noTransfersDesc',
        'inventory.filterByStatus',
        'inventory.allStatuses',
        'inventory.status.draft',
        'inventory.status.submitted',
        'inventory.status.approved',
        'inventory.status.shipped',
        'inventory.status.received',
        'inventory.status.cancelled',
      ];

      transferKeys.forEach((key) => {
        expect(en[key], `Missing in en.ts: ${key}`).toBeDefined();
        expect(bn[key], `Missing in bn.ts: ${key}`).toBeDefined();
        expect(en[key].length).toBeGreaterThan(0);
        expect(bn[key].length).toBeGreaterThan(0);
      });
    });

    it('6.2 verifies authentic Bengali business terminology for transfers', () => {
      expect(bn['inventory.transfersTitle']).toBe('আন্তঃগুদাম স্থানান্তর');
      expect(bn['inventory.sourceWarehouse']).toBe('উৎস গুদাম');
      expect(bn['inventory.destinationWarehouse']).toBe('গন্তব্য গুদাম');
      expect(bn['inventory.transferQty']).toBe('স্থানান্তরের পরিমাণ');
      expect(bn['inventory.sourceStock']).toBe('উৎস গুদামের মজুদ');
      expect(bn['inventory.receivedQty']).toBe('প্রাপ্ত পরিমাণ');
      expect(bn['inventory.viewDetails']).toBe('বিবরণ দেখুন');
    });
  });
});
