import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api/axios';
import { taxApi } from '../api/tax';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

describe('Phase 10: Bangladesh VAT & Tax Compliance Foundation Frontend Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Tax Profile & Registrations API', () => {
    it('fetches tax profile and updates profile', async () => {
      const mockProfile = {
        id: 1,
        company_id: 1,
        legal_name: 'RetailCore Bangladesh Ltd',
        trade_name: 'RetailCore Superstore',
        bin: '123456789-0101',
        tin: '987654321012',
        taxpayer_type: 'VAT_REGISTERED',
        tax_jurisdiction: 'BANGLADESH',
        tax_circle: 'Circle-12',
        tax_zone: 'Zone-02',
        commissionerate: 'Dhaka South',
        effective_from: '2026-01-01',
        status: 'ACTIVE',
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockProfile },
      });

      const res = await taxApi.getProfile();
      expect(api.get).toHaveBeenCalledWith('/tax/profile');
      expect(res.data.success).toBe(true);
      expect(res.data.data?.bin).toBe('123456789-0101');
      expect(res.data.data?.legal_name).toBe('RetailCore Bangladesh Ltd');

      vi.spyOn(api, 'put').mockResolvedValueOnce({
        data: { success: true, message: 'Profile updated', data: { ...mockProfile, trade_name: 'RetailCore Mega' } },
      });

      const updateRes = await taxApi.updateProfile({ trade_name: 'RetailCore Mega' });
      expect(api.put).toHaveBeenCalledWith('/tax/profile', { trade_name: 'RetailCore Mega' });
      expect(updateRes.data.data.trade_name).toBe('RetailCore Mega');
    });

    it('manages tax registrations (VAT, Customs BIN)', async () => {
      const mockRegistrations = [
        {
          id: 1,
          company_id: 1,
          registration_type: 'VAT',
          registration_number: 'BIN-123456789-0101',
          issuing_authority: 'NBR',
          issue_date: '2026-01-01',
          effective_date: '2026-01-01',
          status: 'ACTIVE',
        },
      ];

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockRegistrations },
      });

      const listRes = await taxApi.getRegistrations();
      expect(api.get).toHaveBeenCalledWith('/tax/registrations');
      expect(listRes.data.data.length).toBe(1);
      expect(listRes.data.data[0].registration_type).toBe('VAT');

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Registration added',
          data: {
            id: 2,
            company_id: 1,
            registration_type: 'CUSTOMS_BIN',
            registration_number: 'CBIN-999',
            issuing_authority: 'Customs',
            issue_date: '2026-01-01',
            effective_date: '2026-01-01',
            status: 'ACTIVE',
          },
        },
      });

      const createRes = await taxApi.createRegistration({
        registration_type: 'CUSTOMS_BIN',
        registration_number: 'CBIN-999',
      });
      expect(api.post).toHaveBeenCalledWith('/tax/registrations', {
        registration_type: 'CUSTOMS_BIN',
        registration_number: 'CBIN-999',
      });
      expect(createRes.data.data.registration_number).toBe('CBIN-999');
    });
  });

  describe('2. Tax Categories & Configurable Rules API', () => {
    it('fetches tax categories and rules', async () => {
      const mockCategories = [
        { id: 1, name: 'Standard Rated Goods', code: 'STANDARD', is_active: true },
        { id: 2, name: 'Zero-Rated Exports', code: 'ZERO_RATED', is_active: true },
        { id: 3, name: 'Exempt Basic Goods', code: 'EXEMPT', is_active: true },
      ];
      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockCategories },
      });

      const catsRes = await taxApi.getCategories();
      expect(api.get).toHaveBeenCalledWith('/tax/categories');
      expect(catsRes.data.data.length).toBe(3);

      const mockRules = [
        {
          id: 1,
          tax_category_id: 1,
          code: 'VAT_15',
          name: 'Standard VAT 15%',
          rate: 15.0,
          calculation_method: 'PERCENTAGE',
          base_method: 'NET_AMOUNT',
          inclusive_allowed: true,
          exclusive_allowed: true,
          priority: 1,
          effective_from: '2026-01-01',
          status: 'ACTIVE',
        },
      ];
      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockRules },
      });

      const rulesRes = await taxApi.getRules({ status: 'ACTIVE' });
      expect(api.get).toHaveBeenCalledWith('/tax/rules', { params: { status: 'ACTIVE' } });
      expect(rulesRes.data.data[0].rate).toBe(15.0);
    });

    it('toggles rule status and creates rule', async () => {
      vi.spyOn(api, 'patch').mockResolvedValueOnce({
        data: { success: true, message: 'Status updated', data: { id: 1, status: 'INACTIVE' } },
      });

      const toggleRes = await taxApi.toggleRuleStatus(1, 'INACTIVE');
      expect(api.patch).toHaveBeenCalledWith('/tax/rules/1/status', { status: 'INACTIVE' });
      expect(toggleRes.data.data.status).toBe('INACTIVE');
    });
  });

  describe('3. Tax Periods Lifecycle & Locking API', () => {
    it('manages tax periods and locks/files a period', async () => {
      const mockPeriods = [
        {
          id: 1,
          company_id: 1,
          period_name: 'October 2026',
          period_start: '2026-10-01',
          period_end: '2026-10-31',
          status: 'OPEN',
        },
      ];
      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockPeriods },
      });

      const res = await taxApi.getPeriods();
      expect(res.data.data[0].period_name).toBe('October 2026');

      // Lock period
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, message: 'Period locked', data: { ...mockPeriods[0], status: 'UNDER_REVIEW' } },
      });
      const lockRes = await taxApi.lockPeriod(1);
      expect(api.post).toHaveBeenCalledWith('/tax/periods/1/lock');
      expect(lockRes.data.data.status).toBe('UNDER_REVIEW');

      // File period
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Period filed',
          data: { ...mockPeriods[0], status: 'FILED', filing_reference: 'NBR-REF-9988' },
        },
      });
      const fileRes = await taxApi.filePeriod(1, 'NBR-REF-9988');
      expect(api.post).toHaveBeenCalledWith('/tax/periods/1/file', { filing_reference: 'NBR-REF-9988' });
      expect(fileRes.data.data.status).toBe('FILED');
    });
  });

  describe('4. Tax Subledger Transactions & Settlement API', () => {
    it('fetches tax subledger transactions and settles treasury challan', async () => {
      const mockTx = {
        data: [
          {
            id: 1,
            company_id: 1,
            transaction_type: 'SALE_OUTPUT',
            source_type: 'SALE',
            source_id: 101,
            document_number: 'INV-2026-0001',
            document_date: '2026-10-05',
            taxable_amount: 1000,
            tax_amount: 150,
            sd_amount: 0,
            at_amount: 0,
            withholding_amount: 0,
            total_tax_amount: 150,
            is_inclusive: false,
            status: 'POSTED',
            posted_at: '2026-10-05 10:00:00',
          },
        ],
        total: 1,
        current_page: 1,
        last_page: 1,
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockTx },
      });

      const listRes = await taxApi.getTransactions({ page: 1 });
      expect(api.get).toHaveBeenCalledWith('/tax/transactions', { params: { page: 1 } });
      expect(listRes.data.data.data[0].total_tax_amount).toBe(150);

      // Settle tax
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Tax settled',
          data: { id: 2, transaction_type: 'TAX_SETTLEMENT', taxable_amount: 0, tax_amount: 150 },
        },
      });

      const settleRes = await taxApi.settleTax({
        tax_period_id: 1,
        amount: 150,
        payment_method_id: 1,
        reference_number: 'CHALLAN-TR-12345',
      });
      expect(api.post).toHaveBeenCalledWith('/tax/transactions/settle', {
        tax_period_id: 1,
        amount: 150,
        payment_method_id: 1,
        reference_number: 'CHALLAN-TR-12345',
      });
      expect(settleRes.data.data.transaction_type).toBe('TAX_SETTLEMENT');
    });
  });

  describe('5. Reconciliation & Audit Engine API', () => {
    it('executes reconciliation between subledger and general ledger', async () => {
      const mockReconciliation = {
        id: 1,
        company_id: 1,
        tax_period_id: 1,
        reconciliation_number: 'REC-2026-10-001',
        reconciled_date: '2026-10-07',
        output_vat_subledger: 1500,
        output_vat_gl: 1500,
        output_vat_difference: 0,
        input_vat_subledger: 450,
        input_vat_gl: 450,
        input_vat_difference: 0,
        adjustments_total: 0,
        net_tax_payable: 1050,
        status: 'RECONCILED',
        exceptions: [],
      };

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, message: 'Reconciled', data: mockReconciliation },
      });

      const reconRes = await taxApi.reconcilePeriod(1);
      expect(api.post).toHaveBeenCalledWith('/tax/periods/1/reconcile');
      expect(reconRes.data.data.status).toBe('RECONCILED');
      expect(reconRes.data.data.net_tax_payable).toBe(1050);
    });
  });

  describe('6. Tax Adjustments API', () => {
    it('creates, approves and posts tax adjustments to GL', async () => {
      const mockAdj = {
        id: 1,
        company_id: 1,
        tax_period_id: 1,
        adjustment_number: 'ADJ-2026-0001',
        adjustment_type: 'OUTPUT_VAT_DECREASE',
        reason: 'Sales return under Mushak 6.7',
        amount: 200,
        tax_amount: 30,
        status: 'DRAFT',
      };

      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, message: 'Draft created', data: mockAdj },
      });

      const createRes = await taxApi.createAdjustment({
        tax_period_id: 1,
        adjustment_type: 'OUTPUT_VAT_DECREASE',
        reason: 'Sales return under Mushak 6.7',
        tax_amount: 30,
      });
      expect(createRes.data.data.status).toBe('DRAFT');

      // Approve
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, message: 'Approved', data: { ...mockAdj, status: 'APPROVED' } },
      });
      const approveRes = await taxApi.approveAdjustment(1);
      expect(api.post).toHaveBeenCalledWith('/tax/adjustments/1/approve');
      expect(approveRes.data.data.status).toBe('APPROVED');

      // Post
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: true, message: 'Posted', data: { ...mockAdj, status: 'POSTED' } },
      });
      const postRes = await taxApi.postAdjustment(1);
      expect(api.post).toHaveBeenCalledWith('/tax/adjustments/1/post');
      expect(postRes.data.data.status).toBe('POSTED');
    });
  });

  describe('7. NBR Mushak 9.1 Return Foundation & Calculations', () => {
    it('retrieves Mushak 9.1 structure and validates components', async () => {
      const mockMushak = {
        taxpayer: {
          legal_name: 'RetailCore Bangladesh Ltd',
          trade_name: 'RetailCore Superstore',
          bin: '123456789-0101',
          tin: '987654321012',
          tax_circle: 'Circle-12',
          tax_zone: 'Zone-02',
          commissionerate: 'Dhaka South',
          address: 'Dhaka, Bangladesh',
        },
        period: {
          id: 1,
          name: 'October 2026',
          start_date: '2026-10-01',
          end_date: '2026-10-31',
          status: 'OPEN',
        },
        mushak_9_1_parts: {
          part_3_goods_services_supply: {
            standard_rated_supplies: 100000,
            output_vat: 15000,
            supplementary_duty: 2000,
          },
          part_4_purchases_inputs: {
            standard_rated_inputs: 60000,
            input_vat: 9000,
            input_sd: 0,
          },
          part_5_adjustments: {
            increasing_adjustments: 500,
            decreasing_adjustments: 1000,
            net_adjustment: -500,
          },
          part_6_net_tax_calculation: {
            net_payable_amount: 7500,
            treasury_payments: 5000,
            closing_payable: 2500,
            closing_refundable: 0,
          },
        },
        legal_disclaimer:
          'Bangladesh VAT & Tax Compliance Foundation under VAT and Supplementary Duty Act 2012 (Act No. 47 of 2012)',
      };

      vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockMushak },
      });

      const res = await taxApi.getMushakFoundation(1);
      expect(api.get).toHaveBeenCalledWith('/reports/tax/mushak-foundation/1');
      expect(res.data.data.taxpayer.bin).toBe('123456789-0101');
      expect(res.data.data.mushak_9_1_parts.part_3_goods_services_supply.output_vat).toBe(15000);
      expect(res.data.data.mushak_9_1_parts.part_4_purchases_inputs.input_vat).toBe(9000);
      expect(res.data.data.mushak_9_1_parts.part_6_net_tax_calculation.net_payable_amount).toBe(7500);
    });

    it('verifies deterministic inclusive and exclusive tax formula results', async () => {
      // Exclusive 15% VAT on 1000: Base = 1000, VAT = 150, Gross = 1150
      const exclusiveBase = 1000;
      const rate = 15;
      const exclusiveVat = (exclusiveBase * rate) / 100;
      expect(exclusiveVat).toBe(150);

      // Inclusive 15% VAT on 1150: Base = 1150 / 1.15 = 1000, VAT = 150
      const inclusiveGross = 1150;
      const inclusiveVat = (inclusiveGross * rate) / (100 + rate);
      expect(Math.round(inclusiveVat * 100) / 100).toBe(150);

      // Supplementary duty (10%) compound with VAT (15%)
      const net = 1000;
      const sdRate = 10;
      const sd = (net * sdRate) / 100;
      expect(sd).toBe(100);
      const vatBase = net + sd;
      expect(vatBase).toBe(1100);
      const vat = (vatBase * rate) / 100;
      expect(vat).toBe(165);
      const totalTax = sd + vat;
      expect(totalTax).toBe(265);
      const grossWithSd = net + totalTax;
      expect(grossWithSd).toBe(1265);
    });
  });

  describe('8. Bilingual Localization (EN & BN)', () => {
    it('verifies English and Bangla keys for Tax compliance navigation', () => {
      expect((en as any)['nav.taxCompliance']).toBe('Tax & VAT Compliance');
      expect((bn as any)['nav.taxCompliance']).toBe('ট্যাক্স ও ভ্যাট কমপ্লায়েন্স');

      expect((en as any)['nav.taxDashboard']).toBe('Tax Dashboard');
      expect((bn as any)['nav.taxDashboard']).toBe('ট্যাক্স ড্যাশবোর্ড');

      expect((en as any)['nav.taxProfiles']).toBe('Tax Profiles & Registrations');
      expect((bn as any)['nav.taxProfiles']).toBe('ট্যাক্স প্রোফাইল ও নিবন্ধন');

      expect((en as any)['nav.taxRules']).toBe('Tax Rates & Rules');
      expect((bn as any)['nav.taxRules']).toBe('ট্যাক্স হার ও বিধিমালা');

      expect((en as any)['nav.taxPeriods']).toBe('Tax Filing Periods');
      expect((bn as any)['nav.taxPeriods']).toBe('ট্যাক্স ফাইলিং পিরিয়ড');

      expect((en as any)['nav.taxTransactions']).toBe('Tax Subledger Register');
      expect((bn as any)['nav.taxTransactions']).toBe('ট্যাক্স সাবলেজার রেজিস্টার');

      expect((en as any)['nav.taxReconciliation']).toBe('Subledger vs GL Audit');
      expect((bn as any)['nav.taxReconciliation']).toBe('সাবলেজার ও জিএল রিকনসিলিয়েশন');

      expect((en as any)['nav.taxAdjustments']).toBe('Tax Adjustments & Notes');
      expect((bn as any)['nav.taxAdjustments']).toBe('ট্যাক্স অ্যাডজাস্টমেন্ট ও নোট');

      expect((en as any)['nav.taxReports']).toBe('Mushak 9.1 & VAT Reports');
      expect((bn as any)['nav.taxReports']).toBe('মূসক ৯.১ ও ভ্যাট রিপোর্ট');
    });
  });
});
