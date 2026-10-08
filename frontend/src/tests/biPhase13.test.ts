import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api/axios';
import { biApi } from '../api/bi';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

describe('Phase 13: Advanced BI & Management Reporting Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Executive Management Dashboard API', () => {
    it('fetches executive dashboard data with parameters', async () => {
      const mockDashboard = {
        period: { start_date: '2026-01-01', end_date: '2026-10-08' },
        primary_kpis: {
          revenue: 500000,
          gross_sales: 520000,
          net_sales: 500000,
          returns: 20000,
          discounts: 10000,
          cogs: 300000,
          gross_profit: 200000,
          gross_margin_pct: 40.0,
          operating_expenses: 50000,
          operating_profit: 150000,
          net_profit: 150000,
          net_margin_pct: 30.0,
          cash_balance: 100000,
          bank_balance: 400000,
          accounts_receivable: 80000,
          accounts_payable: 60000,
          inventory_value: 250000,
          working_capital: 690000,
          budget_utilization: 65.5,
        },
        sales_kpis: {
          today_sales: 25000,
          yesterday_sales: 20000,
          mtd_sales: 150000,
          prev_mtd_sales: 120000,
          qtd_sales: 450000,
          prev_qtd_sales: 400000,
          ytd_sales: 500000,
          prev_ytd_sales: 420000,
          growth_today_pct: 25.0,
          growth_mtd_pct: 25.0,
          growth_ytd_pct: 19.05,
          aov: 2500,
          average_basket_size: 3.5,
          units_sold: 700,
          transactions: 200,
          return_rate_pct: 3.85,
          discount_rate_pct: 1.92,
        },
        daily_trend: [{ sale_date: '2026-10-08', transactions: 10, revenue: 25000 }],
        top_products: [{ id: 1, name: 'Cotton Shirt', sku: 'SHT-01', total_quantity: 50, total_revenue: 50000 }],
        top_branches: [{ id: 1, name: 'Main Branch', transactions: 150, total_revenue: 375000 }],
        channel_breakdown: [{ channel: 'POS', orders_count: 180, total_revenue: 450000 }],
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { status: 'success', data: mockDashboard },
      });

      const res = await biApi.getExecutiveDashboard({ branch_id: 1, channel: 'POS' });
      expect(api.get).toHaveBeenCalledWith('/bi/dashboard/executive', {
        params: { branch_id: 1, channel: 'POS' },
      });
      expect(res.data.status).toBe('success');
      expect(res.data.data.primary_kpis.revenue).toBe(500000);
      expect(res.data.data.primary_kpis.gross_margin_pct).toBe(40.0);
    });

    it('fetches executive sales KPIs endpoint', async () => {
      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            today_sales: 10000,
            growth_today_pct: 12.5,
            aov: 1500,
          },
        },
      });

      const res = await biApi.getExecutiveSalesKpis();
      expect(api.get).toHaveBeenCalledWith('/bi/dashboard/sales', {
        params: undefined,
      });
      expect(res.data.data.today_sales).toBe(10000);
      expect(res.data.data.growth_today_pct).toBe(12.5);
    });
  });

  describe('2. Specialized Domain BI Endpoints', () => {
    it('fetches Sales BI analytics and funnel data', async () => {
      const mockSalesBi = {
        summary: { gross_sales: 100000, discounts: 2000, net_sales: 98000, orders_count: 50, units_sold: 120, aov: 1960 },
        by_date: [],
        by_month: [],
        by_branch: [],
        by_channel: [],
        by_category: [],
        by_payment_method: [],
        funnel: {
          total_created: 50,
          completed: 48,
          paid: 48,
          fulfilled: 48,
          cancelled: 2,
          returned: 1,
          completion_rate_pct: 96.0,
          fulfillment_rate_pct: 96.0,
        },
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { status: 'success', data: mockSalesBi },
      });

      const res = await biApi.getSalesBi({ date_from: '2026-10-01' });
      expect(api.get).toHaveBeenCalledWith('/bi/sales', { params: { date_from: '2026-10-01' } });
      expect(res.data.data.summary.net_sales).toBe(98000);
      expect(res.data.data.funnel.completion_rate_pct).toBe(96.0);
    });

    it('fetches Inventory BI including ABC & Aging analysis', async () => {
      const mockInvBi = {
        summary: {
          total_valuation: 850000,
          total_units: 1200,
          total_skus: 45,
          low_stock_items: 3,
          out_of_stock_items: 1,
          turnover_ratio: 4.2,
          doh: 86.9,
          dead_stock_value: 15000,
          dead_stock_count: 2,
        },
        abc_analysis: {
          summary: {
            class_a: { count: 8, value: 680000, pct_value: 80.0 },
            class_b: { count: 12, value: 127500, pct_value: 15.0 },
            class_c: { count: 25, value: 42500, pct_value: 5.0 },
          },
          class_a: [],
          class_b: [],
          class_c: [],
        },
        aging_buckets: {
          '0_30': { count: 25, value: 500000, label: '0 - 30 Days' },
          '31_60': { count: 10, value: 200000, label: '31 - 60 Days' },
          '61_90': { count: 5, value: 80000, label: '61 - 90 Days' },
          '91_180': { count: 3, value: 40000, label: '91 - 180 Days' },
          '181_365': { count: 1, value: 15000, label: '181 - 365 Days' },
          '365_plus': { count: 1, value: 15000, label: '365+ Days (Dead Stock)' },
        },
        reorder_alerts: [],
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { status: 'success', data: mockInvBi },
      });

      const res = await biApi.getInventoryBi();
      expect(api.get).toHaveBeenCalledWith('/bi/inventory', { params: undefined });
      expect(res.data.data.summary.total_valuation).toBe(850000);
    });

    it('fetches Profitability, Customer, Supplier, Finance, POS, and HR BI endpoints', async () => {
      // Profitability
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { status: 'success', data: { summary: { gross_margin_pct: 35.0 } } } });
      const pRes = await biApi.getProfitabilityBi();
      expect(api.get).toHaveBeenCalledWith('/bi/profitability', { params: undefined });
      expect(pRes.data.data.summary.gross_margin_pct).toBe(35.0);

      // Customer
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { status: 'success', data: { summary: { total_customers: 250 } } } });
      const cRes = await biApi.getCustomerBi();
      expect(api.get).toHaveBeenCalledWith('/bi/customer', { params: undefined });
      expect(cRes.data.data.summary.total_customers).toBe(250);

      // Supplier
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { status: 'success', data: { summary: { total_suppliers: 18 } } } });
      const sRes = await biApi.getSupplierBi();
      expect(api.get).toHaveBeenCalledWith('/bi/supplier', { params: undefined });
      expect(sRes.data.data.summary.total_suppliers).toBe(18);

      // Finance
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { status: 'success', data: { telemetry: { current_ratio: 2.1 } } } });
      const fRes = await biApi.getFinanceBi();
      expect(api.get).toHaveBeenCalledWith('/bi/finance', { params: undefined });
      expect(fRes.data.data.telemetry.current_ratio).toBe(2.1);

      // POS
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { status: 'success', data: { summary: { total_revenue: 120000 } } } });
      const posRes = await biApi.getPosBi();
      expect(api.get).toHaveBeenCalledWith('/bi/pos', { params: undefined });
      expect(posRes.data.data.summary.total_revenue).toBe(120000);

      // HR
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { status: 'success', data: { summary: { total_employees: 42 } } } });
      const hrRes = await biApi.getHrBi();
      expect(api.get).toHaveBeenCalledWith('/bi/hr', { params: undefined });
      expect(hrRes.data.data.summary.total_employees).toBe(42);
    });
  });

  describe('3. KPI Alerts Management API', () => {
    it('evaluates, lists, acknowledges, and resolves alerts', async () => {
      // Evaluate
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [{ id: 10, code: 'WARN_LOW_MARGIN', severity: 'WARNING', status: 'ACTIVE' }],
        },
      });
      const evalRes = await biApi.evaluateAlerts();
      expect(api.post).toHaveBeenCalledWith('/bi/alerts/evaluate');
      expect(evalRes.data.data[0].code).toBe('WARN_LOW_MARGIN');

      // Acknowledge
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          status: 'success',
          data: { id: 10, status: 'ACKNOWLEDGED' },
        },
      });
      const ackRes = await biApi.acknowledgeAlert(10, 'Investigating supplier price changes');
      expect(api.post).toHaveBeenCalledWith('/bi/alerts/10/acknowledge', { notes: 'Investigating supplier price changes' });
      expect(ackRes.data.data.status).toBe('ACKNOWLEDGED');

      // Resolve
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          status: 'success',
          data: { id: 10, status: 'RESOLVED' },
        },
      });
      const resRes = await biApi.resolveAlert(10, 'Pricing updated');
      expect(api.post).toHaveBeenCalledWith('/bi/alerts/10/resolve', { notes: 'Pricing updated' });
      expect(resRes.data.data.status).toBe('RESOLVED');
    });
  });

  describe('4. Custom Report Builder & Saved Reports API', () => {
    it('queries datasets catalog and executes ad-hoc report', async () => {
      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            sales: { name: 'Sales Transactions', dimensions: {}, metrics: {} },
            inventory: { name: 'Inventory & Stock Valuation', dimensions: {}, metrics: {} },
          },
        },
      });
      const catalogRes = await biApi.getDatasets();
      expect(api.get).toHaveBeenCalledWith('/bi/reports/catalog');
      expect(catalogRes.data.data.sales.name).toBe('Sales Transactions');

      // Run Report
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            columns: ['branch', 'net_sales'],
            rows: [{ branch: 'Main', net_sales: 50000 }],
            count: 1,
          },
        },
      });
      const runRes = await biApi.runReport({
        dataset: 'sales',
        dimensions: ['branch'],
        metrics: ['net_sales'],
      });
      expect(api.post).toHaveBeenCalledWith('/bi/reports/execute', {
        dataset: 'sales',
        dimensions: ['branch'],
        metrics: ['net_sales'],
      });
      expect(runRes.data.data.rows[0].net_sales).toBe(50000);
    });

    it('creates, lists, runs, and deletes saved reports', async () => {
      // Save report
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          status: 'success',
          data: { id: 5, name: 'Weekly Branch Sales', dataset: 'sales' },
        },
      });
      const saveRes = await biApi.saveReport({
        name: 'Weekly Branch Sales',
        dataset: 'sales',
        config: { dimensions: ['branch'], metrics: ['net_sales'] },
      });
      expect(api.post).toHaveBeenCalledWith('/bi/reports/saved', {
        name: 'Weekly Branch Sales',
        dataset: 'sales',
        config: { dimensions: ['branch'], metrics: ['net_sales'] },
      });
      expect(saveRes.data.data.id).toBe(5);

      // List saved reports
      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [{ id: 5, name: 'Weekly Branch Sales', dataset: 'sales' }],
        },
      });
      const listRes = await biApi.getSavedReports();
      expect(api.get).toHaveBeenCalledWith('/bi/reports/saved');
      expect(listRes.data.data.length).toBe(1);

      // Delete saved report
      vi.spyOn(api, 'delete').mockResolvedValueOnce({
        data: { status: 'success', message: 'Report deleted successfully' },
      });
      const delRes = await biApi.deleteSavedReport(5);
      expect(api.delete).toHaveBeenCalledWith('/bi/reports/saved/5');
      expect(delRes.data.status).toBe('success');
    });
  });

  describe('5. Localization Parity (English & Bengali)', () => {
    it('verifies that all BI translation keys exist in both English and Bengali dictionaries', () => {
      const biEnKeys = Object.keys(en).filter((k) => k.startsWith('bi.'));
      const biBnKeys = Object.keys(bn).filter((k) => k.startsWith('bi.'));

      expect(biEnKeys.length).toBeGreaterThan(30);
      expect(biBnKeys.length).toBe(biEnKeys.length);

      // Ensure every single key matches without exception
      for (const key of biEnKeys) {
        expect(bn[key]).toBeDefined();
        expect(typeof bn[key]).toBe('string');
        expect(bn[key].trim().length).toBeGreaterThan(0);
      }
    });
  });
});
