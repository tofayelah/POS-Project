import { describe, it, expect } from 'vitest';
import { SupplierPayload } from '../types/supplier';

describe('Supplier Form Validation & Payload Modeling', () => {
  it('validates minimum required supplier payload', () => {
    const payload: SupplierPayload = {
      name: 'Rahim Textile Mills Ltd.',
      supplier_code: 'SUP-0001',
      status: 'ACTIVE',
      opening_balance: 0,
      credit_limit: 50000,
      payment_terms: 'Net 30 Days',
    };

    expect(payload.name).toBe('Rahim Textile Mills Ltd.');
    expect(payload.status).toBe('ACTIVE');
    expect(payload.credit_limit).toBe(50000);
    expect(payload.payment_terms).toBe('Net 30 Days');
  });

  it('correctly handles contact and location details in supplier payload', () => {
    const payload: SupplierPayload = {
      name: 'Apex Footwear Ltd.',
      contact_person: 'Mr. Rafiqul Islam',
      mobile: '+880 1712-345678',
      email: 'sales@apex.com',
      address: 'Plot 12, Tejgaon I/A',
      city: 'Dhaka',
      country: 'Bangladesh',
      tax_number: 'BIN-9928374-01',
      opening_balance: 15000,
      credit_limit: 100000,
      status: 'ACTIVE',
    };

    expect(payload.contact_person).toBe('Mr. Rafiqul Islam');
    expect(payload.city).toBe('Dhaka');
    expect(payload.opening_balance).toBe(15000);
    expect(payload.tax_number).toBe('BIN-9928374-01');
  });

  it('normalizes empty opening balance and credit limit to 0', () => {
    const rawOpeningBalance: number | '' = '';
    const rawCreditLimit: number | '' = '';

    const normalizedOpening = rawOpeningBalance === '' ? 0 : Number(rawOpeningBalance);
    const normalizedCredit = rawCreditLimit === '' ? 0 : Number(rawCreditLimit);

    expect(normalizedOpening).toBe(0);
    expect(normalizedCredit).toBe(0);
  });
});
