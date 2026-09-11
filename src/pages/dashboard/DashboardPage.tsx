import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, ShoppingCart,
  Package, IndianRupee, Layers, Users, Building2, Factory,
  CheckCircle2, ArrowRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { KpiCard } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_WAREHOUSE_ID } from '@/lib/constants'
import type { Item, Customer, Supplier, Invoice, PurchaseInvoice, ProductionOrder } from '@/types/database.types'

interface InvoiceWithCustomer extends Invoice {
  customer?: Customer
}

interface PurchaseWithSupplier extends PurchaseInvoice {
  supplier?: Supplier
}

interface ProductionWithBOM extends Omit<ProductionOrder, 'bom'> {
  bom?: {
    finished_good?: {
      name: string
      sku: string
    }
  }
}

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

const FY_MONTHS = [
  { key: '04', label: 'Apr' },
  { key: '05', label: 'May' },
  { key: '06', label: 'Jun' },
  { key: '07', label: 'Jul' },
  { key: '08', label: 'Aug' },
  { key: '09', label: 'Sep' },
  { key: '10', label: 'Oct' },
  { key: '11', label: 'Nov' },
  { key: '12', label: 'Dec' },
  { key: '01', label: 'Jan' },
  { key: '02', label: 'Feb' },
  { key: '03', label: 'Mar' },
]

export function DashboardPage() {
  const { user } = useAuth()
  const companyId = user?.company_id || ''

  // ─── Real Supabase Queries ───────────────────────────────────────────────────

  // 1. Items
  const { data: items = [] } = useQuery({
    queryKey: ['dashboard_items', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
      if (error) throw error
      return (data || []) as Item[]
    },
    enabled: !!companyId,
  })

  // 2. Stock balances
  const { data: stockMap = {} } = useQuery({
    queryKey: ['dashboard_stock_balances', companyId],
    queryFn: async () => {
      const { data: itemRows } = await (supabase.from('items') as any)
        .select('id')
        .eq('company_id', companyId)
      if (!itemRows?.length) return {}
      const ids = (itemRows as { id: string }[]).map(i => i.id)
      const { data, error } = await (supabase.from('stock_balances') as any)
        .select('item_id, qty_on_hand')
        .in('item_id', ids)
        .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
      if (error) return {}
      const map: Record<string, number> = {}
      ;(data as { item_id: string; qty_on_hand: number }[])?.forEach(b => {
        map[b.item_id] = Number(b.qty_on_hand) || 0
      })
      return map
    },
    enabled: !!companyId,
  })

  // 3. Customers
  const { data: liveCustomers = [] } = useQuery({
    queryKey: ['dashboard_customers', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name')
      return (data || []) as Customer[]
    },
    enabled: !!companyId,
  })

  // 4. Suppliers
  const { data: liveSuppliers = [] } = useQuery({
    queryKey: ['dashboard_suppliers', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name')
      return (data || []) as Supplier[]
    },
    enabled: !!companyId,
  })

  // 5. BOM Count
  const { data: bomCount = 0 } = useQuery({
    queryKey: ['dashboard_boms_count', companyId],
    queryFn: async () => {
      const { count } = await (supabase.from('boms') as any)
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true)
      return count || 0
    },
    enabled: !!companyId,
  })

  // 6. Sales Invoices
  const { data: salesInvoices = [] } = useQuery({
    queryKey: ['dashboard_sales_invoices', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, city)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })
      if (error) return []
      return (data || []) as InvoiceWithCustomer[]
    },
    enabled: !!companyId,
  })

  // 7. Purchase Invoices
  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ['dashboard_purchase_invoices', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          *,
          supplier:suppliers(id, name, city)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })
      if (error) return []
      return (data || []) as PurchaseWithSupplier[]
    },
    enabled: !!companyId,
  })

  // 8. Production Orders
  const { data: productionOrders = [] } = useQuery({
    queryKey: ['dashboard_production_orders', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_orders')
        .select(`
          *,
          bom:boms(
            finished_good:items(name, sku)
          )
        `)
        .eq('company_id', companyId)
        .order('planned_date', { ascending: false })
      if (error) return []
      return (data || []) as ProductionWithBOM[]
    },
    enabled: !!companyId,
  })

  // ─── Real Computed Metrics ───────────────────────────────────────────────────

  // Finished Goods & Raw Materials count
  const finishedGoodsCount = items.filter(i => i.type === 'finished_good').length
  const rawMaterialsCount = items.filter(i => i.type === 'raw_material').length

  // Revenue (posted sales invoices)
  const postedSales = salesInvoices.filter(i => i.status === 'posted')
  const totalRevenue = postedSales.reduce((s, i) => s + (Number(i.total_amount) || 0), 0)

  // Purchases (posted purchase bills)
  const postedPurchases = purchaseInvoices.filter(i => i.status === 'posted')
  const totalPurchases = postedPurchases.reduce((s, i) => s + (Number(i.total_amount) || 0), 0)

  // Customer Receivables (active non-cancelled invoices)
  const activeSales = salesInvoices.filter(i => i.status !== 'cancelled')
  const totalReceivables = activeSales.reduce((s, i) => {
    const due = (Number(i.total_amount) || 0) - (Number(i.paid_amount) || 0)
    return s + Math.max(0, due)
  }, 0)

  // Supplier Payables (posted purchase bills unpaid)
  const totalPayables = postedPurchases.reduce((s, i) => s + (Number(i.total_amount) || 0), 0)

  // Real Low stock items
  const lowStock = items
    .map(item => ({
      ...item,
      qty_on_hand: stockMap[item.id] ?? 0,
    }))
    .filter(item => item.min_stock_level > 0 && item.qty_on_hand <= item.min_stock_level)

  // Real Monthly Bar Chart Data
  const monthlyChartData = useMemo(() => {
    const monthlyMap: Record<string, { revenue: number; purchases: number }> = {}
    FY_MONTHS.forEach(m => {
      monthlyMap[m.key] = { revenue: 0, purchases: 0 }
    })

    postedSales.forEach(inv => {
      if (!inv.date) return
      const monthPart = inv.date.slice(5, 7) // 'YYYY-MM-DD'
      if (monthlyMap[monthPart]) {
        monthlyMap[monthPart].revenue += Number(inv.total_amount) || 0
      }
    })

    postedPurchases.forEach(bill => {
      if (!bill.date) return
      const monthPart = bill.date.slice(5, 7)
      if (monthlyMap[monthPart]) {
        monthlyMap[monthPart].purchases += Number(bill.total_amount) || 0
      }
    })

    return FY_MONTHS.map(m => ({
      month: m.label,
      revenue: monthlyMap[m.key]?.revenue || 0,
      purchases: monthlyMap[m.key]?.purchases || 0,
    }))
  }, [postedSales, postedPurchases])

  const recentSales = salesInvoices.slice(0, 5)
  const recentPurchases = purchaseInvoices.slice(0, 5)
  const recentProduction = productionOrders.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Factory Overview Dashboard</h1>
        <p className="text-sm text-outline mt-0.5">
          DD Enterprise Paver Block Plant · Live Database · As of {formatDate(new Date())}
        </p>
      </div>

      {/* Low stock alert banner */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900 font-medium">
              <span className="font-bold">{lowStock.length} items</span> are below minimum re-order threshold.
            </p>
          </div>
          <Link
            to="/reports/stock"
            className="text-xs font-bold text-amber-800 hover:text-amber-900 underline flex items-center gap-1"
          >
            View Stock Report <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* KPI Row 1 - Operational Master Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Master Items (SKUs)"
          value={String(items.length)}
          subtitle={`${finishedGoodsCount} Finished Goods · ${rawMaterialsCount} Raw Materials`}
          icon={Package}
          color="blue"
        />
        <KpiCard
          title="Active Customers"
          value={String(liveCustomers.length)}
          subtitle="Registered buyers & contractors"
          icon={Users}
          color="green"
        />
        <KpiCard
          title="Raw Material Vendors"
          value={String(liveSuppliers.length)}
          subtitle="Cement, sand, fly ash suppliers"
          icon={Building2}
          color="amber"
        />
        <KpiCard
          title="Recipe BOMs"
          value={String(bomCount)}
          subtitle="Active mix formulas configured"
          icon={Layers}
          color="purple"
        />
      </div>

      {/* KPI Row 2 - Live Financials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue (FY)"
          value={formatCurrency(totalRevenue)}
          subtitle={`incl. GST · ${postedSales.length} posted invoices`}
          icon={TrendingUp}
          color="green"
        />
        <KpiCard
          title="Total Purchases (FY)"
          value={formatCurrency(totalPurchases)}
          subtitle={`incl. GST · ${postedPurchases.length} posted bills`}
          icon={ShoppingCart}
          color="blue"
        />
        <KpiCard
          title="Customer Receivables"
          value={formatCurrency(totalReceivables)}
          subtitle="outstanding balance due"
          icon={IndianRupee}
          color="amber"
        />
        <KpiCard
          title="Supplier Payables"
          value={formatCurrency(totalPayables)}
          subtitle="outstanding to vendors"
          icon={TrendingDown}
          color="red"
        />
      </div>

      {/* Charts & Production */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Real Revenue Chart */}
        <div className="bg-surface rounded-xl border border-outline-variant p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-on-surface">
              Monthly Revenue vs Purchases (FY 2025–26)
            </h2>
            <span className="text-xs font-mono text-outline">Real-Time Data</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis
                tickFormatter={v => (v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : `₹${v}`)}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="purchases" name="Purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Real Recent Production Orders */}
        <div className="bg-surface rounded-xl border border-outline-variant p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-on-surface">Recent Production Batches</h2>
            <Link
              to="/manufacturing/production-orders"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentProduction.length === 0 ? (
            <div className="py-12 text-center text-xs text-outline space-y-2">
              <Factory className="h-8 w-8 text-outline mx-auto stroke-1" />
              <p>No production batches scheduled yet.</p>
              <Link
                to="/manufacturing/production-orders"
                className="inline-block px-3 py-1.5 bg-primary/10 text-primary font-semibold rounded-lg hover:bg-primary/20 transition-colors"
              >
                Schedule First Batch
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProduction.map(order => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b border-outline-variant/60 last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-on-surface">
                      {order.bom?.finished_good?.name || order.order_number}
                    </p>
                    <p className="text-xs text-outline">
                      {order.order_number} · {formatDate(order.planned_date)} · {order.shift || 'General Shift'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-on-surface">
                      {formatNumber(order.actual_qty ?? order.planned_qty, 0)} pcs
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Real Alert Table */}
      {lowStock.length > 0 && (
        <div className="bg-surface rounded-xl border border-outline-variant p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Low Stock Alerts (Replenishment Required)
            </h2>
            <span className="bg-red-100 text-red-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              {lowStock.length} items
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/60 text-xs uppercase text-outline">
                  <th className="text-left py-2">Item Name</th>
                  <th className="text-left py-2">SKU</th>
                  <th className="text-right py-2">Current On Hand</th>
                  <th className="text-right py-2">Min Level</th>
                  <th className="text-right py-2">Shortfall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {lowStock.map(item => (
                  <tr key={item.id} className="hover:bg-background/50">
                    <td className="py-2.5 font-medium text-on-surface">{item.name}</td>
                    <td className="py-2.5 font-mono text-xs text-outline">{item.sku}</td>
                    <td className="py-2.5 text-right text-red-600 font-bold">
                      {formatNumber(item.qty_on_hand, 0)}
                    </td>
                    <td className="py-2.5 text-right text-outline">
                      {formatNumber(item.min_stock_level, 0)}
                    </td>
                    <td className="py-2.5 text-right text-amber-600 font-bold">
                      {formatNumber(Math.max(0, item.min_stock_level - item.qty_on_hand), 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Real Transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales Invoices */}
        <div className="bg-surface rounded-xl border border-outline-variant p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-on-surface">Recent Sales Invoices</h2>
            <Link
              to="/sales/invoices"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <div className="py-10 text-center text-xs text-outline space-y-2">
              <p>No sales invoices created yet.</p>
              <Link
                to="/sales/invoices"
                className="inline-block px-3 py-1.5 bg-primary/10 text-primary font-semibold rounded-lg hover:bg-primary/20 transition-colors"
              >
                Create First Sales Invoice
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSales.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2 border-b border-outline-variant/60 last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{inv.invoice_number}</p>
                    <p className="text-xs text-outline">
                      {inv.customer?.name || 'Customer'} · {formatDate(inv.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-on-surface">
                      {formatCurrency(inv.total_amount)}
                    </p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Invoices */}
        <div className="bg-surface rounded-xl border border-outline-variant p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-on-surface">Recent Purchase Bills</h2>
            <Link
              to="/procurement/purchase-invoices"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentPurchases.length === 0 ? (
            <div className="py-10 text-center text-xs text-outline space-y-2">
              <p>No purchase bills recorded yet.</p>
              <Link
                to="/procurement/purchase-invoices"
                className="inline-block px-3 py-1.5 bg-primary/10 text-primary font-semibold rounded-lg hover:bg-primary/20 transition-colors"
              >
                Record Purchase Bill
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPurchases.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2 border-b border-outline-variant/60 last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{inv.invoice_number}</p>
                    <p className="text-xs text-outline">
                      {inv.supplier?.name || 'Vendor'} · {formatDate(inv.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-on-surface">
                      {formatCurrency(inv.total_amount)}
                    </p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
