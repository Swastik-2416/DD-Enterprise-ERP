import { useState } from 'react'
import { Package, Search, Filter, AlertTriangle, CheckCircle, Printer } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StockBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { mockItems, mockCategories, mockUnits, getStockBalance } from '@/lib/mockData'
import { cn } from '@/lib/cn'

export function StockReportPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [stockStatusFilter, setStockStatusFilter] = useState('all')

  const itemsWithStock = mockItems.map(item => {
    const qty = getStockBalance(item.id)
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
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || item.type === typeFilter
    const matchStatus =
      stockStatusFilter === 'all' ||
      (stockStatusFilter === 'low' && item.is_low) ||
      (stockStatusFilter === 'ok' && !item.is_low)
    return matchSearch && matchType && matchStatus
  })

  const totalValuation = itemsWithStock.reduce((s, i) => s + i.valuation, 0)
  const lowStockCount = itemsWithStock.filter(i => i.is_low).length

  function getUnitSymbol(unitId: string) {
    return mockUnits.find(u => u.id === unitId)?.symbol ?? ''
  }

  function getCategoryName(catId: string) {
    return mockCategories.find(c => c.id === catId)?.name ?? ''
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Valuation & Inventory Report"
        subtitle="Real-time physical stock balances, re-order thresholds, and warehouse valuation"
        action={{
          label: 'Print Stock Sheet',
          icon: Printer,
          onClick: () => window.print(),
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Inventory Valuation</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalValuation)}</div>
          <div className="text-xs text-slate-500 mt-1">Valued at standard purchase / base rates</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Warnings</span>
            <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{lowStockCount} Items</div>
          <div className="text-xs text-amber-600 font-medium mt-1">Below minimum threshold limit</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tracked SKUs</span>
            <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">{mockItems.length} SKUs</div>
          <div className="text-xs text-slate-500 mt-1">Single centralized factory warehouse</div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU or item name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            aria-label="Filter inventory report by type"
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden"
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
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden"
          >
            <option value="all">All Stock Statuses</option>
            <option value="low">Low Stock Alert Only</option>
            <option value="ok">Sufficient Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Min Threshold</th>
                <th className="py-3 px-4 text-right">Base Rate</th>
                <th className="py-3 px-4 text-right">Stock Valuation</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(item => {
                const unit = getUnitSymbol(item.unit_id)
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'hover:bg-slate-50/50 transition-colors',
                      item.is_low && 'bg-amber-50/30'
                    )}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">{item.sku}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-400 font-mono">HSN: {item.hsn_code || '—'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{getCategoryName(item.category_id)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatNumber(item.qty_on_hand)} <span className="text-xs font-normal text-slate-500">{unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatNumber(item.min_stock_level)} {unit}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatCurrency(item.type === 'finished_good' ? item.selling_rate : item.purchase_rate)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(item.valuation)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StockBadge qty={item.qty_on_hand} min={item.min_stock_level} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
