import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const MOCK_BI_EXECUTIVE = {
  primary_kpis: {
    revenue: 125400.00,
    cogs: 68970.00,
    gross_profit: 56430.00,
    gross_margin_pct: 45.0,
    operating_expenses: 18200.00,
    ebitda: 38230.00,
    net_profit: 32500.00,
    net_margin_pct: 25.9,
    cash_balance: 84200.00,
    ar_outstanding: 14500.00,
    ap_outstanding: 9800.00,
    inventory_valuation: 112000.00,
  },
  sales_kpis: {
    today_sales: 4850.00,
    yesterday_sales: 4200.00,
    growth_today_pct: 15.5,
    mtd_sales: 68400.00,
    prev_mtd_sales: 58200.00,
    growth_mtd_pct: 17.5,
    aov: 85.20,
    transactions: 802,
    average_basket_size: 3.4,
  },
  sales_trend: [
    { label: 'Mon', revenue: 8200, profit: 3600 },
    { label: 'Tue', revenue: 9400, profit: 4100 },
    { label: 'Wed', revenue: 10500, profit: 4800 },
    { label: 'Thu', revenue: 11200, profit: 5100 },
    { label: 'Fri', revenue: 14800, profit: 6700 },
    { label: 'Sat', revenue: 18500, profit: 8200 },
    { label: 'Sun', revenue: 15900, profit: 7100 },
  ],
  category_breakdown: [
    { category: 'Electronics', sales: 48500, percentage: 38.6 },
    { category: 'Apparel & Fashion', sales: 32400, percentage: 25.8 },
    { category: 'Home & Grocery', sales: 24500, percentage: 19.5 },
    { category: 'Health & Beauty', sales: 20000, percentage: 16.1 },
  ],
  channel_performance: [
    { channel: 'POS Storefront', sales: 78500, orders: 920 },
    { channel: 'E-Commerce Online', sales: 34200, orders: 410 },
    { channel: 'Wholesale B2B', sales: 12700, orders: 35 },
  ],
  top_products: [
    { name: 'Wireless Bluetooth Headphones', quantity: 240, revenue: 12000 },
    { name: 'Smart Fitness Watch', quantity: 180, revenue: 16200 },
    { name: 'Ergonomic Mechanical Keyboard', quantity: 150, revenue: 13500 },
    { name: 'USB-C Fast Charging Cable', quantity: 510, revenue: 5100 },
  ],
  inventory_alerts: {
    low_stock_count: 8,
    out_of_stock_count: 2,
    overstock_count: 4,
    expired_count: 0,
  },
  recent_activities: [
    { time: '10 mins ago', title: 'POS Sale Completed', description: 'Terminal #1 processed order $124.50' },
    { time: '35 mins ago', title: 'Stock Receipt Verified', description: 'GRN #8080 received at Main Warehouse' },
    { time: '1 hour ago', title: 'Invoice Paid', description: 'Supplier Apex Wholesale payment posted $1,250' },
  ],
};

const INITIAL_MOCK_SUPPLIERS = [
  {
    id: 1,
    supplier_code: 'SUP-0001',
    name: 'TM International',
    short_name: 'TMI',
    mobile: '01711000001',
    address: '12 Motijheel C/A, Dhaka-1000',
    contact_person: 'Tariq Mahmood',
    contact_designation: 'Managing Director',
    contact_phone: '01711000001',
    tax_number: 'BIN-001928374-0101',
    bank_name: 'Eastern Bank PLC',
    bank_account_no: '1041010098765',
    bank_branch: 'Principal Branch, Dhaka',
    notes: 'Primary pharmaceutical and FMCG partner. Standard 30-day payment term.',
    status: 'ACTIVE',
    current_balance: 12500,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 2,
    supplier_code: 'SUP-0002',
    name: 'Square Pharmaceuticals Ltd',
    short_name: 'SQU',
    mobile: '01811000002',
    address: 'Square Centre, 48 Mohakhali C/A, Dhaka-1212',
    contact_person: 'Kamrul Hasan',
    contact_designation: 'Key Account Manager',
    contact_phone: '01811000002',
    tax_number: 'BIN-002847192-0202',
    bank_name: 'Standard Chartered Bank',
    bank_account_no: '0182746192801',
    bank_branch: 'Gulshan Branch',
    notes: 'Bulk healthcare & medicine procurement contract.',
    status: 'ACTIVE',
    current_balance: 45000,
    created_at: '2026-10-02T11:30:00Z',
    updated_at: '2026-10-02T11:30:00Z',
  },
  {
    id: 3,
    supplier_code: 'SUP-0003',
    name: 'Apex Footwear & Leather',
    short_name: 'AFL',
    mobile: '01911000003',
    address: 'House 6, Road 137, Gulshan-1, Dhaka',
    contact_person: 'Rafiqul Islam',
    contact_designation: 'Supply Chain Head',
    contact_phone: '01911000003',
    tax_number: 'BIN-003918274-0303',
    bank_name: 'Dutch-Bangla Bank PLC',
    bank_account_no: '1151200039182',
    bank_branch: 'Mohakhali Branch',
    notes: 'Footwear & leather goods accessories partner.',
    status: 'ACTIVE',
    current_balance: 0,
    created_at: '2026-10-03T14:15:00Z',
    updated_at: '2026-10-03T14:15:00Z',
  },
];

let devSuppliersStore: any[] = [...INITIAL_MOCK_SUPPLIERS];

const INITIAL_MOCK_CATEGORIES = [
  {
    id: 1,
    name: 'Electronics',
    code: 'ELEC',
    slug: 'electronics',
    parent_id: null,
    products_count: 14,
    status: 'active',
    description: 'Consumer and commercial electronic devices',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 2,
    name: 'Smart Devices & Gadgets',
    code: 'SMART',
    slug: 'smart-gadgets',
    parent_id: 1,
    parent: { id: 1, name: 'Electronics' },
    products_count: 8,
    status: 'active',
    description: 'Smartphones, wearables, audio gear',
    created_at: '2026-10-01T10:30:00Z',
    updated_at: '2026-10-01T10:30:00Z',
  },
  {
    id: 3,
    name: 'Apparel & Fashion',
    code: 'APPAR',
    slug: 'apparel-fashion',
    parent_id: null,
    products_count: 22,
    status: 'active',
    description: 'Men, women, and kids garments',
    created_at: '2026-10-02T11:00:00Z',
    updated_at: '2026-10-02T11:00:00Z',
  },
  {
    id: 4,
    name: 'Footwear & Shoes',
    code: 'FOOT',
    slug: 'footwear-shoes',
    parent_id: 3,
    parent: { id: 3, name: 'Apparel & Fashion' },
    products_count: 12,
    status: 'active',
    description: 'Leather shoes, sneakers, and sandals',
    created_at: '2026-10-02T11:30:00Z',
    updated_at: '2026-10-02T11:30:00Z',
  },
  {
    id: 5,
    name: 'Food & Groceries',
    code: 'GROC',
    slug: 'food-groceries',
    parent_id: null,
    products_count: 35,
    status: 'active',
    description: 'Packaged foods, beverages, and pantry essentials',
    created_at: '2026-10-03T12:00:00Z',
    updated_at: '2026-10-03T12:00:00Z',
  },
  {
    id: 6,
    name: 'Health & Beauty',
    code: 'BEAUTY',
    slug: 'health-beauty',
    parent_id: null,
    products_count: 19,
    status: 'active',
    description: 'Skincare, personal care, and wellness items',
    created_at: '2026-10-04T09:00:00Z',
    updated_at: '2026-10-04T09:00:00Z',
  },
  {
    id: 7,
    name: 'Baby Care',
    code: 'BABY',
    slug: 'baby-care',
    parent_id: null,
    products_count: 6,
    status: 'active',
    description: 'Diapers, infant nutrition, baby accessories',
    created_at: '2026-10-05T14:00:00Z',
    updated_at: '2026-10-05T14:00:00Z',
  },
];
let devCategoriesStore: any[] = [...INITIAL_MOCK_CATEGORIES];

const INITIAL_MOCK_BRANDS = [
  { id: 1, name: 'Samsung', code: 'SAM', products_count: 8, status: 'active' },
  { id: 2, name: 'Apple', code: 'APL', products_count: 6, status: 'active' },
  { id: 3, name: 'Square', code: 'SQU', products_count: 14, status: 'active' },
  { id: 4, name: 'Apex', code: 'APX', products_count: 10, status: 'active' },
  { id: 5, name: 'Nestle', code: 'NES', products_count: 12, status: 'active' },
];
let devBrandsStore: any[] = [...INITIAL_MOCK_BRANDS];

const INITIAL_MOCK_UNITS = [
  { id: 1, name: 'Piece', short_code: 'PCS', symbol: 'pcs', decimal_allowed: false },
  { id: 2, name: 'Kilogram', short_code: 'KG', symbol: 'kg', decimal_allowed: true },
  { id: 3, name: 'Box', short_code: 'BOX', symbol: 'box', decimal_allowed: false },
  { id: 4, name: 'Liter', short_code: 'LTR', symbol: 'L', decimal_allowed: true },
];
let devUnitsStore: any[] = [...INITIAL_MOCK_UNITS];

const INITIAL_MOCK_ATTRIBUTES = [
  {
    id: 1,
    name: 'Size',
    code: 'SIZE',
    values: [
      { id: 1, attribute_id: 1, value: 'Small', code: 'S' },
      { id: 2, attribute_id: 1, value: 'Medium', code: 'M' },
      { id: 3, attribute_id: 1, value: 'Large', code: 'L' },
      { id: 4, attribute_id: 1, value: 'Extra Large', code: 'XL' },
    ],
  },
  {
    id: 2,
    name: 'Color',
    code: 'COLOR',
    values: [
      { id: 5, attribute_id: 2, value: 'Black', code: 'BLK' },
      { id: 6, attribute_id: 2, value: 'White', code: 'WHT' },
      { id: 7, attribute_id: 2, value: 'Blue', code: 'BLU' },
      { id: 8, attribute_id: 2, value: 'Red', code: 'RED' },
    ],
  },
  {
    id: 3,
    name: 'Volume',
    code: 'VOL',
    values: [
      { id: 9, attribute_id: 3, value: '150ml', code: '150ML' },
      { id: 10, attribute_id: 3, value: '240ml', code: '240ML' },
      { id: 11, attribute_id: 3, value: '300ml', code: '300ML' },
    ],
  },
];
let devAttributesStore: any[] = [...INITIAL_MOCK_ATTRIBUTES];

export default defineConfig({
  root: './frontend',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'api-mock-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url.startsWith('/api/v1') || req.url.startsWith('/api/v2'))) {
            // Handle /api/v2/health or /api/v1/v2/health
            if (req.url.includes('/v2/health')) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: {
                  system: 'RetailCore POS_ERP',
                  version: '2.0.0-step1',
                  api_version: 'v2',
                  status: 'healthy',
                  database: 'connected',
                  architecture: {
                    framework: 'Laravel 12 / React 19',
                    tenant_isolation: 'enabled',
                    rbac_engine: 'active',
                    accounting_engine: 'double_entry_ledger',
                    inventory_engine: 'immutable_stock_movement',
                  },
                  timestamp: new Date().toISOString(),
                },
              }));
              return;
            }

            // Handle /api/v2/system/status or /api/v1/v2/system/status
            if (req.url.includes('/v2/system/status')) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: {
                  environment: 'production',
                  v2_foundation: {
                    step: 1,
                    name: 'RetailCore V2 Step 1 Foundation',
                    status: 'ACTIVE',
                    installed_at: '2026-09-16T00:00:00Z',
                  },
                  github: {
                    repository: 'tofayelah/POS-Project',
                    branch: 'main',
                    commit: 'v2-step',
                    commit_full: 'v2-step1-foundation',
                    status: 'connected',
                  },
                  live: {
                    environment: 'PRODUCTION',
                    commit: 'v2-step',
                    backend: {
                      status: 'healthy',
                      version: '2.0.0-step1',
                      api_version: 'v2',
                    },
                    frontend: {
                      status: 'healthy',
                      version: '2.0.0-step1',
                    },
                    database: {
                      status: 'healthy',
                    },
                  },
                  comparison: {
                    github_vs_live: 'UP_TO_DATE',
                    backend_vs_frontend: 'SYNCHRONIZED',
                  },
                  checked_at: new Date().toISOString(),
                },
              }));
              return;
            }

            // Handle /api/v2/system/capabilities or /api/v1/v2/system/capabilities
            if (req.url.includes('/v2/system/capabilities')) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: {
                  v2_spec: 'Step 1 Foundation',
                  capabilities: {
                    product_master_v2: true,
                    pos_workflow_v2: true,
                    multi_tenant_rbac: true,
                    immutable_inventory_ledger: true,
                    double_entry_accounting: true,
                    procurement_matching_3way: true,
                    bi_analytics_dashboard: true,
                    unified_light_theme: true,
                  },
                  modules: [
                    'POS', 'Inventory', 'Procurement', 'Finance', 'CRM',
                    'E-Commerce', 'HR', 'BI & Analytics', 'Tax & Compliance',
                  ],
                },
              }));
              return;
            }

            // Handle /api/v1/login
            if (req.url.includes('/login') && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', () => {
                let parsed: { email?: string } = {};
                try { parsed = JSON.parse(body); } catch {}
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  message: 'Login successful',
                  token: 'mock-jwt-token-12345',
                  user: {
                    id: 1,
                    name: parsed.email ? parsed.email.split('@')[0] : 'Admin User',
                    email: parsed.email || 'admin@retailcore.com',
                    roles: [{ id: 1, name: 'Super Admin' }],
                    permissions: ['*'],
                  },
                }));
              });
              return;
            }

            // Handle /api/v1/me
            if (req.url.includes('/me') && req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: {
                  id: 1,
                  name: 'Admin User',
                  email: 'admin@retailcore.com',
                  roles: [{ id: 1, name: 'Super Admin' }],
                  permissions: ['*'],
                },
              }));
              return;
            }

            // Handle /api/v1/logout
            if (req.url.includes('/logout') && req.method === 'POST') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Logged out' }));
              return;
            }

            // Handle /api/v1/system/status
            if (req.url.includes('/system/status')) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: {
                  status: 'healthy',
                  version: 'v2.0.0',
                  environment: 'development',
                  db_status: 'connected',
                },
              }));
              return;
            }

            // Handle /api/v1/bi/dashboard/executive
            if (req.url.includes('/bi/dashboard/executive')) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'success',
                data: MOCK_BI_EXECUTIVE,
              }));
              return;
            }

            // Handle /api/v1/suppliers/next-code
            if (req.url.includes('/suppliers/next-code') && req.method === 'GET') {
              let maxNum = 0;
              for (const s of devSuppliersStore) {
                if (s.supplier_code) {
                  const m = s.supplier_code.match(/^SUP-(\d+)$/i);
                  if (m) {
                    const n = parseInt(m[1], 10);
                    if (n > maxNum) maxNum = n;
                  }
                }
              }
              const nextCode = `SUP-${String(maxNum + 1).padStart(4, '0')}`;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: { supplier_code: nextCode },
              }));
              return;
            }

            // Handle /api/v1/suppliers/:id/balance
            const balanceMatch = req.url.match(/\/api\/v1\/suppliers\/(\d+)\/balance/);
            if (balanceMatch && req.method === 'GET') {
              const supId = parseInt(balanceMatch[1], 10);
              const found = devSuppliersStore.find((s) => s.id === supId);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: {
                  supplier_id: supId,
                  supplier_code: found ? found.supplier_code : `SUP-${String(supId).padStart(4, '0')}`,
                  name: found ? found.name : 'Supplier',
                  opening_balance: 0,
                  total_purchases: 0,
                  total_paid: 0,
                  balance: found?.current_balance || 0,
                },
              }));
              return;
            }

            // Handle /api/v1/suppliers/:id/performance
            const perfMatch = req.url.match(/\/api\/v1\/suppliers\/(\d+)\/performance/);
            if (perfMatch && req.method === 'GET') {
              const supId = parseInt(perfMatch[1], 10);
              const found = devSuppliersStore.find((s) => s.id === supId) || devSuppliersStore[0];
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: {
                  id: found?.id || supId,
                  supplier_id: found?.id || supId,
                  supplier_code: found?.supplier_code || `SUP-${String(supId).padStart(4, '0')}`,
                  supplier_name: found?.name || 'Selected Supplier',
                  qualification_status: (found as any)?.qualification_status || 'QUALIFIED',
                  risk_rating: (found as any)?.risk_rating || 'LOW',
                  agreed_lead_time_days: 7,
                  metrics: {
                    composite_score: 91.5,
                    on_time_delivery_rate: 95.0,
                    fill_rate: 98.2,
                    quality_acceptance_rate: 99.1,
                    price_stability_rate: 94.0,
                    total_orders_count: 18,
                    total_spend: 245000,
                    outstanding_balance: Number(found?.current_balance) || 12500,
                    average_actual_lead_time_days: 4.8,
                  },
                },
              }));
              return;
            }

            // Handle /api/v1/suppliers/:id/recalculate-score
            const recalcMatch = req.url.match(/\/api\/v1\/suppliers\/(\d+)\/recalculate-score/);
            if (recalcMatch && req.method === 'POST') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                message: 'Supplier score recalculated successfully',
                data: { score_cached: 93.0 },
              }));
              return;
            }

            // Handle /api/v1/suppliers/:id/qualification
            const qualMatch = req.url.match(/\/api\/v1\/suppliers\/(\d+)\/qualification/);
            if (qualMatch && req.method === 'POST') {
              let body = '';
              req.on('data', (c) => { body += c; });
              req.on('end', () => {
                let parsed: any = {};
                try { parsed = JSON.parse(body); } catch {}
                const supId = parseInt(qualMatch[1], 10);
                const idx = devSuppliersStore.findIndex((s) => s.id === supId);
                if (idx !== -1 && parsed.qualification_status) {
                  (devSuppliersStore[idx] as any).qualification_status = parsed.qualification_status;
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  message: 'Qualification updated successfully',
                  data: devSuppliersStore[idx] || {},
                }));
              });
              return;
            }

            // Handle /api/v1/procurement/supplier-rankings
            if (req.url.includes('/procurement/supplier-rankings') && req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                status: 'success',
                data: devSuppliersStore.map((s, idx) => ({
                  id: s.id,
                  name: s.name,
                  code: s.supplier_code,
                  qualification_status: (s as any).qualification_status || 'QUALIFIED',
                  risk_rating: idx === 0 ? 'LOW' : idx === 1 ? 'LOW' : 'MEDIUM',
                  score: idx === 0 ? 94.5 : idx === 1 ? 89.0 : 82.5,
                  otd_rate: idx === 0 ? 98.0 : idx === 1 ? 92.5 : 85.0,
                  fill_rate: idx === 0 ? 99.0 : idx === 1 ? 96.0 : 90.0,
                  total_spend: idx === 0 ? 350000 : idx === 1 ? 210000 : 85000,
                  outstanding_balance: Number(s.current_balance) || 0,
                })),
              }));
              return;
            }

            // Handle /api/v1/suppliers/:id (GET, PUT, DELETE)
            const singleSupplierMatch = req.url.match(/\/api\/v1\/suppliers\/(\d+)(\?.*)?$/);
            if (singleSupplierMatch) {
              const supId = parseInt(singleSupplierMatch[1], 10);
              if (req.method === 'GET') {
                const found = devSuppliersStore.find((s) => s.id === supId);
                res.setHeader('Content-Type', 'application/json');
                if (found) {
                  res.end(JSON.stringify({ success: true, data: found }));
                } else {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, message: 'Supplier not found' }));
                }
                return;
              }
              if (req.method === 'PUT') {
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', () => {
                  let parsed: any = {};
                  try { parsed = JSON.parse(body); } catch {}
                  const idx = devSuppliersStore.findIndex((s) => s.id === supId);
                  if (idx !== -1) {
                    devSuppliersStore[idx] = {
                      ...devSuppliersStore[idx],
                      ...parsed,
                      updated_at: new Date().toISOString(),
                    };
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                      success: true,
                      message: 'Supplier updated successfully',
                      data: devSuppliersStore[idx],
                    }));
                  } else {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ success: false, message: 'Supplier not found' }));
                  }
                });
                return;
              }
              if (req.method === 'DELETE') {
                devSuppliersStore = devSuppliersStore.filter((s) => s.id !== supId);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'Supplier deleted successfully' }));
                return;
              }
            }

            // Handle /api/v1/suppliers (POST)
            if (req.url.match(/\/api\/v1\/suppliers(\?.*)?$/) && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', () => {
                let parsed: any = {};
                try { parsed = JSON.parse(body); } catch {}
                let maxNum = 0;
                let maxId = 0;
                for (const s of devSuppliersStore) {
                  if (s.id > maxId) maxId = s.id;
                  if (s.supplier_code) {
                    const m = s.supplier_code.match(/^SUP-(\d+)$/i);
                    if (m) {
                      const n = parseInt(m[1], 10);
                      if (n > maxNum) maxNum = n;
                    }
                  }
                }
                const newCode = `SUP-${String(maxNum + 1).padStart(4, '0')}`;
                const newSupplier = {
                  id: maxId + 1,
                  supplier_code: newCode,
                  name: parsed.name?.trim() || 'New Supplier',
                  short_name: parsed.short_name?.trim() || '',
                  mobile: parsed.mobile?.trim() || '',
                  address: parsed.address?.trim() || '',
                  contact_person: parsed.contact_person?.trim() || '',
                  contact_designation: parsed.contact_designation?.trim() || '',
                  contact_phone: parsed.contact_phone?.trim() || '',
                  tax_number: parsed.tax_number?.trim() || '',
                  bank_name: parsed.bank_name?.trim() || '',
                  bank_account_no: parsed.bank_account_no?.trim() || '',
                  bank_branch: parsed.bank_branch?.trim() || '',
                  notes: parsed.notes?.trim() || '',
                  status: parsed.status || 'ACTIVE',
                  current_balance: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                devSuppliersStore = [newSupplier, ...devSuppliersStore];
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  message: 'Supplier created successfully',
                  data: newSupplier,
                }));
              });
              return;
            }

            // Handle /api/v1/suppliers (GET)
            if (req.url.startsWith('/api/v1/suppliers') && req.method === 'GET') {
              const urlObj = new URL(req.url, 'http://localhost');
              const search = urlObj.searchParams.get('search')?.toLowerCase();
              const status = urlObj.searchParams.get('status')?.toUpperCase();
              let result = [...devSuppliersStore];
              if (status && status !== 'ALL') {
                result = result.filter((s) => s.status === status);
              }
              if (search) {
                result = result.filter((s) =>
                  s.name.toLowerCase().includes(search) ||
                  s.supplier_code.toLowerCase().includes(search) ||
                  (s.short_name && s.short_name.toLowerCase().includes(search)) ||
                  (s.mobile && s.mobile.toLowerCase().includes(search)) ||
                  (s.contact_person && s.contact_person.toLowerCase().includes(search))
                );
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: result,
              }));
              return;
            }

            // Handle /api/v1/categories/next-code (GET)
            if (req.url.includes('/categories/next-code') && req.method === 'GET') {
              let maxNum = 0;
              for (const c of devCategoriesStore) {
                const codeStr = String(c.code || c.slug || '');
                const m = codeStr.match(/^CAT-(\d+)$/i);
                if (m) {
                  const n = parseInt(m[1], 10);
                  if (n > maxNum) maxNum = n;
                }
              }
              if (maxNum === 0) {
                maxNum = devCategoriesStore.length;
              }
              const nextCode = `CAT-${String(maxNum + 1).padStart(4, '0')}`;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: {
                  category_code: nextCode,
                  next_code: nextCode,
                },
              }));
              return;
            }

            // Handle /api/v1/categories/:id (GET, PUT, PATCH, DELETE)
            const categoryIdMatch = req.url.match(/\/api\/v1\/categories\/(\d+)(?:\?.*)?$/);
            if (categoryIdMatch) {
              const catId = parseInt(categoryIdMatch[1], 10);
              if (req.method === 'GET') {
                const found = devCategoriesStore.find((c) => c.id === catId);
                if (found) {
                  const parentObj = found.parent_id ? devCategoriesStore.find((p) => p.id === Number(found.parent_id)) : null;
                  const enriched = {
                    ...found,
                    parent: parentObj ? { id: parentObj.id, name: parentObj.name } : (found.parent || null),
                  };
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, data: enriched }));
                  return;
                }
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, message: 'Category not found' }));
                return;
              }

              if (req.method === 'PUT' || req.method === 'PATCH') {
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', () => {
                  let parsed: any = {};
                  try { parsed = JSON.parse(body); } catch {}
                  const idx = devCategoriesStore.findIndex((c) => c.id === catId);
                  if (idx !== -1) {
                    const parentId = parsed.parent_id ? Number(parsed.parent_id) : null;
                    const parentObj = parentId ? devCategoriesStore.find((p) => p.id === parentId) : null;
                    devCategoriesStore[idx] = {
                      ...devCategoriesStore[idx],
                      name: parsed.name !== undefined ? parsed.name.trim() : devCategoriesStore[idx].name,
                      code: parsed.code !== undefined ? parsed.code.trim() : devCategoriesStore[idx].code,
                      description: parsed.description !== undefined ? parsed.description.trim() : devCategoriesStore[idx].description,
                      parent_id: parentId,
                      parent: parentObj ? { id: parentObj.id, name: parentObj.name } : null,
                      status: parsed.status || devCategoriesStore[idx].status || 'active',
                      updated_at: new Date().toISOString(),
                    };
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                      success: true,
                      message: `Category "${devCategoriesStore[idx].name}" updated successfully.`,
                      data: devCategoriesStore[idx],
                    }));
                    return;
                  }
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, message: 'Category not found' }));
                });
                return;
              }

              if (req.method === 'DELETE') {
                devCategoriesStore = devCategoriesStore.filter((c) => c.id !== catId);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  message: 'Category deleted successfully.',
                }));
                return;
              }
            }

            // Handle /api/v1/categories (POST create)
            if (req.url.startsWith('/api/v1/categories') && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', () => {
                let parsed: any = {};
                try { parsed = JSON.parse(body); } catch {}
                let maxId = 0;
                let maxNum = 0;
                for (const c of devCategoriesStore) {
                  if (c.id > maxId) maxId = c.id;
                  const codeStr = String(c.code || c.slug || '');
                  const m = codeStr.match(/^CAT-(\d+)$/i);
                  if (m) {
                    const n = parseInt(m[1], 10);
                    if (n > maxNum) maxNum = n;
                  }
                }
                if (maxNum === 0) {
                  maxNum = devCategoriesStore.length;
                }
                const autoGeneratedCode = `CAT-${String(maxNum + 1).padStart(4, '0')}`;
                const parentId = parsed.parent_id ? Number(parsed.parent_id) : null;
                const parentObj = parentId ? devCategoriesStore.find((p) => p.id === parentId) : null;
                const categoryName = parsed.name?.trim() || 'New Category';
                const code = parsed.code?.trim() || autoGeneratedCode;
                const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${maxId + 1}`;

                const newCategory = {
                  id: maxId + 1,
                  name: categoryName,
                  code,
                  slug,
                  description: parsed.description?.trim() || '',
                  parent_id: parentId,
                  parent: parentObj ? { id: parentObj.id, name: parentObj.name } : null,
                  products_count: 0,
                  status: parsed.status || 'active',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };

                devCategoriesStore = [newCategory, ...devCategoriesStore];
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  message: `Category "${newCategory.name}" created successfully.`,
                  data: newCategory,
                }));
              });
              return;
            }

            // Handle /api/v1/categories (GET list)
            if (req.url.startsWith('/api/v1/categories') && req.method === 'GET') {
              const urlObj = new URL(req.url, 'http://localhost');
              const search = urlObj.searchParams.get('search')?.toLowerCase();
              const status = urlObj.searchParams.get('status')?.toLowerCase();
              const parentIdParam = urlObj.searchParams.get('parent_id');

              let list = devCategoriesStore.map((cat) => {
                const parentObj = cat.parent_id ? devCategoriesStore.find((p) => p.id === Number(cat.parent_id)) : null;
                return {
                  ...cat,
                  parent: parentObj ? { id: parentObj.id, name: parentObj.name } : (cat.parent || null),
                };
              });

              if (status && status !== 'all') {
                list = list.filter((c) => (c.status || 'active') === status);
              }
              if (parentIdParam) {
                if (parentIdParam === 'root') {
                  list = list.filter((c) => !c.parent_id);
                } else {
                  list = list.filter((c) => Number(c.parent_id) === Number(parentIdParam));
                }
              }
              if (search) {
                list = list.filter((c) =>
                  c.name.toLowerCase().includes(search) ||
                  (c.code && c.code.toLowerCase().includes(search)) ||
                  (c.description && c.description.toLowerCase().includes(search))
                );
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: list,
                meta: {
                  total: list.length,
                  current_page: 1,
                  last_page: 1,
                  per_page: list.length,
                },
              }));
              return;
            }

            // Handle /api/v1/brands (GET, POST, PUT, DELETE)
            const brandIdMatch = req.url.match(/\/api\/v1\/brands\/(\d+)(?:\?.*)?$/);
            if (brandIdMatch) {
              const brandId = parseInt(brandIdMatch[1], 10);
              if (req.method === 'DELETE') {
                devBrandsStore = devBrandsStore.filter((b) => b.id !== brandId);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'Brand deleted successfully.' }));
                return;
              }
              if (req.method === 'PUT' || req.method === 'PATCH') {
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', () => {
                  let parsed: any = {};
                  try { parsed = JSON.parse(body); } catch {}
                  const idx = devBrandsStore.findIndex((b) => b.id === brandId);
                  if (idx !== -1) {
                    devBrandsStore[idx] = {
                      ...devBrandsStore[idx],
                      name: parsed.name?.trim() || devBrandsStore[idx].name,
                      code: parsed.code?.trim() || devBrandsStore[idx].code,
                      status: parsed.status || devBrandsStore[idx].status,
                    };
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, data: devBrandsStore[idx] }));
                    return;
                  }
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, message: 'Brand not found' }));
                });
                return;
              }
            }
            // Handle /api/v1/brands/next-code (GET)
            if (req.url.startsWith('/api/v1/brands/next-code') && req.method === 'GET') {
              let maxNum = 0;
              for (const b of devBrandsStore) {
                const m = String(b.code || '').match(/^BR(?:D)?-(\d+)$/i);
                if (m) {
                  const n = parseInt(m[1], 10);
                  if (n > maxNum) maxNum = n;
                }
              }
              if (maxNum === 0) maxNum = devBrandsStore.length;
              const nextCode = `BR-${String(maxNum + 1).padStart(4, '0')}`;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: {
                  next_code: nextCode,
                  brand_code: nextCode,
                },
              }));
              return;
            }

            if (req.url.startsWith('/api/v1/brands') && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', () => {
                let parsed: any = {};
                try { parsed = JSON.parse(body); } catch {}
                let maxId = 0;
                let maxNum = 0;
                for (const b of devBrandsStore) {
                  if (b.id > maxId) maxId = b.id;
                  const m = String(b.code || '').match(/^BR(?:D)?-(\d+)$/i);
                  if (m) {
                    const n = parseInt(m[1], 10);
                    if (n > maxNum) maxNum = n;
                  }
                }
                if (maxNum === 0) maxNum = devBrandsStore.length;
                const autoGeneratedCode = `BR-${String(maxNum + 1).padStart(4, '0')}`;
                const brandName = parsed.name?.trim() || 'New Brand';
                const code = parsed.code?.trim() || autoGeneratedCode;

                const newBrand = {
                  id: maxId + 1,
                  name: brandName,
                  code,
                  description: parsed.description?.trim() || '',
                  products_count: 0,
                  status: parsed.status || 'active',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                devBrandsStore = [newBrand, ...devBrandsStore];
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'Brand created successfully.', data: newBrand }));
              });
              return;
            }
            if (req.url.startsWith('/api/v1/brands') && req.method === 'GET') {
              const urlObj = new URL(req.url, 'http://localhost');
              const search = urlObj.searchParams.get('search')?.toLowerCase();
              let result = [...devBrandsStore];
              if (search) {
                result = result.filter((b) => b.name.toLowerCase().includes(search) || (b.code && b.code.toLowerCase().includes(search)));
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, data: result }));
              return;
            }

            // Handle /api/v1/units (GET, POST, PUT, DELETE)
            const unitIdMatch = req.url.match(/\/api\/v1\/units\/(\d+)(?:\?.*)?$/);
            if (unitIdMatch && req.method === 'DELETE') {
              const unitId = parseInt(unitIdMatch[1], 10);
              devUnitsStore = devUnitsStore.filter((u) => u.id !== unitId);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Unit deleted successfully.' }));
              return;
            }
            if (req.url.startsWith('/api/v1/units') && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', () => {
                let parsed: any = {};
                try { parsed = JSON.parse(body); } catch {}
                let maxId = 0;
                for (const u of devUnitsStore) { if (u.id > maxId) maxId = u.id; }
                const newUnit = {
                  id: maxId + 1,
                  name: parsed.name?.trim() || 'New Unit',
                  short_code: parsed.short_code?.trim() || parsed.name?.substring(0, 3).toUpperCase() || `UN-${maxId + 1}`,
                  symbol: parsed.symbol?.trim() || '',
                  decimal_allowed: !!parsed.decimal_allowed,
                };
                devUnitsStore = [newUnit, ...devUnitsStore];
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'Unit created successfully.', data: newUnit }));
              });
              return;
            }
            if (req.url.startsWith('/api/v1/units') && req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, data: devUnitsStore }));
              return;
            }

            // Handle /api/v1/attributes (GET, POST)
            if (req.url.startsWith('/api/v1/attributes') && req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, data: devAttributesStore }));
              return;
            }

            // Generic mock fallback for all other /api/v1/* requests
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              status: 'success',
              data: [],
            }));
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
