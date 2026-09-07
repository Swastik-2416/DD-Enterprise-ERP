import { useState } from 'react'
import { Factory, Plus, Search, CheckCircle2, Play, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatNumber, formatDate } from '@/lib/formatters'
import { mockProductionOrders, mockBOMs, mockItems } from '@/lib/mockData'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import type { ProductionOrder } from '@/types/database.types'

export function ProductionOrdersPage() {
  const { isManager } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [activeOrder, setActiveOrder] = useState<ProductionOrder | null>(null)

  const filtered = mockProductionOrders.filter(order => {
    const bom = mockBOMs.find(b => b.id === order.bom_id)
    const fgItem = mockItems.find(i => i.id === bom?.finished_good_id)
    const matchSearch =
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (fgItem?.name.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (order.machine_used?.toLowerCase() ?? '').includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || order.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPlanned = mockProductionOrders.reduce((s, o) => s + o.planned_qty, 0)
  const totalActual = mockProductionOrders.reduce((s, o) => s + (o.actual_qty ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Orders"
        subtitle="Manage manufacturing batches, shift schedules, concrete mix recipes, and FG output"
        action={
          isManager
            ? {
                label: 'New Production Order',
                icon: Plus,
                onClick: () => setShowModal(true),
              }
            : undefined
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">Planned Production</div>
          <div className="text-2xl font-bold text-on-surface mt-1">{formatNumber(totalPlanned)} <span className="text-xs font-normal text-outline">pcs</span></div>
          <div className="text-xs text-outline mt-1">Across {mockProductionOrders.length} scheduled orders</div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">Completed Output</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{formatNumber(totalActual)} <span className="text-xs font-normal text-outline">pcs</span></div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            {Math.round((totalActual / (totalPlanned || 1)) * 100)}% batch completion rate
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">Active Batch Efficiency</div>
          <div className="text-2xl font-bold text-primary mt-1">99.4%</div>
          <div className="text-xs text-blue-500 mt-1">&lt;1% breakages / scrap recorded</div>
        </div>
      </div>

      {/* Filter row */}
      <div className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search order #, product name, or machine..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter production orders by status"
            className="w-full md:w-44 px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved / Scheduled</option>
            <option value="posted">Completed & Posted</option>
          </select>
        </div>
      </div>

      {/* Production Orders Table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Factory}
            title="No production orders found"
            description="Create a new production schedule to start manufacturing."
            action={isManager ? { label: 'New Production Order', onClick: () => setShowModal(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background/80 border-b border-outline-variant text-xs uppercase font-semibold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Planned Date</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Item to Produce</th>
                  <th className="py-3 px-4 text-right">Planned Qty</th>
                  <th className="py-3 px-4 text-right">Actual Qty</th>
                  <th className="py-3 px-4">Machine & Mould</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(order => {
                  const bom = mockBOMs.find(b => b.id === order.bom_id)
                  const fgItem = mockItems.find(i => i.id === bom?.finished_good_id)

                  return (
                    <tr key={order.id} className="hover:bg-background/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-primary">{order.order_number}</td>
                      <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">{formatDate(order.planned_date)}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                          {order.shift || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-on-surface">
                        {fgItem?.name || 'Finished Paver Block'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-on-surface-variant">
                        {formatNumber(order.planned_qty)} pcs
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-on-surface">
                        {order.actual_qty ? `${formatNumber(order.actual_qty)} pcs` : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-on-surface-variant">
                        <div>{order.machine_used || '—'}</div>
                        <div className="text-slate-400">{order.mould_used}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {order.status === 'approved' && isManager ? (
                          <button
                            onClick={() => setActiveOrder(order)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-md transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Log Output
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Complete</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Output Modal */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-on-surface mb-1">Record Finished Goods Output</h3>
            <p className="text-xs text-outline mb-4">
              Order {activeOrder.order_number} · Planned: {formatNumber(activeOrder.planned_qty)} pcs
            </p>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Actual Good Pieces Produced</label>
                <input
                  type="number"
                  defaultValue={activeOrder.planned_qty}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-lg font-bold text-on-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Damaged / Rejected Pieces</label>
                <input type="number" defaultValue="20" className="w-full px-3 py-2 border border-outline-variant rounded-lg" />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 inline mr-1 text-amber-600" />
                Confirming output will immediately credit the Finished Goods warehouse and consume corresponding raw materials (cement, aggregate, sand, fly ash) based on the recipe BOM.
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="px-4 py-2 border border-outline-variant text-on-surface-variant text-sm font-medium rounded-lg hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Demo note: Production logged! FG inventory increased, raw material stock decreased.')
                  setActiveOrder(null)
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-xs"
              >
                Confirm & Post to Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Production Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-on-surface mb-2">Schedule Production Batch</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Select product BOM, planned pieces, machine and mould to schedule daily factory output.
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Product Recipe (BOM)</label>
                <select className="w-full px-3 py-2 border border-outline-variant rounded-lg">
                  {mockBOMs.map(b => {
                    const item = mockItems.find(i => i.id === b.finished_good_id)
                    return <option key={b.id} value={b.id}>{item?.name} (v{b.version})</option>
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Planned Quantity</label>
                  <input type="number" placeholder="5000" className="w-full px-3 py-2 border border-outline-variant rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Shift</label>
                  <select className="w-full px-3 py-2 border border-outline-variant rounded-lg">
                    <option>Morning Shift (8 AM - 4 PM)</option>
                    <option>Evening Shift (4 PM - 12 AM)</option>
                    <option>Night Shift (12 AM - 8 AM)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Machine</label>
                <input type="text" defaultValue="Paver Block Hydraulic Press #1" className="w-full px-3 py-2 border border-outline-variant rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-outline-variant text-on-surface-variant text-sm font-medium rounded-lg hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Demo note: Production order scheduled!')
                  setShowModal(false)
                }}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg shadow-xs"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
