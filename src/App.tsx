import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ItemsPage } from '@/pages/master/ItemsPage'
import { BomPage } from '@/pages/master/BomPage'
import { UnitsPage } from '@/pages/master/UnitsPage'
import { CategoriesPage } from '@/pages/master/CategoriesPage'
import { WarehousesPage } from '@/pages/master/WarehousesPage'
import { WarehouseTransfersPage } from '@/pages/inventory/WarehouseTransfersPage'
import { SuppliersPage } from '@/pages/stakeholders/SuppliersPage'
import { CustomersPage } from '@/pages/stakeholders/CustomersPage'
import { PurchaseOrdersPage } from '@/pages/procurement/PurchaseOrdersPage'
import { PurchaseInvoicesPage } from '@/pages/procurement/PurchaseInvoicesPage'
import { GoodsReceiptsPage } from '@/pages/procurement/GoodsReceiptsPage'
import { PurchaseReturnsPage } from '@/pages/procurement/PurchaseReturnsPage'
import { InvoicesPage } from '@/pages/sales/InvoicesPage'
import { DeliveryChallansPage } from '@/pages/sales/DeliveryChallansPage'
import { QuotationsPage } from '@/pages/sales/QuotationsPage'
import { SalesOrdersPage } from '@/pages/sales/SalesOrdersPage'
import { FreightRegisterPage } from '@/pages/transport/FreightRegisterPage'
import { TransporterPaymentsPage } from '@/pages/transport/TransporterPaymentsPage'
import { PaymentsPage } from '@/pages/payments/PaymentsPage'
import { AttendancePage } from '@/pages/hr/AttendancePage'
import { ProductionOrdersPage } from '@/pages/manufacturing/ProductionOrdersPage'
import { ProductionReportPage } from '@/pages/reports/ProductionReportPage'
import { StockReportPage } from '@/pages/reports/StockReportPage'
import { GstReportPage } from '@/pages/reports/GstReportPage'
import { SalesRegisterPage } from '@/pages/reports/SalesRegisterPage'
import { PurchaseRegisterPage } from '@/pages/reports/PurchaseRegisterPage'
import { PartyLedgerPage } from '@/pages/finance/PartyLedgerPage'
import { ExpensesPage } from '@/pages/finance/ExpensesPage'
import { OtherIncomePage } from '@/pages/finance/OtherIncomePage'
import { ProfitLossPage } from '@/pages/finance/ProfitLossPage'
import { AgingReportPage } from '@/pages/finance/AgingReportPage'
import { ExecutiveAnalyticsPage } from '@/pages/analytics/ExecutiveAnalyticsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { ProfilePage } from '@/pages/settings/ProfilePage'
import { AuditLogPage } from '@/pages/settings/AuditLogPage'
import { PlaceholderPage } from '@/pages/common/PlaceholderPage'

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />

          {/* Master Data */}
          <Route path="master/items" element={<ItemsPage />} />
          <Route path="master/bom" element={<BomPage />} />
          <Route path="master/units" element={<UnitsPage />} />
          <Route path="master/categories" element={<CategoriesPage />} />
          <Route path="master/warehouses" element={<WarehousesPage />} />

          {/* Stakeholders */}
          <Route path="stakeholders/vendors" element={<SuppliersPage />} />
          <Route path="stakeholders/suppliers" element={<SuppliersPage />} />
          <Route path="stakeholders/customers" element={<CustomersPage />} />
          <Route
            path="stakeholders/employees"
            element={<PlaceholderPage title="Employee Management" subtitle="Staff records, daily wages & monthly payroll registry" />}
          />
          <Route
            path="stakeholders/labour"
            element={<PlaceholderPage title="Labour Contractors" subtitle="Contractor records, piece-rate tracking and daily muster" />}
          />
          <Route
            path="stakeholders/transporters"
            element={<PlaceholderPage title="Transporters" subtitle="Vehicle fleet, drivers, lorry freight agreements & challans" />}
          />

          {/* Procurement */}
          <Route path="procurement/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="procurement/purchase-invoices" element={<PurchaseInvoicesPage />} />
          <Route path="procurement/goods-receipts" element={<GoodsReceiptsPage />} />
          <Route path="procurement/returns" element={<PurchaseReturnsPage />} />
          <Route path="procurement/purchase-returns" element={<PurchaseReturnsPage />} />

          {/* Manufacturing & Inventory */}
          <Route path="manufacturing/production-orders" element={<ProductionOrdersPage />} />
          <Route path="manufacturing/fg-inventory" element={<StockReportPage />} />
          <Route path="manufacturing/transfers" element={<WarehouseTransfersPage />} />
          <Route path="inventory/transfers" element={<WarehouseTransfersPage />} />

          {/* Sales */}
          <Route path="sales/quotations" element={<QuotationsPage />} />
          <Route path="sales/orders" element={<SalesOrdersPage />} />
          <Route path="sales/invoices" element={<InvoicesPage />} />
          <Route path="sales/delivery-challans" element={<DeliveryChallansPage />} />
          {/* <Route
            path="sales/credit-notes"
            element={<PlaceholderPage title="Credit Notes" subtitle="Sales returns, rate adjustments & breakage allowances" />}
          /> */}

          {/* Payments */}
          <Route path="payments/inward" element={<PaymentsPage defaultType="inward" />} />
          <Route path="payments/outward" element={<PaymentsPage defaultType="outward" />} />

          {/* HR & Payroll */}
          <Route path="hr/attendance" element={<AttendancePage />} />
          {/* <Route
            path="hr/payroll"
            element={<PlaceholderPage title="Payroll Register" subtitle="Monthly salary slips, wage calculations & cash advances" />}
          /> */}

          {/* Transport */}
          <Route path="transport/freight" element={<FreightRegisterPage />} />
          <Route path="transport/payments" element={<TransporterPaymentsPage />} />

          {/* Finance */}
          <Route path="finance/customer-ledger" element={<PartyLedgerPage partyType="customer" />} />
          <Route path="finance/vendor-ledger" element={<PartyLedgerPage partyType="supplier" />} />
          <Route path="finance/supplier-ledger" element={<PartyLedgerPage partyType="supplier" />} />
          <Route path="finance/aging" element={<AgingReportPage />} />
          <Route path="finance/expenses" element={<ExpensesPage />} />
          <Route path="finance/other-income" element={<OtherIncomePage />} />
          <Route path="finance/pl-report" element={<ProfitLossPage />} />

          {/* Reports & Analytics */}
          <Route path="analytics" element={<ExecutiveAnalyticsPage />} />
          <Route path="reports/analytics" element={<ExecutiveAnalyticsPage />} />
          <Route path="reports/purchases" element={<PurchaseRegisterPage />} />
          <Route path="reports/sales" element={<SalesRegisterPage />} />
          <Route path="reports/aging" element={<AgingReportPage />} />
          <Route path="reports/stock" element={<StockReportPage />} />
          <Route path="reports/production" element={<ProductionReportPage />} />
          <Route path="reports/gst" element={<GstReportPage />} />

          {/* Settings & User Profile */}
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/profile" element={<ProfilePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings/audit-logs" element={<AuditLogPage />} />
          <Route path="audit-logs" element={<AuditLogPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
