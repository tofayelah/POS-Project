/**
 * Brand Auto Unique Code & List Verification Test Suite
 *
 * Verifies:
 * 1. Initial brand list loads with default brands and codes (SAM, APL, SQU, etc.)
 * 2. Sequential auto-code generator creates guaranteed unique codes (e.g. BR-0006)
 * 3. Mnemonic auto-code generator produces clean codes from brand names (e.g. "Unilever" -> "UNI")
 * 4. Collision resolution appends unique counters if abbreviation already exists
 * 5. Creating a brand via createBrand without code auto-assigns unique code and persists to store
 * 6. BrandList.tsx contains auto-unique code indicators, generator action buttons, and KPI banner
 * 7. Table header adheres to required contrast class (bg-slate-100 uppercase text-xs font-bold text-slate-800)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  DEFAULT_BRANDS,
  getStoredBrands,
  saveStoredBrands,
  generateNextBrandCode,
  generateBrandCodeFromName,
  createBrand,
  getBrands,
} from '../api/products';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('--- BRAND AUTO UNIQUE CODE & LIST TEST SUITE ---');
console.log('================================================================');

// 1. Initial Brands & Codes
assert(Array.isArray(DEFAULT_BRANDS) && DEFAULT_BRANDS.length >= 5, 'DEFAULT_BRANDS contains initial seed brands');
const samBrand = DEFAULT_BRANDS.find((b) => b.name === 'Samsung');
assert(samBrand && samBrand.code === 'SAM', 'Samsung brand has initial code SAM');

// 2. Sequential code generation
const nextCode = generateNextBrandCode(DEFAULT_BRANDS);
assert(typeof nextCode === 'string' && nextCode.startsWith('BR-'), `Sequential generator creates valid code (${nextCode})`);

// Mock existing codes to test sequential advancement
const testList = [
  { id: 1, name: 'Brand A', code: 'BR-0001' },
  { id: 2, name: 'Brand B', code: 'BR-0005' },
];
const advancedCode = generateNextBrandCode(testList);
assert(advancedCode === 'BR-0006', `Sequential generator increments from max existing number to BR-0006 (got ${advancedCode})`);

// 3. Name-based abbreviation generation
const codeFromUni = generateBrandCodeFromName('Unilever', DEFAULT_BRANDS);
assert(codeFromUni === 'UNI', `Abbreviation for Unilever is UNI (got ${codeFromUni})`);

const codeFromMulti = generateBrandCodeFromName('British American Tobacco', DEFAULT_BRANDS);
assert(codeFromMulti === 'BAT', `Abbreviation for British American Tobacco is BAT (got ${codeFromMulti})`);

// 4. Collision resolution
const collisionCode = generateBrandCodeFromName('Samsung', DEFAULT_BRANDS);
assert(collisionCode === 'SAM-01', `Collision on SAM resolves to SAM-01 (got ${collisionCode})`);

// 5. Creating brand with auto-generated code
const createdResult = await createBrand({ name: 'Panasonic' });
assert(createdResult.success === true, 'createBrand returns success');
assert(
  createdResult.data && createdResult.data.code && createdResult.data.code.length > 0,
  `createBrand automatically generated unique code (${createdResult.data.code})`
);

// 6. getBrands retrieves newly created brand
const brandsResult = await getBrands({ search: 'Panasonic' });
assert(
  brandsResult.success && brandsResult.data.some((b: any) => b.name === 'Panasonic'),
  'getBrands returns newly created brand with search filter'
);

// 7. Verify BrandList.tsx UI integration
const brandListPath = resolve(process.cwd(), 'frontend/src/pages/products/BrandList.tsx');
assert(existsSync(brandListPath), 'BrandList.tsx exists');

const brandListContent = readFileSync(brandListPath, 'utf-8');
assert(brandListContent.includes('Auto Unique Code'), 'BrandList displays Auto Unique Code badge');
assert(brandListContent.includes('Sequential'), 'BrandList provides Sequential button');
assert(brandListContent.includes('From Name'), 'BrandList provides From Name button');
assert(brandListContent.includes('generateNextBrandCode'), 'BrandList calls generateNextBrandCode');
assert(brandListContent.includes('generateBrandCodeFromName'), 'BrandList calls generateBrandCodeFromName');
assert(
  brandListContent.includes('bg-slate-100 uppercase text-xs font-bold text-slate-800'),
  'BrandList retains required high-contrast table header style'
);
assert(!brandListContent.includes('dark:bg-slate-800'), 'BrandList avoids dark:bg-slate-800 overrides');

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} BRAND AUTO CODE TESTS PASSED.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
