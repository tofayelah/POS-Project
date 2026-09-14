import { describe, it, expect } from 'vitest';

describe('Variant Validation', () => {
  it('detects duplicate variant combinations in frontend builder', () => {
    // Mock the variant builder state
    const variants = [
      { variant_name: 'Black / 32', attribute_value_ids: [1, 2], sku: 'SKU1' },
      { variant_name: 'Black / 32 (Duplicate)', attribute_value_ids: [2, 1], sku: 'SKU2' }
    ];

    const findDuplicates = (vars: any[]) => {
      const signatures = new Set();
      const duplicates = [];
      for (const v of vars) {
        const sig = [...v.attribute_value_ids].sort().join('-');
        if (signatures.has(sig)) {
          duplicates.push(v);
        }
        signatures.add(sig);
      }
      return duplicates;
    };

    const duplicates = findDuplicates(variants);
    expect(duplicates.length).toBe(1);
    expect(duplicates[0].sku).toBe('SKU2');
  });
});
