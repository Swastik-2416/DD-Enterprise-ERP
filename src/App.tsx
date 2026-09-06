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
import { SuppliersPage } from '@/pages/stakeholders/SuppliersPage'
import { CustomersPage } from '@/pages/stakeholders/CustomersPage'
import { PurchaseInvoicesPage } from '@/pages/procurement/PurchaseInvoicesPage'
import { InvoicesPage } from '@/pages/sales/InvoicesPage'
import { PaymentsPage } from '@/pages/payments/PaymentsPage'
import { ProductionOrdersPage } from '@/pages/manufacturing/ProductionOrdersPage'
import { StockReportPage } from '@/pages/reports/StockReportPage'
import { GstReportPage } from '@/pages/reports/GstReportPage'
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

          {/* Stakeholders */}
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
          <Route
            path="procurement/purchase-orders"
            element={<PlaceholderPage title="Purchase Orders" subtitle="Raw material POs, cement & aggregate supply contracts" />}
          />
          <Route path="procurement/purchase-invoices" element={<PurchaseInvoicesPage />} />
          <Route
            path="procurement/goods-receipts"
            element={<PlaceholderPage title="Goods Receipts (MRN)" subtitle="Gate entry inspection, weighbridge slips & inward delivery verification" />}
          />

          {/* Manufacturing */}
          <Route path="manufacturing/production-orders" element={<ProductionOrdersPage />} />
          <Route path="manufacturing/fg-inventory" element={<StockReportPage />} />

          {/* Sales */}
          <Route
            path="sales/quotations"
            element={<PlaceholderPage title="Sales Quotations" subtitle="Price estimates for contractors, builders, and government tenders" />}
          />
          <Route
            path="sales/orders"
            element={<PlaceholderPage title="Sales Orders" subtitle="Confirmed orders, production commitments & booking advances" />}
          />
          <Route path="sales/invoices" element={<InvoicesPage />} />
          <Route
            path="sales/delivery-challans"
            element={<PlaceholderPage title="Delivery Challans" subtitle="Dispatch gate passes, truck load slips & customer sign-offs" />}
          />
          <Route
            path="sales/credit-notes"
            element={<PlaceholderPage title="Credit Notes" subtitle="Sales returns, rate adjustments & breakage allowances" />}
          />

          {/* Payments */}
          <Route path="payments/inward" element={<PaymentsPage defaultType="inward" />} />
          <Route path="payments/outward" element={<PaymentsPage defaultType="outward" />} />

          {/* HR & Payroll */}
          <Route
            path="hr/attendance"
            element={<PlaceholderPage title="Daily Attendance" subtitle="Factory labour attendance muster and overtime hours tracking" />}
          />
          <Route
            path="hr/payroll"
            element={<PlaceholderPage title="Payroll Register" subtitle="Monthly salary slips, wage calculations & cash advances" />}
          />

          {/* Transport */}
          <Route
            path="transport/freight"
            element={<PlaceholderPage title="Freight Register" subtitle="Trip logs, per-ton / per-trip freight costs and transit challans" />}
          />
          <Route
            path="transport/payments"
            element={<PlaceholderPage title="Transporter Payments" subtitle="Lorry freight settlements & fuel advances" />}
          />

          {/* Finance */}
          <Route
            path="finance/customer-ledger"
            element={<PlaceholderPage title="Customer Statement of Account" subtitle="Party-wise debit/credit ledger and payment reconciliation" />}
          />
          <Route
            path="finance/supplier-ledger"
            element={<PlaceholderPage title="Supplier Statement of Account" subtitle="Vendor-wise billing and payment reconciliation" />}
          />
          <Route
            path="finance/expenses"
            element={<PlaceholderPage title="Indirect Expenses" subtitle="Electricity, diesel for DG sets, machine repairs & factory maintenance" />}
          />
          <Route
            path="finance/other-income"
            element={<PlaceholderPage title="Other Income" subtitle="Scrap sales, pallet deposits & miscellaneous receipts" />}
          />
          <Route
            path="finance/pl-report"
            element={<PlaceholderPage title="Profit & Loss Statement" subtitle="Trading account, gross margin & net operational surplus" />}
          />

          {/* Reports */}
          <Route path="reports/purchases" element={<PurchaseInvoicesPage />} />
          <Route path="reports/sales" element={<InvoicesPage />} />
          <Route path="reports/stock" element={<StockReportPage />} />
          <Route path="reports/production" element={<ProductionOrdersPage />} />
          <Route path="reports/gst" element={<GstReportPage />} />

          {/* Settings */}
          <Route
            path="settings"
            element={<PlaceholderPage title="Business Settings" subtitle="Company profile, GSTIN, bank accounts, and user access roles" />}
          />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
