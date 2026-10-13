/**
 * Product Category Hierarchy & Save-to-List Verification Test Suite
 *
 * Verifies:
 * 1. Initial category hierarchy loads with root and nested parent-child categories.
 * 2. Creating a category via `createCategory` immediately persists and reflects in `getCategories()` list.
 * 3. Updating and deleting categories properly update the store.
 * 4. Search and filter parameters correctly query categories.
 * 5. CategoryList.tsx conforms to design tokens and maintains KPI summary metrics.
 * 6. Vite mock middleware provides full CRUD endpoints for categories, brands, and units.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  DEFAULT_CATEGORIES,
  getStoredCategories,
  saveStoredCategories,
} from '../api/products';

console.log('===================================================================');
console.log('--- PRODUCT CATEGORY HIERARCHY & SAVE-TO-LIST TEST SUITE ---');
console.log('===================================================================');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${description}`);
  } else {
    console.error(`[FAIL] ${description}`);
    throw new Error(`Test failed: ${description}`);
  }
}

async function runTests() {
  // 1. Initial Default Categories Verification
  assert(DEFAULT_CATEGORIES.length >= 7, 'Default categories include at least 7 predefined entries');
  const electronics = DEFAULT_CATEGORIES.find((c) => c.name === 'Electronics');
  assert(!!electronics && electronics.parent_id === null, 'Electronics is defined as a root category');
  const smartGadgets = DEFAULT_CATEGORIES.find((c) => c.name === 'Smart Devices & Gadgets');
  assert(!!smartGadgets && smartGadgets.parent_id === 1, 'Smart Devices & Gadgets is a subcategory of Electronics');

  // 2. getCategories API
  saveStoredCategories([...DEFAULT_CATEGORIES]);
  const initialRes = await getCategories();
  const initialItems = initialRes?.data || [];
  assert(initialItems.length >= 7, 'getCategories returns populated category list');
  assert(initialItems.some((c: any) => c.name === 'Baby Care'), 'Default categories include Baby Care');

  // 3. Creating a new category and verifying it appears in the list
  const newCatPayload = {
    name: 'Home & Kitchen Essentials',
    code: 'HOME',
    description: 'Cookware, appliances and dining accessories',
    parent_id: null,
    status: 'active' as const,
  };
  const createRes = await createCategory(newCatPayload);
  assert(createRes.success === true, 'createCategory returns success status');
  assert(createRes.data.name === 'Home & Kitchen Essentials', 'createCategory returns the created record');
  assert(createRes.data.code === 'HOME', 'createCategory preserves provided code');

  // Fetch list again and verify the new category is in the returned list
  const afterCreateRes = await getCategories();
  const afterItems = afterCreateRes?.data || [];
  const foundCreated = afterItems.find((c: any) => c.name === 'Home & Kitchen Essentials');
  assert(!!foundCreated, 'Newly created category is returned in getCategories() list');
  assert(foundCreated.code === 'HOME', 'Persisted category code is accurate');

  // 4. Creating a subcategory with a parent relationship
  const subCatPayload = {
    name: 'Cookware & Utensils',
    code: 'COOK',
    description: 'Pans, pots and chef tools',
    parent_id: Number(foundCreated.id),
    status: 'active' as const,
  };
  const subCatRes = await createCategory(subCatPayload);
  assert(subCatRes.success === true, 'Subcategory creation succeeds');
  const afterSubRes = await getCategories();
  const afterSubItems = afterSubRes?.data || [];
  const foundSub = afterSubItems.find((c: any) => c.name === 'Cookware & Utensils');
  assert(!!foundSub, 'Subcategory appears in category list');
  assert(Number(foundSub.parent_id) === Number(foundCreated.id), 'Subcategory has parent_id mapped to parent category');
  assert(foundSub.parent?.name === 'Home & Kitchen Essentials', 'Subcategory resolves parent object reference with parent name');

  // 5. Updating category details
  const updateRes = await updateCategory(Number(foundCreated.id), {
    name: 'Home & Living',
    description: 'Home décor, bedding and kitchenware',
  });
  assert(updateRes.success === true, 'updateCategory returns success');
  const afterUpdateRes = await getCategories();
  const updatedItems = afterUpdateRes?.data || [];
  const foundUpdated = updatedItems.find((c: any) => Number(c.id) === Number(foundCreated.id));
  assert(foundUpdated.name === 'Home & Living', 'Category name update is persisted in getCategories list');
  assert(foundUpdated.description === 'Home décor, bedding and kitchenware', 'Category description update is persisted');

  // 6. Filtering & Search query
  const searchRes = await getCategories({ search: 'Baby' });
  const searchItems = searchRes?.data || [];
  assert(searchItems.length > 0 && searchItems.every((c: any) => c.name.includes('Baby') || (c.code && c.code.includes('BABY'))), 'Search filter returns only matching categories');

  // 7. Deleting a category
  await deleteCategory(Number(foundSub.id));
  const afterDeleteRes = await getCategories();
  const afterDeleteItems = afterDeleteRes?.data || [];
  const deletedStillExists = afterDeleteItems.some((c: any) => Number(c.id) === Number(foundSub.id));
  assert(!deletedStillExists, 'deleteCategory removes the category from the list');

  // 8. Auto Unique Code System Tests
  const { generateNextCategoryCode, generateCategoryCodeFromName, getNextCategoryCode } = await import('../api/products');
  const nextAutoCode = generateNextCategoryCode();
  assert(/^CAT-\d{4}$/.test(nextAutoCode), `generateNextCategoryCode produces sequential CAT-XXXX pattern (got ${nextAutoCode})`);

  const fromNameCode = generateCategoryCodeFromName('Baby Nutrition');
  assert(typeof fromNameCode === 'string' && fromNameCode.length >= 2, `generateCategoryCodeFromName produces unique code from name (got ${fromNameCode})`);

  // Creating a category without providing a code automatically generates a unique code
  const autoCreatedRes = await createCategory({
    name: 'Outdoor & Camping',
    description: 'Tents, hiking bags and camping gear',
  });
  assert(autoCreatedRes.success === true, 'createCategory without code succeeds');
  assert(!!autoCreatedRes.data.code && autoCreatedRes.data.code.startsWith('CAT-'), `Category code was automatically uniquely generated (got ${autoCreatedRes.data.code})`);

  // 9. Verification of CategoryList.tsx Source Code
  const categoryListPath = resolve(process.cwd(), 'frontend/src/pages/products/CategoryList.tsx');
  const categoryListContent = readFileSync(categoryListPath, 'utf-8');

  assert(categoryListContent.includes('Product Category Hierarchy'), 'CategoryList has correct title');
  assert(categoryListContent.includes('Add Category'), 'CategoryList has Add Category action button');
  assert(categoryListContent.includes('Save Category'), 'CategoryList modal has Save Category submit button');
  assert(categoryListContent.includes('await fetchCategories()'), 'CategoryList awaits fetchCategories() after save to refresh list');
  assert(categoryListContent.includes('Auto Unique Code'), 'CategoryList renders Auto Unique Code badge in modal');
  assert(categoryListContent.includes('Sequential'), 'CategoryList provides Sequential auto code generator button');
  assert(categoryListContent.includes('From Name'), 'CategoryList provides From Name auto code generator button');
  assert(categoryListContent.includes('Total Categories'), 'CategoryList renders Total Categories KPI metric');
  assert(categoryListContent.includes('Root Categories'), 'CategoryList renders Root Categories KPI metric');
  assert(categoryListContent.includes('Subcategories'), 'CategoryList renders Subcategories KPI metric');
  assert(categoryListContent.includes('Active Status'), 'CategoryList renders Active Status KPI metric');
  assert(categoryListContent.includes('bg-slate-100 uppercase text-xs font-bold text-slate-800'), 'CategoryList table header adheres to design token');
  assert(categoryListContent.includes('font-bold text-slate-900'), 'CategoryList row category names display deep navy text');
  assert(!categoryListContent.includes('dark:bg-slate-800'), 'CategoryList has zero dark mode overrides');

  // 10. Verification of Backend and Vite Routes
  const viteConfigPath = resolve(process.cwd(), 'vite.config.ts');
  const viteConfigContent = readFileSync(viteConfigPath, 'utf-8');
  assert(viteConfigContent.includes('/categories/next-code'), 'vite.config.ts implements /categories/next-code endpoint');
  assert(viteConfigContent.includes('/api/v1/categories'), 'vite.config.ts implements /api/v1/categories endpoints');
  assert(viteConfigContent.includes('devCategoriesStore'), 'vite.config.ts maintains in-memory devCategoriesStore');

  const apiRoutesPath = resolve(process.cwd(), 'backend/routes/api.php');
  const apiRoutesContent = readFileSync(apiRoutesPath, 'utf-8');
  assert(apiRoutesContent.includes('categories/next-code'), 'backend/routes/api.php defines categories/next-code route');

  const categoryControllerPath = resolve(process.cwd(), 'backend/app/Http/Controllers/Api/V1/CategoryController.php');
  const categoryControllerContent = readFileSync(categoryControllerPath, 'utf-8');
  assert(categoryControllerContent.includes('generateUniqueCategoryCode'), 'CategoryController implements generateUniqueCategoryCode method');
  assert(categoryControllerContent.includes('nextCode'), 'CategoryController implements nextCode action');

  console.log('===================================================================');
  console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED.`);
  console.log('===================================================================');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
