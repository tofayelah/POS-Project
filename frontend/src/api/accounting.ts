import api from './axios';

export interface AccountGroup {
  id: number;
  name: string;
  code: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parent_id?: number | null;
}

export interface Account {
  id: number;
  account_name: string;
  account_code: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normal_balance: 'DEBIT' | 'CREDIT';
  is_active: boolean;
  is_system?: boolean;
  account_group_id?: number | null;
  account_group?: AccountGroup;
  current_balance?: number;
}

export interface CreateAccountPayload {
  account_name: string;
  account_code: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normal_balance: 'DEBIT' | 'CREDIT';
  account_group_id?: number | null;
  allow_manual_posting?: boolean;
}

export interface UpdateAccountPayload {
  account_name: string;
  account_code?: string;
  account_type?: string;
  normal_balance?: string;
  account_group_id?: number | null;
  is_active?: boolean;
}

export interface JournalEntryLine {
  id?: number;
  account_id: number;
  account?: Account;
  debit: number | string;
  credit: number | string;
  description?: string;
  branch_id?: number;
  warehouse_id?: number;
  business_unit_id?: number;
}

export interface JournalEntry {
  id: number;
  journal_number: string;
  journal_date: string;
  description: string;
  reference_type?: string;
  reference_id?: number;
  source: 'MANUAL' | 'SYSTEM' | 'IMPORT';
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  total_debit: number | string;
  total_credit: number | string;
  reversed_by_journal_id?: number | null;
  reversal_of_id?: number | null;
  lines: JournalEntryLine[];
  created_at?: string;
}

export interface CreateJournalPayload {
  journal_date: string;
  description: string;
  reference_type?: string;
  reference_id?: number;
  lines: {
    account_id: number;
    debit: number;
    credit: number;
    description?: string;
  }[];
}

export interface CashBankTransferPayload {
  from_account_id: number;
  to_account_id: number;
  amount: number;
  date: string;
  reference?: string;
  description?: string;
}

export interface GeneralLedgerLine {
  journal_entry_id: number;
  journal_number: string;
  journal_date: string;
  description: string;
  source: string;
  debit: number | string;
  credit: number | string;
  running_balance: number | string;
}

export interface GeneralLedgerReport {
  account: Account;
  from_date: string;
  to_date: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  lines: GeneralLedgerLine[];
}

export interface TrialBalanceLine {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  debit_balance: number;
  credit_balance: number;
}

export interface TrialBalanceReport {
  as_of_date: string;
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  lines: TrialBalanceLine[];
}

export interface ProfitAndLossReport {
  from_date: string;
  to_date: string;
  operating_revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  gross_margin_percentage: number;
  operating_expenses: number;
  net_profit: number;
  net_margin_percentage: number;
  breakdown: {
    revenue_accounts: { account_id: number; account_code: string; account_name: string; amount: number }[];
    cogs_accounts: { account_id: number; account_code: string; account_name: string; amount: number }[];
    expense_accounts: { account_id: number; account_code: string; account_name: string; amount: number }[];
  };
}

export interface BalanceSheetReport {
  as_of_date: string;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  current_period_earnings: number;
  is_balanced: boolean;
  variance: number;
  breakdown: {
    asset_accounts: { account_id: number; account_code: string; account_name: string; balance: number }[];
    liability_accounts: { account_id: number; account_code: string; account_name: string; balance: number }[];
    equity_accounts: { account_id: number; account_code: string; account_name: string; balance: number }[];
  };
}

export interface CashFlowReport {
  from_date: string;
  to_date: string;
  opening_cash_balance: number;
  total_inflows: number;
  total_outflows: number;
  net_cash_movement: number;
  closing_cash_balance: number;
  inflows_breakdown: { reference_type: string; total: number }[];
  outflows_breakdown: { reference_type: string; total: number }[];
}

export interface VatReport {
  from_date: string;
  to_date: string;
  sales_summary: {
    sales_count: number;
    total_taxable_revenue: number;
    total_output_vat: number;
  };
  gl_vat_payable_balance: number;
  gl_vat_period_movement: number;
}

export const accountingApi = {
  // Accounts
  getAccounts: (params?: { type?: string; active_only?: boolean; search?: string }) =>
    api.get<{ success: boolean; data: Account[] }>('/accounts', { params }),

  getAccount: (id: number) =>
    api.get<{ success: boolean; data: Account }>(`/accounts/${id}`),

  createAccount: (data: CreateAccountPayload) =>
    api.post<{ success: boolean; data: Account }>('/accounts', data),

  updateAccount: (id: number, data: UpdateAccountPayload) =>
    api.put<{ success: boolean; data: Account }>(`/accounts/${id}`, data),

  deleteAccount: (id: number) =>
    api.delete<{ success: boolean; message: string }>(`/accounts/${id}`),

  deactivateAccount: (id: number) =>
    api.post<{ success: boolean; message: string }>(`/accounts/${id}/deactivate`),

  // Account Groups
  getAccountGroups: () =>
    api.get<{ success: boolean; data: AccountGroup[] }>('/account-groups'),

  // Journals
  getJournals: (params?: { status?: string; from_date?: string; to_date?: string; page?: number; per_page?: number }) =>
    api.get<{ success: boolean; data: { data: JournalEntry[]; total: number; current_page: number; last_page: number } | JournalEntry[] }>('/journals', { params }),

  getJournal: (id: number) =>
    api.get<{ success: boolean; data: JournalEntry }>(`/journals/${id}`),

  createJournal: (data: CreateJournalPayload) =>
    api.post<{ success: boolean; data: JournalEntry }>('/journals', data),

  postJournal: (id: number) =>
    api.post<{ success: boolean; data: JournalEntry }>(`/journals/${id}/post`),

  reverseJournal: (id: number, reason?: string) =>
    api.post<{ success: boolean; data: JournalEntry }>(`/journals/${id}/reverse`, { reason }),

  // Cash / Bank Transfer
  transferCashBank: (data: CashBankTransferPayload) =>
    api.post<{ success: boolean; data: JournalEntry }>('/accounting/cash-bank-transfer', data),

  // Reports
  getGeneralLedger: (params: { account_id: number; from_date?: string; to_date?: string }) =>
    api.get<{ success: boolean; data: GeneralLedgerReport }>('/reports/general-ledger', { params }),

  getTrialBalance: (params?: { as_of_date?: string }) =>
    api.get<{ success: boolean; data: TrialBalanceReport }>('/reports/trial-balance', { params }),

  getProfitAndLoss: (params?: { from_date?: string; to_date?: string }) =>
    api.get<{ success: boolean; data: ProfitAndLossReport }>('/reports/profit-loss', { params }),

  getBalanceSheet: (params?: { as_of_date?: string }) =>
    api.get<{ success: boolean; data: BalanceSheetReport }>('/reports/balance-sheet', { params }),

  getCashFlow: (params?: { from_date?: string; to_date?: string }) =>
    api.get<{ success: boolean; data: CashFlowReport }>('/reports/cash-flow', { params }),

  getVatReport: (params?: { from_date?: string; to_date?: string }) =>
    api.get<{ success: boolean; data: VatReport }>('/reports/vat', { params }),
};
