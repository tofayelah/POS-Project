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
    status: 'ACTIVE',
    current_balance: 0,
    created_at: '2026-10-03T14:15:00Z',
    updated_at: '2026-10-03T14:15:00Z',
  },
];

let devSuppliersStore: any[] = [...INITIAL_MOCK_SUPPLIERS];

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
