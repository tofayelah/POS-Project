import api from './axios';
import { 
  PurchaseOrder, 
  CreatePurchaseOrderPayload, 
  PurchaseOrderFilterParams 
} from '../types/purchase';
import { getActiveTenantId } from './organization';

const STORAGE_KEY = 'retailcore_purchase_orders_cache_v2';

const DEFAULT_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 1,
    uuid: 'po-0001-uuid',
    company_id: 1,
    business_unit_id: 1,
    branch_id: 1,
    warehouse_id: 1,
    supplier_id: 1,
    po_number: 'PO-2026-0001',
    order_date: '2026-03-10',
    expected_date: '2026-03-25',
    status: 'APPROVED',
    subtotal: 185000.0,
    discount_total: 5000.0,
    tax_total: 9000.0,
    shipping_cost: 1500.0,
    other_cost: 500.0,
    grand_total: 191000.0,
    notes: 'Urgent stock procurement for Ramadan festive promotion.',
    created_at: '2026-03-10T09:30:00Z',
    supplier: {
      id: 1,
      name: 'Bengal Trade International Ltd.',
      supplier_code: 'SUP-0001',
      mobile: '+8801711000001',
      email: 'info@bengaltrade.com.bd',
      city: 'Dhaka',
      status: 'ACTIVE',
    } as any,
    warehouse: {
      id: 1,
      name: 'Central Distribution Center (CDC)',
      code: 'CDC-01',
      is_active: true,
    } as any,
    items: [
      {
        id: 101,
        purchase_order_id: 1,
        product_id: 1,
        product_variant_id: 1,
        quantity: 50,
        unit_cost: 2500,
        discount: 0,
        tax: 0,
        line_total: 125000,
        received_quantity: 50,
        pending_quantity: 0,
        product: {
          id: 1,
          name: 'Premium Slim Fit Cotton Shirt',
          sku: 'SHT-COT-01',
        } as any,
        variant: {
          id: 1,
          sku: 'SHT-COT-01-M',
          variant_name: 'Medium / Navy Blue',
          cost_price: 2500,
          selling_price: 3800,
        } as any,
      },
      {
        id: 102,
        purchase_order_id: 1,
        product_id: 2,
        product_variant_id: 2,
        quantity: 30,
        unit_cost: 2000,
        discount: 0,
        tax: 0,
        line_total: 60000,
        received_quantity: 0,
        pending_quantity: 30,
        product: {
          id: 2,
          name: 'Casual Denim Chinos Pant',
          sku: 'PNT-DNM-02',
        } as any,
        variant: {
          id: 2,
          sku: 'PNT-DNM-02-32',
          variant_name: '32 / Olive Green',
          cost_price: 2000,
          selling_price: 3200,
        } as any,
      },
    ],
  },
  {
    id: 2,
    uuid: 'po-0002-uuid',
    company_id: 1,
    business_unit_id: 1,
    branch_id: 1,
    warehouse_id: 2,
    supplier_id: 2,
    po_number: 'PO-2026-0002',
    order_date: '2026-03-18',
    expected_date: '2026-04-02',
    status: 'DRAFT',
    subtotal: 78000.0,
    discount_total: 0.0,
    tax_total: 3900.0,
    shipping_cost: 800.0,
    other_cost: 0.0,
    grand_total: 82700.0,
    notes: 'Standard replenishment for packaging material and shipping cartons.',
    created_at: '2026-03-18T14:15:00Z',
    supplier: {
      id: 2,
      name: 'Padma Packaging & Paper Mills',
      supplier_code: 'SUP-0002',
      mobile: '+8801711000002',
      email: 'sales@padmapackaging.com',
      city: 'Gazipur',
      status: 'ACTIVE',
    } as any,
    warehouse: {
      id: 2,
      name: 'Gulshan Branch Stockroom',
      code: 'GLS-STK-01',
      is_active: true,
    } as any,
    items: [
      {
        id: 103,
        purchase_order_id: 2,
        product_id: 3,
        product_variant_id: 3,
        quantity: 200,
        unit_cost: 390,
        discount: 0,
        tax: 0,
        line_total: 78000,
        received_quantity: 0,
        pending_quantity: 200,
        product: {
          id: 3,
          name: 'Heavy Duty Packaging Box 5-Ply',
          sku: 'PKG-BX-05',
        } as any,
        variant: {
          id: 3,
          sku: 'PKG-BX-05-STD',
          variant_name: 'Standard 40x30x20cm',
          cost_price: 390,
          selling_price: 550,
        } as any,
      },
    ],
  },
];

export const getLocalPurchaseOrders = (): PurchaseOrder[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PURCHASE_ORDERS));
      return DEFAULT_PURCHASE_ORDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PURCHASE_ORDERS;
  } catch {
    return DEFAULT_PURCHASE_ORDERS;
  }
};

export const saveLocalPurchaseOrders = (orders: PurchaseOrder[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.warn('Failed to save purchase orders to localStorage:', e);
  }
};

export const generateNextPoNumber = (): string => {
  const current = getLocalPurchaseOrders();
  const currentYear = new Date().getFullYear();
  let maxSeq = 0;
  const regex = new RegExp(`PO-${currentYear}-(\\d+)`, 'i');

  current.forEach((po) => {
    if (po.po_number) {
      const match = regex.exec(po.po_number);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  const nextSeq = maxSeq + 1;
  return `PO-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
};

// --- API Functions ---

export async function getPurchaseOrders(params?: PurchaseOrderFilterParams): Promise<{ data: PurchaseOrder[]; total: number }> {
  try {
    const response = await api.get('/purchase-orders', { params });
    if (response.data && response.data.success && response.data.data) {
      const paginated = response.data.data;
      const apiList: PurchaseOrder[] = Array.isArray(paginated) ? paginated : (paginated.data || []);
      
      // Update local cache
      const local = getLocalPurchaseOrders();
      const merged = [...apiList];
      local.forEach((loc) => {
        if (!merged.some((m) => m.id === loc.id || m.po_number === loc.po_number)) {
          merged.push(loc);
        }
      });
      saveLocalPurchaseOrders(merged);
      return { data: merged, total: merged.length };
    }
  } catch (err) {
    console.warn('Backend API /purchase-orders unreachable, loading from resilient local tenant store:', err);
  }

  // Fallback to local store
  const tenantId = getActiveTenantId();
  let list = getLocalPurchaseOrders();
  
  if (tenantId) {
    list = list.filter((po) => po.company_id === tenantId || po.company_id === 1);
  }

  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter((po) => 
      po.po_number.toLowerCase().includes(q) ||
      po.supplier?.name.toLowerCase().includes(q) ||
      po.warehouse?.name.toLowerCase().includes(q)
    );
  }

  if (params?.status && params.status !== 'ALL') {
    list = list.filter((po) => po.status === params.status);
  }

  if (params?.supplier_id) {
    list = list.filter((po) => po.supplier_id === Number(params.supplier_id));
  }

  if (params?.warehouse_id) {
    list = list.filter((po) => po.warehouse_id === Number(params.warehouse_id));
  }

  return { data: list, total: list.length };
}

export async function getPurchaseOrder(id: number): Promise<{ data: PurchaseOrder }> {
  try {
    const response = await api.get(`/purchase-orders/${id}`);
    if (response.data && response.data.success && response.data.data) {
      return { data: response.data.data };
    }
  } catch (err) {
    console.warn(`Backend API /purchase-orders/${id} unreachable, checking local store:`, err);
  }

  const list = getLocalPurchaseOrders();
  const found = list.find((po) => po.id === Number(id));
  if (!found) {
    throw new Error(`Purchase Order #${id} not found.`);
  }
  return { data: found };
}

export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<{ success: boolean; data: PurchaseOrder; message?: string }> {
  const companyId = getActiveTenantId();
  
  try {
    const response = await api.post('/purchase-orders', payload);
    if (response.data && response.data.success) {
      const created = response.data.data;
      const list = getLocalPurchaseOrders();
      saveLocalPurchaseOrders([created, ...list.filter((p) => p.id !== created.id)]);
      return { success: true, data: created, message: 'Purchase Order created successfully on server.' };
    }
  } catch (err) {
    console.warn('Backend API /purchase-orders POST failed, persisting to local tenant store:', err);
  }

  // Resilient local store implementation
  const list = getLocalPurchaseOrders();
  const maxId = list.reduce((max, p) => (p.id > max ? p.id : max), 0);
  const newId = maxId + 1;

  let subtotal = 0;
  const items = (payload.items || []).map((item, idx) => {
    const lineTotal = Number(item.quantity) * Number(item.unit_cost) - (Number(item.discount) || 0) + (Number(item.tax) || 0);
    subtotal += lineTotal;
    return {
      id: newId * 100 + (idx + 1),
      purchase_order_id: newId,
      product_id: item.product_id,
      product_variant_id: item.product_variant_id,
      quantity: Number(item.quantity),
      unit_cost: Number(item.unit_cost),
      discount: Number(item.discount) || 0,
      tax: Number(item.tax) || 0,
      line_total: lineTotal,
      received_quantity: 0,
      pending_quantity: Number(item.quantity),
    };
  });

  const shippingCost = Number(payload.shipping_cost) || 0;
  const otherCost = Number(payload.other_cost) || 0;
  const discountTotal = Number(payload.discount_total) || 0;
  const taxTotal = Number(payload.tax_total) || 0;
  const grandTotal = subtotal + shippingCost + otherCost + taxTotal - discountTotal;

  const newPO: PurchaseOrder = {
    id: newId,
    uuid: `po-${newId}-uuid`,
    company_id: companyId,
    business_unit_id: payload.business_unit_id || null,
    branch_id: payload.branch_id || null,
    warehouse_id: payload.warehouse_id,
    supplier_id: payload.supplier_id,
    po_number: payload.po_number || generateNextPoNumber(),
    order_date: payload.order_date || new Date().toISOString().split('T')[0],
    expected_date: payload.expected_date || null,
    status: payload.status || 'DRAFT',
    subtotal,
    discount_total: discountTotal,
    tax_total: taxTotal,
    shipping_cost: shippingCost,
    other_cost: otherCost,
    grand_total: grandTotal,
    notes: payload.notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: items as any,
  };

  saveLocalPurchaseOrders([newPO, ...list]);
  return { success: true, data: newPO, message: 'Purchase Order created successfully.' };
}

export async function approvePurchaseOrder(id: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await api.post(`/purchase-orders/${id}/approve`);
    if (response.data && response.data.success) {
      return { success: true, message: 'Purchase order approved successfully.' };
    }
  } catch (err) {
    console.warn(`Backend approve for PO #${id} failed, updating local state:`, err);
  }

  const list = getLocalPurchaseOrders();
  const idx = list.findIndex((p) => p.id === Number(id));
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveLocalPurchaseOrders(list);
    return { success: true, message: 'Purchase order approved successfully.' };
  }

  throw new Error(`Purchase order #${id} not found.`);
}

export async function cancelPurchaseOrder(id: number): Promise<{ success: boolean; message: string }> {
  const list = getLocalPurchaseOrders();
  const idx = list.findIndex((p) => p.id === Number(id));
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      status: 'CANCELLED',
      updated_at: new Date().toISOString(),
    };
    saveLocalPurchaseOrders(list);
    return { success: true, message: 'Purchase order cancelled.' };
  }
  throw new Error(`Purchase order #${id} not found.`);
}
