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
import { PurchaseOrderList } from './pages/purchase/PurchaseOrderList';
import { PurchaseList } from './pages/purchase/PurchaseList';
import { CustomerList } from './pages/customers/CustomerList';
import { CustomerGroupList } from './pages/customers/CustomerGroupList';
import ExpenseIndex from "./pages/expenses/ExpenseIndex";
import ExpenseCreate from "./pages/expenses/ExpenseCreate";
import { PosTerminal } from './pages/pos/PosTerminal';

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
            <Route path="/purchases/orders" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseOrderList />
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
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}


