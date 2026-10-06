import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { CompanyProvider } from './contexts/CompanyContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Accounting from "./pages/Accounting";
import { AdminLayout } from './components/layout/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { ProductList } from './pages/products/ProductList';
import { ProductForm } from './pages/products/ProductForm';
import { ItemInformation } from './pages/products/ItemInformation';
import { CategoryList } from './pages/products/CategoryList';
import { BrandList } from './pages/products/BrandList';
import { UnitList } from './pages/products/UnitList';
import { AttributeList } from './pages/products/AttributeList';
import { InventoryDashboard } from './pages/inventory/InventoryDashboard';
import { StockMovements } from './pages/inventory/StockMovements';
import { StockAdjustments } from './pages/inventory/StockAdjustments';
import { StockTransfers } from './pages/inventory/StockTransfers';
import { StockCounts } from './pages/inventory/StockCounts';
import { StockBatches } from './pages/inventory/StockBatches';
import { InventoryValuation } from './pages/inventory/InventoryValuation';
import { InventoryReconciliation } from './pages/inventory/InventoryReconciliation';
import { SupplierList } from './pages/purchase/SupplierList';
import { SupplierForm } from './pages/purchase/SupplierForm';
import { PurchaseOrderList } from './pages/purchase/PurchaseOrderList';
import { PurchaseOrderForm } from './pages/purchase/PurchaseOrderForm';
import { PurchaseList } from './pages/purchase/PurchaseList';
import { PurchaseInvoiceForm } from './pages/purchase/PurchaseInvoiceForm';
import { PurchaseInvoiceDetail } from './pages/purchase/PurchaseInvoiceDetail';
import { GoodsReceiptList } from './pages/purchase/GoodsReceiptList';
import { GoodsReceiptForm } from './pages/purchase/GoodsReceiptForm';
import { GoodsReceiptDetail } from './pages/purchase/GoodsReceiptDetail';
import { SupplierPayables } from './pages/purchase/SupplierPayables';
import { SupplierLedgerView } from './pages/purchase/SupplierLedgerView';
import { CustomerList } from './pages/customers/CustomerList';
import { CustomerGroupList } from './pages/customers/CustomerGroupList';
import ExpenseIndex from "./pages/expenses/ExpenseIndex";
import ExpenseCreate from "./pages/expenses/ExpenseCreate";
import { PosTerminal } from './pages/pos/PosTerminal';
import { PosTerminalManagement } from './pages/pos/PosTerminalManagement';
import { PaymentMethodsList } from './pages/pos/PaymentMethodsList';
import { LoyaltySettingsPage } from './pages/pos/LoyaltySettingsPage';
import SalesReturnIndex from './pages/sales-returns/SalesReturnIndex';
import SalesReturnCreate from './pages/sales-returns/SalesReturnCreate';
import { CompanyPage } from './pages/organization/CompanyPage';
import { BusinessUnitList } from './pages/organization/BusinessUnitList';
import { BranchList } from './pages/organization/BranchList';
import { WarehouseList } from './pages/organization/WarehouseList';
import { StorageLocationList } from './pages/organization/StorageLocationList';
import { UserList } from './pages/organization/UserList';
import RoleList from './pages/rbac/RoleList';
import RolePermissionMatrix from './pages/rbac/RolePermissionMatrix';
import { AuditLogList } from './pages/audit/AuditLogList';
import { PosShiftManagement } from './pages/pos/PosShiftManagement';
import { LanguageProvider } from './i18n';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <CompanyProvider>
            <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/accounting" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Accounting />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/products" element={
              <ProtectedRoute>
                <AdminLayout>
                  <ProductList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/products/item-information" element={
              <ProtectedRoute>
                <AdminLayout>
                  <ItemInformation />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/item-information" element={<Navigate to="/products/item-information" replace />} />
            <Route path="/products/new" element={
              <ProtectedRoute>
                <AdminLayout>
                  <ProductForm />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/products/:id/edit" element={
              <ProtectedRoute>
                <AdminLayout>
                  <ProductForm />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/categories" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CategoryList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/brands" element={
              <ProtectedRoute>
                <AdminLayout>
                  <BrandList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/units" element={
              <ProtectedRoute>
                <AdminLayout>
                  <UnitList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/attributes" element={
              <ProtectedRoute>
                <AdminLayout>
                  <AttributeList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute>
                <AdminLayout>
                  <InventoryDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/inventory/movements" element={
              <ProtectedRoute>
                <AdminLayout>
                  <StockMovements />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/inventory/adjustments" element={
              <ProtectedRoute>
                <AdminLayout>
                  <StockAdjustments />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/inventory/transfers" element={
              <ProtectedRoute>
                <AdminLayout>
                  <StockTransfers />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/inventory/stock-counts" element={
              <ProtectedRoute>
                <AdminLayout>
                  <StockCounts />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/inventory/batches" element={
              <ProtectedRoute>
                <AdminLayout>
                  <StockBatches />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/inventory/valuation" element={
              <ProtectedRoute>
                <AdminLayout>
                  <InventoryValuation />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/inventory/reconciliation" element={
              <ProtectedRoute>
                <AdminLayout>
                  <InventoryReconciliation />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/suppliers" element={<Navigate to="/purchases/suppliers" replace />} />
            <Route path="/suppliers/new" element={<Navigate to="/purchases/suppliers/new" replace />} />
            <Route path="/suppliers/:id/edit" element={<Navigate to="/purchases/suppliers/:id/edit" replace />} />
            <Route path="/purchases/suppliers" element={
              <ProtectedRoute>
                <AdminLayout>
                  <SupplierList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/suppliers/new" element={
              <ProtectedRoute>
                <AdminLayout>
                  <SupplierForm />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/suppliers/:id/edit" element={
              <ProtectedRoute>
                <AdminLayout>
                  <SupplierForm />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/orders" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseOrderList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/orders/new" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseOrderForm />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/orders/:id/edit" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseOrderForm />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/new" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseInvoiceForm />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/:id" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseInvoiceDetail />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/invoices" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/invoices/create" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseInvoiceForm />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/invoices/:id" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseInvoiceDetail />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/goods-receipts" element={
              <ProtectedRoute>
                <AdminLayout>
                  <GoodsReceiptList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/goods-receipts/create" element={
              <ProtectedRoute>
                <AdminLayout>
                  <GoodsReceiptForm />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/goods-receipts/:id" element={
              <ProtectedRoute>
                <AdminLayout>
                  <GoodsReceiptDetail />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/payables" element={
              <ProtectedRoute>
                <AdminLayout>
                  <SupplierPayables />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/purchases/suppliers/:id/ledger" element={
              <ProtectedRoute>
                <AdminLayout>
                  <SupplierLedgerView />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/suppliers/:id/ledger" element={<Navigate to="/purchases/suppliers/:id/ledger" replace />} />
            <Route path="/expenses" element={<ProtectedRoute><AdminLayout><ExpenseIndex /></AdminLayout></ProtectedRoute>} />
<Route path="/expenses/create" element={<ProtectedRoute><AdminLayout><ExpenseCreate /></AdminLayout></ProtectedRoute>} />
<Route path="/customers" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CustomerList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/customers/groups" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CustomerGroupList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/pos" element={
              <ProtectedRoute>
                <PosTerminal />
              </ProtectedRoute>
            } />
            <Route path="/pos/terminals" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PosTerminalManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/pos/shifts" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PosShiftManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/pos/payment-methods" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PaymentMethodsList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/pos/loyalty-settings" element={
              <ProtectedRoute>
                <AdminLayout>
                  <LoyaltySettingsPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/sales-returns" element={
              <ProtectedRoute>
                <AdminLayout>
                  <SalesReturnIndex />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/sales-returns/create" element={
              <ProtectedRoute>
                <AdminLayout>
                  <SalesReturnCreate />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/pos-terminals" element={<Navigate to="/pos/terminals" replace />} />
            <Route path="/admin/pos/terminals" element={<Navigate to="/pos/terminals" replace />} />
            {/* Organization Routes */}
            <Route path="/company" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CompanyPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/organization/company" element={<Navigate to="/company" replace />} />
            <Route path="/business-units" element={
              <ProtectedRoute>
                <AdminLayout>
                  <BusinessUnitList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/organization/business-units" element={<Navigate to="/business-units" replace />} />
            <Route path="/branches" element={
              <ProtectedRoute>
                <AdminLayout>
                  <BranchList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/organization/branches" element={<Navigate to="/branches" replace />} />
            <Route path="/warehouses" element={
              <ProtectedRoute>
                <AdminLayout>
                  <WarehouseList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/organization/warehouses" element={<Navigate to="/warehouses" replace />} />
            <Route path="/storage-locations" element={
              <ProtectedRoute>
                <AdminLayout>
                  <StorageLocationList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/organization/storage-locations" element={<Navigate to="/storage-locations" replace />} />
            <Route path="/users" element={
              <ProtectedRoute>
                <AdminLayout>
                  <UserList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/organization/users" element={<Navigate to="/users" replace />} />
            <Route path="/roles" element={
              <ProtectedRoute>
                <AdminLayout>
                  <RoleList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/roles/:id/permissions" element={
              <ProtectedRoute>
                <AdminLayout>
                  <RolePermissionMatrix />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/permissions" element={
              <ProtectedRoute>
                <AdminLayout>
                  <RolePermissionMatrix />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/audit-logs" element={
              <ProtectedRoute>
                <AdminLayout>
                  <AuditLogList />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings/audit-logs" element={<Navigate to="/audit-logs" replace />} />
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
        </CompanyProvider>
      </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}


