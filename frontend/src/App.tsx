import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Accounting from "./pages/Accounting";
import { AdminLayout } from './components/layout/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { ProductList } from './pages/products/ProductList';
import { ProductForm } from './pages/products/ProductForm';
import { CategoryList } from './pages/products/CategoryList';
import { BrandList } from './pages/products/BrandList';
import { UnitList } from './pages/products/UnitList';
import { AttributeList } from './pages/products/AttributeList';
import { InventoryDashboard } from './pages/inventory/InventoryDashboard';
import { StockMovements } from './pages/inventory/StockMovements';
import { StockTransfers } from './pages/inventory/StockTransfers';
import { SupplierList } from './pages/purchase/SupplierList';
import { SupplierForm } from './pages/purchase/SupplierForm';
import { PurchaseOrderList } from './pages/purchase/PurchaseOrderList';
import { PurchaseOrderForm } from './pages/purchase/PurchaseOrderForm';
import { PurchaseList } from './pages/purchase/PurchaseList';
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
import { CompanyPage } from './pages/organization/CompanyPage';
import { BusinessUnitList } from './pages/organization/BusinessUnitList';
import { BranchList } from './pages/organization/BranchList';
import { WarehouseList } from './pages/organization/WarehouseList';
import { StorageLocationList } from './pages/organization/StorageLocationList';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
            <Route path="/inventory/transfers" element={
              <ProtectedRoute>
                <AdminLayout>
                  <StockTransfers />
                </AdminLayout>
              </ProtectedRoute>
            } />
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
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}


