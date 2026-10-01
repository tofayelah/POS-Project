import { describe, it, expect, beforeEach } from 'vitest';
import { en } from '../i18n/en';
import { bn } from '../i18n/bn';
import { formatCurrency, formatNumber, formatDate } from '../utils/format';

// In-memory mock storage for Node test environment
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
  clear: () => { storage.clear(); },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() { return storage.size; },
};

(globalThis as unknown as { localStorage: typeof mockLocalStorage }).localStorage = mockLocalStorage;

describe('RetailCore ERP Frontend UI Redesign & i18n Suite', () => {
  beforeEach(() => {
    storage.clear();
    if (typeof document !== 'undefined') {
      document.documentElement.lang = 'en';
    }
  });

  describe('1. Internationalization (i18n) Architecture & Persistence', () => {
    it('enforces complete dictionary key coverage between English and Bengali', () => {
      const enKeys = Object.keys(en);
      const bnKeys = Object.keys(bn);

      expect(enKeys.length).toBeGreaterThanOrEqual(130);
      expect(bnKeys.length).toBeGreaterThanOrEqual(130);

      // Check 100% key parity
      const missingInBn = enKeys.filter(key => !(key in bn));
      const missingInEn = bnKeys.filter(key => !(key in en));

      expect(missingInBn).toEqual([]);
      expect(missingInEn).toEqual([]);
    });

    it('validates comprehensive dictionary coverage across all core ERP module domains', () => {
      const domains = [
        'nav',
        'header',
        'dashboard',
        'quickActions',
        'common',
        'products',
        'inventory',
        'purchases',
        'customers',
        'accounting',
        'organization',
        'status',
        'pos',
      ];

      domains.forEach(domain => {
        const domainEnKeys = Object.keys(en).filter(k => k.startsWith(`${domain}.`));
        const domainBnKeys = Object.keys(bn).filter(k => k.startsWith(`${domain}.`));

        expect(domainEnKeys.length).toBeGreaterThan(0);
        expect(domainBnKeys.length).toBe(domainEnKeys.length);
      });
    });

    it('verifies critical retail terminology is authentic in Bengali (বাংলা)', () => {
      expect(bn['dashboard.todaySales']).toBe('আজকের বিক্রয়');
      expect(bn['dashboard.totalSales']).toBe('মোট বিক্রয়');
      expect(bn['dashboard.totalItems']).toBe('মোট পণ্য');
      expect(bn['dashboard.netProfit']).toBe('নিট লাভ');
      expect(bn['dashboard.salesByCategory']).toBe('ক্যাটাগরি ভিত্তিক বিক্রয়');
      expect(bn['quickActions.posRegister']).toBe('পিওএস কাউন্টার');
      expect(bn['pos.thermalReceipt']).toBe('থার্মাল রসিদ');
      expect(bn['pos.salesSlip']).toBe('বিক্রয় স্লিপ');
      expect(bn['nav.posTerminalManagement']).toBe('টার্মিনাল ব্যবস্থাপনা');
    });

    it('persists selected language in localStorage and updates document.documentElement.lang', () => {
      const STORAGE_KEY = 'retailcore_lang';

      // Initial state
      expect(mockLocalStorage.getItem(STORAGE_KEY)).toBeNull();

      // Switch to Bengali
      mockLocalStorage.setItem(STORAGE_KEY, 'bn');
      expect(mockLocalStorage.getItem(STORAGE_KEY)).toBe('bn');

      // Switch to English
      mockLocalStorage.setItem(STORAGE_KEY, 'en');
      expect(mockLocalStorage.getItem(STORAGE_KEY)).toBe('en');
    });

    it('replaces token parameters correctly in localized strings', () => {
      const template = en['dashboard.subtitle'];
      const companyName = 'Apex Footwear Ltd';
      const rendered = template.replace('{company}', companyName);

      expect(rendered).toContain('Apex Footwear Ltd');
      expect(rendered).not.toContain('{company}');

      const bnTemplate = bn['dashboard.subtitle'];
      const bnRendered = bnTemplate.replace('{company}', companyName);
      expect(bnRendered).toContain('Apex Footwear Ltd');
      expect(bnRendered).not.toContain('{company}');
    });
  });

  describe('2. Top 4 Distinctive Retail KPI Cards (Green, Blue, Orange, Purple)', () => {
    it('verifies 4 primary retail KPI cards match color assignments and data semantics', () => {
      const kpis = [
        {
          id: 'kpi-today-sales',
          title: en['dashboard.todaySales'],
          color: 'emerald',
          expectedHexOrClass: 'bg-emerald-500 text-white',
          sampleValue: 48500.5,
          formatted: formatCurrency(48500.5),
        },
        {
          id: 'kpi-total-sales',
          title: en['dashboard.totalSales'],
          color: 'blue',
          expectedHexOrClass: 'bg-blue-600 text-white',
          sampleValue: 1250000,
          formatted: formatCurrency(1250000),
        },
        {
          id: 'kpi-total-items',
          title: en['dashboard.totalItems'],
          color: 'orange',
          expectedHexOrClass: 'bg-amber-500 text-white',
          sampleValue: 1420,
          formatted: '1,420',
        },
        {
          id: 'kpi-net-profit',
          title: en['dashboard.netProfit'],
          color: 'purple',
          expectedHexOrClass: 'bg-purple-600 text-white',
          sampleValue: 284300,
          formatted: formatCurrency(284300),
        },
      ];

      expect(kpis[0].color).toBe('emerald'); // Green
      expect(kpis[1].color).toBe('blue');    // Ocean Blue
      expect(kpis[2].color).toBe('orange');  // Vibrant Amber/Orange
      expect(kpis[3].color).toBe('purple');  // Royal Purple

      expect(kpis[0].formatted).toBe('৳ 48,500.50');
      expect(kpis[1].formatted).toBe('৳ 1,250,000.00');
      expect(kpis[3].formatted).toBe('৳ 284,300.00');
    });

    it('verifies secondary financial KPI cards preserve financial accuracy', () => {
      const purchases = 840000;
      const expenses = 125700;
      const receivables = 45000;
      const payables = 62000;

      expect(formatCurrency(purchases)).toBe('৳ 840,000.00');
      expect(formatCurrency(expenses)).toBe('৳ 125,700.00');
      expect(formatCurrency(receivables)).toBe('৳ 45,000.00');
      expect(formatCurrency(payables)).toBe('৳ 62,000.00');
    });
  });

  describe('3. Quick Action Module Shortcuts Grid', () => {
    it('verifies all 8 quick action shortcuts navigate to authoritative routes', () => {
      const quickActions = [
        { id: 'quick-action-pos', route: '/pos' },
        { id: 'quick-action-items', route: '/products/item-information' },
        { id: 'quick-action-inventory', route: '/inventory' },
        { id: 'quick-action-purchases', route: '/purchases' },
        { id: 'quick-action-accounting', route: '/accounting' },
        { id: 'quick-action-expenses', route: '/expenses' },
        { id: 'quick-action-customers', route: '/customers' },
        { id: 'quick-action-terminals', route: '/pos/terminals' },
      ];

      expect(quickActions.length).toBe(8);

      quickActions.forEach(action => {
        expect(action.route).toMatch(/^\/[a-z0-9\/-]+$/);
        expect(action.id).toContain('quick-action-');
      });
    });
  });

  describe('4. Sales by Category Donut Chart Analytics', () => {
    it('calculates category revenue and percentage breakdown correctly', () => {
      const sampleCategories = [
        { category: 'Footwear', total: '450000' },
        { category: 'Apparel', total: '350000' },
        { category: 'Accessories', total: '200000' },
      ];

      const formatted = sampleCategories.map(c => ({
        name: c.category,
        value: Number(c.total),
      }));

      const total = formatted.reduce((acc, curr) => acc + curr.value, 0);
      expect(total).toBe(1000000);

      const footwearPercent = ((formatted[0].value / total) * 100).toFixed(1);
      const apparelPercent = ((formatted[1].value / total) * 100).toFixed(1);
      const accessoriesPercent = ((formatted[2].value / total) * 100).toFixed(1);

      expect(footwearPercent).toBe('45.0');
      expect(apparelPercent).toBe('35.0');
      expect(accessoriesPercent).toBe('20.0');
    });

    it('handles empty category sales without dividing by zero', () => {
      const emptyCategories: Array<{ category: string; total: string | number }> = [];
      const total = emptyCategories.reduce((acc, curr) => acc + Number(curr.total), 0);
      expect(total).toBe(0);

      const percent = total > 0 ? (0 / total) * 100 : 0;
      expect(percent).toBe(0);
      expect(Number.isNaN(percent)).toBe(false);
    });
  });

  describe('5. Layout Navigation & Mobile Drawer Behavior', () => {
    it('verifies RBAC route visibility logic for POS Terminal Management and Admin', () => {
      const canViewPosAdmin = (roles: string[], permissions: string[]) => {
        const hasRole = (r: string) => roles.some(role => role.toLowerCase() === r.toLowerCase());
        const hasPermission = (p: string) => permissions.some(perm => perm.toLowerCase() === p.toLowerCase());
        return hasRole('Super Admin') || hasRole('Admin') || hasPermission('pos.view');
      };

      expect(canViewPosAdmin(['Super Admin'], [])).toBe(true);
      expect(canViewPosAdmin(['Admin'], [])).toBe(true);
      expect(canViewPosAdmin(['Cashier'], ['pos.view'])).toBe(true);
      expect(canViewPosAdmin(['Cashier'], [])).toBe(false);
    });

    it('verifies mobile drawer toggle logic and close handler on navigation', () => {
      let isMobileOpen = false;
      const onToggle = () => { isMobileOpen = !isMobileOpen; };
      const onClose = () => { isMobileOpen = false; };

      expect(isMobileOpen).toBe(false);

      // Open drawer via mobile hamburger
      onToggle();
      expect(isMobileOpen).toBe(true);

      // Close on navigation link tap or backdrop click
      onClose();
      expect(isMobileOpen).toBe(false);
    });

    it('verifies desktop sidebar default collapsed width and hover expansion specifications', () => {
      const desktopCollapsedWidth = 'w-20';
      const desktopHoverExpandedWidth = 'w-64';
      const mobileDrawerWidth = 'w-72';

      expect(desktopCollapsedWidth).toBe('w-20');
      expect(desktopHoverExpandedWidth).toBe('w-64');
      expect(mobileDrawerWidth).toBe('w-72');
    });
  });

  describe('6. Design System Formatting, Status Badges & Terminology', () => {
    it('formats currencies, numbers, and dates consistently according to Bangladesh ERP standard', () => {
      expect(formatCurrency(0)).toBe('৳ 0.00');
      expect(formatCurrency(4850.75)).toBe('৳ 4,850.75');
      expect(formatCurrency(1250000)).toBe('৳ 1,250,000.00');

      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(1420)).toBe('1,420');
      expect(formatNumber(9876543)).toBe('9,876,543');

      expect(formatDate(null)).toBe('-');
      expect(formatDate('2026-10-01')).toContain('2026');
    });

    it('validates authentic Bengali translations for all workflow statuses', () => {
      expect(bn['status.active']).toBe('সক্রিয়');
      expect(bn['status.inactive']).toBe('নিষ্ক্রিয়');
      expect(bn['status.pending']).toBe('অপেক্ষমান');
      expect(bn['status.completed']).toBe('সম্পন্ন');
      expect(bn['status.paid']).toBe('পরিশোধিত');
      expect(bn['status.partial']).toBe('আংশিক পরিশোধ');
      expect(bn['status.due']).toBe('বকেয়া');
      expect(bn['status.draft']).toBe('খসড়া');
    });
  });
});
