/**
 * RetailCore ERP — Supplier Performance Scorecard Safety & Fallback Verification Suite
 */

import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('================================================================');
console.log('--- SUPPLIER PERFORMANCE SCORECARD SAFETY TEST SUITE ---');
console.log('================================================================');

let passed = 0;
let failed = 0;

async function it(desc: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`[PASS] ${desc}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${desc}: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  const perfPath = resolve(process.cwd(), 'frontend/src/pages/procurement/SupplierPerformance.tsx');
  const vitePath = resolve(process.cwd(), 'vite.config.ts');
  const perfContent = readFileSync(perfPath, 'utf8');
  const viteContent = readFileSync(vitePath, 'utf8');

  await it('SupplierPerformance.tsx exists and is readable', () => {
    assert(existsSync(perfPath), 'SupplierPerformance.tsx must exist');
  });

  await it('SupplierPerformance.tsx implements safe metrics fallback guard', () => {
    assert(perfContent.includes('const metrics = scorecard.metrics || {'), 'Must define fallback metrics object');
    assert(perfContent.includes('metrics.composite_score'), 'Must read composite_score safely through guarded metrics');
    assert(perfContent.includes('metrics.on_time_delivery_rate'), 'Must read on_time_delivery_rate through guarded metrics');
  });

  await it('SupplierPerformance.tsx fetchScorecard guards against array or missing metrics in API response', () => {
    assert(perfContent.includes('!Array.isArray(res.data)'), 'Must check !Array.isArray(res.data)');
    assert(perfContent.includes('(res.data as any).metrics'), 'Must check (res.data as any).metrics');
  });

  await it('vite.config.ts implements explicit mock for /api/v1/suppliers/:id/performance', () => {
    assert(viteContent.includes('/api/v1/suppliers/:id/performance'), 'Must handle supplier performance in vite.config.ts');
    assert(viteContent.includes('composite_score: 91.5'), 'Must return valid composite_score in mock data');
  });

  await it('vite.config.ts implements mock for /procurement/supplier-rankings', () => {
    assert(viteContent.includes('/procurement/supplier-rankings'), 'Must handle supplier rankings in vite.config.ts');
  });

  console.log('================================================================');
  console.log(`RESULTS: ${passed} / ${passed + failed} TESTS PASSED.`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests();
