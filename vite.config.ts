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

export default defineConfig({
  root: './frontend',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'api-mock-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api/v1')) {
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

            // Generic fallback for any other /api/v1/bi/* calls
            if (req.url.includes('/bi/')) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'success',
                data: {},
              }));
              return;
            }
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
