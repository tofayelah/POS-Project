import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api/axios';
import { accountingApi } from '../api/accounting';

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

describe('Phase 3.5 — Financial Accounting Operations Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Chart of Accounts API Client', () => {
    it('fetches accounts with search and type parameters', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 1, account_code: '1010', account_name: 'Cash on Hand', account_type: 'ASSET', normal_balance: 'DEBIT', is_active: true, is_system: true },
            { id: 2, account_code: '2000', account_name: 'Accounts Payable', account_type: 'LIABILITY', normal_balance: 'CREDIT', is_active: true, is_system: true },
          ],
        },
      };
      (api.get as any).mockResolvedValueOnce(mockResponse);

      const res = await accountingApi.getAccounts({ type: 'ASSET', search: 'Cash' });
      expect(api.get).toHaveBeenCalledWith('/accounts', { params: { type: 'ASSET', search: 'Cash' } });
      expect(res.data.data).toHaveLength(2);
    });

    it('creates new custom account with POST /accounts', async () => {
      const payload = {
        account_name: 'Petty Cash',
        account_code: '1015',
        account_type: 'ASSET' as const,
        normal_balance: 'DEBIT' as const,
        allow_manual_posting: true,
      };
      const mockResponse = { data: { success: true, data: { id: 10, ...payload } } };
      (api.post as any).mockResolvedValueOnce(mockResponse);

      const res = await accountingApi.createAccount(payload);
      expect(api.post).toHaveBeenCalledWith('/accounts', payload);
      expect(res.data.data.account_code).toBe('1015');
    });

    it('updates custom account with PUT /accounts/:id', async () => {
      const updateData = { account_name: 'Renamed Cash Account' };
      (api.put as any).mockResolvedValueOnce({ data: { success: true, data: { id: 1, ...updateData } } });

      const res = await accountingApi.updateAccount(1, updateData);
      expect(api.put).toHaveBeenCalledWith('/accounts/1', updateData);
      expect(res.data.data.account_name).toBe('Renamed Cash Account');
    });

    it('deletes custom account with DELETE /accounts/:id', async () => {
      (api.delete as any).mockResolvedValueOnce({ data: { success: true, message: 'Deleted' } });
      const res = await accountingApi.deleteAccount(5);
      expect(api.delete).toHaveBeenCalledWith('/accounts/5');
      expect(res.data.success).toBe(true);
    });

    it('deactivates account with POST /accounts/:id/deactivate', async () => {
      (api.post as any).mockResolvedValueOnce({ data: { success: true, message: 'Deactivated' } });
      const res = await accountingApi.deactivateAccount(5);
      expect(api.post).toHaveBeenCalledWith('/accounts/5/deactivate');
      expect(res.data.success).toBe(true);
    });
  });

  describe('Journal Entries & Lifecycle API Client', () => {
    it('fetches journal entries with status filter', async () => {
      const mockJournals = [
        { id: 1, journal_number: 'JRN-2026-0001', journal_date: '2026-02-01', description: 'Opening', status: 'POSTED', total_debit: 1000, total_credit: 1000, lines: [] },
      ];
      (api.get as any).mockResolvedValueOnce({ data: { success: true, data: mockJournals } });

      const res = await accountingApi.getJournals({ status: 'POSTED' });
      expect(api.get).toHaveBeenCalledWith('/journals', { params: { status: 'POSTED' } });
      expect(res.data.data).toHaveLength(1);
    });

    it('creates manual journal entry with lines', async () => {
      const payload = {
        journal_date: '2026-03-01',
        description: 'Office Supplies',
        lines: [
          { account_id: 10, debit: 500, credit: 0, description: 'Stationery' },
          { account_id: 1, debit: 0, credit: 500, description: 'Cash' },
        ],
      };
      (api.post as any).mockResolvedValueOnce({ data: { success: true, data: { id: 99, status: 'DRAFT', ...payload } } });

      const res = await accountingApi.createJournal(payload);
      expect(api.post).toHaveBeenCalledWith('/journals', payload);
      expect(res.data.data.status).toBe('DRAFT');
    });

    it('posts draft journal with POST /journals/:id/post', async () => {
      (api.post as any).mockResolvedValueOnce({ data: { success: true, data: { id: 99, status: 'POSTED' } } });
      const res = await accountingApi.postJournal(99);
      expect(api.post).toHaveBeenCalledWith('/journals/99/post');
      expect(res.data.data.status).toBe('POSTED');
    });

    it('reverses posted journal with POST /journals/:id/reverse', async () => {
      const reason = 'Correction of duplicate transaction';
      (api.post as any).mockResolvedValueOnce({
        data: { success: true, data: { id: 100, status: 'POSTED', reversal_of_id: 99 } },
      });
      const res = await accountingApi.reverseJournal(99, reason);
      expect(api.post).toHaveBeenCalledWith('/journals/99/reverse', { reason });
      expect(res.data.data.reversal_of_id).toBe(99);
    });
  });

  describe('Atomic Cash & Bank Transfer Client', () => {
    it('executes cash/bank transfer calling POST /accounting/cash-bank-transfer', async () => {
      const transferPayload = {
        from_account_id: 1,
        to_account_id: 2,
        amount: 25000,
        date: '2026-03-15',
        reference: 'DEP-987',
        description: 'Cash deposit to Bank',
      };
      (api.post as any).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 200,
            journal_number: 'JRN-2026-0050',
            reference_type: 'CASH_BANK_TRANSFER',
            status: 'POSTED',
          },
        },
      });

      const res = await accountingApi.transferCashBank(transferPayload);
      expect(api.post).toHaveBeenCalledWith('/accounting/cash-bank-transfer', transferPayload);
      expect(res.data.data.reference_type).toBe('CASH_BANK_TRANSFER');
      expect(res.data.data.status).toBe('POSTED');
    });
  });

  describe('Financial Reports & Invariants API Client', () => {
    it('fetches General Ledger with running and opening balance', async () => {
      const mockGl = {
        opening_balance: 10000,
        total_debit: 5000,
        total_credit: 2000,
        closing_balance: 13000,
        lines: [
          { journal_entry_id: 1, journal_number: 'JRN-01', debit: 5000, credit: 0, running_balance: 15000 },
          { journal_entry_id: 2, journal_number: 'JRN-02', debit: 0, credit: 2000, running_balance: 13000 },
        ],
      };
      (api.get as any).mockResolvedValueOnce({ data: { success: true, data: mockGl } });

      const res = await accountingApi.getGeneralLedger({ account_id: 1, from_date: '2026-02-01', to_date: '2026-02-28' });
      expect(api.get).toHaveBeenCalledWith('/reports/general-ledger', {
        params: { account_id: 1, from_date: '2026-02-01', to_date: '2026-02-28' },
      });
      expect(res.data.data.closing_balance).toBe(13000);
      expect(res.data.data.lines).toHaveLength(2);
    });

    it('fetches Trial Balance and validates is_balanced invariant', async () => {
      const mockTb = {
        as_of_date: '2026-03-31',
        total_debit: 75000,
        total_credit: 75000,
        is_balanced: true,
        lines: [],
      };
      (api.get as any).mockResolvedValueOnce({ data: { success: true, data: mockTb } });

      const res = await accountingApi.getTrialBalance({ as_of_date: '2026-03-31' });
      expect(api.get).toHaveBeenCalledWith('/reports/trial-balance', { params: { as_of_date: '2026-03-31' } });
      expect(res.data.data.is_balanced).toBe(true);
      expect(res.data.data.total_debit).toBe(res.data.data.total_credit);
    });

    it('fetches Profit and Loss statement with Gross & Net margin', async () => {
      const mockPnl = {
        operating_revenue: 100000,
        cost_of_goods_sold: 40000,
        gross_profit: 60000,
        gross_margin_percentage: 60.0,
        operating_expenses: 15000,
        net_profit: 45000,
        net_margin_percentage: 45.0,
      };
      (api.get as any).mockResolvedValueOnce({ data: { success: true, data: mockPnl } });

      const res = await accountingApi.getProfitAndLoss({ from_date: '2026-01-01', to_date: '2026-01-31' });
      expect(api.get).toHaveBeenCalledWith('/reports/profit-loss', {
        params: { from_date: '2026-01-01', to_date: '2026-01-31' },
      });
      expect(res.data.data.gross_profit).toBe(60000);
      expect(res.data.data.net_profit).toBe(45000);
    });

    it('fetches Balance Sheet and validates Assets == Liabilities + Equity', async () => {
      const mockBs = {
        as_of_date: '2026-03-31',
        total_assets: 250000,
        total_liabilities: 80000,
        total_equity: 170000,
        current_period_earnings: 45000,
        is_balanced: true,
        variance: 0,
      };
      (api.get as any).mockResolvedValueOnce({ data: { success: true, data: mockBs } });

      const res = await accountingApi.getBalanceSheet({ as_of_date: '2026-03-31' });
      expect(api.get).toHaveBeenCalledWith('/reports/balance-sheet', { params: { as_of_date: '2026-03-31' } });
      expect(res.data.data.total_assets).toBe(res.data.data.total_liabilities + res.data.data.total_equity);
      expect(res.data.data.is_balanced).toBe(true);
      expect(res.data.data.variance).toBe(0);
    });

    it('fetches Cash Flow Statement with opening, movements, and closing', async () => {
      const mockCf = {
        opening_cash_balance: 50000,
        total_inflows: 30000,
        total_outflows: 12000,
        net_cash_movement: 18000,
        closing_cash_balance: 68000,
      };
      (api.get as any).mockResolvedValueOnce({ data: { success: true, data: mockCf } });

      const res = await accountingApi.getCashFlow({ from_date: '2026-02-01', to_date: '2026-02-28' });
      expect(api.get).toHaveBeenCalledWith('/reports/cash-flow', {
        params: { from_date: '2026-02-01', to_date: '2026-02-28' },
      });
      expect(res.data.data.closing_cash_balance).toBe(
        res.data.data.opening_cash_balance + res.data.data.net_cash_movement
      );
    });

    it('fetches VAT report with sales tax and GL reconciliation', async () => {
      const mockVat = {
        sales_summary: {
          sales_count: 45,
          total_taxable_revenue: 200000,
          total_output_vat: 15000,
        },
        gl_vat_payable_balance: 15000,
        gl_vat_period_movement: 15000,
      };
      (api.get as any).mockResolvedValueOnce({ data: { success: true, data: mockVat } });

      const res = await accountingApi.getVatReport({ from_date: '2026-01-01', to_date: '2026-01-31' });
      expect(api.get).toHaveBeenCalledWith('/reports/vat', {
        params: { from_date: '2026-01-01', to_date: '2026-01-31' },
      });
      expect(res.data.data.gl_vat_payable_balance).toBe(15000);
    });
  });
});
