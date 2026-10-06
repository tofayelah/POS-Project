import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api/axios';
import { crmApi } from '../api/crm';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

describe('Phase 8: Advanced Customer + Credit + CRM + Intelligence Frontend Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Credit Management
  describe('1. Customer Credit Management APIs', () => {
    it('fetches customer credit summary', async () => {
      const mockSummary = {
        customer_id: 1,
        credit_limit: 100000,
        credit_days: 30,
        current_balance: 45000,
        available_credit: 55000,
        credit_hold: false,
        credit_utilization_pct: 45,
        overdue_amount: 0,
        overdue_days: 0,
        status: 'SAFE',
      };
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockSummary } });

      const res = await crmApi.getCreditSummary(1);
      expect(api.get).toHaveBeenCalledWith('/customers/1/credit-summary');
      expect(res.credit_limit).toBe(100000);
      expect(res.status).toBe('SAFE');
    });

    it('submits credit adjustment request', async () => {
      const mockRequest = {
        id: 10,
        customer_id: 1,
        requested_credit_limit: 150000,
        requested_credit_days: 45,
        reason: 'Increased wholesale volume',
        status: 'PENDING',
      };
      vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { success: true, data: mockRequest } });

      const res = await crmApi.requestCredit(1, {
        requested_credit_limit: 150000,
        requested_credit_days: 45,
        reason: 'Increased wholesale volume',
      });
      expect(api.post).toHaveBeenCalledWith('/customers/1/credit-request', {
        requested_credit_limit: 150000,
        requested_credit_days: 45,
        reason: 'Increased wholesale volume',
      });
      expect(res.status).toBe('PENDING');
    });

    it('approves and rejects credit requests', async () => {
      vi.spyOn(api, 'post')
        .mockResolvedValueOnce({ data: { success: true, data: { id: 10, status: 'APPROVED' } } })
        .mockResolvedValueOnce({ data: { success: true, data: { id: 11, status: 'REJECTED' } } });

      const approved = await crmApi.approveCreditRequest(10, 'Approved by director');
      expect(api.post).toHaveBeenCalledWith('/credit-requests/10/approve', { notes: 'Approved by director' });
      expect(approved.status).toBe('APPROVED');

      const rejected = await crmApi.rejectCreditRequest(11, 'Unsettled previous invoices');
      expect(api.post).toHaveBeenCalledWith('/credit-requests/11/reject', { reason: 'Unsettled previous invoices' });
      expect(rejected.status).toBe('REJECTED');
    });

    it('toggles customer credit hold', async () => {
      vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { success: true, data: { credit_hold: true } } });

      const res = await crmApi.toggleCreditHold(1, true, 'Default risk');
      expect(api.post).toHaveBeenCalledWith('/customers/1/toggle-credit-hold', { hold: true, reason: 'Default risk' });
      expect(res.credit_hold).toBe(true);
    });
  });

  // 2. AR Aging & Statements
  describe('2. Accounts Receivable Aging & Statement APIs', () => {
    it('fetches customer aging buckets', async () => {
      const mockAging = {
        customer_id: 1,
        total_outstanding: 25000,
        buckets: {
          current: 15000,
          days_1_30: 10000,
          days_31_60: 0,
          days_61_90: 0,
          days_90_plus: 0,
        },
        oldest_due_days: 12,
      };
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockAging } });

      const res = await crmApi.getCustomerAging(1);
      expect(api.get).toHaveBeenCalledWith('/customers/1/aging');
      expect(res.total_outstanding).toBe(25000);
      expect(res.buckets.current).toBe(15000);
    });

    it('fetches company aging summary and collection priorities', async () => {
      const mockCompanyAging = {
        total_receivable: 500000,
        customer_count: 24,
        buckets: { current: 300000, days_1_30: 100000, days_31_60: 50000, days_61_90: 30000, days_90_plus: 20000 },
        bucket_percentages: { current: 60, days_1_30: 20, days_31_60: 10, days_61_90: 6, days_90_plus: 4 },
      };
      const mockPriorities = [
        { customer_id: 5, name: 'Metro Trade', total_due: 45000, overdue_amount: 45000, days_overdue: 94, risk_level: 'CRITICAL' },
      ];

      vi.spyOn(api, 'get')
        .mockResolvedValueOnce({ data: { success: true, data: mockCompanyAging } })
        .mockResolvedValueOnce({ data: { success: true, data: mockPriorities } });

      const aging = await crmApi.getCompanyAging();
      expect(api.get).toHaveBeenCalledWith('/ar-aging');
      expect(aging.total_receivable).toBe(500000);

      const priorities = await crmApi.getCollectionPriorities();
      expect(api.get).toHaveBeenCalledWith('/ar-aging/collection-priorities');
      expect(priorities).toHaveLength(1);
      expect(priorities[0].risk_level).toBe('CRITICAL');
    });

    it('fetches customer account statement', async () => {
      const mockStatement = {
        customer: { id: 1, customer_code: 'CUST-001', name: 'Apex Retail' },
        period: { from: '2026-01-01', to: '2026-03-31' },
        opening_balance: 10000,
        total_debit: 50000,
        total_credit: 40000,
        closing_balance: 20000,
        aging_breakdown: { current: 20000, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0 },
        transactions: [
          { date: '2026-01-05', type: 'SALE', reference_number: 'INV-001', debit: 50000, credit: 0, running_balance: 60000 },
          { date: '2026-01-20', type: 'PAYMENT', reference_number: 'PAY-001', debit: 0, credit: 40000, running_balance: 20000 },
        ],
      };
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockStatement } });

      const res = await crmApi.getCustomerStatement(1, '2026-01-01', '2026-03-31');
      expect(api.get).toHaveBeenCalledWith('/customers/1/statement', {
        params: { from_date: '2026-01-01', to_date: '2026-03-31' },
      });
      expect(res.closing_balance).toBe(20000);
      expect(res.transactions).toHaveLength(2);
    });
  });

  // 3. CRM Activities, Complaints, Opportunities
  describe('3. CRM Activities, Complaints, and Opportunities APIs', () => {
    it('manages CRM activities and follow-ups', async () => {
      const mockAct = { id: 1, customer_id: 2, activity_type: 'CALL', subject: 'Inquiry', status: 'OPEN' };
      vi.spyOn(api, 'post')
        .mockResolvedValueOnce({ data: { success: true, data: mockAct } })
        .mockResolvedValueOnce({ data: { success: true, data: { ...mockAct, status: 'COMPLETED' } } });

      const created = await crmApi.createActivity({ customer_id: 2, activity_type: 'CALL', subject: 'Inquiry' });
      expect(api.post).toHaveBeenCalledWith('/crm/activities', { customer_id: 2, activity_type: 'CALL', subject: 'Inquiry' });
      expect(created.status).toBe('OPEN');

      const completed = await crmApi.completeActivity(1, 'Customer placed order');
      expect(api.post).toHaveBeenCalledWith('/crm/activities/1/complete', { notes: 'Customer placed order' });
      expect(completed.status).toBe('COMPLETED');
    });

    it('manages service complaints and resolutions', async () => {
      const mockComp = { id: 5, ticket_number: 'TKT-100', category: 'PRODUCT', subject: 'Damaged item', status: 'OPEN' };
      vi.spyOn(api, 'post')
        .mockResolvedValueOnce({ data: { success: true, data: mockComp } })
        .mockResolvedValueOnce({ data: { success: true, data: { ...mockComp, status: 'RESOLVED' } } });

      const created = await crmApi.createComplaint({ customer_id: 3, category: 'PRODUCT', subject: 'Damaged item' });
      expect(api.post).toHaveBeenCalledWith('/crm/complaints', { customer_id: 3, category: 'PRODUCT', subject: 'Damaged item' });
      expect(created.ticket_number).toBe('TKT-100');

      const resolved = await crmApi.resolveComplaint(5, 'Replaced unit from Gulshan branch');
      expect(api.post).toHaveBeenCalledWith('/crm/complaints/5/resolve', { resolution: 'Replaced unit from Gulshan branch' });
      expect(resolved.status).toBe('RESOLVED');
    });

    it('manages sales opportunities pipeline', async () => {
      const mockOpp = { id: 8, title: 'Corporate Uniforms', stage: 'PROSPECT' as const, estimated_value: 75000, probability: 30 };
      vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { success: true, data: mockOpp } });
      vi.spyOn(api, 'put').mockResolvedValueOnce({ data: { success: true, data: { ...mockOpp, stage: 'WON' } } });

      const created = await crmApi.createOpportunity(mockOpp);
      expect(api.post).toHaveBeenCalledWith('/crm/opportunities', mockOpp);
      expect(created.stage).toBe('PROSPECT');

      const updated = await crmApi.updateOpportunity(8, { stage: 'WON' });
      expect(api.put).toHaveBeenCalledWith('/crm/opportunities/8', { stage: 'WON' });
      expect(updated.stage).toBe('WON');
    });
  });

  // 4. Customer Intelligence & RFM
  describe('4. Customer Intelligence & RFM Scoring APIs', () => {
    it('fetches customer 360 profile view', async () => {
      const mock360 = {
        customer: { id: 1, customer_code: 'CUST-001', name: 'Al-Madina Stores', customer_type: 'WHOLESALE' },
        credit: { credit_limit: 200000, current_balance: 50000, status: 'SAFE' },
        ar_aging: { total_outstanding: 50000, buckets: { current: 50000, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0 } },
        clv: { total_orders: 12, total_spent: 350000, gross_profit: 70000, gross_margin_pct: 20 },
        rfm: { composite_score: '544', segment: 'CHAMPIONS' },
        balances: { points: 1500, store_credit: 5000 },
        top_products: [],
        timeline: [],
      };
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mock360 } });

      const res = await crmApi.getCustomer360(1);
      expect(api.get).toHaveBeenCalledWith('/customers/1/360');
      expect(res.customer.name).toBe('Al-Madina Stores');
      expect(res.rfm.segment).toBe('CHAMPIONS');
    });

    it('fetches company RFM distribution and triggers recalculation', async () => {
      const mockDist = {
        total_scored_customers: 150,
        segments: { CHAMPIONS: 25, LOYAL: 40, AT_RISK: 15, LOST: 20 },
      };
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockDist } });
      vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { success: true, data: { processed: 150, segments: mockDist.segments } } });

      const dist = await crmApi.getRfmSummary();
      expect(api.get).toHaveBeenCalledWith('/customer-intelligence/rfm-summary');
      expect(dist.total_scored_customers).toBe(150);

      const recalc = await crmApi.recalculateRfm();
      expect(api.post).toHaveBeenCalledWith('/customer-intelligence/recalculate-rfm');
      expect(recalc.processed).toBe(150);
    });

    it('identifies at-risk customers by inactivity threshold', async () => {
      const mockAtRisk = [
        { id: 14, customer_code: 'CUST-014', name: 'Bismillah Fabrics', days_inactive: 92, total_spent: 80000, credit_hold: false },
      ];
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockAtRisk } });

      const res = await crmApi.getAtRiskCustomers(60);
      expect(api.get).toHaveBeenCalledWith('/customer-intelligence/at-risk', { params: { days_threshold: 60 } });
      expect(res).toHaveLength(1);
      expect(res[0].days_inactive).toBe(92);
    });
  });

  // 5. Sales Intelligence & Demand Forecast
  describe('5. Sales Intelligence & Demand Forecast APIs', () => {
    it('fetches sales intelligence dashboard and salesperson metrics', async () => {
      const mockDashboard = {
        period: { start_date: '2026-09-01', end_date: '2026-09-30' },
        top_customers: [],
        branch_breakdown: [],
        top_products: [],
        salesperson_leaderboard: [
          { salesperson_id: 3, salesperson_name: 'Zubair Hossain', orders: 18, gross_sales: 150000, margin_pct: 22 },
        ],
        return_metrics: { gross_sales: 500000, return_count: 3, return_value: 12000, return_rate_pct: 2.4, by_reason: [] },
      };
      vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { success: true, data: mockDashboard } });

      const res = await crmApi.getSalesDashboard({ start_date: '2026-09-01', end_date: '2026-09-30' });
      expect(api.get).toHaveBeenCalledWith('/sales-intelligence/dashboard', {
        params: { start_date: '2026-09-01', end_date: '2026-09-30' },
      });
      expect(res.salesperson_leaderboard[0].salesperson_name).toBe('Zubair Hossain');
      expect(res.return_metrics.return_rate_pct).toBe(2.4);
    });

    it('fetches demand velocity forecasts and reorder recommendations', async () => {
      const mockForecast = [
        { product_id: 1, sku: 'CPS-L-NAVY', name: 'Cotton Polo', avg_daily_sales: 2.5, projected_demand: 75, trend: 'GROWING' },
      ];
      const mockReorder = [
        { product_id: 1, sku: 'CPS-L-NAVY', avg_daily_sales: 2.5, current_stock: 5, incoming_po_stock: 0, effective_stock: 5, days_remaining: 2.0, demand_risk: 'HIGH', recommended_reorder_qty: 70 },
      ];

      vi.spyOn(api, 'get')
        .mockResolvedValueOnce({ data: { success: true, data: mockForecast } })
        .mockResolvedValueOnce({ data: { success: true, data: mockReorder } });

      const forecasts = await crmApi.getDemandForecast({ forecast_days: 30 });
      expect(api.get).toHaveBeenCalledWith('/sales-intelligence/demand-forecast', { params: { forecast_days: 30 } });
      expect(forecasts[0].trend).toBe('GROWING');

      const reorders = await crmApi.getReorderRecommendations({ lead_time_days: 7, buffer_days: 14 });
      expect(api.get).toHaveBeenCalledWith('/sales-intelligence/reorder-recommendations', {
        params: { lead_time_days: 7, buffer_days: 14 },
      });
      expect(reorders[0].demand_risk).toBe('HIGH');
      expect(reorders[0].recommended_reorder_qty).toBe(70);
    });
  });

  // 6. i18n Bilingual Parity Test
  describe('6. i18n Bilingual Parity (EN/BN)', () => {
    it('verifies 100% parity of Phase 8 translation keys between English and Bengali', () => {
      const phase8KeyPrefixes = ['nav.customer', 'nav.arAging', 'nav.crmActivityCenter', 'nav.salesIntelligence', 'crm.'];

      const enPhase8Keys = Object.keys(en).filter((k) =>
        phase8KeyPrefixes.some((prefix) => k.startsWith(prefix))
      );
      const bnPhase8Keys = Object.keys(bn).filter((k) =>
        phase8KeyPrefixes.some((prefix) => k.startsWith(prefix))
      );

      expect(enPhase8Keys.length).toBeGreaterThan(50);
      expect(bnPhase8Keys.length).toBeGreaterThan(50);

      // Check every English key exists in Bengali
      enPhase8Keys.forEach((key) => {
        expect(bn[key], `Missing Bengali translation for key: ${key}`).toBeDefined();
        expect(bn[key].trim().length).toBeGreaterThan(0);
      });

      // Check every Bengali key exists in English
      bnPhase8Keys.forEach((key) => {
        expect(en[key], `Missing English translation for key: ${key}`).toBeDefined();
        expect(en[key].trim().length).toBeGreaterThan(0);
      });
    });
  });
});
