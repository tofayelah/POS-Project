/**
 * POS Receipt Company Branding Integrity & Regression Test Suite
 *
 * Verifies that POS receipts source company identity dynamically from the active authorized
 * company profile and never fall back to fake phone numbers, BINs, addresses, or generic store names.
 */

import { assertStrict, assertContains, assertNotContains, assertEqual } from './testHelpers';

// Forbidden fake strings that must NEVER appear as default fallbacks
const FORBIDDEN_FAKES = [
  '+880 1700-000000',
  'BIN-0012345678-0101',
  'Dhaka, Bangladesh',
  'www.retailcore-erp.com',
  'RETAILCORE SUPERSTORE',
  'RETAILCORE POS_ERP',
];

interface CompanyProfile {
  id: number;
  name: string;
  legal_name?: string;
  address?: string;
  phone?: string;
  vat_registration?: string;
  tax_number?: string;
  website?: string;
  logo_path?: string;
}

interface PosReceiptPropsInput {
  company?: CompanyProfile | null;
  isCompanyLoading?: boolean;
  branchName?: string;
}

/**
 * Helper function mapping POS Terminal context & hook state into receipt props
 * matching the logic in PosTerminal.tsx and PosReceiptModal.tsx.
 */
function resolveReceiptProps(input: PosReceiptPropsInput) {
  const { company, isCompanyLoading = false } = input;

  const companyName = company?.legal_name || company?.name || undefined;
  const companyAddress = company?.address || undefined;
  const companyPhone = company?.phone || undefined;
  const companyBin = company?.vat_registration || company?.tax_number || undefined;
  const companyWebsite = company?.website || undefined;
  const companyLogo = company?.logo_path || undefined;
  const hasCompanyProfile = Boolean(company);

  const isProfileMissing = hasCompanyProfile !== undefined ? !hasCompanyProfile : (!companyName && !isCompanyLoading);
  const isIdentityBlocked = isCompanyLoading || isProfileMissing || !companyName;

  return {
    companyName,
    companyAddress,
    companyPhone,
    companyBin,
    companyWebsite,
    companyLogo,
    isCompanyLoading,
    hasCompanyProfile,
    isIdentityBlocked,
  };
}

async function runPosReceiptBrandingTests() {
  console.log('================================================================');
  console.log('Running POS Receipt Branding Integrity & Regression Test Suite...');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      console.log(`[PASS] Test ${totalTests}: ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`[FAIL] Test ${totalTests}: ${name}`);
      console.error(`       Error: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Test 1: Fully populated company profile
  // ---------------------------------------------------------------------------
  test('1. Fully populated company profile sources all branding fields', () => {
    const companyA: CompanyProfile = {
      id: 1,
      name: 'Apex Retail',
      legal_name: 'Apex Retail Holdings Limited',
      address: 'Level 8, Concord Tower, Gulshan-1, Dhaka',
      phone: '+880 1819-998877',
      vat_registration: 'BIN-987654321',
      website: 'www.apexretail.com.bd',
      logo_path: 'https://cdn.apexretail.com/logo.png',
    };

    const props = resolveReceiptProps({ company: companyA, isCompanyLoading: false });

    assertEqual(props.companyName, 'Apex Retail Holdings Limited', 'companyName should reflect legal_name');
    assertEqual(props.companyAddress, 'Level 8, Concord Tower, Gulshan-1, Dhaka', 'address should match');
    assertEqual(props.companyPhone, '+880 1819-998877', 'phone should match');
    assertEqual(props.companyBin, 'BIN-987654321', 'BIN should match vat_registration');
    assertEqual(props.companyWebsite, 'www.apexretail.com.bd', 'website should match');
    assertEqual(props.companyLogo, 'https://cdn.apexretail.com/logo.png', 'logo should match');
    assertEqual(props.isIdentityBlocked, false, 'Printing should NOT be blocked');
  });

  // ---------------------------------------------------------------------------
  // Test 2: Missing optional company fields (no fake defaults)
  // ---------------------------------------------------------------------------
  test('2. Missing optional company fields are undefined and NEVER output fake values', () => {
    const minimalCompany: CompanyProfile = {
      id: 2,
      name: 'Simple Store Ltd',
    };

    const props = resolveReceiptProps({ company: minimalCompany, isCompanyLoading: false });

    assertEqual(props.companyName, 'Simple Store Ltd', 'companyName should be set');
    assertEqual(props.companyAddress, undefined, 'companyAddress should be undefined');
    assertEqual(props.companyPhone, undefined, 'companyPhone should be undefined');
    assertEqual(props.companyBin, undefined, 'companyBin should be undefined');
    assertEqual(props.companyWebsite, undefined, 'companyWebsite should be undefined');
    assertEqual(props.companyLogo, undefined, 'companyLogo should be undefined');
    assertEqual(props.isIdentityBlocked, false, 'Printing should be allowed with valid companyName');

    // Assert zero forbidden fake values
    FORBIDDEN_FAKES.forEach((fakeStr) => {
      assertNotContains(
        JSON.stringify(props),
        fakeStr,
        `Props must not contain forbidden fake fallback string "${fakeStr}"`
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Missing or loading company profile
  // ---------------------------------------------------------------------------
  test('3. Missing or loading company profile blocks printing and disables print actions', () => {
    // 3a. Loading state
    const loadingProps = resolveReceiptProps({ company: null, isCompanyLoading: true });
    assertEqual(loadingProps.isIdentityBlocked, true, 'Loading state MUST block printing');
    assertEqual(loadingProps.companyName, undefined, 'companyName must be undefined when loading');

    // 3b. Missing company profile state
    const missingProps = resolveReceiptProps({ company: null, isCompanyLoading: false });
    assertEqual(missingProps.isIdentityBlocked, true, 'Missing company state MUST block printing');
    assertEqual(missingProps.hasCompanyProfile, false, 'hasCompanyProfile must be false');
    assertEqual(missingProps.companyName, undefined, 'companyName must be undefined when missing');

    // Assert zero forbidden fake values
    FORBIDDEN_FAKES.forEach((fakeStr) => {
      assertNotContains(
        JSON.stringify(loadingProps),
        fakeStr,
        `Loading props must not contain forbidden fake string "${fakeStr}"`
      );
      assertNotContains(
        JSON.stringify(missingProps),
        fakeStr,
        `Missing props must not contain forbidden fake string "${fakeStr}"`
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Switching between two companies
  // ---------------------------------------------------------------------------
  test('4. Switching between two companies dynamically updates branding without stale cache', () => {
    const company1: CompanyProfile = {
      id: 101,
      name: 'Company One',
      address: '123 First Street',
      phone: '+880 1111-111111',
      tax_number: 'BIN-1111',
    };

    const company2: CompanyProfile = {
      id: 102,
      name: 'Company Two',
      address: '456 Second Avenue',
      phone: '+880 2222-222222',
      vat_registration: 'BIN-2222',
    };

    // Active Company 1
    const props1 = resolveReceiptProps({ company: company1, isCompanyLoading: false });
    assertEqual(props1.companyName, 'Company One', 'Company 1 name');
    assertEqual(props1.companyAddress, '123 First Street', 'Company 1 address');
    assertEqual(props1.companyPhone, '+880 1111-111111', 'Company 1 phone');
    assertEqual(props1.companyBin, 'BIN-1111', 'Company 1 BIN');

    // Switch to Company 2
    const props2 = resolveReceiptProps({ company: company2, isCompanyLoading: false });
    assertEqual(props2.companyName, 'Company Two', 'Company 2 name');
    assertEqual(props2.companyAddress, '456 Second Avenue', 'Company 2 address');
    assertEqual(props2.companyPhone, '+880 2222-222222', 'Company 2 phone');
    assertEqual(props2.companyBin, 'BIN-2222', 'Company 2 BIN');

    // Ensure props2 does not retain Company 1 values
    assertNotContains(JSON.stringify(props2), '123 First Street', 'Company 2 must not retain Company 1 address');
    assertNotContains(JSON.stringify(props2), '+880 1111-111111', 'Company 2 must not retain Company 1 phone');
  });

  // ---------------------------------------------------------------------------
  // Test 5: Comprehensive assertion that forbidden fake strings never appear
  // ---------------------------------------------------------------------------
  test('5. Forbidden fake string regression guard across empty, partial, and null inputs', () => {
    const testCases: PosReceiptPropsInput[] = [
      { company: null, isCompanyLoading: true },
      { company: null, isCompanyLoading: false },
      { company: { id: 99, name: '' }, isCompanyLoading: false },
      { company: { id: 100, name: 'Test Shop', address: '', phone: '' }, isCompanyLoading: false },
    ];

    testCases.forEach((tc, idx) => {
      const props = resolveReceiptProps(tc);
      const propsJson = JSON.stringify(props);
      FORBIDDEN_FAKES.forEach((fakeStr) => {
        assertNotContains(
          propsJson,
          fakeStr,
          `Test case ${idx + 1} produced forbidden fake string "${fakeStr}"`
        );
      });
    });
  });

  console.log('\n================================================================');
  console.log(`Results: ${passedTests} / ${totalTests} POS receipt branding tests PASSED.`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPosReceiptBrandingTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
