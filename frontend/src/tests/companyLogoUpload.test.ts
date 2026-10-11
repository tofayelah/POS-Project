/**
 * Company Logo Upload & Persistence Integration Test Suite
 *
 * Verifies that the optional Company Logo Upload functionality in New Tenant Onboarding
 * and Company Configure Modal properly validates, previews, and persists company logos.
 */

import { assertStrict, assertEqual } from './testHelpers';
import { 
  createCompany, 
  updateCompany, 
  getLocalTenantCompanies, 
  saveLocalTenantCompanies, 
  setActiveTenantCompany,
  getActiveCompanyFromStorage
} from '../api/organization';
import { Company, CreateCompanyPayload } from '../types/organization';

// Polyfill localStorage in node runner environment if required
if (typeof localStorage === 'undefined' || !localStorage.getItem) {
  const store: Record<string, string> = {};
  global.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    length: 0,
    key: (i: number) => Object.keys(store)[i] || null,
  };
}

async function runLogoUploadTests() {
  console.log('=== Running Company Logo Upload & Persistence Integration Tests ===\n');
  const sampleLogoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // Test 1: Onboard new tenant with logo
  console.log('Test 1: Onboards new customer tenant with optional logo image');
  localStorage.clear();

  const payload: CreateCompanyPayload = {
    name: 'Logo Test Electronics',
    legal_name: 'Logo Test Electronics Ltd.',
    subdomain: 'logotest',
    code: 'LT-01',
    business_type: 'MOBILE_ELECTRONICS',
    owner_name: 'Test Owner',
    owner_email: 'owner@logotest.com',
    owner_phone: '+880 1700-112233',
    logo_path: sampleLogoDataUrl,
  };

  const createRes = await createCompany(payload);
  assertStrict(createRes.success, 'Company creation should return success: true');
  assertEqual(createRes.data.name, 'Logo Test Electronics');
  assertEqual(createRes.data.logo_path, sampleLogoDataUrl);

  const localTenants = getLocalTenantCompanies();
  const found = localTenants.find((t) => t.subdomain === 'logotest');
  assertStrict(Boolean(found), 'Newly created tenant with logo should exist in local storage');
  assertEqual(found?.logo_path, sampleLogoDataUrl);
  console.log('✓ PASS: Logo saved and persisted during tenant onboarding\n');

  // Test 2: Onboard tenant without logo (graceful fallback)
  console.log('Test 2: Onboards tenant without logo (supports default initial letter avatar)');
  const noLogoPayload: CreateCompanyPayload = {
    name: 'No Logo Superstore',
    legal_name: 'No Logo Superstore Ltd.',
    subdomain: 'nologo',
    code: 'NL-01',
    business_type: 'GROCERY_FMCG',
    owner_name: 'No Logo Owner',
    owner_email: 'owner@nologo.com',
  };

  const createNoLogoRes = await createCompany(noLogoPayload);
  assertStrict(createNoLogoRes.success, 'Company creation without logo should succeed');
  assertStrict(!createNoLogoRes.data.logo_path, 'logo_path should be undefined when no logo uploaded');
  console.log('✓ PASS: Onboarding without logo succeeds with initial letter fallback\n');

  // Test 3: Update existing company with a logo
  console.log('Test 3: Updates an existing company profile with a new logo');
  const existingCompany: Company = {
    id: 99,
    name: 'Existing Retail Co',
    subdomain: 'existing',
    status: 'active',
  };
  saveLocalTenantCompanies([existingCompany]);

  const updateRes = await updateCompany({
    id: 99,
    name: 'Existing Retail Co',
    logo_path: sampleLogoDataUrl,
  });

  assertStrict(updateRes.success, 'Company update should return success: true');
  assertEqual(updateRes.data.logo_path, sampleLogoDataUrl);

  const updatedLocal = getLocalTenantCompanies().find((t) => t.id === 99);
  assertEqual(updatedLocal?.logo_path, sampleLogoDataUrl);
  console.log('✓ PASS: Existing company profile successfully updated with new logo\n');

  // Test 4: Active company scope updates
  console.log('Test 4: Updates active company profile and verifies active scope storage');
  const activeComp: Company = {
    id: 100,
    name: 'Active Scope Company',
    subdomain: 'activescope',
    status: 'active',
  };
  saveLocalTenantCompanies([activeComp]);
  setActiveTenantCompany(activeComp);

  await updateCompany({
    id: 100,
    name: 'Active Scope Company Updated',
    logo_path: sampleLogoDataUrl,
  });

  const storedActive = getActiveCompanyFromStorage();
  assertStrict(Boolean(storedActive), 'Active company should exist in local storage');
  assertEqual(storedActive?.name, 'Active Scope Company Updated');
  assertEqual(storedActive?.logo_path, sampleLogoDataUrl);
  console.log('✓ PASS: Active company scope storage updated with logo_path\n');

  console.log('🎉 ALL COMPANY LOGO UPLOAD & PERSISTENCE TESTS PASSED SUCCESSFULLY!');
}

runLogoUploadTests().catch((err) => {
  console.error('❌ Logo Upload Test Failed:', err);
  process.exit(1);
});
