/**
 * RetailCore ERP — Dynamic Table Column Resizing, Visibility & Expandability Test Suite
 *
 * Verifies:
 *  1. Column definitions: ITEM / SKU, BARCODE, CATEGORY & BRAND, COST, RETAIL, GP %, STOCK, STATUS, ACTION
 *  2. Drag-to-resize handles with cursor-col-resize and active state styling
 *  3. Dynamic column visibility dropdown and toggling (show/hide columns to view hidden information)
 *  4. Single-line vs Wrap Text toggle to reveal full text details without truncation
 *  5. Elimination of rigid max-w-[180px] constraint to allow dynamic expansion
 *  6. Auto-fit / expand-all and reset-widths actions
 *  7. LocalStorage persistence for user column preferences
 *  8. Table-fixed layout with colgroup and dynamic min-width calculation
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('--- DYNAMIC TABLE COLUMN RESIZING & VISIBILITY TEST SUITE ---');
console.log('================================================================');

const itemInfoPath = resolve(process.cwd(), 'frontend/src/pages/products/ItemInformation.tsx');
assert(existsSync(itemInfoPath), 'ItemInformation.tsx exists in products directory');

const itemInfoContent = readFileSync(itemInfoPath, 'utf-8');

// 1. Column Definitions
assert(itemInfoContent.includes('DEFAULT_CATALOG_COLUMNS'), 'DEFAULT_CATALOG_COLUMNS defined');
assert(itemInfoContent.includes("id: 'item', label: 'Item / SKU'"), 'Item / SKU column defined');
assert(itemInfoContent.includes("id: 'barcode', label: 'Barcode'"), 'Barcode column defined');
assert(itemInfoContent.includes("id: 'category_brand', label: 'Category & Brand'"), 'Category & Brand column defined');
assert(itemInfoContent.includes("id: 'cost', label: 'Cost (৳)'"), 'Cost (৳) column defined');
assert(itemInfoContent.includes("id: 'retail', label: 'Retail (৳)'"), 'Retail (৳) column defined');
assert(itemInfoContent.includes("id: 'gp', label: 'GP %'"), 'GP % column defined');
assert(itemInfoContent.includes("id: 'stock', label: 'Stock'"), 'Stock column defined');
assert(itemInfoContent.includes("id: 'status', label: 'Status'"), 'Status column defined');
assert(itemInfoContent.includes("id: 'action', label: 'Action'"), 'Action column defined');

// 2. Drag-to-Resize Mechanics
assert(itemInfoContent.includes('handleResizeStart'), 'handleResizeStart drag handler implemented');
assert(itemInfoContent.includes('cursor-col-resize'), 'cursor-col-resize styling on resizer handles');
assert(itemInfoContent.includes('activeResizingCol'), 'activeResizingCol tracking active drag interaction');
assert(itemInfoContent.includes('resetColumnWidth'), 'Double-click resetColumnWidth handler implemented');
assert(itemInfoContent.includes('onDoubleClick={() => resetColumnWidth(col.id)}'), 'Double-click listener attached to resizer');

// 3. Dynamic Column Visibility / Hide-Show
assert(itemInfoContent.includes('columnVisibility'), 'columnVisibility state initialized');
assert(itemInfoContent.includes('toggleColumnVisibility'), 'toggleColumnVisibility function present');
assert(itemInfoContent.includes('showColumnMenu'), 'showColumnMenu toggle for column chooser dropdown');
assert(itemInfoContent.includes('activeColumns.map'), 'Table headers dynamically rendered from activeColumns');
assert(itemInfoContent.includes('colSpan={activeColumns.length}'), 'Empty state colSpan dynamically matches active visible columns');

// 4. Reveal Hidden Information (Text Wrap & Unconstrained Widths)
assert(itemInfoContent.includes('isWrapText'), 'isWrapText toggle state defined');
assert(itemInfoContent.includes('toggleWrapText'), 'toggleWrapText toggle handler present');
assert(itemInfoContent.includes('Full Text (Wrap)'), 'Wrap text UI button label present');
assert(!itemInfoContent.includes('max-w-[180px]'), 'Rigid max-w-[180px] constraint removed to allow column expansion');
assert(itemInfoContent.includes('title={p.name}'), 'Hover tooltip title attribute added to item name');

// 5. Action Controls
assert(itemInfoContent.includes('autoFitAllColumns'), 'autoFitAllColumns helper present');
assert(itemInfoContent.includes('resetAllColumnWidths'), 'resetAllColumnWidths helper present');

// 6. LocalStorage Persistence
assert(itemInfoContent.includes('retailcore_item_info_col_widths_v2'), 'Column widths persisted to localStorage');
assert(itemInfoContent.includes('retailcore_item_info_col_visibility_v2'), 'Column visibility persisted to localStorage');
assert(itemInfoContent.includes('retailcore_item_info_wrap_mode_v2'), 'Wrap mode persisted to localStorage');

// 7. Table Layout Architecture
assert(itemInfoContent.includes('table-fixed'), 'table-fixed layout ensures pixel-perfect column widths');
assert(itemInfoContent.includes('<colgroup>'), 'colgroup used for instantaneous column sizing');
assert(itemInfoContent.includes('totalTableWidth'), 'totalTableWidth dynamically calculated for smooth horizontal scrolling');

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} DYNAMIC COLUMN TESTS PASSED.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
