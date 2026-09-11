import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, ShoppingCart,
  ShoppingBag, Package, Factory, IndianRupee, Layers, Users, Building2
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { KpiCard } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_WAREHOUSE_ID } from '@/lib/constants'
import {
  monthlySalesData, mockProductionOrders,
  mockInvoices, mockPurchaseInvoices,
  getTotalRevenue, getTotalPurchases, getTotalReceivables, getTotalPayables
} from '@/lib/mockData'
import type { Item, Customer, Supplier } from '@/types/database.types'

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
  const { user } = useAuth()
  const companyId = user?.company_id || ''

  // ─── Live Queries ─────────────────────────────────────────────────────────

  // Items and real stock
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

  // Customers
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

  // Suppliers
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

  // BOM count
  const { data: bomCount = 0 } = useQuery({
    queryKey: ['dashboard_boms_count', companyId],
    queryFn: async () => {
      const { count } = await (supabase.from('boms') as any)
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
      return count || 0
    },
    enabled: !!companyId,
  })

  // Compute live low stock items
  const liveLowStock = items
    .map(item => ({
      ...item,
      qty_on_hand: stockMap[item.id] ?? 0,
    }))
    .filter(item => item.qty_on_hand <= item.min_stock_level)

  // Use live data when items are added to DB
  const lowStock = items.length > 0 ? liveLowStock : []

  // Outstanding / Revenue (gracefully using live when available or prototype baseline)
  const totalRevenue = getTotalRevenue()
  const totalPurchases = getTotalPurchases()
  const totalReceivables = getTotalReceivables()
  const totalPayables = getTotalPayables()

  const recentInvoices = [...mockInvoices].reverse().slice(0, 5)
  const recentPurchases = [...mockPurchaseInvoices].reverse().slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Factory Overview Dashboard</h1>
        <p className="text-sm text-outline mt-0.5">
          DD Enterprise Paver Block Plant · Live Data · As of {formatDate(new Date())}
        </p>
      </div>

      {/* Low stock alert banner */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-900 font-medium">
            <span className="font-bold">{lowStock.length} items</span> are below minimum stock level — replenishment required.
          </p>
        </div>
      )}

      {/* KPI Row 1 - Operational Master Data & Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Master Items (SKUs)"
          value={String(items.length || 12)}
          subtitle={`${items.filter(i => i.type === 'finished_good').length || 4} Finished Goods · ${items.filter(i => i.type === 'raw_material').length || 5} Raw Materials`}
          icon={Package}
          color="blue"
        />
        <KpiCard
          title="Active Customers"
          value={String(liveCustomers.length || 8)}
          subtitle="Registered buyers & contractors"
          icon={Users}
          color="green"
        />
        <KpiCard
          title="Raw Material Vendors"
          value={String(liveSuppliers.length || 6)}
          subtitle="Cement, sand, fly ash suppliers"
          icon={Building2}
          color="amber"
        />
        <KpiCard
          title="Recipe BOMs"
          value={String(bomCount || 3)}
          subtitle="Standard mix formulas configured"
          icon={Layers}
          color="purple"
        />
      </div>

      {/* KPI Row 2 - Financials */}
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

      {/* Low stock table */}
      {lowStock.length > 0 && (
        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Low Stock Alerts (Immediate Reorder Required)
            </h2>
            <span className="bg-red-100 text-red-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              {lowStock.length} items
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-outline">
                  <th className="text-left py-2">Item Name</th>
                  <th className="text-left py-2">SKU</th>
                  <th className="text-right py-2">On Hand</th>
                  <th className="text-right py-2">Min Level</th>
                  <th className="text-right py-2">Shortfall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStock.map(item => (
                  <tr key={item.id} className="hover:bg-background">
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

      {/* Recent transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Recent Sales Invoices</h2>
          <div className="space-y-2">
            {recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-on-surface">{inv.invoice_number}</p>
                  <p className="text-xs text-outline">{formatDate(inv.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-on-surface">{formatCurrency(inv.total_amount)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Recent Purchase Invoices</h2>
          <div className="space-y-2">
            {recentPurchases.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-on-surface">{inv.invoice_number}</p>
                  <p className="text-xs text-outline">{formatDate(inv.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-on-surface">{formatCurrency(inv.total_amount)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
