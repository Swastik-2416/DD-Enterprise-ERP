import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package, Search, Filter, AlertTriangle, CheckCircle,
  Printer, ArrowDownLeft, ArrowUpRight, History, Edit3,
  Loader2, X, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StockBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import { DEFAULT_WAREHOUSE_ID } from '@/lib/constants'
import type { Item, ItemCategory, Unit, StockMovement } from '@/types/database.types'

interface ItemWithDetails extends Item {
  category?: ItemCategory
  unit?: Unit
}

// ─── Data Hooks ─────────────────────────────────────────────────────────────

function useItems(companyId: string) {
  return useQuery({
    queryKey: ['stock_report_items', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          category:item_categories(id, name, type),
          unit:units(id, name, symbol)
        `)
        .eq('company_id', companyId)
        .order('name')

      if (error) throw error
      return (data || []) as ItemWithDetails[]
    },
    enabled: !!companyId,
  })
}

function useStockBalances(companyId: string) {
  return useQuery({
    queryKey: ['stock_report_balances', companyId],
    queryFn: async () => {
      const { data: itemRows } = await (supabase.from('items') as any)
        .select('id')
        .eq('company_id', companyId)

      if (!itemRows?.length) return {}
      const ids = (itemRows as { id: string }[]).map(i => i.id)

      const { data, error } = await (supabase.from('stock_balances') as any)
        .select('item_id, qty_on_hand, updated_at')
        .in('item_id', ids)
        .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)

      if (error) throw error
      const map: Record<string, number> = {}
      ;(data as { item_id: string; qty_on_hand: number }[])?.forEach(b => {
        map[b.item_id] = Number(b.qty_on_hand) || 0
      })
      return map
    },
    enabled: !!companyId,
  })
}

function useItemStockMovements(companyId: string, itemId: string | null) {
  return useQuery({
    queryKey: ['item_stock_movements', companyId, itemId],
    queryFn: async () => {
      if (!itemId) return []
      const { data, error } = await (supabase.from('stock_movements') as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as StockMovement[]
    },
    enabled: !!companyId && !!itemId,
  })
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function StockReportPage() {
  const { user, isManager } = useAuth()
  const companyId = user?.company_id || ''
  const userId = user?.id || ''
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [stockStatusFilter, setStockStatusFilter] = useState('all')
  const [adjustItem, setAdjustItem] = useState<ItemWithDetails | null>(null)
  const [ledgerItem, setLedgerItem] = useState<ItemWithDetails | null>(null)

  const { data: items = [], isLoading: itemsLoading } = useItems(companyId)
  const { data: stockMap = {}, isLoading: balancesLoading } = useStockBalances(companyId)

  // Movements for ledger modal
  const { data: movements = [], isLoading: movementsLoading } = useItemStockMovements(
    companyId,
    ledgerItem?.id || null
  )

  const itemsWithStock = items.map(item => {
    const qty = stockMap[item.id] ?? 0
    const isLow = qty < item.min_stock_level
    const valuationRate = item.type === 'finished_good' ? item.selling_rate : item.purchase_rate
    const valuation = qty * valuationRate
    return {
      ...item,
      qty_on_hand: qty,
      is_low: isLow,
      valuation,
    }
  })

  const filtered = itemsWithStock.filter(item => {
    const q = search.toLowerCase()
    const matchSearch =
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.category?.name?.toLowerCase() ?? '').includes(q)
    const matchType = typeFilter === 'all' || item.type === typeFilter
    const matchStatus =
      stockStatusFilter === 'all' ||
      (stockStatusFilter === 'low' && item.is_low) ||
      (stockStatusFilter === 'ok' && !item.is_low)
    return matchSearch && matchType && matchStatus
  })

  const totalValuation = itemsWithStock.reduce((s, i) => s + i.valuation, 0)
  const lowStockCount = itemsWithStock.filter(i => i.is_low).length

  // Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: async ({
      item,
      newQty,
      reason,
    }: {
      item: ItemWithDetails
      newQty: number
      reason: string
    }) => {
      const currentQty = stockMap[item.id] ?? 0
      const diff = newQty - currentQty

      // 1. Record stock movement
      await (supabase.from('stock_movements') as any).insert({
        company_id: companyId,
        item_id: item.id,
        warehouse_id: DEFAULT_WAREHOUSE_ID,
        movement_type: 'adjustment',
        qty: diff,
        ref_doc_type: 'stock_adjustment',
        ref_doc_id: item.id,
        ref_doc_number: `ADJ-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        notes: reason || 'Physical inventory recount adjustment',
        created_by: userId,
      })

      // 2. Update stock balance
      const { data: curBal } = await (supabase.from('stock_balances') as any)
        .select('item_id')
        .eq('item_id', item.id)
        .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
        .single()

      if (curBal) {
        await (supabase.from('stock_balances') as any)
          .update({
            qty_on_hand: newQty,
            updated_at: new Date().toISOString(),
          })
          .eq('item_id', item.id)
          .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
      } else {
        await (supabase.from('stock_balances') as any).insert({
          item_id: item.id,
          warehouse_id: DEFAULT_WAREHOUSE_ID,
          qty_on_hand: newQty,
          updated_at: new Date().toISOString(),
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_report_balances', companyId] })
      queryClient.invalidateQueries({ queryKey: ['stock_balances', companyId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stock_balances', companyId] })
      setAdjustItem(null)
      toast.success('Stock count adjusted successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to adjust stock')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Valuation & Inventory Report"
        subtitle="Live physical inventory balances, minimum re-order thresholds, and warehouse valuation"
        action={{
          label: 'Print Stock Sheet',
          icon: Printer,
          onClick: () => window.print(),
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            Total Inventory Valuation
          </div>
          <div className="text-2xl font-bold text-on-surface mt-1">
            {formatCurrency(totalValuation)}
          </div>
          <div className="text-xs text-outline mt-1">Valued at standard purchase / selling rates</div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Low Stock Warnings
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{lowStockCount} Items</div>
          <div className="text-xs text-amber-600 font-medium mt-1">Below minimum threshold limit</div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Total Tracked SKUs
            </span>
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-primary mt-2">{items.length} SKUs</div>
          <div className="text-xs text-outline mt-1">Single centralized factory warehouse</div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Search SKU, category or item name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-outline shrink-0" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            aria-label="Filter inventory report by type"
            className="px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-hidden"
          >
            <option value="all">All Item Types</option>
            <option value="raw_material">Raw Materials</option>
            <option value="finished_good">Finished Goods</option>
            <option value="consumable">Consumables</option>
          </select>

          <select
            value={stockStatusFilter}
            onChange={e => setStockStatusFilter(e.target.value)}
            aria-label="Filter inventory report by stock status"
            className="px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-hidden"
          >
            <option value="all">All Stock Statuses</option>
            <option value="low">Low Stock Alert Only</option>
            <option value="ok">Sufficient Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xs">
        {itemsLoading || balancesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items found"
            description="Try changing your search keywords or inventory filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-outline-variant text-xs uppercase font-semibold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-right">Min Threshold</th>
                  <th className="py-3 px-4 text-right">Base Rate</th>
                  <th className="py-3 px-4 text-right">Stock Valuation</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-background/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-xs text-primary">
                      {item.sku}
                    </td>
                    <td className="py-3 px-4 font-medium text-on-surface">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-xs text-outline">
                      {item.category?.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-on-surface">
                      {formatNumber(item.qty_on_hand, 2)} {item.unit?.symbol || ''}
                    </td>
                    <td className="py-3 px-4 text-right text-outline">
                      {formatNumber(item.min_stock_level, 0)} {item.unit?.symbol || ''}
                    </td>
                    <td className="py-3 px-4 text-right text-on-surface-variant">
                      {formatCurrency(item.type === 'finished_good' ? item.selling_rate : item.purchase_rate)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-on-surface">
                      {formatCurrency(item.valuation)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StockBadge
                        qty={item.qty_on_hand}
                        min={item.min_stock_level}
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLedgerItem(item)}
                          className="p-1.5 text-outline hover:text-primary hover:bg-background rounded-md transition-colors"
                          title="View Stock Ledger"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        {isManager && (
                          <button
                            type="button"
                            onClick={() => setAdjustItem(item)}
                            className="p-1.5 text-outline hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            title="Adjust Physical Count"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {adjustItem && isManager && (
        <StockAdjustmentModal
          item={adjustItem}
          currentQty={stockMap[adjustItem.id] ?? 0}
          onClose={() => setAdjustItem(null)}
          onSubmit={({ newQty, reason }) =>
            adjustMutation.mutate({ item: adjustItem, newQty, reason })
          }
          isSubmitting={adjustMutation.isPending}
        />
      )}

      {/* Stock Ledger History Modal */}
      {ledgerItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-outline-variant my-8">
            <div className="p-5 border-b border-outline-variant flex items-center justify-between sticky top-0 bg-surface z-10">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span>Stock Ledger: {ledgerItem.name}</span>
                </h3>
                <p className="text-xs text-outline mt-0.5 font-mono">
                  SKU: {ledgerItem.sku} · Current Balance:{' '}
                  <strong className="text-on-surface">
                    {formatNumber(stockMap[ledgerItem.id] ?? 0)} {ledgerItem.unit?.symbol || ''}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLedgerItem(null)}
                className="text-outline hover:text-on-surface text-xl font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {movementsLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : movements.length === 0 ? (
                <div className="py-8 text-center text-outline text-xs">
                  No stock transactions recorded for this item yet.
                </div>
              ) : (
                <div className="border border-outline-variant rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-background border-b border-outline-variant font-semibold text-on-surface-variant">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Movement Type</th>
                        <th className="py-2.5 px-3">Reference Doc</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60">
                      {movements.map(m => {
                        const isPositive = Number(m.qty) > 0
                        return (
                          <tr key={m.id} className="hover:bg-background/40">
                            <td className="py-2.5 px-3 text-outline whitespace-nowrap">
                              {formatDate(m.date)}
                            </td>
                            <td className="py-2.5 px-3 font-medium capitalize">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                                  isPositive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                )}
                              >
                                {m.movement_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-outline">
                              {m.ref_doc_number || '—'}
                            </td>
                            <td
                              className={cn(
                                'py-2.5 px-3 text-right font-bold',
                                isPositive ? 'text-emerald-600' : 'text-rose-600'
                              )}
                            >
                              {isPositive ? '+' : ''}
                              {formatNumber(m.qty)} {ledgerItem.unit?.symbol || ''}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setLedgerItem(null)}
                  className="px-4 py-2 border border-outline-variant text-xs font-semibold rounded-lg hover:bg-background"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stock Adjustment Modal Component ───────────────────────────────────────

interface StockAdjustmentModalProps {
  item: ItemWithDetails
  currentQty: number
  onClose: () => void
  onSubmit: (data: { newQty: number; reason: string }) => void
  isSubmitting: boolean
}

function StockAdjustmentModal({
  item,
  currentQty,
  onClose,
  onSubmit,
  isSubmitting,
}: StockAdjustmentModalProps) {
  const [newQty, setNewQty] = useState<number | ''>(currentQty)
  const [reason, setReason] = useState('')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (newQty === '' || Number(newQty) < 0) {
      toast.error('Please enter a valid count >= 0')
      return
    }
    onSubmit({ newQty: Number(newQty), reason: reason.trim() })
  }

  const diff = Number(newQty || 0) - currentQty

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-6 border border-outline-variant my-8">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant mb-4">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Physical Stock Adjustment</h3>
            <p className="text-xs text-outline mt-0.5">
              {item.name} ({item.sku})
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

        <form onSubmit={handleSave} className="space-y-4 text-sm">
          <div className="bg-background rounded-xl p-3 border border-outline-variant flex justify-between items-center text-xs">
            <span className="text-outline">Recorded System Balance:</span>
            <span className="font-bold text-on-surface">
              {formatNumber(currentQty)} {item.unit?.symbol || ''}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Actual Physical Count on Hand <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={newQty}
              onChange={e => setNewQty(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 text-lg font-bold border border-outline-variant rounded-lg bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {diff !== 0 && (
              <p
                className={cn(
                  'text-xs mt-1 font-semibold',
                  diff > 0 ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                Discrepancy: {diff > 0 ? `+${diff}` : diff} {item.unit?.symbol || ''}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Reason for Discrepancy
            </label>
            <input
              type="text"
              placeholder="e.g. Breakage during stacking, recount after monsoon..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
              disabled={isSubmitting}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Adjustment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
