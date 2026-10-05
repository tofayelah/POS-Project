import { describe, it, expect, vi } from 'vitest';
import assert from 'node:assert';
import { storeCreditApi, StoreCreditAccount, StoreCreditTransaction } from '../api/storeCredit';
import api from '../api/axios';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

describe('Phase 5.3: Loyalty & Store Credit Frontend Specs', () => {
  it('exposes authoritative store credit API client methods', () => {
    assert.strictEqual(typeof storeCreditApi.getCustomerCredit, 'function');
    assert.strictEqual(typeof storeCreditApi.getTransactions, 'function');
    assert.strictEqual(typeof storeCreditApi.issueCredit, 'function');
    assert.strictEqual(typeof storeCreditApi.redeemCredit, 'function');
    assert.strictEqual(typeof storeCreditApi.adjustCredit, 'function');
  });

  it('calls GET /customers/{id}/store-credit correctly', async () => {
    const mockAccount: StoreCreditAccount = {
      customer_id: 10,
      customer_name: 'Habib Enterprise',
      account_status: 'ACTIVE',
      current_balance: 1500.5,
      can_redeem: true,
    };

    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: { success: true, data: mockAccount },
    });

    const res = await storeCreditApi.getCustomerCredit(10);

    expect(getSpy).toHaveBeenCalledWith('/customers/10/store-credit');
    expect(res.success).toBe(true);
    expect(res.data.current_balance).toBe(1500.5);
    expect(res.data.can_redeem).toBe(true);
    getSpy.mockRestore();
  });

  it('calls GET /customers/{id}/store-credit/transactions with filter params', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          data: [],
          current_page: 1,
          last_page: 1,
          total: 0,
        },
      },
    });

    const params = { type: 'REFUND', date_from: '2026-10-01', per_page: 15 };
    const res = await storeCreditApi.getTransactions(10, params);

    expect(getSpy).toHaveBeenCalledWith('/customers/10/store-credit/transactions', { params });
    expect(res.success).toBe(true);
    expect(res.data.data).toEqual([]);
    getSpy.mockRestore();
  });

  it('calls POST /customers/{id}/store-credit/issue with payload', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Store credit issued successfully.',
        data: {
          customer_id: 10,
          current_balance: 500,
          transaction: {
            id: 1,
            company_id: 1,
            customer_id: 10,
            store_credit_account_id: 2,
            type: 'ISSUE',
            amount: 500,
            balance_before: 0,
            balance_after: 500,
            description: 'Goodwill credit',
            created_at: '2026-10-05T00:00:00Z',
          } as StoreCreditTransaction,
        },
      },
    });

    const payload = { amount: 500, description: 'Goodwill credit', reference_number: 'GW-001' };
    const res = await storeCreditApi.issueCredit(10, payload);

    expect(postSpy).toHaveBeenCalledWith('/customers/10/store-credit/issue', payload);
    expect(res.success).toBe(true);
    expect(res.data.current_balance).toBe(500);
    postSpy.mockRestore();
  });

  it('calls POST /customers/{id}/store-credit/redeem with payload', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Store credit redeemed successfully.',
        data: {
          customer_id: 10,
          current_balance: 200,
          transaction: {
            id: 2,
            company_id: 1,
            customer_id: 10,
            store_credit_account_id: 2,
            type: 'REDEEM',
            amount: -300,
            balance_before: 500,
            balance_after: 200,
            description: 'Redeemed',
            created_at: '2026-10-05T00:00:00Z',
          } as StoreCreditTransaction,
        },
      },
    });

    const payload = { amount: 300, description: 'Redeemed' };
    const res = await storeCreditApi.redeemCredit(10, payload);

    expect(postSpy).toHaveBeenCalledWith('/customers/10/store-credit/redeem', payload);
    expect(res.success).toBe(true);
    expect(res.data.current_balance).toBe(200);
    postSpy.mockRestore();
  });

  it('calls POST /customers/{id}/store-credit/adjust with payload', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Store credit adjusted successfully.',
        data: {
          customer_id: 10,
          current_balance: 250,
          transaction: {
            id: 3,
            company_id: 1,
            customer_id: 10,
            store_credit_account_id: 2,
            type: 'ADJUSTMENT',
            amount: 50,
            balance_before: 200,
            balance_after: 250,
            description: 'Admin adjustment',
            created_at: '2026-10-05T00:00:00Z',
          } as StoreCreditTransaction,
        },
      },
    });

    const payload = { amount: 50, reason: 'Admin adjustment' };
    const res = await storeCreditApi.adjustCredit(10, payload);

    expect(postSpy).toHaveBeenCalledWith('/customers/10/store-credit/adjust', payload);
    expect(res.success).toBe(true);
    expect(res.data.current_balance).toBe(250);
    postSpy.mockRestore();
  });

  it('has complete English and Bengali translation parity for loyalty and store credit keys', () => {
    const requiredKeys = [
      'loyalty.title',
      'loyalty.points',
      'loyalty.pointsBalance',
      'loyalty.redemptionValue',
      'loyalty.minRedemption',
      'loyalty.adjustPoints',
      'loyalty.adjustReason',
      'loyalty.adjustSuccess',
      'loyalty.ledgerTitle',
      'loyalty.earn',
      'loyalty.redeem',
      'loyalty.reversal',
      'loyalty.adjustment',
      'loyalty.status',
      'loyalty.active',
      'loyalty.disabled',
      'storeCredit.title',
      'storeCredit.account',
      'storeCredit.balance',
      'storeCredit.issue',
      'storeCredit.redeem',
      'storeCredit.adjust',
      'storeCredit.amount',
      'storeCredit.reason',
      'storeCredit.reference',
      'storeCredit.expiry',
      'storeCredit.transactions',
      'storeCredit.typeIssue',
      'storeCredit.typeRedeem',
      'storeCredit.typeRefund',
      'storeCredit.typeAdjustment',
      'storeCredit.typeReversal',
      'storeCredit.typeExpiry',
      'storeCredit.insufficientBalance',
      'storeCredit.issueSuccess',
      'storeCredit.adjustSuccess',
    ];

    for (const key of requiredKeys) {
      expect(en[key as keyof typeof en], `Missing EN key: ${key}`).toBeDefined();
      expect(bn[key as keyof typeof bn], `Missing BN key: ${key}`).toBeDefined();
      expect(en[key as keyof typeof en].length).toBeGreaterThan(0);
      expect(bn[key as keyof typeof bn].length).toBeGreaterThan(0);
    }
  });
});
