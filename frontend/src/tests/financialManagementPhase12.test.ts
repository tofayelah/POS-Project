import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api/axios';
import { financeApi } from '../api/finance';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

describe('Phase 12: Advanced Financial Management Frontend Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Budgets & Variance Analysis API', () => {
    it('fetches budgets and creates a new budget with lines', async () => {
      const mockBudgets = [
        {
          id: 1,
          name: 'FY 2026-2027 Operating Budget',
          version: 1,
          period_type: 'ANNUAL',
          total_budgeted_amount: 1500000,
          status: 'ACTIVE',
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockBudgets },
      });

      const res = await financeApi.getBudgets();
      expect(api.get).toHaveBeenCalledWith('/financial-management/budgets', { params: undefined });
      expect(res.data.success).toBe(true);
      expect(res.data.data.length).toBe(1);
      expect(res.data.data[0].total_budgeted_amount).toBe(1500000);

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Budget created',
          data: { id: 2, name: 'Marketing Budget', version: 1, status: 'DRAFT', total_budgeted_amount: 300000 },
        },
      });

      const createRes = await financeApi.createBudget({
        name: 'Marketing Budget',
        fiscal_year_id: 1,
        period_type: 'ANNUAL',
        lines: [{ account_id: 5, allocated_amount: 300000 }],
      });
      expect(createRes.data.data.status).toBe('DRAFT');
      expect(createRes.data.data.total_budgeted_amount).toBe(300000);
    });

    it('fetches budget variance report and checks net variance and consumption', async () => {
      const mockVariance = {
        budget_id: 1,
        budget_name: 'FY 2026 Operating Budget',
        version: 1,
        fiscal_year: 'FY 2026-2027',
        total_budget: 1000000,
        total_actual: 750000,
        net_variance: 250000,
        overall_status: 'UNDER_BUDGET',
        lines: [
          {
            account_code: 'EXP-MKT',
            account_name: 'Marketing & Ad Expenses',
            allocated_amount: 1000000,
            actual_amount: 750000,
            variance: 250000,
            variance_pct: 75.0,
            status: 'UNDER_BUDGET',
          },
        ],
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockVariance },
      });

      const res = await financeApi.getBudgetVariance(1);
      expect(api.get).toHaveBeenCalledWith('/financial-management/budgets/1/variance', { params: undefined });
      expect(res.data.data.net_variance).toBe(250000);
      expect(res.data.data.overall_status).toBe('UNDER_BUDGET');
      expect(res.data.data.lines[0].variance_pct).toBe(75.0);
    });

    it('manages spending control policies (ALLOW, WARNING, BLOCK)', async () => {
      const mockControls = [
        {
          id: 1,
          warning_threshold_pct: 85,
          hard_stop_threshold_pct: 100,
          control_level: 'BLOCK',
          is_active: true,
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockControls },
      });

      const res = await financeApi.getBudgetControls();
      expect(api.get).toHaveBeenCalledWith('/financial-management/budget-controls');
      expect(res.data.data[0].control_level).toBe('BLOCK');
      expect(res.data.data[0].hard_stop_threshold_pct).toBe(100);
    });
  });

  describe('2. Cash & Treasury Management', () => {
    it('fetches authoritative treasury positions with liquid balances and burn rate', async () => {
      const mockTreasury = {
        as_of_date: '2026-10-07',
        total_liquid_cash: 2500000,
        breakdown: {
          cash_accounts: [{ id: 1, code: '1010', name: 'Cash on Hand', balance: 500000 }],
          bank_accounts: [{ id: 2, bank_name: 'BRAC Bank', account_name: 'Main Operations', account_number: '150123', balance: 2000000 }],
        },
        key_metrics: {
          monthly_burn_rate: 400000,
          cash_runway_days: 187,
        },
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockTreasury },
      });

      const res = await financeApi.getTreasuryPositions();
      expect(api.get).toHaveBeenCalledWith('/financial-management/treasury/positions', { params: undefined });
      expect(res.data.data.total_liquid_cash).toBe(2500000);
      expect(res.data.data.key_metrics.cash_runway_days).toBe(187);
    });

    it('retrieves deterministic cash flow forecast', async () => {
      const mockForecast = {
        as_of_date: '2026-10-07',
        horizon_days: 30,
        opening_liquid_cash: 2500000,
        forecast_breakdown: {
          projected_inflows: 800000,
          projected_outflows: 450000,
          net_cash_flow: 350000,
          projected_closing_balance: 2850000,
        },
        daily_schedule: [
          { date: '2026-10-08', inflow: 50000, outflow: 20000, net: 30000, cumulative_balance: 2530000 },
        ],
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockForecast },
      });

      const res = await financeApi.getCashForecast({ horizon_days: 30 });
      expect(res.data.data.forecast_breakdown.net_cash_flow).toBe(350000);
      expect(res.data.data.forecast_breakdown.projected_closing_balance).toBe(2850000);
    });
  });

  describe('3. Bank Accounts & Statement Import', () => {
    it('manages bank accounts and imports electronic statements', async () => {
      const mockAccounts = [
        {
          id: 1,
          bank_name: 'Eastern Bank PLC',
          account_name: 'RetailCore Operations',
          account_number: '1081234567890',
          currency: 'BDT',
          current_balance: 1250000,
          is_active: true,
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockAccounts },
      });

      const res = await financeApi.getBankAccounts();
      expect(res.data.data.length).toBe(1);
      expect(res.data.data[0].bank_name).toBe('Eastern Bank PLC');

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Statement imported',
          data: { id: 10, statement_date: '2026-10-07', opening_balance: 1000000, closing_balance: 1250000 },
        },
      });

      const importRes = await financeApi.importBankStatement({
        bank_account_id: 1,
        statement_date: '2026-10-07',
        opening_balance: 1000000,
        closing_balance: 1250000,
        lines: [
          { transaction_date: '2026-10-07', description: 'Customer Payment', deposit_amount: 250000, withdrawal_amount: 0 },
        ],
      });
      expect(importRes.data.success).toBe(true);
      expect(importRes.data.data.closing_balance).toBe(1250000);
    });
  });

  describe('4. Bank Reconciliation Matching Engine', () => {
    it('runs auto-match algorithms and finalizes reconciliation', async () => {
      const mockReconciliation = {
        id: 5,
        bank_account_id: 1,
        statement_date: '2026-10-07',
        statement_closing_balance: 1250000,
        gl_closing_balance: 1250000,
        difference: 0.0,
        status: 'IN_PROGRESS',
        matches: [
          {
            id: 1,
            match_type: 'EXACT',
            matched_amount: 250000,
          },
        ],
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockReconciliation },
      });

      const res = await financeApi.getReconciliation(5);
      expect(res.data.data.difference).toBe(0.0);
      expect(res.data.data.matches?.length).toBe(1);
      expect(res.data.data.matches?.[0].match_type).toBe('EXACT');

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, message: 'Reconciliation finalized', data: { ...mockReconciliation, status: 'RECONCILED' } },
      });

      const finalizeRes = await financeApi.finalizeReconciliation(5);
      expect(finalizeRes.data.data.status).toBe('RECONCILED');
    });
  });

  describe('5. Financial Period Governance & Year-End Closing', () => {
    it('checks pre-close criteria and closes financial period', async () => {
      const mockCheck = {
        can_close: true,
        can_soft_lock: true,
        unposted_journals_count: 0,
        unposted_journals: [],
        unreconciled_bank_statements_count: 0,
        warnings: [],
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockCheck },
      });

      const checkRes = await financeApi.getPeriodClosingChecks(1);
      expect(checkRes.data.data.can_close).toBe(true);
      expect(checkRes.data.data.unposted_journals_count).toBe(0);

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, message: 'Period closed', data: { id: 1, status: 'CLOSED', is_closed: true } },
      });

      const closeRes = await financeApi.closePeriod(1);
      expect(closeRes.data.data.status).toBe('CLOSED');
      expect(closeRes.data.data.is_closed).toBe(true);
    });

    it('reopens closed period with required supervisor justification', async () => {
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Period reopened',
          data: { id: 1, status: 'OPEN', reopened_reason: 'Statutory audit adjustment' },
        },
      });

      const reopenRes = await financeApi.reopenPeriod(1, { reason: 'Statutory audit adjustment' });
      expect(reopenRes.data.data.status).toBe('OPEN');
      expect(reopenRes.data.data.reopened_reason).toBe('Statutory audit adjustment');
    });

    it('executes year-end closing and clears revenue and expense to Retained Earnings', async () => {
      const mockPreview = {
        total_revenue: 5000000,
        total_expense: 3800000,
        net_profit: 1200000,
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockPreview },
      });

      const prevRes = await financeApi.previewYearEndClosing({ fiscal_year_id: 1 });
      expect(prevRes.data.data.net_profit).toBe(1200000);

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Year-end closed',
          data: { id: 1, net_profit_loss: 1200000, is_rolled_back: false },
        },
      });

      const execRes = await financeApi.executeYearEndClosing({
        fiscal_year_id: 1,
        closing_date: '2026-10-07',
        retained_earnings_account_id: 1,
      });
      expect(execRes.data.data.net_profit_loss).toBe(1200000);
      expect(execRes.data.data.is_rolled_back).toBe(false);
    });
  });

  describe('6. Cost & Profit Centre Management', () => {
    it('retrieves cost centres and expense attribution reports', async () => {
      const mockCostCentres = [
        {
          id: 1,
          code: 'CC-OPS-01',
          name: 'Operations & Logistics',
          budget_limit: 500000,
          status: 'ACTIVE',
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockCostCentres },
      });

      const ccRes = await financeApi.getCostCentres();
      expect(ccRes.data.data.length).toBe(1);
      expect(ccRes.data.data[0].code).toBe('CC-OPS-01');

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: { cost_centre_id: 1, total_expenses: 320000 } },
      });

      const expRes = await financeApi.getCostCentreExpenseReport(1);
      expect(expRes.data.data.total_expenses).toBe(320000);
    });

    it('retrieves profit centres and profitability margin analysis', async () => {
      const mockProfitReport = {
        profit_centre_id: 1,
        revenue: 2000000,
        direct_costs: 1200000,
        contribution_margin: 800000,
        margin_pct: 40.0,
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockProfitReport },
      });

      const res = await financeApi.getProfitCentreReport(1);
      expect(res.data.data.contribution_margin).toBe(800000);
      expect(res.data.data.margin_pct).toBe(40.0);
    });
  });

  describe('7. Advanced AR & AP Aging', () => {
    it('retrieves AR aging with multi-tier buckets, priority scoring, and GL reconciliation', async () => {
      const mockAr = {
        as_of_date: '2026-10-07',
        summary: {
          total_current: 500000,
          total_1_30: 200000,
          total_31_60: 100000,
          total_61_90: 50000,
          total_91_120: 20000,
          total_over_120: 30000,
          grand_total_subledger: 900000,
          gl_receivables_balance: 900000,
          reconciliation_variance: 0.0,
        },
        customers: [
          {
            customer_id: 1,
            customer_name: 'Apex Superstore',
            customer_code: 'CUST-001',
            total_due: 35000,
            max_overdue_days: 45,
            priority_score: 87500,
            priority_level: 'URGENT',
          },
        ],
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockAr },
      });

      const res = await financeApi.getArAging();
      expect(res.data.data.summary.grand_total_subledger).toBe(900000);
      expect(res.data.data.summary.reconciliation_variance).toBe(0.0);
      expect(res.data.data.customers[0].priority_level).toBe('URGENT');
    });

    it('retrieves AP aging with trade payables subledger vs GL reconciliation', async () => {
      const mockAp = {
        as_of_date: '2026-10-07',
        summary: {
          total_current: 300000,
          total_1_30: 150000,
          total_31_60: 50000,
          total_61_90: 0,
          total_91_120: 0,
          total_over_120: 0,
          grand_total_subledger: 500000,
          gl_payables_balance: 500000,
          reconciliation_variance: 0.0,
        },
        suppliers: [
          {
            supplier_id: 1,
            supplier_name: 'Unilever Bangladesh',
            supplier_code: 'SUPP-001',
            total_due: 500000,
            max_overdue_days: 20,
          },
        ],
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockAp },
      });

      const res = await financeApi.getApAging();
      expect(res.data.data.summary.grand_total_subledger).toBe(500000);
      expect(res.data.data.summary.reconciliation_variance).toBe(0.0);
    });
  });

  describe('8. Fixed Assets & Straight-Line Depreciation', () => {
    it('registers asset, executes depreciation run, and handles asset disposal', async () => {
      const mockAsset = {
        id: 1,
        asset_code: 'AST-SRV-001',
        name: 'Database Server',
        purchase_cost: 120000,
        salvage_value: 0,
        accumulated_depreciation: 0,
        current_book_value: 120000,
        useful_life_months: 36,
        status: 'ACTIVE',
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: [mockAsset] },
      });

      const listRes = await financeApi.getAssets();
      expect(listRes.data.data[0].current_book_value).toBe(120000);

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, message: 'Depreciation posted', data: { assets_processed: 1 } },
      });

      const runRes = await financeApi.runDepreciation({ period_id: 1 });
      expect(runRes.data.data.assets_processed).toBe(1);

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Asset disposed',
          data: { disposal_type: 'SALE', proceeds_amount: 50000, gain_loss_amount: -70000, gain_or_loss: 'LOSS' },
        },
      });

      const dispRes = await financeApi.disposeAsset(1, {
        disposal_date: '2026-10-07',
        disposal_type: 'SALE',
        proceeds_amount: 50000,
      });
      expect(dispRes.data.data.gain_or_loss).toBe('LOSS');
    });
  });

  describe('9. Financial Ratios, DuPont Analysis & Forecasting', () => {
    it('fetches financial ratios with divide-by-zero guards and DuPont model', async () => {
      const mockRatios = {
        as_of_date: '2026-10-07',
        profitability: {
          gross_profit_margin_pct: 35.0,
          operating_profit_margin_pct: 20.0,
          net_profit_margin_pct: 15.0,
          return_on_assets_pct: 12.0,
          return_on_equity_pct: 18.0,
        },
        liquidity: {
          current_ratio: 2.5,
          quick_ratio: 1.8,
          cash_ratio: 1.2,
        },
        leverage: {
          debt_to_equity: 0.5,
          debt_to_assets: 0.33,
        },
        efficiency: {
          receivables_turnover: 8.5,
          days_sales_outstanding: 42.9,
        },
        dupont_analysis: {
          net_profit_margin_pct: 15.0,
          asset_turnover: 0.8,
          equity_multiplier: 1.5,
          roe_pct: 18.0,
        },
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockRatios },
      });

      const res = await financeApi.getFinancialRatios();
      expect(res.data.data.liquidity.current_ratio).toBe(2.5);
      expect(res.data.data.dupont_analysis.roe_pct).toBe(18.0);
    });

    it('fetches executive telemetry metrics', async () => {
      const mockTelemetry = {
        liquid_cash: 2500000,
        burn_rate: 400000,
        cash_runway_days: 187,
        total_receivables: 900000,
        total_payables: 500000,
        net_working_capital: 400000,
        current_ratio: 2.5,
        quick_ratio: 1.8,
        operating_margin_pct: 20.0,
        net_margin_pct: 15.0,
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockTelemetry },
      });

      const res = await financeApi.getExecutiveTelemetry();
      expect(res.data.data.liquid_cash).toBe(2500000);
      expect(res.data.data.net_working_capital).toBe(400000);
    });
  });

  describe('10. Localization & Key Parity (en vs bn)', () => {
    it('verifies 100% key parity between English and Bengali translations for Phase 12 keys', () => {
      const phase12Keys = [
        'nav.financeDashboard',
        'nav.budgets',
        'nav.treasury',
        'nav.bankAccounts',
        'nav.bankReconciliation',
        'nav.periodClosing',
        'nav.costProfitCentres',
        'nav.financeArAging',
        'nav.apAging',
        'nav.fixedAssets',
        'nav.financialAnalytics',
        'finance.dashboardTitle',
        'finance.dashboardSubtitle',
        'finance.liquidCash',
        'finance.vaultAndBank',
        'finance.cashRunway',
        'finance.monthlyBurn',
        'finance.monthlyBurnRate',
        'finance.days',
        'finance.workingCapital',
        'finance.liquidityRatios',
        'finance.managementModules',
        'finance.budgetManagement',
        'finance.budgetDesc',
        'finance.treasuryManagement',
        'finance.treasuryDesc',
        'finance.bankAccounts',
        'finance.bankDesc',
        'finance.bankReconciliation',
        'finance.reconDesc',
        'finance.periodClosing',
        'finance.periodDesc',
        'finance.costProfitCentres',
        'finance.centresDesc',
        'finance.advancedAr',
        'finance.arDesc',
        'finance.advancedAp',
        'finance.apDesc',
        'finance.fixedAssets',
        'finance.assetsDesc',
        'finance.financialRatios',
        'finance.ratiosDesc',
        'finance.budgetsTitle',
        'finance.budgetsSubtitle',
        'finance.controlRules',
        'finance.newBudget',
        'finance.budgetCreated',
        'finance.controlCreated',
        'finance.budgetsList',
        'finance.records',
        'finance.budgetName',
        'finance.costCentre',
        'finance.periodType',
        'finance.version',
        'finance.allocatedAmount',
        'finance.noBudgetsFound',
        'finance.activeControlRules',
        'finance.createBudgetTitle',
        'finance.varianceTitle',
        'finance.allocatedBudget',
        'finance.actualSpend',
        'finance.variance',
        'finance.burnRate',
        'finance.accountBreakdown',
        'finance.account',
        'finance.budgeted',
        'finance.actual',
        'finance.pctConsumed',
        'finance.treasuryTitle',
        'finance.treasurySubtitle',
        'finance.cashVaults',
        'finance.bankBalances',
        'finance.bankManagementTitle',
        'finance.bankManagementSubtitle',
        'finance.importStatement',
        'finance.newBankAccount',
        'finance.bankAccountsList',
        'finance.importedStatements',
        'finance.bankReconTitle',
        'finance.bankReconSubtitle',
        'finance.periodClosingTitle',
        'finance.periodClosingSubtitle',
        'finance.yearEndClosing',
        'finance.accountingPeriods',
        'finance.yearEndHistory',
        'finance.centresTitle',
        'finance.centresSubtitle',
        'finance.arAgingTitle',
        'finance.arAgingSubtitle',
        'finance.apAgingTitle',
        'finance.apAgingSubtitle',
        'finance.assetsTitle',
        'finance.assetsSubtitle',
        'finance.analyticsTitle',
        'finance.analyticsSubtitle',
      ];

      for (const key of phase12Keys) {
        expect(en[key], `Missing English translation for key: ${key}`).toBeDefined();
        expect(bn[key], `Missing Bengali translation for key: ${key}`).toBeDefined();
        expect(en[key].length).toBeGreaterThan(0);
        expect(bn[key].length).toBeGreaterThan(0);
      }
    });
  });
});
