/**
 * Minimal test assertion helpers for POS receipt branding regression tests.
 */

export function assertEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertStrict(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || 'Expected condition to be true');
  }
}

export function assertContains(haystack: string, needle: string, message?: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`${message || 'Assertion failed'}: string "${haystack}" does not contain "${needle}"`);
  }
}

export function assertNotContains(haystack: string, needle: string, message?: string) {
  if (haystack.includes(needle)) {
    throw new Error(`${message || 'Assertion failed'}: string "${haystack}" MUST NOT contain forbidden string "${needle}"`);
  }
}
