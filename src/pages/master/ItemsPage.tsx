import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, Search, Edit2, Loader2, X, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StockBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import { GST_RATES, DEFAULT_WAREHOUSE_ID } from '@/lib/constants'
import { seedStandardUnitsAndCategories } from '@/lib/seedDefaults'
import type { Item, ItemCategory, Unit, ItemType } from '@/types/database.types'

const TYPE_LABELS: Record<ItemType, string> = {
  raw_material: 'Raw Material',
  finished_good: 'Finished Good',
  mould: 'Mould',
  machinery: 'Machinery',
  consumable: 'Consumable',
  service: 'Service',
}

const TYPE_COLORS: Record<ItemType, string> = {
  raw_material: 'bg-primary/10 text-primary',
  finished_good: 'bg-green-100 text-green-700',
  mould: 'bg-purple-100 text-purple-700',
  machinery: 'bg-orange-100 text-orange-700',
  consumable: 'bg-pink-100 text-pink-700',
  service: 'bg-surface-container text-on-surface-variant',
}

// ─── Data hooks ────────────────────────────────────────────────────────────────

function useItems(companyId: string) {
  return useQuery({
    queryKey: ['items', companyId],
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
      return data as (Item & { category: ItemCategory; unit: Unit })[]
    },
    enabled: !!companyId,
  })
}

function useStockBalances(companyId: string) {
  return useQuery({
    queryKey: ['stock_balances', companyId],
    queryFn: async () => {
      const { data: items } = await (supabase
        .from('items') as any)
        .select('id')
        .eq('company_id', companyId)
      if (!items?.length) return {}
      const itemIds = (items as { id: string }[]).map(i => i.id)
      const { data, error } = await (supabase
        .from('stock_balances') as any)
        .select('item_id, qty_on_hand')
        .in('item_id', itemIds)
        .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
      if (error) throw error
      const map: Record<string, number> = {}
      ;(data as { item_id: string; qty_on_hand: number }[])?.forEach(b => { map[b.item_id] = b.qty_on_hand })
      return map
    },
    enabled: !!companyId,
  })
}

function useCategories(companyId: string) {
  return useQuery({
    queryKey: ['categories', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_categories')
        .select('*')
        .eq('company_id', companyId)
        .order('name')
      if (error) throw error
      return data as ItemCategory[]
    },
    enabled: !!companyId,
  })
}

function useUnits(companyId: string) {
  return useQuery({
    queryKey: ['units', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('company_id', companyId)
        .order('name')
      if (error) throw error
      return data as Unit[]
    },
    enabled: !!companyId,
  })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function ItemsPage() {
  const { user, isManager } = useAuth()
  const companyId = user?.company_id ?? ''

  const { data: items = [], isLoading } = useItems(companyId)
  const { data: stockMap = {} } = useStockBalances(companyId)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || item.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle={`${items.length} items · raw materials, finished goods, consumables`}
        icon={Package}
        actions={isManager ? (
          <button
            onClick={() => { setEditItem(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Item
          </button>
        ) : undefined}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-outline-variant last:border-0">
              <div className="h-4 bg-surface-container rounded w-20" />
              <div className="h-4 bg-surface-container rounded flex-1" />
              <div className="h-4 bg-surface-container rounded w-24" />
              <div className="h-4 bg-surface-container rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && !search && items.length === 0 && (
        <EmptyState
          icon={Package}
          title="No items yet"
          description="Add your first item — raw materials, finished paver blocks, moulds, or consumables."
          action={isManager ? { label: 'Add Item', onClick: () => setShowForm(true) } : undefined}
        />
      )}

      {!isLoading && filtered.length === 0 && (search || typeFilter !== 'all') && (
        <EmptyState icon={Package} title="No items found" description="Try adjusting your search or filter." />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wide">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wide">HSN</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wide">GST%</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wide">Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wide">Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wide">Status</th>
                  {isManager && <th className="text-center px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wide">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => {
                  const stock = stockMap[item.id] ?? 0
                  const unitSymbol = (item as any).unit?.symbol ?? '—'
                  return (
                    <tr key={item.id} className="hover:bg-background transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-outline">{item.sku}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-on-surface">{item.name}</p>
                        <p className="text-xs text-slate-400">
                          {(item as any).category?.name ?? '—'} · {unitSymbol}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-block px-2 py-0.5 rounded-md text-xs font-medium', TYPE_COLORS[item.type])}>
                          {TYPE_LABELS[item.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-outline">{item.hsn_code ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-on-surface-variant">{item.gst_rate}%</td>
                      <td className="px-4 py-3 text-right text-on-surface font-medium">
                        {item.selling_rate > 0
                          ? formatCurrency(item.selling_rate) + ' / ' + unitSymbol
                          : formatCurrency(item.purchase_rate) + ' / ' + unitSymbol}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className={cn('font-semibold', stock < item.min_stock_level ? 'text-error' : 'text-on-surface')}>
                          {formatNumber(stock, 0)} {unitSymbol}
                        </p>
                        <StockBadge qty={stock} min={item.min_stock_level} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                          item.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-container text-outline'
                        )}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isManager && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => { setEditItem(item); setShowForm(true) }}
                            className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 bg-background text-xs text-outline">
            Showing {filtered.length} of {items.length} items
          </div>
        </div>
      )}

      {showForm && isManager && (
        <ItemFormModal item={editItem} companyId={companyId} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

// ─── Form modal ────────────────────────────────────────────────────────────────

interface ItemFormProps {
  item: Item | null
  companyId: string
  onClose: () => void
}

function ItemFormModal({ item, companyId, onClose }: ItemFormProps) {
  const qc = useQueryClient()
  const isEdit = !!item

  const { data: categories = [] } = useCategories(companyId)
  const { data: units = [] } = useUnits(companyId)

  const [form, setForm] = useState({
    sku: item?.sku ?? '',
    name: item?.name ?? '',
    type: (item?.type ?? 'raw_material') as ItemType,
    category_id: item?.category_id ?? (categories[0]?.id ?? ''),
    unit_id: item?.unit_id ?? (units[0]?.id ?? ''),
    hsn_code: item?.hsn_code ?? '',
    gst_rate: item?.gst_rate ?? 18,
    purchase_rate: item?.purchase_rate ?? 0,
    selling_rate: item?.selling_rate ?? 0,
    min_stock_level: item?.min_stock_level ?? 0,
    description: item?.description ?? '',
    is_active: item?.is_active ?? true,
  })

  function set(field: string, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.sku.trim()) throw new Error('SKU is required')
      if (!form.name.trim()) throw new Error('Item name is required')
      if (!form.unit_id) throw new Error('Please select a unit of measure')
      const payload = {
        ...form,
        sku: form.sku.trim(),
        name: form.name.trim(),
        category_id: form.category_id || null,
        unit_id: form.unit_id || null,
        hsn_code: form.hsn_code.trim() || null,
        description: form.description.trim() || null,
        purchase_rate: Number(form.purchase_rate) || 0,
        selling_rate: Number(form.selling_rate) || 0,
        min_stock_level: Number(form.min_stock_level) || 0,
        company_id: companyId,
      }

      if (isEdit) {
        const { error } = await (supabase.from('items') as any).update(payload).eq('id', item.id)
        if (error) throw error
      } else {
        const { data: newItem, error } = await (supabase.from('items') as any).insert(payload).select().single()
        if (error) throw error

        // Auto-seed initial stock balance for default warehouse
        if (newItem?.id) {
          await (supabase.from('stock_balances') as any).insert({
            item_id: newItem.id,
            warehouse_id: DEFAULT_WAREHOUSE_ID,
            qty_on_hand: 0,
          })
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', companyId] })
      qc.invalidateQueries({ queryKey: ['stock_balances', companyId] })
      qc.invalidateQueries({ queryKey: ['items_finished_goods', companyId] })
      qc.invalidateQueries({ queryKey: ['items_raw_materials', companyId] })
      qc.invalidateQueries({ queryKey: ['dashboard_items', companyId] })
      toast.success(isEdit ? 'Item updated' : 'Item added successfully')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const [isSeeding, setIsSeeding] = useState(false)

  const handleSeedDefaults = async () => {
    setIsSeeding(true)
    try {
      const res = await seedStandardUnitsAndCategories(companyId)
      await qc.invalidateQueries({ queryKey: ['categories', companyId] })
      await qc.invalidateQueries({ queryKey: ['units', companyId] })
      toast.success(`Loaded standard units & categories! (+${res.unitsAdded} units, +${res.categoriesAdded} categories)`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load standard units & categories')
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant sticky top-0 bg-surface z-10">
          <h2 className="text-lg font-bold text-on-surface">{isEdit ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-lg transition-colors text-outline">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Quick Seed Defaults Banner if categories empty or units minimal */}
          {(categories.length === 0 || units.length <= 1) && (
            <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-950 dark:text-blue-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <p className="font-bold text-blue-900 dark:text-blue-100">Standard Concrete Plant Master Data</p>
                  <p className="text-[11px] text-blue-700/90 dark:text-blue-300 mt-0.5">
                    Pre-populate standard factory units (Bags, Kilograms, Tonnes, Sq.Ft) and paver categories.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSeeding}
                onClick={handleSeedDefaults}
                className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 text-xs"
              >
                {isSeeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Load Factory Defaults
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">SKU *</label>
              <input value={form.sku} onChange={e => set('sku', e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="e.g. RM-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Item Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Item name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Item Type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Category</label>
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface">
                <option value="">— Select category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Unit *</label>
              <select value={form.unit_id} onChange={e => set('unit_id', e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface">
                <option value="">— Select unit —</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">HSN / SAC Code</label>
              <input value={form.hsn_code} onChange={e => set('hsn_code', e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="e.g. 6810" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">GST Rate (%)</label>
              <select value={form.gst_rate} onChange={e => set('gst_rate', Number(e.target.value))}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface">
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Purchase Rate (₹)</label>
              <input type="number" min={0} step={0.01} value={form.purchase_rate} onChange={e => set('purchase_rate', Number(e.target.value))}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Selling Rate (₹)</label>
              <input type="number" min={0} step={0.01} value={form.selling_rate} onChange={e => set('selling_rate', Number(e.target.value))}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Min Stock Level</label>
              <input type="number" min={0} value={form.min_stock_level} onChange={e => set('min_stock_level', Number(e.target.value))}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
            </div>
            {isEdit && (
              <div className="sm:col-span-2 flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-outline-variant accent-primary" />
                <label htmlFor="is_active" className="text-sm text-on-surface">Item is active</label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-on-surface-variant border border-outline-variant rounded-lg hover:bg-background transition-colors">
              Cancel
            </button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-60">
              {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
