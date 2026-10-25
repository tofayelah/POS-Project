import assert from 'assert';
import { 
  getPurchaseOrder, 
  getStoredPurchaseOrders, 
  DEFAULT_PURCHASE_ORDERS, 
  updatePurchaseOrder 
} from '../api/purchaseOrders';
import fs from 'fs';
import path from 'path';

console.log('🧪 Running Purchase Order Edit Data Display Verification Suite...\n');

async function runTests() {
  let passed = 0;

  // 1. Verify PO-2026-5934 exists in DEFAULT_PURCHASE_ORDERS
  const defaultPo5934 = DEFAULT_PURCHASE_ORDERS.find(p => p.po_number === 'PO-2026-5934');
  assert(defaultPo5934, 'PO-2026-5934 should be present in DEFAULT_PURCHASE_ORDERS');
  assert.strictEqual(defaultPo5934.po_number, 'PO-2026-5934');
  assert(defaultPo5934.items && defaultPo5934.items.length > 0, 'PO-2026-5934 should have populated items');
  console.log('✅ 1. PO-2026-5934 is defined in DEFAULT_PURCHASE_ORDERS with items');
  passed++;

  // 2. Verify getStoredPurchaseOrders includes PO-2026-5934 and PO-2026-5933
  const storedList = getStoredPurchaseOrders();
  const found5934InStored = storedList.find(p => p.po_number === 'PO-2026-5934');
  const found5933InStored = storedList.find(p => p.po_number === 'PO-2026-5933');
  assert(found5934InStored, 'PO-2026-5934 must be present in getStoredPurchaseOrders()');
  assert(found5933InStored, 'PO-2026-5933 must be present in getStoredPurchaseOrders()');
  console.log('✅ 2. getStoredPurchaseOrders() guarantees both PO-2026-5933 and PO-2026-5934');
  passed++;

  // 3. Verify getPurchaseOrder by PO Number string ('PO-2026-5934')
  const resByPoNum = await getPurchaseOrder('PO-2026-5934');
  assert(resByPoNum.data, 'Result data must be present for PO-2026-5934');
  assert.strictEqual(resByPoNum.data.po_number, 'PO-2026-5934');
  assert(resByPoNum.data.items && resByPoNum.data.items.length > 0, 'PO-2026-5934 items must not be empty');
  assert.strictEqual(resByPoNum.data.supplier_id, 1);
  assert(Number(resByPoNum.data.grand_total) > 0, 'Grand total must be greater than 0');
  console.log('✅ 3. getPurchaseOrder("PO-2026-5934") returns full order data with items and totals');
  passed++;

  // 4. Verify getPurchaseOrder by case-insensitive PO Number ('po-2026-5934')
  const resByLower = await getPurchaseOrder('po-2026-5934');
  assert.strictEqual(resByLower.data.po_number, 'PO-2026-5934');
  assert(resByLower.data.items.length > 0, 'Items must be populated on case-insensitive match');
  console.log('✅ 4. getPurchaseOrder("po-2026-5934") case-insensitive lookup succeeds');
  passed++;

  // 5. Verify getPurchaseOrder by numeric ID (103)
  const resById = await getPurchaseOrder(103);
  assert.strictEqual(resById.data.po_number, 'PO-2026-5934');
  assert.strictEqual(resById.data.id, 103);
  assert(resById.data.items.length > 0, 'Items must be populated when querying by id 103');
  console.log('✅ 5. getPurchaseOrder(103) returns PO-2026-5934 correctly');
  passed++;

  // 6. Verify getPurchaseOrder by string numeric ID ('103')
  const resByStrId = await getPurchaseOrder('103');
  assert.strictEqual(resByStrId.data.po_number, 'PO-2026-5934');
  console.log('✅ 6. getPurchaseOrder("103") string ID returns PO-2026-5934 correctly');
  passed++;

  // 7. Verify updatePurchaseOrder retains product details and updates items
  const updateRes = await updatePurchaseOrder('PO-2026-5934', {
    supplier_id: 1,
    warehouse_id: 1,
    po_number: 'PO-2026-5934',
    order_date: '2026-10-14',
    items: [
      {
        product_id: 1,
        product_variant_id: 1,
        product_name: 'Samsung Galaxy A54 5G',
        variant_name: 'Awesome Black (128GB/8GB)',
        sku: 'SAM-A54-128-BLK',
        barcode: 'SBD-609012345',
        quantity: 5,
        unit_cost: 32000,
        discount: 0,
        tax: 1200,
        tax_percent: 0.75,
        unit_selling_price: 36000,
        gp_percent: 11.11,
        purchase_unit: 'Pcs',
        line_total: 161200,
        item_note: 'Updated quantity test'
      } as any
    ]
  });
  assert(updateRes.success, 'Update must report success');
  assert.strictEqual(updateRes.data?.items[0].quantity, 5);
  assert.strictEqual(updateRes.data?.items[0].product_name, 'Samsung Galaxy A54 5G');
  console.log('✅ 7. updatePurchaseOrder preserves rich item metadata');
  passed++;

  // 8. Verify PurchaseOrderForm.tsx source does not do Number(id) which caused NaN failure
  const formPath = path.join(process.cwd(), 'frontend/src/pages/purchase/PurchaseOrderForm.tsx');
  const formFile = fs.readFileSync(formPath, 'utf8');
  assert(!formFile.includes('getPurchaseOrder(Number(id))'), 'PurchaseOrderForm must not convert id to Number(id) which yields NaN for PO-2026-5934');
  assert(formFile.includes('getPurchaseOrder(id)'), 'PurchaseOrderForm must pass id directly to getPurchaseOrder');
  console.log('✅ 8. PurchaseOrderForm.tsx safely loads PO using id directly');
  passed++;

  // 9. Verify PurchaseOrderList.tsx uses po.id || po.po_number for route navigation
  const listPath = path.join(process.cwd(), 'frontend/src/pages/purchase/PurchaseOrderList.tsx');
  const listFile = fs.readFileSync(listPath, 'utf8');
  assert(listFile.includes('po.id || po.po_number'), 'PurchaseOrderList must use po.id || po.po_number for edit links/buttons');
  console.log('✅ 9. PurchaseOrderList.tsx supports navigation by either id or po_number');
  passed++;

  // 10. Verify backend controller supports string PO numbers and numeric IDs
  const backendPath = path.join(process.cwd(), 'backend/app/Http/Controllers/Api/V1/PurchaseOrderController.php');
  const backendCtrl = fs.readFileSync(backendPath, 'utf8');
  assert(backendCtrl.includes('findPoByCompany'), 'PurchaseOrderController must implement findPoByCompany helper');
  assert(backendCtrl.includes("'po_number', $id"), 'PurchaseOrderController must support lookup by po_number');
  console.log('✅ 10. Backend PurchaseOrderController supports lookup by both numeric ID and po_number');
  passed++;

  console.log(`\n🎉 All ${passed} tests passed successfully!`);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
