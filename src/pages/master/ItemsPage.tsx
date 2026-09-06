import { useState } from 'react'
import { Package, Plus, Search, Edit2, ToggleLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StockBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { mockItems, mockCategories, mockUnits, mockStockBalances } from '@/lib/mockData'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import type { Item } from '@/types/database.types'

const TYPE_LABELS: Record<string, string> = {
  raw_material: 'Raw Material',
  finished_good: 'Finished Good',
  mould: 'Mould',
  machinery: 'Machinery',
  consumable: 'Consumable',
  service: 'Service',
}

const TYPE_COLORS: Record<string, string> = {
  raw_material: 'bg-blue-100 text-blue-700',
  finished_good: 'bg-green-100 text-green-700',
  mould: 'bg-purple-100 text-purple-700',
  machinery: 'bg-orange-100 text-orange-700',
  consumable: 'bg-pink-100 text-pink-700',
  service: 'bg-slate-100 text-slate-600',
}

export function ItemsPage() {
  const { isManager } = useAuth()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)

  const filtered = mockItems.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || item.type === typeFilter
    return matchSearch && matchType
  })

  function getStock(itemId: string) {
    return mockStockBalances.find(s => s.item_id === itemId)?.qty_on_hand ?? 0
  }

  function getCategory(catId: string) {
    return mockCategories.find(c => c.id === catId)?.name ?? '—'
  }

  function getUnit(unitId: string) {
    return mockUnits.find(u => u.id === unitId)?.symbol ?? '—'
  }

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle={`${mockItems.length} items · raw materials, finished goods, consumables`}
        icon={Package}
        actions={isManager ? (
          <button
            onClick={() => { setEditItem(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No items found" description="Try adjusting your search or filters." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">HSN</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">GST%</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  {isManager && <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => {
                  const stock = getStock(item.id)
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-400">{getCategory(item.category_id)} · {getUnit(item.unit_id)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-block px-2 py-0.5 rounded-md text-xs font-medium', TYPE_COLORS[item.type])}>
                          {TYPE_LABELS[item.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.hsn_code ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{item.gst_rate}%</td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium">
                        {item.selling_rate > 0
                          ? formatCurrency(item.selling_rate) + ' / ' + getUnit(item.unit_id)
                          : formatCurrency(item.purchase_rate) + ' / ' + getUnit(item.unit_id)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className={cn('font-semibold', stock < item.min_stock_level ? 'text-red-600' : 'text-slate-900')}>
                          {formatNumber(stock, 0)} {getUnit(item.unit_id)}
                        </p>
                        <StockBadge qty={stock} min={item.min_stock_level} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                          item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        )}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isManager && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => { setEditItem(item); setShowForm(true) }}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
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
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
            Showing {filtered.length} of {mockItems.length} items
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && isManager && (
        <ItemFormModal item={editItem} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

function ItemFormModal({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const isEdit = !!item
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">SKU *</label>
              <input defaultValue={item?.sku} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. RM-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name *</label>
              <input defaultValue={item?.name} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Item name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Item Type *</label>
              <select defaultValue={item?.type} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unit *</label>
              <select defaultValue={item?.unit_id} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {mockUnits.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">HSN / SAC Code</label>
              <input defaultValue={item?.hsn_code ?? ''} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 6810" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">GST Rate (%)</label>
              <select defaultValue={item?.gst_rate} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Purchase Rate (₹)</label>
              <input type="number" defaultValue={item?.purchase_rate} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Selling Rate (₹)</label>
              <input type="number" defaultValue={item?.selling_rate} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Min Stock Level</label>
              <input type="number" defaultValue={item?.min_stock_level} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea defaultValue={item?.description ?? ''} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              {isEdit ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
