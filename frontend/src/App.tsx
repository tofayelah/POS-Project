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
import { ProcurementDashboard } from './pages/procurement/ProcurementDashboard';
import { PurchaseRequisitions } from './pages/procurement/PurchaseRequisitions';
import { RfqManagement } from './pages/procurement/RfqManagement';
import { SupplierPerformance } from './pages/procurement/SupplierPerformance';
import { SupplierContracts } from './pages/procurement/SupplierContracts';
import { ThreeWayMatchingExceptions } from './pages/procurement/ThreeWayMatchingExceptions';
import { ProcurementRecommendations } from './pages/procurement/ProcurementRecommendations';
import { Customer360 } from './pages/crm/Customer360';
import { CustomerCreditManagement } from './pages/crm/CustomerCreditManagement';
import { ArAgingDashboard } from './pages/crm/ArAgingDashboard';
import { CrmActivityCenter } from './pages/crm/CrmActivityCenter';
import { CustomerIntelligenceDashboard } from './pages/crm/CustomerIntelligenceDashboard';
import { SalesIntelligenceDashboard } from './pages/crm/SalesIntelligenceDashboard';
import { HrDashboard } from './pages/hr/HrDashboard';
import { EmployeeManagement } from './pages/hr/EmployeeManagement';
import { EmployeeProfile } from './pages/hr/EmployeeProfile';
import { DepartmentDesignationManagement } from './pages/hr/DepartmentDesignationManagement';
import { ShiftAttendanceManagement } from './pages/hr/ShiftAttendanceManagement';
import { LeaveManagement } from './pages/hr/LeaveManagement';
import { PayrollManagement } from './pages/hr/PayrollManagement';
import { AdvanceLoanManagement } from './pages/hr/AdvanceLoanManagement';
import { TaxDashboard } from './pages/tax/TaxDashboard';
import { TaxProfileManagement } from './pages/tax/TaxProfileManagement';
import { TaxRuleManagement } from './pages/tax/TaxRuleManagement';
import { TaxPeriodManagement } from './pages/tax/TaxPeriodManagement';
import { TaxTransactionRegister } from './pages/tax/TaxTransactionRegister';
import { TaxReconciliationView } from './pages/tax/TaxReconciliationView';
import { TaxAdjustmentManagement } from './pages/tax/TaxAdjustmentManagement';
import { TaxReports } from './pages/tax/TaxReports';
import { EcommerceDashboard } from './pages/ecommerce/EcommerceDashboard';
import { OrderManagement } from './pages/ecommerce/OrderManagement';
import { OrderDetail } from './pages/ecommerce/OrderDetail';
import { FulfillmentManagement } from './pages/ecommerce/FulfillmentManagement';
import { CatalogManagement } from './pages/ecommerce/CatalogManagement';
import { EcommerceCategoryManagement } from './pages/ecommerce/EcommerceCategoryManagement';
import { CouponManagement } from './pages/ecommerce/CouponManagement';
import { ShippingConfiguration } from './pages/ecommerce/ShippingConfiguration';
import { ReviewModeration } from './pages/ecommerce/ReviewModeration';
import { EcommerceReturnManagement } from './pages/ecommerce/EcommerceReturnManagement';
import { EcommerceReports } from './pages/ecommerce/EcommerceReports';
import { StoreSettings } from './pages/ecommerce/StoreSettings';

import { StorefrontHome } from './pages/storefront/StorefrontHome';
import { StorefrontCatalog } from './pages/storefront/StorefrontCatalog';
import { StorefrontProductDetail } from './pages/storefront/StorefrontProductDetail';
import { StorefrontCart } from './pages/storefront/StorefrontCart';
import { StorefrontCheckout } from './pages/storefront/StorefrontCheckout';
import { StorefrontAccount } from './pages/storefront/StorefrontAccount';
import { StorefrontOrderTracking } from './pages/storefront/StorefrontOrderTracking';
import { StorefrontAuth } from './pages/storefront/StorefrontAuth';
import { FinancialManagementDashboard } from './pages/finance/FinancialManagementDashboard';
import { BudgetManagement } from './pages/finance/BudgetManagement';
import { BudgetVsActual } from './pages/finance/BudgetVsActual';
import { CashTreasuryManagement } from './pages/finance/CashTreasuryManagement';
import { BankManagement } from './pages/finance/BankManagement';
import { BankReconciliationView } from './pages/finance/BankReconciliationView';
import { FinancialPeriodManagement } from './pages/finance/FinancialPeriodManagement';
import { CostProfitCentreManagement } from './pages/finance/CostProfitCentreManagement';
import { AdvancedArManagement } from './pages/finance/AdvancedArManagement';
import { AdvancedApManagement } from './pages/finance/AdvancedApManagement';
import { FixedAssetManagement } from './pages/finance/FixedAssetManagement';
import { FinancialReportsAndRatios } from './pages/finance/FinancialReportsAndRatios';
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
            {/* Procurement Intelligence (Phase 7) */}
            <Route path="/procurement" element={<Navigate to="/procurement/dashboard" replace />} />
            <Route path="/procurement/dashboard" element={
              <ProtectedRoute>
                <AdminLayout>
                  <ProcurementDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/procurement/requisitions" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseRequisitions />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/procurement/rfqs" element={
              <ProtectedRoute>
                <AdminLayout>
                  <RfqManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/procurement/supplier-performance" element={
              <ProtectedRoute>
                <AdminLayout>
                  <SupplierPerformance />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/procurement/contracts" element={
              <ProtectedRoute>
                <AdminLayout>
                  <SupplierContracts />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/procurement/matching" element={
              <ProtectedRoute>
                <AdminLayout>
                  <ThreeWayMatchingExceptions />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/procurement/planning" element={
              <ProtectedRoute>
                <AdminLayout>
                  <ProcurementRecommendations />
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
            {/* Phase 8: CRM, Credit, AR Aging, Intelligence & Sales */}
            <Route path="/crm/customer-360" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Customer360 />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/crm/credit" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CustomerCreditManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/crm/ar-aging" element={
              <ProtectedRoute>
                <AdminLayout>
                  <ArAgingDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/crm/activities" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CrmActivityCenter />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/crm/intelligence" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CustomerIntelligenceDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/crm/sales-intelligence" element={
              <ProtectedRoute>
                <AdminLayout>
                  <SalesIntelligenceDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            {/* Phase 9: HRM, Attendance, Leave & Payroll Routes */}
            <Route path="/hr/dashboard" element={
              <ProtectedRoute>
                <AdminLayout>
                  <HrDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/hr/employees" element={
              <ProtectedRoute>
                <AdminLayout>
                  <EmployeeManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/hr/employees/:id" element={
              <ProtectedRoute>
                <AdminLayout>
                  <EmployeeProfile />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/hr/departments" element={
              <ProtectedRoute>
                <AdminLayout>
                  <DepartmentDesignationManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/hr/designations" element={<Navigate to="/hr/departments" replace />} />
            <Route path="/hr/attendance" element={
              <ProtectedRoute>
                <AdminLayout>
                  <ShiftAttendanceManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/hr/shifts" element={<Navigate to="/hr/attendance" replace />} />
            <Route path="/hr/leaves" element={
              <ProtectedRoute>
                <AdminLayout>
                  <LeaveManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/hr/payroll" element={
              <ProtectedRoute>
                <AdminLayout>
                  <PayrollManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/hr/advances-loans" element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdvanceLoanManagement />
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

            {/* Tax & VAT Compliance Routes */}
            <Route path="/tax/dashboard" element={
              <ProtectedRoute>
                <AdminLayout>
                  <TaxDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/tax/profiles" element={
              <ProtectedRoute>
                <AdminLayout>
                  <TaxProfileManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/tax/rules" element={
              <ProtectedRoute>
                <AdminLayout>
                  <TaxRuleManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/tax/periods" element={
              <ProtectedRoute>
                <AdminLayout>
                  <TaxPeriodManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/tax/transactions" element={
              <ProtectedRoute>
                <AdminLayout>
                  <TaxTransactionRegister />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/tax/reconciliation" element={
              <ProtectedRoute>
                <AdminLayout>
                  <TaxReconciliationView />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/tax/adjustments" element={
              <ProtectedRoute>
                <AdminLayout>
                  <TaxAdjustmentManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/tax/reports" element={
              <ProtectedRoute>
                <AdminLayout>
                  <TaxReports />
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* E-Commerce Admin Routes */}
            <Route path="/ecommerce" element={
              <ProtectedRoute>
                <AdminLayout>
                  <EcommerceDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/dashboard" element={
              <ProtectedRoute>
                <AdminLayout>
                  <EcommerceDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/orders" element={
              <ProtectedRoute>
                <AdminLayout>
                  <OrderManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/orders/:id" element={
              <ProtectedRoute>
                <AdminLayout>
                  <OrderDetail />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/fulfillment" element={
              <ProtectedRoute>
                <AdminLayout>
                  <FulfillmentManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/catalog" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CatalogManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/categories" element={
              <ProtectedRoute>
                <AdminLayout>
                  <EcommerceCategoryManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/coupons" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CouponManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/shipping" element={
              <ProtectedRoute>
                <AdminLayout>
                  <ShippingConfiguration />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/reviews" element={
              <ProtectedRoute>
                <AdminLayout>
                  <ReviewModeration />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/returns" element={
              <ProtectedRoute>
                <AdminLayout>
                  <EcommerceReturnManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/reports" element={
              <ProtectedRoute>
                <AdminLayout>
                  <EcommerceReports />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/settings" element={
              <ProtectedRoute>
                <AdminLayout>
                  <StoreSettings />
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* Advanced Financial Management Routes */}
            <Route path="/finance" element={<Navigate to="/finance/dashboard" replace />} />
            <Route path="/finance/dashboard" element={
              <ProtectedRoute>
                <AdminLayout>
                  <FinancialManagementDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/finance/budgets" element={
              <ProtectedRoute>
                <AdminLayout>
                  <BudgetManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/finance/budgets/:id/variance" element={
              <ProtectedRoute>
                <AdminLayout>
                  <BudgetVsActual />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/finance/treasury" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CashTreasuryManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/finance/banks" element={
              <ProtectedRoute>
                <AdminLayout>
                  <BankManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/finance/bank-reconciliation" element={
              <ProtectedRoute>
                <AdminLayout>
                  <BankReconciliationView />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/finance/periods" element={
              <ProtectedRoute>
                <AdminLayout>
                  <FinancialPeriodManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/finance/centres" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CostProfitCentreManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/finance/ar" element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdvancedArManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/finance/ap" element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdvancedApManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/finance/fixed-assets" element={
              <ProtectedRoute>
                <AdminLayout>
                  <FixedAssetManagement />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/finance/analytics" element={
              <ProtectedRoute>
                <AdminLayout>
                  <FinancialReportsAndRatios />
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* E-Commerce Storefront Routes */}
            <Route path="/store" element={<StorefrontHome />} />
            <Route path="/store/catalog" element={<StorefrontCatalog />} />
            <Route path="/store/products/:slug" element={<StorefrontProductDetail />} />
            <Route path="/store/cart" element={<StorefrontCart />} />
            <Route path="/store/checkout" element={<StorefrontCheckout />} />
            <Route path="/store/account" element={<StorefrontAccount />} />
            <Route path="/store/track" element={<StorefrontOrderTracking />} />
            <Route path="/store/login" element={<StorefrontAuth />} />

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


