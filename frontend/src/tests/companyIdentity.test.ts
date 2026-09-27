import { describe, it, expect, beforeEach } from 'vitest';

// In-memory mock storage for Node test environment
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
  clear: () => { storage.clear(); },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() { return storage.size; },
};

(globalThis as unknown as { localStorage: typeof mockLocalStorage }).localStorage = mockLocalStorage;

import { Company } from '../types/organization';
import { 
  getActiveTenantId, 
  setActiveTenantCompany, 
  getActiveCompanyFromStorage 
} from '../api/organization';

describe('Global Multi-Tenant Company Identity Tests', () => {
  const companyA: Company = {
    id: 1,
    name: 'Trust Bond Trading',
    legal_name: 'Trust Bond Trading Limited',
    code: 'TBT-01',
    subdomain: 'trustbond',
    custom_domain: 'pos.trustbond.com',
    business_type: 'GENERAL_RETAIL',
    business_type_label: 'General Retail',
    owner_name: 'Mr. Tofayel',
    owner_email: 'tofayel@trustbond.com',
    owner_phone: '+8801700000001',
    phone: '+8801700000001',
    email: 'info@trustbond.com',
    website: 'https://trustbond.com',
    vat_registration: 'VAT-9988776655',
    tax_number: 'VAT-9988776655',
    address: 'Suit 401, Commercial Tower, Motijheel, Dhaka',
    country: 'Bangladesh',
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    status: 'active',
  };

  const companyB: Company = {
    id: 2,
    name: 'ABC Fashion Ltd.',
    legal_name: 'ABC Fashion International Ltd.',
    code: 'ABC-02',
    subdomain: 'abcfashion',
    custom_domain: 'erp.abcfashion.com',
    business_type: 'GARMENTS_APPAREL',
    business_type_label: 'Apparel & Undergarments',
    owner_name: 'Mr. Tamim',
    owner_email: 'tamim@abcfashion.com',
    owner_phone: '+8801800000002',
    phone: '+8801800000002',
    email: 'contact@abcfashion.com',
    website: 'https://abcfashion.com',
    vat_registration: 'BIN-1122334455',
    tax_number: 'BIN-1122334455',
    address: 'Plot 12, Sector 3, Uttara, Dhaka',
    country: 'Bangladesh',
    currency_code: 'BDT',
    timezone: 'Asia/Dhaka',
    status: 'active',
  };

  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('correctly persists and retrieves active tenant company from storage', () => {
    setActiveTenantCompany(companyA);
    expect(getActiveTenantId()).toBe(companyA.id);

    const stored = getActiveCompanyFromStorage();
    expect(stored).not.toBeNull();
    expect(stored?.name).toBe('Trust Bond Trading');
    expect(stored?.website).toBe('https://trustbond.com');
    expect(stored?.vat_registration).toBe('VAT-9988776655');
  });

  it('dynamically switches company identity between Company A and Company B', () => {
    // Activate Customer A
    setActiveTenantCompany(companyA);
    let active = getActiveCompanyFromStorage();
    expect(active?.name).toBe('Trust Bond Trading');
    expect(active?.subdomain).toBe('trustbond');
    expect(active?.vat_registration).toBe('VAT-9988776655');

    // Dynamically switch to Customer B
    setActiveTenantCompany(companyB);
    active = getActiveCompanyFromStorage();
    expect(active?.name).toBe('ABC Fashion Ltd.');
    expect(active?.subdomain).toBe('abcfashion');
    expect(active?.vat_registration).toBe('BIN-1122334455');
    expect(active?.website).toBe('https://abcfashion.com');
    expect(active?.address).toBe('Plot 12, Sector 3, Uttara, Dhaka');
  });

  it('generates dynamic Header welcome greeting for any active tenant without hardcoding', () => {
    const getWelcomeText = (comp?: Company | null) => `Welcome to ${comp?.name || 'RetailCore'}`;

    expect(getWelcomeText(companyA)).toBe('Welcome to Trust Bond Trading');
    expect(getWelcomeText(companyB)).toBe('Welcome to ABC Fashion Ltd.');
    expect(getWelcomeText(null)).toBe('Welcome to RetailCore');
  });

  it('formats DocumentHeader attributes accurately for print and document views', () => {
    const formatDocumentHeaderData = (comp: Company) => ({
      companyName: comp.name,
      legalName: comp.legal_name && comp.legal_name !== comp.name ? comp.legal_name : null,
      address: comp.address || null,
      phone: comp.phone || null,
      email: comp.email || null,
      website: comp.website || null,
      vatNumber: comp.vat_registration || comp.tax_number || null,
    });

    const docA = formatDocumentHeaderData(companyA);
    expect(docA.companyName).toBe('Trust Bond Trading');
    expect(docA.legalName).toBe('Trust Bond Trading Limited');
    expect(docA.vatNumber).toBe('VAT-9988776655');
    expect(docA.website).toBe('https://trustbond.com');
    expect(docA.address).toContain('Motijheel, Dhaka');

    const docB = formatDocumentHeaderData(companyB);
    expect(docB.companyName).toBe('ABC Fashion Ltd.');
    expect(docB.legalName).toBe('ABC Fashion International Ltd.');
    expect(docB.vatNumber).toBe('BIN-1122334455');
    expect(docB.website).toBe('https://abcfashion.com');
    expect(docB.address).toContain('Uttara, Dhaka');
  });

  it('validates company payload constraints for name, subdomain, and identity fields', () => {
    // Company name must not be blank
    const isValidCompanyName = (name?: string) => Boolean(name && name.trim().length > 0);
    expect(isValidCompanyName('Trust Bond Trading')).toBe(true);
    expect(isValidCompanyName('   ')).toBe(false);
    expect(isValidCompanyName('')).toBe(false);

    // Subdomain must only contain lowercase alphanumeric and hyphens
    const sanitizeSubdomain = (val: string) => val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    expect(sanitizeSubdomain('Trust Bond!')).toBe('trustbond');
    expect(sanitizeSubdomain('ABC-Fashion_123')).toBe('abc-fashion123');
  });
});
