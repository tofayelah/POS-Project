import { ReceiptData } from '../components/pos/ThermalReceipt';

export type ReceiptPaperSize = '58mm' | '80mm' | 'a4';

/**
 * Triggers thermal / A4 receipt printing via browser window.print() safely.
 * Does not make network requests, duplicate payments, or alter financial/inventory state.
 */
export function triggerThermalPrint(_receiptData?: ReceiptData, _paperSize: ReceiptPaperSize = '80mm'): boolean {
  try {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.warn('Browser print failed:', e);
        }
      }, 100);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Thermal print failed:', err);
    return false;
  }
}
