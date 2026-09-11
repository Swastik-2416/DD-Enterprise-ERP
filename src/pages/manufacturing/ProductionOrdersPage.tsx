import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Factory, Plus, Search, CheckCircle2, Play, AlertCircle,
  X, Loader2, Calendar, Settings, Layers, ArrowRight,
  TrendingUp, Sparkles, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatNumber, formatDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import { DEFAULT_WAREHOUSE_ID } from '@/lib/constants'
import type { ProductionOrder, BOM, Item, BOMLine, DocumentStatus } from '@/types/database.types'

interface ProductionOrderWithBOM extends ProductionOrder {
  bom?: BOM & { finished_good?: Item }
}

interface BOMWithItem extends BOM {
  finished_good: Item
}

// ─── Data Hooks ─────────────────────────────────────────────────────────────

function useProductionOrders(companyId: string) {
  return useQuery({
    queryKey: ['production_orders', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_orders')
        .select(`
          *,
          bom:boms(
            id,
            version,
            notes,
            finished_good:items(id, name, sku)
          )
        `)
        .eq('company_id', companyId)
        .order('planned_date', { ascending: false })

      if (error) throw error
      return (data || []) as ProductionOrderWithBOM[]
    },
    enabled: !!companyId,
  })
}

function useActiveBOMs(companyId: string) {
  return useQuery({
    queryKey: ['active_boms_list', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boms')
        .select(`
          *,
          finished_good:items(id, name, sku)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as BOMWithItem[]
    },
    enabled: !!companyId,
  })
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ProductionOrdersPage() {
  const { user, isManager } = useAuth()
  const companyId = user?.company_id || ''
  const userId = user?.id || ''
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [activeOrder, setActiveOrder] = useState<ProductionOrderWithBOM | null>(null)

  const { data: orders = [], isLoading } = useProductionOrders(companyId)
  const { data: boms = [] } = useActiveBOMs(companyId)

  const filtered = orders.filter(order => {
    const fgName = order.bom?.finished_good?.name || ''
    const q = search.toLowerCase()
    const matchSearch =
      order.order_number.toLowerCase().includes(q) ||
      fgName.toLowerCase().includes(q) ||
      (order.machine_used?.toLowerCase() ?? '').includes(q) ||
      (order.shift?.toLowerCase() ?? '').includes(q)
    const matchStatus = statusFilter === 'all' || order.status === statusFilter
    return matchSearch && matchStatus
  })

  // Aggregates
  const totalPlanned = orders.reduce((s, o) => s + (Number(o.planned_qty) || 0), 0)
  const totalActual = orders.reduce((s, o) => s + (Number(o.actual_qty) || 0), 0)
  const completedOrders = orders.filter(o => o.status === 'posted')
  const completionRate = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 100

  // ─── Output Logging Mutation ───────────────────────────────────────────────
  const logOutputMutation = useMutation({
    mutationFn: async ({
      order,
      actualQty,
      notes,
    }: {
      order: ProductionOrderWithBOM
      actualQty: number
      notes: string
    }) => {
      if (!order.bom_id) throw new Error('Order does not have a linked BOM')

      // 1. Fetch the recipe lines for this BOM
      const { data: bomLines, error: linesErr } = await (supabase
        .from('bom_lines') as any)
        .select('*')
        .eq('bom_id', order.bom_id)

      if (linesErr) throw linesErr

      // 2. Consume Raw Materials based on mix ratio
      if (bomLines && bomLines.length > 0) {
        for (const line of bomLines) {
          const wastage = Number(line.wastage_pct) || 0
          const grossRatio = Number(line.qty_per_unit) * (1 + wastage / 100)
          const consumedQty = actualQty * grossRatio

          // Record consumption movement
          await (supabase.from('stock_movements') as any).insert({
            company_id: companyId,
            item_id: line.raw_material_id,
            warehouse_id: DEFAULT_WAREHOUSE_ID,
            movement_type: 'production_consumption',
            qty: -consumedQty,
            ref_doc_type: 'production_order',
            ref_doc_id: order.id,
            ref_doc_number: order.order_number,
            date: new Date().toISOString().split('T')[0],
            notes: `Consumed for batch ${order.order_number}`,
            created_by: userId,
          })

          // Update raw material stock balance
          const { data: curBal } = await (supabase.from('stock_balances') as any)
            .select('qty_on_hand')
            .eq('item_id', line.raw_material_id)
            .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
            .single()

          if (curBal) {
            const newBal = Math.max(0, (Number(curBal.qty_on_hand) || 0) - consumedQty)
            await (supabase.from('stock_balances') as any)
              .update({
                qty_on_hand: newBal,
                updated_at: new Date().toISOString(),
              })
              .eq('item_id', line.raw_material_id)
              .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
          }
        }
      }

      // 3. Credit Finished Good Stock
      const fgId = order.bom?.finished_good?.id
      if (fgId) {
        await (supabase.from('stock_movements') as any).insert({
          company_id: companyId,
          item_id: fgId,
          warehouse_id: DEFAULT_WAREHOUSE_ID,
          movement_type: 'production_output',
          qty: actualQty,
          ref_doc_type: 'production_order',
          ref_doc_id: order.id,
          ref_doc_number: order.order_number,
          date: new Date().toISOString().split('T')[0],
          notes: `Manufactured in batch ${order.order_number}`,
          created_by: userId,
        })

        const { data: fgBal } = await (supabase.from('stock_balances') as any)
          .select('qty_on_hand')
          .eq('item_id', fgId)
          .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
          .single()

        if (fgBal) {
          const newFgBal = (Number(fgBal.qty_on_hand) || 0) + actualQty
          await (supabase.from('stock_balances') as any)
            .update({
              qty_on_hand: newFgBal,
              updated_at: new Date().toISOString(),
            })
            .eq('item_id', fgId)
            .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
        } else {
          await (supabase.from('stock_balances') as any).insert({
            item_id: fgId,
            warehouse_id: DEFAULT_WAREHOUSE_ID,
            qty_on_hand: actualQty,
            updated_at: new Date().toISOString(),
          })
        }
      }

      // 4. Update order status to 'posted'
      const { error: updErr } = await (supabase.from('production_orders') as any)
        .update({
          actual_qty: actualQty,
          status: 'posted',
          notes: notes ? `${order.notes ? order.notes + ' · ' : ''}${notes}` : order.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (updErr) throw updErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_orders', companyId] })
      queryClient.invalidateQueries({ queryKey: ['stock_balances', companyId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stock_balances', companyId] })
      queryClient.invalidateQueries({ queryKey: ['items', companyId] })
      setActiveOrder(null)
      toast.success('Production logged! FG inventory increased & raw materials deducted.')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to log production output')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Orders"
        subtitle="Manage manufacturing batches, daily shift schedules, concrete mix recipes, and FG outputs"
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
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            Planned Production
          </div>
          <div className="text-2xl font-bold text-on-surface mt-1">
            {formatNumber(totalPlanned)}{' '}
            <span className="text-xs font-normal text-outline">pcs</span>
          </div>
          <div className="text-xs text-outline mt-1">Across {orders.length} scheduled orders</div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            Completed Output
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {formatNumber(totalActual)}{' '}
            <span className="text-xs font-normal text-outline">pcs</span>
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            {completionRate}% batch completion rate ({completedOrders.length} batches posted)
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            Active Recipes (BOMs)
          </div>
          <div className="text-2xl font-bold text-primary mt-1">{boms.length} Formulas</div>
          <div className="text-xs text-blue-500 mt-1">Ready for automated factory batching</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Search order #, product name, or machine..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter production orders by status"
            className="w-full md:w-44 px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-hidden"
          >
            <option value="all">All Statuses ({orders.length})</option>
            <option value="draft">Draft</option>
            <option value="approved">Scheduled / Approved</option>
            <option value="posted">Completed & Posted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Production Orders Table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Factory}
            title={search ? 'No production orders match your search' : 'No production batches scheduled'}
            description="Create your first production order to schedule factory hydraulic presses and track concrete mix recipes."
            action={
              isManager
                ? {
                    label: 'Schedule First Batch',
                    onClick: () => setShowModal(true),
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-outline-variant text-xs uppercase font-semibold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Planned Date</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Item to Produce</th>
                  <th className="py-3 px-4 text-right">Planned Qty</th>
                  <th className="py-3 px-4 text-right">Actual Output</th>
                  <th className="py-3 px-4">Machine & Mould</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {filtered.map(order => {
                  const fg = order.bom?.finished_good
                  return (
                    <tr key={order.id} className="hover:bg-background/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-primary">
                        {order.order_number}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">
                        {formatDate(order.planned_date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                          {order.shift || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-on-surface">
                          {fg?.name || 'Finished Paver Block'}
                        </div>
                        <div className="text-xs text-outline font-mono">
                          {fg?.sku || '—'} · Recipe v{order.bom?.version || 1}.0
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-on-surface-variant">
                        {formatNumber(order.planned_qty)} pcs
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-on-surface">
                        {order.actual_qty ? `${formatNumber(order.actual_qty)} pcs` : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-on-surface-variant">
                        <div className="font-medium">{order.machine_used || 'Hydraulic Press'}</div>
                        <div className="text-outline">{order.mould_used || 'Standard Mould'}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {order.status === 'approved' && isManager ? (
                          <button
                            type="button"
                            onClick={() => setActiveOrder(order)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Log Output
                          </button>
                        ) : order.status === 'posted' ? (
                          <span className="text-xs text-emerald-600 font-medium">Completed</span>
                        ) : (
                          <span className="text-xs text-outline capitalize">{order.status}</span>
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
        <LogOutputModal
          order={activeOrder}
          onClose={() => setActiveOrder(null)}
          onSubmit={({ actualQty, notes }) =>
            logOutputMutation.mutate({ order: activeOrder, actualQty, notes })
          }
          isSubmitting={logOutputMutation.isPending}
        />
      )}

      {/* New Production Order Modal */}
      {showModal && isManager && (
        <CreateProductionOrderModal
          companyId={companyId}
          userId={userId}
          existingOrderCount={orders.length}
          boms={boms}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['production_orders', companyId] })
          }}
        />
      )}
    </div>
  )
}

// ─── Log Output Modal ───────────────────────────────────────────────────────

interface LogOutputModalProps {
  order: ProductionOrderWithBOM
  onClose: () => void
  onSubmit: (data: { actualQty: number; notes: string }) => void
  isSubmitting: boolean
}

function LogOutputModal({ order, onClose, onSubmit, isSubmitting }: LogOutputModalProps) {
  const [actualQty, setActualQty] = useState<number | ''>(order.planned_qty)
  const [notes, setNotes] = useState('')

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!actualQty || Number(actualQty) <= 0) {
      toast.error('Please enter valid actual production quantity')
      return
    }
    onSubmit({ actualQty: Number(actualQty), notes })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-6 border border-outline-variant my-8">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant mb-4">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Record Finished Goods Output</h3>
            <p className="text-xs text-outline mt-0.5">
              Order {order.order_number} · Planned: {formatNumber(order.planned_qty)} pcs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-background"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Actual Good Pieces Produced <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={actualQty}
              onChange={e => setActualQty(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 border border-outline-variant rounded-lg text-lg font-bold text-on-surface bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Batch Remarks / Shift Quality Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Curing started, 15 pcs minor edge breakage"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-700" />
              Automated Recipe Consumption:
            </div>
            <p className="text-amber-800">
              Confirming this batch will immediately credit the Finished Goods warehouse inventory and automatically deduct exact quantities of Cement, Sand, Coarse Aggregate, and Fly Ash based on Recipe v{order.bom?.version || 1}.0.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-outline-variant text-on-surface-variant text-sm font-medium rounded-lg hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting to Inventory...
                </>
              ) : (
                'Confirm & Post to Stock'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Create Production Order Modal ──────────────────────────────────────────

interface CreateProductionOrderModalProps {
  companyId: string
  userId: string
  existingOrderCount: number
  boms: BOMWithItem[]
  onClose: () => void
  onSuccess: () => void
}

function CreateProductionOrderModal({
  companyId,
  userId,
  existingOrderCount,
  boms,
  onClose,
  onSuccess,
}: CreateProductionOrderModalProps) {
  const [bomId, setBomId] = useState(boms[0]?.id || '')
  const [plannedQty, setPlannedQty] = useState<number | ''>(5000)
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0])
  const [shift, setShift] = useState('Morning Shift (8 AM - 4 PM)')
  const [machineUsed, setMachineUsed] = useState('Paver Block Hydraulic Press #1')
  const [mouldUsed, setMouldUsed] = useState('60mm Zig-Zag Mould')
  const [notes, setNotes] = useState('')

  const now = new Date()
  const year = now.getFullYear() % 100
  const fy = `${year}${year + 1}`
  const orderNumber = `PRD-${fy}-${String(existingOrderCount + 1).padStart(4, '0')}`

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bomId) {
      toast.error('Please select a BOM recipe. Create one in Master Data if needed.')
      return
    }

    if (!plannedQty || Number(plannedQty) <= 0) {
      toast.error('Please enter a valid planned quantity')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await (supabase.from('production_orders') as any).insert({
        company_id: companyId,
        order_number: orderNumber,
        bom_id: bomId,
        planned_date: plannedDate,
        shift: shift,
        planned_qty: Number(plannedQty),
        status: 'approved', // Auto approved for production scheduling
        machine_used: machineUsed.trim() || null,
        mould_used: mouldUsed.trim() || null,
        notes: notes.trim() || null,
        created_by: userId,
        approved_by: userId,
      })

      if (error) throw error

      toast.success('Production order scheduled successfully')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule production order')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-outline-variant my-8">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant mb-4">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Schedule Production Batch</h3>
            <p className="text-xs text-outline mt-0.5">
              Select product BOM, planned pieces, machine and mould to schedule factory output
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-background"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Product Mix Recipe (BOM) <span className="text-red-500">*</span>
            </label>
            {boms.length === 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                No active BOM recipes found. Please create a recipe in Master Data &gt; Bill of Materials first.
              </div>
            ) : (
              <select
                value={bomId}
                onChange={e => setBomId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {boms.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.finished_good?.name} ({b.finished_good?.sku}) — v{b.version}.0
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Planned Quantity (Pieces) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="100"
                step="100"
                required
                placeholder="5000"
                value={plannedQty}
                onChange={e => setPlannedQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Planned Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={plannedDate}
                onChange={e => setPlannedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Shift Schedule
              </label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option>Morning Shift (8 AM - 4 PM)</option>
                <option>Evening Shift (4 PM - 12 AM)</option>
                <option>Night Shift (12 AM - 8 AM)</option>
                <option>General Shift</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Batch Order #
              </label>
              <input
                type="text"
                disabled
                value={orderNumber}
                className="w-full px-3 py-2 text-sm font-mono bg-background border border-outline-variant rounded-lg text-outline"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Machine / Press
              </label>
              <input
                type="text"
                value={machineUsed}
                onChange={e => setMachineUsed(e.target.value)}
                placeholder="e.g. Hydraulic Press #1"
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Mould Attached
              </label>
              <input
                type="text"
                value={mouldUsed}
                onChange={e => setMouldUsed(e.target.value)}
                placeholder="e.g. 60mm Zig-Zag Mould"
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Notes / Production Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. For Highway expansion project order"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-outline-variant text-on-surface-variant text-sm font-medium rounded-lg hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || boms.length === 0}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Create Production Order'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
