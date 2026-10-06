import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api/axios';
import {
  getProcurementDashboard,
  getRequisitions,
  getRequisition,
  createRequisition,
  submitRequisition,
  reviewRequisition,
  approveRequisition,
  rejectRequisition,
  cancelRequisition,
  convertRequisitionToPo,
  convertRequisitionToRfq,
  getRfqs,
  getRfq,
  createRfq,
  inviteRfqSuppliers,
  recordRfqQuotation,
  compareRfqQuotations,
  awardRfqQuotation,
  getSupplierRankings,
  getSupplierPerformance,
  recalculateSupplierScore,
  updateSupplierQualification,
  getSupplierContracts,
  createSupplierContract,
  getSupplierPriceAgreements,
  createSupplierPriceAgreement,
  resolveProcurementPrice,
  getMatchExceptions,
  getPpvSummary,
  getReplenishmentRecommendations,
  createRequisitionFromRecommendations,
} from '../api/procurement';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';

describe('Phase 7: Advanced Procurement Intelligence API Client & i18n', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Dashboard
  it('1. fetches procurement dashboard metrics and alerts', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          recommendations_count: 5,
          active_requisitions_count: 3,
          open_rfqs_count: 2,
          match_exceptions_count: 1,
          active_contracts_count: 4,
          spend_summary: {
            total_spend_30d: 125000,
            net_ppv_30d: 2500,
            unmatched_po_qty: 10,
            unmatched_grn_qty: 0,
          },
          top_suppliers: [],
          recent_requisitions: [],
        },
      },
    };
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue(mockResponse);

    const result = await getProcurementDashboard();
    expect(getSpy).toHaveBeenCalledWith('/procurement/dashboard');
    expect(result.success).toBe(true);
    expect(result.data.recommendations_count).toBe(5);
  });

  // 2. Requisitions: list & show
  it('2. fetches purchase requisitions list with filters', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          data: [{ id: 1, pr_number: 'PR-2026-0001', status: 'DRAFT' }],
          total: 1,
        },
      },
    };
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue(mockResponse);

    const result = await getRequisitions({ status: 'DRAFT', warehouse_id: 1 });
    expect(getSpy).toHaveBeenCalledWith('/purchase-requisitions', {
      params: { status: 'DRAFT', warehouse_id: 1 },
    });
    expect(result.data.data[0].pr_number).toBe('PR-2026-0001');
  });

  it('3. creates new purchase requisition and executes workflow transitions', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, data: { id: 10, pr_number: 'PR-2026-0010', status: 'DRAFT' } },
    });

    const createRes = await createRequisition({
      warehouse_id: 1,
      items: [{ product_id: 1, variant_id: 2, requested_qty: 50, estimated_unit_cost: 100 }],
    });
    expect(postSpy).toHaveBeenCalledWith('/purchase-requisitions', expect.any(Object));
    expect(createRes.data.pr_number).toBe('PR-2026-0010');

    // Submit
    postSpy.mockResolvedValueOnce({
      data: { success: true, data: { id: 10, status: 'SUBMITTED' } },
    });
    const submitRes = await submitRequisition(10);
    expect(postSpy).toHaveBeenCalledWith('/purchase-requisitions/10/submit');
    expect(submitRes.data.status).toBe('SUBMITTED');

    // Review
    postSpy.mockResolvedValueOnce({
      data: { success: true, data: { id: 10, status: 'UNDER_REVIEW' } },
    });
    const reviewRes = await reviewRequisition(10, 'Reviewing stock levels');
    expect(postSpy).toHaveBeenCalledWith('/purchase-requisitions/10/review', { notes: 'Reviewing stock levels' });
    expect(reviewRes.data.status).toBe('UNDER_REVIEW');

    // Approve
    postSpy.mockResolvedValueOnce({
      data: { success: true, data: { id: 10, status: 'APPROVED' } },
    });
    const approveRes = await approveRequisition(10);
    expect(postSpy).toHaveBeenCalledWith('/purchase-requisitions/10/approve', { enforce_segregation: false });
    expect(approveRes.data.status).toBe('APPROVED');

    // Convert to PO
    postSpy.mockResolvedValueOnce({
      data: { success: true, data: { po: { id: 99, po_number: 'PO-2026-0099' } } },
    });
    const convertPoRes = await convertRequisitionToPo(10, 5, 1);
    expect(postSpy).toHaveBeenCalledWith('/purchase-requisitions/10/convert-po', { supplier_id: 5, warehouse_id: 1 });
    expect(convertPoRes.data.po.po_number).toBe('PO-2026-0099');
  });

  // 4. RFQ and Quotations
  it('4. creates RFQ, invites suppliers, records quotations, and evaluates matrix', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, data: { id: 20, rfq_number: 'RFQ-2026-0001', status: 'DRAFT' } },
    });
    const getSpy = vi.spyOn(api, 'get');

    // Create RFQ
    const rfqRes = await createRfq({
      title: 'Tender Q2 Supplies',
      items: [{ product_id: 1, requested_qty: 100 }],
    });
    expect(postSpy).toHaveBeenCalledWith('/rfqs', expect.any(Object));
    expect(rfqRes.data.rfq_number).toBe('RFQ-2026-0001');

    // Invite Suppliers
    postSpy.mockResolvedValueOnce({
      data: { success: true, data: { invited_count: 2 } },
    });
    await inviteRfqSuppliers(20, [3, 4]);
    expect(postSpy).toHaveBeenCalledWith('/rfqs/20/invite', { supplier_ids: [3, 4] });

    // Record Quote
    postSpy.mockResolvedValueOnce({
      data: { success: true, data: { quotation_id: 100 } },
    });
    await recordRfqQuotation(20, {
      supplier_id: 3,
      quotation_reference: 'QUOTE-ABC',
      items: [{ rfq_item_id: 1, quoted_unit_price: 95 }],
    });
    expect(postSpy).toHaveBeenCalledWith('/rfqs/20/quotations', expect.any(Object));

    // Compare Quotes
    getSpy.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          rfq: { id: 20 },
          matrix: [],
          recommended_quotation_id: 100,
        },
      },
    });
    const compareRes = await compareRfqQuotations(20);
    expect(getSpy).toHaveBeenCalledWith('/rfqs/20/compare');
    expect(compareRes.data.recommended_quotation_id).toBe(100);

    // Award Quote
    postSpy.mockResolvedValueOnce({
      data: { success: true, data: { po: { id: 101, po_number: 'PO-2026-0101' } } },
    });
    const awardRes = await awardRfqQuotation(20, 100, 'Best price');
    expect(postSpy).toHaveBeenCalledWith('/rfqs/20/award', {
      quotation_id: 100,
      notes: 'Best price',
      create_po: true,
      warehouse_id: undefined,
    });
    expect(awardRes.data.po.po_number).toBe('PO-2026-0101');
  });

  // 5. Supplier Performance & Qualification
  it('5. retrieves supplier rankings, performance scorecards, and updates qualification', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            supplier_id: 1,
            supplier_name: 'Alpha Ltd',
            composite_score: 92.5,
            tier: 'PLATINUM',
            metrics: { otd_percentage: 95, fill_rate_percentage: 98 },
          },
        ],
      },
    });
    const postSpy = vi.spyOn(api, 'post');

    const rankingsRes = await getSupplierRankings();
    expect(getSpy).toHaveBeenCalledWith('/procurement/supplier-rankings');
    expect(rankingsRes[0].tier).toBe('PLATINUM');

    // Recalculate Score
    postSpy.mockResolvedValueOnce({
      data: { success: true, data: { composite_score: 94.0 } },
    });
    const recalcRes = await recalculateSupplierScore(1);
    expect(postSpy).toHaveBeenCalledWith('/suppliers/1/recalculate-score');
    expect(recalcRes.data.composite_score).toBe(94.0);

    // Update Qualification
    postSpy.mockResolvedValueOnce({
      data: { success: true, data: { qualification_status: 'QUALIFIED' } },
    });
    const qualRes = await updateSupplierQualification(1, 'QUALIFIED', 'ISO verified');
    expect(postSpy).toHaveBeenCalledWith('/suppliers/1/qualification', {
      qualification_status: 'QUALIFIED',
      reason: 'ISO verified',
      notes: undefined,
    });
    expect(qualRes.data.qualification_status).toBe('QUALIFIED');
  });

  // 6. Contracts & Price Agreements
  it('6. manages contracts, price agreements, and resolves item procurement prices', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          data: [{ id: 5, contract_number: 'CNT-2026-0001', status: 'ACTIVE' }],
        },
      },
    });

    const contractsRes = await getSupplierContracts({ supplier_id: 1 });
    expect(getSpy).toHaveBeenCalledWith('/supplier-contracts', { params: { supplier_id: 1 } });
    expect(contractsRes.data.data[0].contract_number).toBe('CNT-2026-0001');

    // Test Price Resolution
    getSpy.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          unit_price: 85.0,
          resolution_source: 'PRICE_AGREEMENT',
          currency: 'BDT',
        },
      },
    });
    const priceRes = await resolveProcurementPrice(1, 20, 5);
    expect(getSpy).toHaveBeenCalledWith('/procurement/resolve-price', {
      params: { supplier_id: 1, product_variant_id: 20, quantity: 5 },
    });
    expect(priceRes.unit_price).toBe(85.0);
    expect(priceRes.resolution_source).toBe('PRICE_AGREEMENT');
  });

  // 7. Three-Way Matching & PPV
  it('7. queries 3-way matching exceptions and PPV variance summary', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            invoice_id: 50,
            invoice_number: 'INV-2026-0050',
            matched: false,
            exceptions: ['PRICE_MISMATCH'],
            price_variance_amount: 1500,
          },
        ],
      },
    });

    const exceptionsRes = await getMatchExceptions(25);
    expect(getSpy).toHaveBeenCalledWith('/procurement/match-exceptions', {
      params: { limit: 25 },
    });
    expect(exceptionsRes[0].exceptions).toContain('PRICE_MISMATCH');

    // PPV summary
    getSpy.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          total_spend: 300000,
          total_standard_cost: 295000,
          net_ppv: 5000,
        },
      },
    });
    const ppvRes = await getPpvSummary(60);
    expect(getSpy).toHaveBeenCalledWith('/procurement/ppv-summary', {
      params: { period_days: 60 },
    });
    expect(ppvRes.net_ppv).toBe(5000);
  });

  // 8. Replenishment Recommendations
  it('8. calculates deterministic replenishment recommendations and creates 1-click requisition', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          warehouse: null,
          summary: { total_items_analyzed: 10, items_needing_reorder: 1, total_estimated_spend: 4800, lookback_days: 30, target_coverage_days: 15 },
          recommendations: [
            {
              product_id: 1,
              product_name: 'Premium Basmati Rice',
              stock_on_hand: 10,
              reorder_point: 40,
              recommended_order_qty: 60,
            },
          ],
        },
      },
    });
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        success: true,
        data: { id: 77, pr_number: 'PR-2026-0077' },
      },
    });

    const recs = await getReplenishmentRecommendations({ warehouse_id: 1 });
    expect(getSpy).toHaveBeenCalledWith('/procurement/recommendations', {
      params: { warehouse_id: 1 },
    });
    expect(recs.data.recommendations[0].recommended_order_qty).toBe(60);

    const autoPr = await createRequisitionFromRecommendations({
      warehouse_id: 1,
      items: [{ product_id: 1, product_variant_id: 2, recommended_quantity: 60, unit_cost: 80 }],
    });
    expect(postSpy).toHaveBeenCalledWith('/procurement/recommendations/create-requisition', expect.any(Object));
    expect(autoPr.data.pr_number).toBe('PR-2026-0077');
  });

  // 9. i18n Translation Parity (EN & BN)
  it('9. verifies EN and BN translation keys parity for procurement module', () => {
    const requiredKeys = [
      'nav.procurementDashboard',
      'nav.purchaseRequisitions',
      'nav.rfqManagement',
      'nav.supplierPerformance',
      'nav.supplierContracts',
      'nav.matchingExceptions',
      'nav.procurementPlanning',
      'procurement.dashboard.title',
      'procurement.dashboard.subtitle',
      'procurement.requisitions.title',
      'procurement.rfq.title',
      'procurement.performance.title',
      'procurement.contracts.title',
      'procurement.matching.title',
      'procurement.recommendations.title',
    ];

    for (const key of requiredKeys) {
      expect(en[key], `Missing EN key: ${key}`).toBeDefined();
      expect(typeof en[key]).toBe('string');
      expect(bn[key], `Missing BN key: ${key}`).toBeDefined();
      expect(typeof bn[key]).toBe('string');
      expect(bn[key].length).toBeGreaterThan(0);
    }
  });
});
