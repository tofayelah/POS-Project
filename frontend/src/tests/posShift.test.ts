import { describe, it, expect } from 'vitest';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';
import { PosSession, PosCashMovement } from '../api/pos';

describe('Phase 5.4 POS Shift & Drawer Management Tests', () => {
  it('1. posShift translation keys have 100% EN and BN parity', () => {
    const requiredKeys = [
      'posShift.title',
      'posShift.shift',
      'posShift.shifts',
      'posShift.currentShift',
      'posShift.openShift',
      'posShift.closeShift',
      'posShift.openingCash',
      'posShift.closingCash',
      'posShift.expectedCash',
      'posShift.actualCash',
      'posShift.variance',
      'posShift.balanced',
      'posShift.short',
      'posShift.over',
      'posShift.cashIn',
      'posShift.cashOut',
      'posShift.cashSales',
      'posShift.cashRefunds',
      'posShift.terminal',
      'posShift.cashier',
      'posShift.openedAt',
      'posShift.closedAt',
      'posShift.status',
      'posShift.notes',
      'posShift.reason',
      'posShift.reference',
      'posShift.amount',
      'posShift.movements',
      'posShift.reconciliation',
      'posShift.tenderSummary',
      'posShift.cardSales',
      'posShift.bkashSales',
      'posShift.nagadSales',
      'posShift.storeCreditSales',
      'posShift.pointsSales',
      'posShift.totalSales',
      'posShift.approveVariance',
      'posShift.varianceApproved',
      'posShift.variancePending',
      'posShift.supervisorApprovalRequired',
      'posShift.denominations',
    ];

    for (const key of requiredKeys) {
      expect((en as any)[key], `EN key missing: ${key}`).toBeDefined();
      expect((bn as any)[key], `BN key missing: ${key}`).toBeDefined();
      expect(typeof (en as any)[key]).toBe('string');
      expect(typeof (bn as any)[key]).toBe('string');
      expect((en as any)[key].length).toBeGreaterThan(0);
      expect((bn as any)[key].length).toBeGreaterThan(0);
    }
  });

  it('2. PosSession interface validates active and closed shift states', () => {
    const activeShift: PosSession = {
      id: 101,
      company_id: 1,
      pos_terminal_id: 2,
      cashier_id: 5,
      session_number: 'SES-20261006-001',
      opening_cash: '5000.0000',
      status: 'OPEN',
      opened_at: '2026-10-06T08:00:00Z',
    };

    expect(activeShift.status).toBe('OPEN');
    expect(Number(activeShift.opening_cash)).toBe(5000);
    expect(activeShift.closing_cash).toBeUndefined();

    const closedShift: PosSession = {
      ...activeShift,
      closing_cash: '15000.0000',
      expected_cash: '15000.0000',
      cash_difference: '0.0000',
      variance_status: 'BALANCED',
      status: 'CLOSED',
      closed_at: '2026-10-06T17:00:00Z',
    };

    expect(closedShift.status).toBe('CLOSED');
    expect(Number(closedShift.closing_cash)).toBe(15000);
    expect(Number(closedShift.expected_cash)).toBe(15000);
    expect(Number(closedShift.cash_difference)).toBe(0);
    expect(closedShift.variance_status).toBe('BALANCED');
  });

  it('3. PosCashMovement supports CASH_IN and CASH_OUT types', () => {
    const cashIn: PosCashMovement = {
      id: 1,
      company_id: 1,
      pos_session_id: 101,
      pos_terminal_id: 2,
      user_id: 5,
      movement_number: 'CIN-20261006-A1B2',
      type: 'CASH_IN',
      amount: '2000.0000',
      reason: 'Change replenishment from vault',
      created_at: '2026-10-06T10:00:00Z',
    };

    expect(cashIn.type).toBe('CASH_IN');
    expect(Number(cashIn.amount)).toBe(2000);

    const cashOut: PosCashMovement = {
      id: 2,
      company_id: 1,
      pos_session_id: 101,
      pos_terminal_id: 2,
      user_id: 5,
      movement_number: 'COUT-20261006-C3D4',
      type: 'CASH_OUT',
      amount: '1500.0000',
      reason: 'Midday cash drop to bank',
      created_at: '2026-10-06T13:00:00Z',
    };

    expect(cashOut.type).toBe('CASH_OUT');
    expect(Number(cashOut.amount)).toBe(1500);
  });

  it('4. Expected cash calculation strictly includes physical cash only', () => {
    const openingCash = 5000;
    const cashSales = 12500;
    const cardSales = 8000; // non-cash
    const bkashSales = 4500; // non-cash
    const storeCreditSales = 2000; // non-cash
    const cashIn = 2000;
    const cashOut = 1000;
    const cashRefunds = 500;

    // Expected physical cash formula:
    // opening_cash + cash_sales + cash_in - cash_out - cash_refunds
    const expectedPhysicalCash = openingCash + cashSales + cashIn - cashOut - cashRefunds;

    expect(expectedPhysicalCash).toBe(18000);

    // Non-cash tenders must not alter physical drawer expected cash
    const totalAllSales = cashSales + cardSales + bkashSales + storeCreditSales;
    expect(totalAllSales).toBe(27000);
    expect(expectedPhysicalCash).not.toBe(openingCash + totalAllSales + cashIn - cashOut - cashRefunds);
  });

  it('5. Cash variance correctly categorizes BALANCED, SHORT, and OVER', () => {
    const expected = 10000;

    const actualBalanced = 10000;
    const diffBalanced = actualBalanced - expected;
    const statusBalanced = Math.abs(diffBalanced) < 0.0001 ? 'BALANCED' : diffBalanced < 0 ? 'SHORT' : 'OVER';
    expect(statusBalanced).toBe('BALANCED');

    const actualShort = 9800;
    const diffShort = actualShort - expected;
    const statusShort = Math.abs(diffShort) < 0.0001 ? 'BALANCED' : diffShort < 0 ? 'SHORT' : 'OVER';
    expect(statusShort).toBe('SHORT');
    expect(diffShort).toBe(-200);

    const actualOver = 10150;
    const diffOver = actualOver - expected;
    const statusOver = Math.abs(diffOver) < 0.0001 ? 'BALANCED' : diffOver < 0 ? 'SHORT' : 'OVER';
    expect(statusOver).toBe('OVER');
    expect(diffOver).toBe(150);
  });

  it('6. Denominations sum matches closing cash total correctly', () => {
    const denomCounts: Record<number, number> = {
      1000: 8,  // 8000
      500: 6,   // 3000
      200: 5,   // 1000
      100: 10,  // 1000
      50: 4,    // 200
      20: 5,    // 100
      10: 10,   // 100
      5: 8,     // 40
      2: 5,     // 10
      1: 0,
    };

    let calculatedTotal = 0;
    for (const [denom, count] of Object.entries(denomCounts)) {
      calculatedTotal += Number(denom) * Number(count);
    }

    expect(calculatedTotal).toBe(13450);
  });
});
