/**
 * Utility functions for Supplier management in RetailCore ERP
 */

/**
 * Generates an abbreviation suggestion for a supplier name according to RetailCore business rules:
 * 1. Split the supplier name into words.
 * 2. Multiword names: generate an abbreviation from each word (e.g. "TM International" -> "TMI").
 *    Acronym tokens like "TM" retain all their letters.
 * 3. Single-word names: suggest first three letters in uppercase (e.g. "Square" -> "SQU", "Akij" -> "AKI").
 * 4. Normalizes whitespace and punctuation.
 */
export function generateSupplierShortName(name: string): string {
  if (!name || !name.trim()) {
    return '';
  }

  // Normalize whitespace and replace punctuation with spaces
  const cleaned = name.trim().replace(/[^\p{L}\p{N}\s-]/gu, ' ');
  const words = cleaned.split(/[\s-]+/).filter(Boolean);

  if (words.length === 0) {
    return '';
  }

  // Single word: use first 3 characters
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  // Multiword: combine initial letters or acronyms
  let result = '';
  for (const word of words) {
    // If word is an uppercase acronym (2-4 uppercase characters, e.g. TM, IBM, IT)
    if (word.length >= 2 && word.length <= 4 && word === word.toUpperCase() && /^[A-Z0-9]+$/.test(word)) {
      result += word;
    } else {
      const firstChar = word.charAt(0);
      if (/[a-zA-Z0-9\p{L}]/u.test(firstChar)) {
        result += firstChar.toUpperCase();
      }
    }
  }

  return result.slice(0, 10);
}

/**
 * Format currency in Bangladeshi Taka (৳)
 */
export function formatBDT(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '৳0.00';
  }
  return `৳${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
