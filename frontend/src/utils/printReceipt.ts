import { ReceiptData } from '../components/pos/ThermalReceipt';

/**
 * Triggers 80mm thermal receipt printing via browser window.print()
 */
export function triggerThermalPrint(receiptData: ReceiptData): void {
  // Ensure DOM is ready and window.print is called safely
  try {
    // Brief delay to allow React print state render if required
    setTimeout(() => {
      window.print();
    }, 100);
  } catch (err) {
    console.error('Thermal print failed:', err);
  }
}
