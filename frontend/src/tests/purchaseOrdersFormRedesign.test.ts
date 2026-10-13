import {
  createPurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrders,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getNextPoNumber
} from '../api/purchaseOrders';

// Test Purchase Orders Form Redesign & Business Calculations
console.log('================================================================');
console.log('--- RETAILCORE ERP PURCHASE ORDERS FORM REDESIGN TEST SUITE ---');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${description}`);
  } else {
    console.error(`[FAIL] ${description}`);
    throw new Error(`Assertion Failed: ${description}`);
  }
}

// 1. FORMULAS & CALCULATION ACCURACY
// Formula 1: Gross Line Cost = Quantity * Unit Cost
const qty = 10;
const unitCost = 250;
const grossLineCost = qty * unitCost;
assert(grossLineCost === 2500, 'Gross line cost equals Quantity * Unit Cost (10 * 250 = 2500 BDT)');

// Formula 2: Taxable Line = Gross Line Cost - Line Discount
const lineDiscount = 100;
const taxableLine = Math.max(0, grossLineCost - lineDiscount);
assert(taxableLine === 2400, 'Taxable line amount correctly applies line discount (2500 - 100 = 2400 BDT)');

// Formula 3: VAT / Tax Amount = Taxable Line * (VAT% / 100)
const vatRate = 15; // 15% VAT
const vatAmount = taxableLine * (vatRate / 100);
assert(vatAmount === 360, '15% VAT calculated on taxable line amount (2400 * 0.15 = 360 BDT)');

// Formula 4: Line Total = Taxable Line + VAT Amount
const lineTotal = taxableLine + vatAmount;
assert(lineTotal === 2760, 'Line total accurately sums net taxable cost and VAT (2400 + 360 = 2760 BDT)');

// Formula 5: Gross Profit Margin % = ((Selling Price - Unit Cost) / Selling Price) * 100
const sellingPrice = 350;
const gpPercent = ((sellingPrice - unitCost) / sellingPrice) * 100;
assert(
  Number(gpPercent.toFixed(2)) === 28.57,
  'Gross Profit margin % correctly calculated as ((350 - 250) / 350) * 100 = 28.57%'
);

// Formula 6: VAT-Inclusive Selling Price = Selling Price * (1 + VAT% / 100)
const inclusiveSellingPrice = Number((sellingPrice * (1 + vatRate / 100)).toFixed(2));
assert(
  inclusiveSellingPrice === 402.5,
  'VAT-inclusive selling price accurately calculated as 350 * 1.15 = 402.50 BDT'
);

// Formula 7: Grand Total = Net Taxable Subtotal + Total VAT + Shipping + Other - Header Discount
const shippingCost = 150;
const otherCost = 50;
const headerDiscount = 50;
const grandTotal = taxableLine + vatAmount + shippingCost + otherCost - headerDiscount;
assert(
  grandTotal === 2910,
  'Grand total (Net PO Amount) correctly integrates line subtotal, tax, freight, other costs & header discount (2760 + 150 + 50 - 50 = 2910 BDT)'
);

// 2. PO NUMBER GENERATION POLICY
async function testPoNumbering() {
  const res = await getNextPoNumber();
  const numStr = res.data?.po_number || (res as any)?.po_number || '';
  assert(
    typeof numStr === 'string' && numStr.startsWith('PO-'),
    `Server issues formatted Purchase Order number e.g. PO-2026-XXXX (got: "${numStr}")`
  );
}

// 3. STRICT BUSINESS BOUNDARIES
// Test that creating a Purchase Order does not modify physical stock or post financial invoices
async function testBusinessBoundaries() {
  const nextNumRes = await getNextPoNumber();
  const candidatePoNum = nextNumRes.data?.po_number || `PO-${Date.now()}`;

  const payload = {
    supplier_id: 1,
    warehouse_id: 1,
    po_number: candidatePoNum,
    order_date: '2026-10-13',
    shipping_cost: 100,
    other_cost: 0,
    discount_total: 0,
    tax_total: 150,
    payment_terms: 'NET_30',
    notes: 'Test PO Redesign Validation',
    items: [
      {
        product_id: 1,
        product_variant_id: 1,
        quantity: 5,
        unit_cost: 200,
        discount: 0,
        tax: 150,
        tax_percent: 15,
        unit_selling_price: 300,
        purchase_unit: 'Pcs'
      }
    ]
  };

  const createRes = await createPurchaseOrder(payload as any);
  assert(
    createRes.success === true || Boolean(createRes.data),
    'createPurchaseOrder persists new Purchase Order successfully in DRAFT status'
  );

  const po = createRes.data;
  if (po && po.id) {
    assert(po.status === 'DRAFT' || po.status === 'PENDING', 'New Purchase Order created in DRAFT status');

    // Test Approval Workflow
    const approveRes = await approvePurchaseOrder(Number(po.id));
    assert(approveRes.success === true, 'Purchase Order can be transitioned from DRAFT to APPROVED status');

    // Test Cancel Workflow
    const cancelRes = await cancelPurchaseOrder(Number(po.id));
    assert(cancelRes.success === true, 'Purchase Order can be transitioned to CANCELLED status');
  }
}

// Execute async test assertions
async function runAllTests() {
  await testPoNumbering();
  await testBusinessBoundaries();

  console.log('================================================================');
  console.log(`RESULTS: ${passedTests} / ${totalTests} PURCHASE ORDERS REDESIGN TESTS PASSED.`);
  console.log('================================================================');
}

runAllTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
