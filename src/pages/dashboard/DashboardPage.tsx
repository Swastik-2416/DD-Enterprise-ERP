import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, ShoppingCart,
  ShoppingBag, Package, Factory, IndianRupee
} from 'lucide-react'
import { KpiCard } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters'
import {
  monthlySalesData, mockProductionOrders,
  getLowStockItems, getCustomerOutstanding, getSupplierOutstanding,
  getTotalRevenue, getTotalPurchases, getTotalReceivables, getTotalPayables,
  mockItems, getItemById, getCustomerById, getSupplierById,
  mockInvoices, mockPurchaseInvoices
} from '@/lib/mockData'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface border border-outline-variant rounded-xl shadow-ambient p-3 text-sm">
        <p className="font-semibold text-on-surface mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function DashboardPage() {
  const lowStock = getLowStockItems()
  const customerOutstanding = getCustomerOutstanding()
  const supplierOutstanding = getSupplierOutstanding()
  const totalRevenue = getTotalRevenue()
  const totalPurchases = getTotalPurchases()
  const totalReceivables = getTotalReceivables()
  const totalPayables = getTotalPayables()

  // Best selling: inv-1 had 18500 pcs 60mm grey
  const bestSelling = mockItems.find(i => i.id === 'item-5')

  const recentInvoices = [...mockInvoices].reverse().slice(0, 5)
  const recentPurchases = [...mockPurchaseInvoices].reverse().slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Dashboard</h1>
        <p className="text-sm text-outline mt-0.5">Financial Year 2025–26 · As of {formatDate(new Date())}</p>
      </div>

      {/* Low stock alert banner */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            <span className="font-bold">{lowStock.length} items</span> are below minimum stock level — reorder required.
          </p>
        </div>
      )}

      {/* KPI Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue (FY)"
          value={formatCurrency(totalRevenue)}
          subtitle="incl. GST · all posted invoices"
          icon={TrendingUp}
          color="green"
          trend={{ value: '+18% vs last FY', positive: true }}
        />
        <KpiCard
          title="Total Purchases (FY)"
          value={formatCurrency(totalPurchases)}
          subtitle="incl. GST · all posted bills"
          icon={ShoppingCart}
          color="blue"
        />
        <KpiCard
          title="Customer Receivables"
          value={formatCurrency(totalReceivables)}
          subtitle="outstanding from customers"
          icon={IndianRupee}
          color="amber"
        />
        <KpiCard
          title="Supplier Payables"
          value={formatCurrency(totalPayables)}
          subtitle="outstanding to suppliers"
          icon={TrendingDown}
          color="red"
        />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Low Stock Items"
          value={String(lowStock.length)}
          subtitle="items below min stock level"
          icon={AlertTriangle}
          color="red"
        />
        <KpiCard
          title="Best Selling Product"
          value={bestSelling?.name ?? '—'}
          subtitle="Paver Block 60mm (Grey) · ₹28/pc"
          icon={Package}
          color="purple"
        />
        <KpiCard
          title="Today's Production"
          value="6,000 pcs"
          subtitle="PRD-2526-0003 · Approved"
          icon={Factory}
          color="blue"
        />
        <KpiCard
          title="Operating Expenses (FY)"
          value={formatCurrency(285000)}
          subtitle="salaries, maintenance, utilities"
          icon={TrendingDown}
          color="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Monthly Revenue vs Purchases (FY 2025–26)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlySalesData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="purchases" name="Purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Production orders */}
        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Recent Production Orders</h2>
          <div className="space-y-3">
            {mockProductionOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-on-surface">{order.order_number}</p>
                  <p className="text-xs text-outline">{formatDate(order.planned_date)} · {order.shift}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-on-surface">
                    {formatNumber(order.actual_qty ?? order.planned_qty, 0)} pcs
                  </p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outstanding tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Customer outstanding */}
        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-on-surface">Customer Outstanding</h2>
            <span className="text-xs text-outline">Total: {formatCurrency(totalReceivables)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-xs font-medium text-outline">Customer</th>
                  <th className="text-right py-2 text-xs font-medium text-outline">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {customerOutstanding.map(({ customer, outstanding }) => (
                  <tr key={customer.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5">
                      <p className="font-medium text-on-surface truncate max-w-[180px]">{customer.name}</p>
                      <p className="text-xs text-slate-400">{customer.city}</p>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-error">
                      {formatCurrency(outstanding)}
                    </td>
                  </tr>
                ))}
                {customerOutstanding.length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-center text-slate-400 text-xs">No outstanding</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplier outstanding */}
        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-on-surface">Supplier Outstanding</h2>
            <span className="text-xs text-outline">Total: {formatCurrency(totalPayables)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-xs font-medium text-outline">Supplier</th>
                  <th className="text-right py-2 text-xs font-medium text-outline">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {supplierOutstanding.map(({ supplier, outstanding }) => (
                  <tr key={supplier.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5">
                      <p className="font-medium text-on-surface truncate max-w-[180px]">{supplier.name}</p>
                      <p className="text-xs text-slate-400">{supplier.city}</p>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-error">
                      {formatCurrency(outstanding)}
                    </td>
                  </tr>
                ))}
                {supplierOutstanding.length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-center text-slate-400 text-xs">No outstanding</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low stock table */}
      <div className="bg-surface rounded-xl border border-outline-variant p-5">
        <h2 className="text-sm font-semibold text-on-surface mb-4">
          Low Stock Alerts <span className="ml-2 bg-red-100 text-error text-xs px-2 py-0.5 rounded-full">{lowStock.length}</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-xs font-medium text-outline">Item</th>
                <th className="text-right py-2 text-xs font-medium text-outline">On Hand</th>
                <th className="text-right py-2 text-xs font-medium text-outline">Min Level</th>
                <th className="text-right py-2 text-xs font-medium text-outline">Shortfall</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map(item => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-background">
                  <td className="py-2.5">
                    <p className="font-medium text-on-surface">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.sku}</p>
                  </td>
                  <td className="py-2.5 text-right text-error font-semibold">
                    {formatNumber(item.qty_on_hand, 0)}
                  </td>
                  <td className="py-2.5 text-right text-outline">
                    {formatNumber(item.min_stock_level, 0)}
                  </td>
                  <td className="py-2.5 text-right text-on-error-container font-bold">
                    {formatNumber(item.min_stock_level - item.qty_on_hand, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Recent Sales Invoices</h2>
          <div className="space-y-2">
            {recentInvoices.map(inv => {
              const cust = getCustomerById(inv.customer_id)
              return (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-on-surface">{inv.invoice_number}</p>
                    <p className="text-xs text-outline">{cust?.name} · {formatDate(inv.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-on-surface">{formatCurrency(inv.total_amount)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Recent Purchase Invoices</h2>
          <div className="space-y-2">
            {recentPurchases.map(inv => {
              const sup = getSupplierById(inv.supplier_id)
              return (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-on-surface">{inv.invoice_number}</p>
                    <p className="text-xs text-outline">{sup?.name} · {formatDate(inv.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-on-surface">{formatCurrency(inv.total_amount)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
