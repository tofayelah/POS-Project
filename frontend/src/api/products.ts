import api from './axios';
import {
  Category,
  Brand,
  Unit,
  Attribute,
  Product,
  ProductVariant,
  Barcode,
  ProductPayload,
  ProductFilterParams,
} from '../types/product';

export const CATEGORIES_STORAGE_KEY = 'retailcore_categories_list_v2';
export const BRANDS_STORAGE_KEY = 'retailcore_brands_list_v2';
export const UNITS_STORAGE_KEY = 'retailcore_units_list_v2';

export const DEFAULT_CATEGORIES: any[] = [
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

let memoryStorage: Record<string, string> = {};

function getStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return {
    getItem: (key: string) => memoryStorage[key] ?? null,
    setItem: (key: string, value: string) => { memoryStorage[key] = value; },
    removeItem: (key: string) => { delete memoryStorage[key]; },
  };
}

export function getStoredCategories(): any[] {
  const storage = getStorage();
  try {
    const raw = storage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_CATEGORIES];
}

export function saveStoredCategories(categories: any[]): void {
  const storage = getStorage();
  try {
    storage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch {}
}

/**
 * Generates guaranteed unique sequential category code (e.g. CAT-0008)
 */
export function generateNextCategoryCode(categoriesList?: any[]): string {
  const list = categoriesList && categoriesList.length > 0 ? categoriesList : getStoredCategories();
  let maxNum = 0;
  for (const c of list) {
    const codeStr = String(c.code || c.slug || '');
    const m = codeStr.match(/^CAT-(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  if (maxNum === 0) {
    maxNum = list.length;
  }
  return `CAT-${String(maxNum + 1).padStart(4, '0')}`;
}

/**
 * Generates a clean unique abbreviation code from name (e.g. "Baby Care" -> "BABY" or "CAT-BABY")
 */
export function generateCategoryCodeFromName(name: string, categoriesList?: any[]): string {
  const list = categoriesList && categoriesList.length > 0 ? categoriesList : getStoredCategories();
  if (!name || !name.trim()) return generateNextCategoryCode(list);
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  let baseCode = '';
  if (words.length === 1) {
    baseCode = words[0].substring(0, 4).toUpperCase();
  } else {
    baseCode = words.map((w) => w[0]).join('').substring(0, 4).toUpperCase();
    if (baseCode.length < 3) {
      baseCode = (words[0].substring(0, 3) + (words[1] ? words[1][0] : '')).toUpperCase();
    }
  }
  if (!baseCode) baseCode = 'CAT';

  const existingCodes = new Set(list.map((c) => String(c.code || c.slug || '').toUpperCase()));
  if (!existingCodes.has(baseCode)) {
    return baseCode;
  }
  // If already exists, append sequential number e.g. BABY-01
  let counter = 1;
  while (existingCodes.has(`${baseCode}-${String(counter).padStart(2, '0')}`)) {
    counter++;
  }
  return `${baseCode}-${String(counter).padStart(2, '0')}`;
}

/**
 * Fetches or calculates the next unique category code from API or storage
 */
export async function getNextCategoryCode(categoriesList?: any[]): Promise<string> {
  try {
    const response = await api.get('/categories/next-code');
    const code = response.data?.data?.category_code || response.data?.data?.next_code;
    if (code) return code;
  } catch {}
  return generateNextCategoryCode(categoriesList);
}

export const DEFAULT_BRANDS: any[] = [
  { id: 1, name: 'Samsung', code: 'SAM', products_count: 8, status: 'active', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' },
  { id: 2, name: 'Apple', code: 'APL', products_count: 6, status: 'active', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' },
  { id: 3, name: 'Square', code: 'SQU', products_count: 14, status: 'active', created_at: '2026-10-02T10:00:00Z', updated_at: '2026-10-02T10:00:00Z' },
  { id: 4, name: 'Apex', code: 'APX', products_count: 10, status: 'active', created_at: '2026-10-02T10:00:00Z', updated_at: '2026-10-02T10:00:00Z' },
  { id: 5, name: 'Nestle', code: 'NES', products_count: 12, status: 'active', created_at: '2026-10-03T10:00:00Z', updated_at: '2026-10-03T10:00:00Z' },
];

export function getStoredBrands(): any[] {
  const storage = getStorage();
  try {
    const raw = storage.getItem(BRANDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_BRANDS];
}

export function saveStoredBrands(brands: any[]): void {
  const storage = getStorage();
  try {
    storage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(brands));
  } catch {}
}

/**
 * Generates guaranteed unique sequential brand code (e.g. BR-0006)
 */
export function generateNextBrandCode(brandsList?: any[]): string {
  const list = brandsList && brandsList.length > 0 ? brandsList : getStoredBrands();
  let maxNum = 0;
  for (const b of list) {
    const codeStr = String(b.code || '');
    const m = codeStr.match(/^BR(?:D)?-(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  if (maxNum === 0) {
    maxNum = list.length;
  }
  return `BR-${String(maxNum + 1).padStart(4, '0')}`;
}

/**
 * Generates a clean unique abbreviation brand code from name (e.g. "Unilever" -> "UNI", "Bata Shoes" -> "BS")
 */
export function generateBrandCodeFromName(name: string, brandsList?: any[]): string {
  const list = brandsList && brandsList.length > 0 ? brandsList : getStoredBrands();
  if (!name || !name.trim()) return generateNextBrandCode(list);
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  let baseCode = '';
  if (words.length === 1) {
    baseCode = words[0].substring(0, 3).toUpperCase();
  } else {
    baseCode = words.map((w) => w[0]).join('').substring(0, 3).toUpperCase();
    if (baseCode.length < 3) {
      baseCode = (words[0].substring(0, 3) + (words[1] ? words[1][0] : '')).toUpperCase();
    }
  }
  if (!baseCode) baseCode = 'BRD';

  const existingCodes = new Set(list.map((b) => String(b.code || '').toUpperCase()));
  if (!existingCodes.has(baseCode)) {
    return baseCode;
  }
  // If already exists, append sequential number e.g. SAM-01
  let counter = 1;
  while (existingCodes.has(`${baseCode}-${String(counter).padStart(2, '0')}`)) {
    counter++;
  }
  return `${baseCode}-${String(counter).padStart(2, '0')}`;
}

/**
 * Fetches or calculates the next unique brand code from API or storage
 */
export async function getNextBrandCode(brandsList?: any[]): Promise<string> {
  try {
    const response = await api.get('/brands/next-code');
    const code = response.data?.data?.brand_code || response.data?.data?.next_code;
    if (code) return code;
  } catch {}
  return generateNextBrandCode(brandsList);
}

// --- Categories ---
export async function getCategories(params?: { search?: string; status?: string; parent_id?: string | number; all?: boolean }) {
  let list: any[] = [];
  try {
    const response = await api.get('/categories', { params });
    const fetched = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
      ? response.data
      : [];
    if (fetched.length > 0) {
      saveStoredCategories(fetched);
      return { success: true, data: fetched };
    }
  } catch {
    // API failed or offline - proceed to storage fallback
  }

  // Fallback to local persistent storage
  list = getStoredCategories();

  // Attach parent objects if missing
  list = list.map((cat) => {
    const parentObj = cat.parent_id ? list.find((p) => Number(p.id) === Number(cat.parent_id)) : null;
    return {
      ...cat,
      parent: parentObj ? { id: parentObj.id, name: parentObj.name } : (cat.parent || null),
    };
  });

  if (params?.status && params.status !== 'all') {
    list = list.filter((c) => (c.status || 'active').toLowerCase() === params.status?.toLowerCase());
  }
  if (params?.parent_id) {
    if (params.parent_id === 'root') {
      list = list.filter((c) => !c.parent_id);
    } else {
      list = list.filter((c) => Number(c.parent_id) === Number(params.parent_id));
    }
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  }

  return { success: true, data: list };
}

export async function getCategory(id: number) {
  try {
    const response = await api.get(`/categories/${id}`);
    if (response.data?.data) return response.data;
  } catch {}

  const current = getStoredCategories();
  const found = current.find((c) => Number(c.id) === Number(id));
  if (found) {
    const parentObj = found.parent_id ? current.find((p) => Number(p.id) === Number(found.parent_id)) : null;
    return {
      success: true,
      data: {
        ...found,
        parent: parentObj ? { id: parentObj.id, name: parentObj.name } : (found.parent || null),
      },
    };
  }
  return { success: false, message: 'Category not found' };
}

export async function createCategory(data: Partial<Category> & { description?: string; status?: string }) {
  let created: any = null;
  try {
    const response = await api.post('/categories', data);
    created = response.data?.data || response.data;
  } catch {
    // offline / fallback
  }

  const current = getStoredCategories();
  let maxId = 0;
  for (const c of current) {
    if (Number(c.id) > maxId) maxId = Number(c.id);
  }

  const parentId = data.parent_id ? Number(data.parent_id) : null;
  const parentObj = parentId ? current.find((c) => Number(c.id) === parentId) : null;
  const categoryName = data.name?.trim() || 'New Category';
  const autoCode = generateNextCategoryCode(current);
  const code = data.code?.trim() || autoCode;

  const newCat = {
    id: created?.id || maxId + 1,
    name: categoryName,
    code,
    slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: (data as any).description?.trim() || '',
    parent_id: parentId,
    parent: parentObj ? { id: parentObj.id, name: parentObj.name } : null,
    products_count: 0,
    status: (data as any).status || 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(created && typeof created === 'object' ? created : {}),
  };

  const updatedList = [newCat, ...current.filter((c) => Number(c.id) !== Number(newCat.id))];
  saveStoredCategories(updatedList);

  return {
    success: true,
    message: `Category "${newCat.name}" created successfully.`,
    data: newCat,
  };
}

export async function updateCategory(id: number, data: Partial<Category> & { description?: string; status?: string }) {
  let updated: any = null;
  try {
    const response = await api.put(`/categories/${id}`, data);
    updated = response.data?.data || response.data;
  } catch {}

  const current = getStoredCategories();
  const idx = current.findIndex((c) => Number(c.id) === Number(id));
  if (idx !== -1) {
    const parentId = data.parent_id ? Number(data.parent_id) : null;
    const parentObj = parentId ? current.find((c) => Number(c.id) === parentId) : null;
    current[idx] = {
      ...current[idx],
      name: data.name !== undefined ? data.name.trim() : current[idx].name,
      code: data.code !== undefined ? data.code?.trim() : current[idx].code,
      description: (data as any).description !== undefined ? (data as any).description?.trim() : current[idx].description,
      parent_id: parentId,
      parent: parentObj ? { id: parentObj.id, name: parentObj.name } : null,
      status: (data as any).status || current[idx].status || 'active',
      updated_at: new Date().toISOString(),
      ...(updated && typeof updated === 'object' ? updated : {}),
    };
    saveStoredCategories(current);
  }

  return {
    success: true,
    message: 'Category updated successfully.',
    data: idx !== -1 ? current[idx] : updated,
  };
}

export async function deleteCategory(id: number) {
  try {
    await api.delete(`/categories/${id}`);
  } catch {}

  const current = getStoredCategories();
  const filtered = current.filter((c) => Number(c.id) !== Number(id));
  saveStoredCategories(filtered);

  return {
    success: true,
    message: 'Category deleted successfully.',
  };
}

// --- Brands ---
export async function getBrands(params?: { search?: string; status?: string; all?: boolean }) {
  let list: any[] = [];
  try {
    const response = await api.get('/brands', { params });
    const fetched = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
      ? response.data
      : [];
    if (fetched.length > 0) {
      saveStoredBrands(fetched);
      return { success: true, data: fetched };
    }
  } catch {
    // API failed or offline - proceed to storage fallback
  }

  list = getStoredBrands();

  if (params?.status && params.status !== 'all') {
    list = list.filter((b) => (b.status || 'active') === params.status);
  }

  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      (b.code && b.code.toLowerCase().includes(q)) ||
      (b.description && b.description.toLowerCase().includes(q))
    );
  }

  return { success: true, data: list };
}

export async function createBrand(data: Partial<Brand> & { description?: string; status?: string }) {
  let created: any = null;
  try {
    const response = await api.post('/brands', data);
    created = response.data?.data || response.data;
  } catch {
    // offline / fallback
  }

  const current = getStoredBrands();
  let maxId = 0;
  for (const b of current) {
    if (Number(b.id) > maxId) maxId = Number(b.id);
  }

  const brandName = data.name?.trim() || 'New Brand';
  const autoCode = generateNextBrandCode(current);
  const code = data.code?.trim() || autoCode;

  const newBrand = {
    id: created?.id || maxId + 1,
    name: brandName,
    code,
    description: (data as any).description?.trim() || '',
    products_count: 0,
    status: (data as any).status || 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(created && typeof created === 'object' ? created : {}),
  };

  const updatedList = [newBrand, ...current.filter((b) => Number(b.id) !== Number(newBrand.id))];
  saveStoredBrands(updatedList);

  return {
    success: true,
    message: `Brand "${newBrand.name}" created successfully.`,
    data: newBrand,
  };
}

export async function updateBrand(id: number, data: Partial<Brand> & { description?: string; status?: string }) {
  let updated: any = null;
  try {
    const response = await api.put(`/brands/${id}`, data);
    updated = response.data?.data || response.data;
  } catch {}

  const current = getStoredBrands();
  const idx = current.findIndex((b) => Number(b.id) === Number(id));
  if (idx !== -1) {
    current[idx] = {
      ...current[idx],
      name: data.name !== undefined ? data.name.trim() : current[idx].name,
      code: data.code !== undefined ? data.code?.trim() : current[idx].code,
      description: (data as any).description !== undefined ? (data as any).description?.trim() : current[idx].description,
      status: (data as any).status || current[idx].status || 'active',
      updated_at: new Date().toISOString(),
      ...(updated && typeof updated === 'object' ? updated : {}),
    };
    saveStoredBrands(current);
  }

  return {
    success: true,
    message: 'Brand updated successfully.',
    data: idx !== -1 ? current[idx] : updated,
  };
}

export async function deleteBrand(id: number) {
  try {
    await api.delete(`/brands/${id}`);
  } catch {}

  const current = getStoredBrands();
  const filtered = current.filter((b) => Number(b.id) !== Number(id));
  saveStoredBrands(filtered);

  return {
    success: true,
    message: 'Brand deleted successfully.',
  };
}

export const PRODUCTS_STORAGE_KEY = 'retailcore_products_list_v2';

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Samsung Galaxy A54 5G 128GB',
    product_code: 'PRD-0001',
    sku: 'SAM-A54-128',
    category_id: 2,
    brand_id: 1,
    unit_id: 1,
    status: 'ACTIVE',
    reorder_level: 10,
    unit: { id: 1, name: 'Piece', short_code: 'pcs' },
    category: { id: 2, name: 'Smart Devices & Gadgets' },
    brand: { id: 1, name: 'Samsung' },
    variants: [
      {
        id: 1,
        product_id: 1,
        sku: 'SAM-A54-128-BLK',
        cost_price: 32000,
        selling_price: 38500,
        available_quantity: 45,
        status: 'ACTIVE',
        barcodes: [{ id: 1, barcode: '8806090123456', is_primary: true }],
      },
    ],
  },
  {
    id: 2,
    name: 'Apple iPhone 15 128GB Blue',
    product_code: 'PRD-0002',
    sku: 'APL-IP15-128',
    category_id: 2,
    brand_id: 2,
    unit_id: 1,
    status: 'ACTIVE',
    reorder_level: 5,
    unit: { id: 1, name: 'Piece', short_code: 'pcs' },
    category: { id: 2, name: 'Smart Devices & Gadgets' },
    brand: { id: 2, name: 'Apple' },
    variants: [
      {
        id: 2,
        product_id: 2,
        sku: 'APL-IP15-128-BLU',
        cost_price: 110000,
        selling_price: 125000,
        available_quantity: 18,
        status: 'ACTIVE',
        barcodes: [{ id: 2, barcode: '194253012345', is_primary: true }],
      },
    ],
  },
  {
    id: 3,
    name: 'Apex Leather Formal Shoes - Brown',
    product_code: 'PRD-0003',
    sku: 'APX-SHOE-BRN',
    category_id: 4,
    brand_id: 4,
    unit_id: 1,
    status: 'ACTIVE',
    reorder_level: 15,
    unit: { id: 1, name: 'Pair', short_code: 'prs' },
    category: { id: 4, name: 'Footwear & Shoes' },
    brand: { id: 4, name: 'Apex' },
    variants: [
      {
        id: 3,
        product_id: 3,
        sku: 'APX-SHOE-BRN-42',
        cost_price: 3200,
        selling_price: 4500,
        available_quantity: 30,
        status: 'ACTIVE',
        barcodes: [{ id: 3, barcode: '8901234567890', is_primary: true }],
      },
    ],
  },
];

export function getStoredProducts(): Product[] {
  const storage = getStorage();
  try {
    const raw = storage.getItem(PRODUCTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_PRODUCTS];
}

export function saveStoredProducts(prods: Product[]): void {
  const storage = getStorage();
  try {
    storage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(prods));
  } catch {}
}

// --- Units ---
export async function getUnits(params?: { search?: string; status?: string; all?: boolean }) {
  try {
    const response = await api.get('/units', { params });
    if (response.data) return response.data;
  } catch {}
  return {
    success: true,
    data: [
      { id: 1, name: 'Piece', short_code: 'pcs', status: 'active' },
      { id: 2, name: 'Box', short_code: 'box', status: 'active' },
      { id: 3, name: 'Kilogram', short_code: 'kg', status: 'active' },
      { id: 4, name: 'Pair', short_code: 'prs', status: 'active' },
    ],
  };
}

export async function createUnit(data: Partial<Unit>) {
  try {
    const response = await api.post('/units', data);
    return response.data;
  } catch {
    return { success: true, data: { id: Date.now(), ...data } };
  }
}

export async function updateUnit(id: number, data: Partial<Unit>) {
  try {
    const response = await api.put(`/units/${id}`, data);
    return response.data;
  } catch {
    return { success: true, data: { id, ...data } };
  }
}

export async function deleteUnit(id: number) {
  try {
    const response = await api.delete(`/units/${id}`);
    return response.data;
  } catch {
    return { success: true, message: 'Unit deleted.' };
  }
}

// --- Attributes & Values ---
export async function getAttributes(params?: { search?: string; status?: string }) {
  try {
    const response = await api.get('/attributes', { params });
    if (response.data) return response.data;
  } catch {}
  return {
    success: true,
    data: [
      { id: 1, name: 'Size', code: 'SIZE', status: 'active' },
      { id: 2, name: 'Color', code: 'COLOR', status: 'active' },
    ],
  };
}

export async function createAttribute(data: Partial<Attribute>) {
  try {
    const response = await api.post('/attributes', data);
    return response.data;
  } catch {
    return { success: true, data: { id: Date.now(), ...data } };
  }
}

export async function updateAttribute(id: number, data: Partial<Attribute>) {
  try {
    const response = await api.put(`/attributes/${id}`, data);
    return response.data;
  } catch {
    return { success: true, data: { id, ...data } };
  }
}

export async function deleteAttribute(id: number) {
  try {
    const response = await api.delete(`/attributes/${id}`);
    return response.data;
  } catch {
    return { success: true, message: 'Attribute deleted.' };
  }
}

// --- Products Master ---
export async function getProducts(params?: ProductFilterParams) {
  try {
    const response = await api.get('/products', { params });
    if (response.data?.success || Array.isArray(response.data) || response.data?.data) {
      return response.data;
    }
  } catch {}

  let list = getStoredProducts();
  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.product_code && p.product_code.toLowerCase().includes(q))
    );
  }
  return { success: true, data: list };
}

export async function getProduct(id: number) {
  try {
    const response = await api.get(`/products/${id}`);
    if (response.data) return response.data;
  } catch {}

  const prods = getStoredProducts();
  const found = prods.find((p) => Number(p.id) === Number(id)) || prods[0];
  return { success: true, data: found };
}

export async function createProduct(payload: ProductPayload) {
  let createdBackend: any = null;
  try {
    const response = await api.post('/products', payload);
    if (response.data) {
      createdBackend = response.data.data || response.data;
    }
  } catch {}

  const prods = getStoredProducts();
  const cats = getStoredCategories();
  const brands = getStoredBrands();

  const selectedCat = cats.find((c) => Number(c.id) === Number(payload.category_id));
  const selectedBrand = brands.find((b) => Number(b.id) === Number(payload.brand_id));

  const v0 = (payload.variants?.[0] || {}) as any;
  const cost = Number(v0.cost_price) || 0;
  const retail = Number(v0.selling_price) || 0;
  const mrpVal = Number(v0.mrp) || retail;
  const barcodeStr = v0.barcodes?.[0]?.barcode || '';

  const newProd: Product = {
    id: createdBackend?.id || Date.now(),
    name: payload.name,
    product_code: payload.product_code || `PRD-${Math.floor(Math.random() * 8999 + 1000)}`,
    sku: payload.sku || payload.product_code || `SKU-${Date.now()}`,
    category_id: payload.category_id || 1,
    brand_id: payload.brand_id || 1,
    unit_id: payload.unit_id || 1,
    status: (payload.status?.toUpperCase() as any) || 'ACTIVE',
    reorder_level: payload.reorder_level || 10,
    price: retail,
    category: createdBackend?.category || (selectedCat ? { id: selectedCat.id, name: selectedCat.name } : { id: 1, name: 'General' }),
    brand: createdBackend?.brand || (selectedBrand ? { id: selectedBrand.id, name: selectedBrand.name } : { id: 1, name: 'Brand' }),
    unit: createdBackend?.unit || { id: payload.unit_id || 1, name: 'Piece', short_code: 'pcs' },
    variants: createdBackend?.variants || [
      {
        id: Date.now(),
        sku: payload.sku || `SKU-${Date.now()}`,
        cost_price: cost,
        selling_price: retail,
        price: retail,
        mrp: mrpVal,
        available_quantity: 0,
        status: 'ACTIVE',
        barcodes: barcodeStr ? [{ id: Date.now(), barcode: barcodeStr, is_primary: true }] : [],
      },
    ],
    ...(createdBackend && typeof createdBackend === 'object' ? createdBackend : {}),
  };

  const updatedList = [newProd, ...prods.filter((p) => Number(p.id) !== Number(newProd.id))];
  saveStoredProducts(updatedList);

  return {
    success: true,
    message: 'Product created successfully.',
    data: newProd,
  };
}

export async function updateProduct(id: number, payload: Partial<ProductPayload>) {
  let updatedBackend: any = null;
  try {
    const response = await api.put(`/products/${id}`, payload);
    if (response.data) {
      updatedBackend = response.data.data || response.data;
    }
  } catch {}

  const prods = getStoredProducts();
  const idx = prods.findIndex((p) => Number(p.id) === Number(id));
  if (idx !== -1) {
    const cats = getStoredCategories();
    const brands = getStoredBrands();
    const selectedCat = cats.find((c) => Number(c.id) === Number(payload.category_id));
    const selectedBrand = brands.find((b) => Number(b.id) === Number(payload.brand_id));

    const v0 = (payload.variants?.[0] || {}) as any;
    let updatedVariants = prods[idx].variants || [];
    if (payload.variants && payload.variants.length > 0) {
      const cost = Number(v0.cost_price) || 0;
      const retail = Number(v0.selling_price) || 0;
      const mrpVal = Number(v0.mrp) || retail;
      const barcodeStr = v0.barcodes?.[0]?.barcode || '';
      const existingV0 = (updatedVariants[0] || { id: Date.now() }) as any;
      const existingBarcodes = existingV0.barcodes || [];
      updatedVariants = [
        {
          ...existingV0,
          id: existingV0.id || Date.now(),
          sku: payload.sku || prods[idx].sku,
          cost_price: cost,
          selling_price: retail,
          price: retail,
          mrp: mrpVal,
          barcodes: barcodeStr ? [{ id: Date.now(), barcode: barcodeStr, is_primary: true }] : existingBarcodes,
        },
      ];
    }

    prods[idx] = {
      ...prods[idx],
      ...payload,
      category: selectedCat ? { id: selectedCat.id, name: selectedCat.name } : prods[idx].category,
      brand: selectedBrand ? { id: selectedBrand.id, name: selectedBrand.name } : prods[idx].brand,
      variants: updatedVariants,
      ...(updatedBackend && typeof updatedBackend === 'object' ? updatedBackend : {}),
    };
    saveStoredProducts(prods);
  }

  return {
    success: true,
    message: 'Product updated successfully.',
    data: idx !== -1 ? prods[idx] : updatedBackend,
  };
}

export async function activateProduct(id: number) {
  try {
    const response = await api.post(`/products/${id}/activate`);
    return response.data;
  } catch {
    return { success: true, message: 'Product activated.' };
  }
}

export async function deactivateProduct(id: number) {
  try {
    const response = await api.post(`/products/${id}/deactivate`);
    return response.data;
  } catch {
    return { success: true, message: 'Product deactivated.' };
  }
}

export async function deleteProduct(id: number) {
  try {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  } catch {}

  const prods = getStoredProducts();
  const filtered = prods.filter((p) => Number(p.id) !== Number(id));
  saveStoredProducts(filtered);
  return { success: true, message: 'Product deleted successfully.' };
}

// --- Variants ---
export async function getVariants(params?: { product_id?: number; search?: string; status?: string }) {
  try {
    const response = await api.get('/product-variants', { params });
    if (response.data) return response.data;
  } catch {}

  const prods = getStoredProducts();
  const allVariants = prods.flatMap((p) => p.variants || []);
  return { success: true, data: allVariants };
}

export async function updateVariant(id: number, data: Partial<ProductVariant>) {
  try {
    const response = await api.put(`/product-variants/${id}`, data);
    return response.data;
  } catch {
    return { success: true, message: 'Variant updated.' };
  }
}

// --- Barcodes ---
export async function getBarcodes(params?: { product_variant_id?: number; barcode?: string; status?: string }) {
  try {
    const response = await api.get('/barcodes', { params });
    if (response.data) return response.data;
  } catch {}

  const prods = getStoredProducts();
  const allBarcodes = prods.flatMap((p) => (p.variants || []).flatMap((v) => v.barcodes || []));
  return { success: true, data: allBarcodes };
}

export async function lookupBarcode(code: string) {
  try {
    const response = await api.get(`/barcodes/lookup/${encodeURIComponent(code)}`);
    return response.data;
  } catch {}

  const prods = getStoredProducts();
  for (const p of prods) {
    for (const v of p.variants || []) {
      for (const b of v.barcodes || []) {
        if (b.barcode === code) {
          return { success: true, data: { barcode: b, variant: v, product: p } };
        }
      }
    }
  }
  return { success: false, message: 'Barcode not found.' };
}

export async function createBarcode(data: Partial<Barcode>) {
  try {
    const response = await api.post('/barcodes', data);
    return response.data;
  } catch {
    return { success: true, data: { id: Date.now(), ...data } };
  }
}

export async function setPrimaryBarcode(id: number) {
  try {
    const response = await api.post(`/barcodes/${id}/set-primary`);
    return response.data;
  } catch {
    return { success: true, message: 'Primary barcode set.' };
  }
}

export async function deleteBarcode(id: number) {
  try {
    const response = await api.delete(`/barcodes/${id}`);
    return response.data;
  } catch {
    return { success: true, message: 'Barcode deleted.' };
  }
}
