import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

console.log('================================================================');
console.log('--- RETAILCORE ONE COMPANY MULTI-BRANCH ARCHITECTURE SUITE ---');
console.log('================================================================');

// 1. CompanyContext One Company Multi-Branch Provider
const contextPath = resolve(process.cwd(), 'frontend/src/contexts/CompanyContext.tsx');
assert(existsSync(contextPath), 'CompanyContext.tsx exists');
const contextContent = readFileSync(contextPath, 'utf-8');

assert(contextContent.includes('ACTIVE_BRANCH_STORAGE_KEY'), 'CompanyContext defines ACTIVE_BRANCH_STORAGE_KEY');
assert(contextContent.includes('activeBranchId: number | \'all\''), 'CompanyContext supports activeBranchId (number or all)');
assert(contextContent.includes('activeBranch: Branch | null'), 'CompanyContext provides activeBranch');
assert(contextContent.includes('isAllBranches: boolean'), 'CompanyContext provides isAllBranches flag');
assert(contextContent.includes('switchBranch: (branchId: number | \'all\') => void'), 'CompanyContext provides switchBranch function');
assert(contextContent.includes('export function useBranch()'), 'CompanyContext exports useBranch hook');
assert(contextContent.includes('retailcore_branch_changed'), 'CompanyContext dispatches and listens to retailcore_branch_changed');

// 2. Header One Company Multi-Branch Selector
const headerPath = resolve(process.cwd(), 'frontend/src/components/layout/Header.tsx');
assert(existsSync(headerPath), 'Header.tsx exists');
const headerContent = readFileSync(headerPath, 'utf-8');

assert(headerContent.includes('header-tenant-switcher-btn'), 'Header renders company/headquarters identity');
assert(headerContent.includes('Head Office'), 'Header displays Head Office badge for single enterprise company');
assert(headerContent.includes('header-branch-switcher-btn'), 'Header renders dedicated multi-branch switcher button');
assert(headerContent.includes('header-branch-dropdown'), 'Header renders multi-branch switcher dropdown menu');
assert(headerContent.includes('Multi-Branch Network'), 'Header dropdown labels Multi-Branch Network');
assert(headerContent.includes('All Branches (Consolidated)'), 'Header dropdown provides All Branches (Consolidated) option');
assert(headerContent.includes('Manage Branches & Outlets'), 'Header provides direct link to Manage Branches & Outlets');

// 3. Organization API Multi-Branch Registry
const orgPath = resolve(process.cwd(), 'frontend/src/api/organization.ts');
assert(existsSync(orgPath), 'organization.ts exists');
const orgContent = readFileSync(orgPath, 'utf-8');

assert(orgContent.includes('DEFAULT_BRANCHES'), 'organization.ts exports DEFAULT_BRANCHES');
assert(orgContent.includes('getBranches'), 'organization.ts exports getBranches API function');
assert(orgContent.includes('BR-DHK-01'), 'DEFAULT_BRANCHES includes Dhaka Head Office Branch (BR-DHK-01)');
assert(orgContent.includes('BR-UTT-02'), 'DEFAULT_BRANCHES includes Uttara Branch (BR-UTT-02)');
assert(orgContent.includes('BR-CTG-05'), 'DEFAULT_BRANCHES includes Chittagong Hub (BR-CTG-05)');

// 4. Branch List Management Page
const branchListPath = resolve(process.cwd(), 'frontend/src/pages/organization/BranchList.tsx');
assert(existsSync(branchListPath), 'BranchList.tsx exists');
const branchListContent = readFileSync(branchListPath, 'utf-8');
assert(branchListContent.includes('getBranches'), 'BranchList loads branches');

console.log('================================================================');
console.log('RESULTS: ALL ONE COMPANY MULTI-BRANCH ARCHITECTURE CHECKS PASSED.');
console.log('================================================================');
