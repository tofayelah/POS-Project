import api from './axios';
import {
  CostCentre,
  ProfitCentre,
  Budget,
  BudgetControl,
  BudgetVarianceReport,
  BankAccount,
  BankStatement,
  BankStatementLine,
  BankReconciliation,
  FinancialPeriodExtended,
  PeriodClosingCheck,
  YearEndClosing,
  FixedAssetCategory,
  FixedAsset,
  ArAgingSummary,
  ApAgingSummary,
  TreasuryPosition,
  CashFlowForecast,
  FinancialRatios,
  ExecutiveTelemetry,
} from '../types/finance';

export const financeApi = {
  // 1. Budgets
  getBudgets: (params?: any) =>
    api.get<{ success: boolean; data: Budget[] }>('/financial-management/budgets', { params }),
  getBudget: (id: number) =>
    api.get<{ success: boolean; data: Budget }>(`/financial-management/budgets/${id}`),
  createBudget: (data: any) =>
    api.post<{ success: boolean; message: string; data: Budget }>('/financial-management/budgets', data),
  updateBudget: (id: number, data: any) =>
    api.put<{ success: boolean; message: string; data: Budget }>(`/financial-management/budgets/${id}`, data),
  submitBudget: (id: number) =>
    api.post<{ success: boolean; message: string; data: Budget }>(`/financial-management/budgets/${id}/submit`),
  approveBudget: (id: number) =>
    api.post<{ success: boolean; message: string; data: Budget }>(`/financial-management/budgets/${id}/approve`),
  activateBudget: (id: number) =>
    api.post<{ success: boolean; message: string; data: Budget }>(`/financial-management/budgets/${id}/activate`),
  createRevision: (id: number) =>
    api.post<{ success: boolean; message: string; data: Budget }>(`/financial-management/budgets/${id}/revise`),
  getBudgetVariance: (id: number, params?: any) =>
    api.get<{ success: boolean; data: BudgetVarianceReport }>(`/financial-management/budgets/${id}/variance`, { params }),

  // 2. Budget Controls
  getBudgetControls: () =>
    api.get<{ success: boolean; data: BudgetControl[] }>('/financial-management/budget-controls'),
  createBudgetControl: (data: any) =>
    api.post<{ success: boolean; message: string; data: BudgetControl }>('/financial-management/budget-controls', data),
  updateBudgetControl: (id: number, data: any) =>
    api.put<{ success: boolean; message: string; data: BudgetControl }>(`/financial-management/budget-controls/${id}`, data),
  deleteBudgetControl: (id: number) =>
    api.delete<{ success: boolean; message: string }>(`/financial-management/budget-controls/${id}`),

  // 3. Cash & Treasury
  getTreasuryPositions: (params?: any) =>
    api.get<{ success: boolean; data: TreasuryPosition }>('/financial-management/treasury/positions', { params }),
  getCashForecast: (params?: any) =>
    api.get<{ success: boolean; data: CashFlowForecast }>('/financial-management/treasury/cash-forecast', { params }),

  // 4. Bank Accounts & Statements
  getBankAccounts: () =>
    api.get<{ success: boolean; data: BankAccount[] }>('/financial-management/bank/accounts'),
  createBankAccount: (data: any) =>
    api.post<{ success: boolean; message: string; data: BankAccount }>('/financial-management/bank/accounts', data),
  updateBankAccount: (id: number, data: any) =>
    api.put<{ success: boolean; message: string; data: BankAccount }>(`/financial-management/bank/accounts/${id}`, data),
  importBankStatement: (data: any) =>
    api.post<{ success: boolean; message: string; data: BankStatement }>('/financial-management/bank/statements/import', data),
  getBankStatements: (params?: any) =>
    api.get<{ success: boolean; data: BankStatement[] }>('/financial-management/bank/statements', { params }),
  getBankStatementLines: (statementId: number) =>
    api.get<{ success: boolean; data: BankStatementLine[] }>(`/financial-management/bank/statements/${statementId}/lines`),

  // 5. Bank Reconciliation
  getReconciliations: (params?: any) =>
    api.get<{ success: boolean; data: BankReconciliation[] }>('/financial-management/bank/reconciliations', { params }),
  createReconciliation: (data: any) =>
    api.post<{ success: boolean; message: string; data: BankReconciliation }>('/financial-management/bank/reconciliations', data),
  getReconciliation: (id: number) =>
    api.get<{ success: boolean; data: BankReconciliation }>(`/financial-management/bank/reconciliations/${id}`),
  autoMatchReconciliation: (id: number) =>
    api.post<{ success: boolean; message: string; data: any }>(`/financial-management/bank/reconciliations/${id}/auto-match`),
  manualMatchReconciliation: (id: number, data: { bank_statement_line_id: number; journal_entry_line_id: number }) =>
    api.post<{ success: boolean; message: string; data: any }>(`/financial-management/bank/reconciliations/${id}/manual-match`, data),
  unmatchReconciliation: (id: number, matchId: number) =>
    api.post<{ success: boolean; message: string; data: any }>(`/financial-management/bank/reconciliations/${id}/matches/${matchId}/unmatch`),
  finalizeReconciliation: (id: number) =>
    api.post<{ success: boolean; message: string; data: BankReconciliation }>(`/financial-management/bank/reconciliations/${id}/finalize`),

  // 6. Financial Periods & Year-End Closing
  getFinancialPeriods: (params?: any) =>
    api.get<{ success: boolean; data: FinancialPeriodExtended[] }>('/financial-management/periods', { params }),
  getPeriodClosingChecks: (periodId: number) =>
    api.get<{ success: boolean; data: PeriodClosingCheck }>(`/financial-management/periods/${periodId}/pre-close-check`),
  softLockPeriod: (periodId: number) =>
    api.post<{ success: boolean; message: string; data: FinancialPeriodExtended }>(`/financial-management/periods/${periodId}/soft-lock`),
  closePeriod: (periodId: number) =>
    api.post<{ success: boolean; message: string; data: FinancialPeriodExtended }>(`/financial-management/periods/${periodId}/close`),
  reopenPeriod: (periodId: number, data: { reason: string }) =>
    api.post<{ success: boolean; message: string; data: FinancialPeriodExtended }>(`/financial-management/periods/${periodId}/reopen`, data),
  getYearEndClosings: () =>
    api.get<{ success: boolean; data: YearEndClosing[] }>('/financial-management/year-end-closings'),
  previewYearEndClosing: (params: { fiscal_year_id: number }) =>
    api.get<{ success: boolean; data: any }>('/financial-management/year-end-closings/preview', { params }),
  executeYearEndClosing: (data: { fiscal_year_id: number; closing_date: string; retained_earnings_account_id: number }) =>
    api.post<{ success: boolean; message: string; data: YearEndClosing }>('/financial-management/year-end-closings', data),
  rollbackYearEndClosing: (id: number) =>
    api.post<{ success: boolean; message: string; data: YearEndClosing }>(`/financial-management/year-end-closings/${id}/rollback`),

  // 7. Cost & Profit Centres
  getCostCentres: (params?: any) =>
    api.get<{ success: boolean; data: CostCentre[] }>('/financial-management/centres/cost', { params }),
  createCostCentre: (data: any) =>
    api.post<{ success: boolean; message: string; data: CostCentre }>('/financial-management/centres/cost', data),
  updateCostCentre: (id: number, data: any) =>
    api.put<{ success: boolean; message: string; data: CostCentre }>(`/financial-management/centres/cost/${id}`, data),
  getCostCentreExpenseReport: (id: number, params?: any) =>
    api.get<{ success: boolean; data: any }>(`/financial-management/centres/cost/${id}/expenses`, { params }),
  getProfitCentres: (params?: any) =>
    api.get<{ success: boolean; data: ProfitCentre[] }>('/financial-management/centres/profit', { params }),
  createProfitCentre: (data: any) =>
    api.post<{ success: boolean; message: string; data: ProfitCentre }>('/financial-management/centres/profit', data),
  updateProfitCentre: (id: number, data: any) =>
    api.put<{ success: boolean; message: string; data: ProfitCentre }>(`/financial-management/centres/profit/${id}`, data),
  getProfitCentreReport: (id: number, params?: any) =>
    api.get<{ success: boolean; data: any }>(`/financial-management/centres/profit/${id}/profitability`, { params }),

  // 8. Advanced AR & AP
  getArAging: (params?: any) =>
    api.get<{ success: boolean; data: ArAgingSummary }>('/financial-management/ar/aging', { params }),
  getApAging: (params?: any) =>
    api.get<{ success: boolean; data: ApAgingSummary }>('/financial-management/ap/aging', { params }),

  // 9. Fixed Assets
  getAssetCategories: () =>
    api.get<{ success: boolean; data: FixedAssetCategory[] }>('/financial-management/fixed-assets/categories'),
  createAssetCategory: (data: any) =>
    api.post<{ success: boolean; message: string; data: FixedAssetCategory }>('/financial-management/fixed-assets/categories', data),
  getAssets: (params?: any) =>
    api.get<{ success: boolean; data: FixedAsset[] }>('/financial-management/fixed-assets', { params }),
  createAsset: (data: any) =>
    api.post<{ success: boolean; message: string; data: FixedAsset }>('/financial-management/fixed-assets', data),
  getAsset: (id: number) =>
    api.get<{ success: boolean; data: FixedAsset }>(`/financial-management/fixed-assets/${id}`),
  runDepreciation: (data: { fixed_asset_id?: number; period_id: number; depreciation_date?: string }) =>
    api.post<{ success: boolean; message: string; data: any }>('/financial-management/fixed-assets/depreciation/run', data),
  disposeAsset: (id: number, data: { disposal_date: string; disposal_type: string; proceeds_amount: number; proceeds_account_id?: number; notes?: string }) =>
    api.post<{ success: boolean; message: string; data: any }>(`/financial-management/fixed-assets/${id}/dispose`, data),

  // 10. Financial Analytics & Forecasting
  getFinancialRatios: (params?: any) =>
    api.get<{ success: boolean; data: FinancialRatios }>('/financial-management/analytics/ratios', { params }),
  getFinancialForecasting: (params?: any) =>
    api.get<{ success: boolean; data: any }>('/financial-management/analytics/forecast', { params }),
  getExecutiveTelemetry: () =>
    api.get<{ success: boolean; data: ExecutiveTelemetry }>('/financial-management/analytics/executive-telemetry'),
};
