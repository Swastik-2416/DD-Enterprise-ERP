import { useState } from 'react'
import { Factory, Plus, Layers, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { mockBOMs, mockBOMLines, mockItems, mockUnits } from '@/lib/mockData'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'

export function BomPage() {
  const { isManager } = useAuth()
  const [selectedBomId, setSelectedBomId] = useState<string>(mockBOMs[0]?.id || '')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const selectedBom = mockBOMs.find(b => b.id === selectedBomId)
  const selectedFgItem = mockItems.find(i => i.id === selectedBom?.finished_good_id)
  const lines = mockBOMLines.filter(l => l.bom_id === selectedBomId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bill of Materials (BOM Recipes)"
        subtitle="Standard mix formulas per finished paver block unit (cement, coarse aggregate, sand, fly ash, pigment)"
        action={
          isManager
            ? {
                label: 'Create Recipe BOM',
                icon: Plus,
                onClick: () => setShowCreateModal(true),
              }
            : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side: BOM list */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-outline">Configured Recipes</div>
          <div className="space-y-2">
            {mockBOMs.map(bom => {
              const fg = mockItems.find(i => i.id === bom.finished_good_id)
              const isSelected = bom.id === selectedBomId
              return (
                <div
                  key={bom.id}
                  onClick={() => setSelectedBomId(bom.id)}
                  className={cn(
                    'p-4 rounded-xl border cursor-pointer transition-all',
                    isSelected
                      ? 'bg-primary/5/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-surface border-outline-variant hover:bg-background/80'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-on-surface">{fg?.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      v{bom.version}.0
                    </span>
                  </div>
                  <p className="text-xs text-outline mt-1">{bom.notes}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-on-surface-variant">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Active Production Mix</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right side: Selected BOM Lines */}
        <div className="lg:col-span-2">
          {selectedBom && (
            <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-outline-variant bg-background/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-on-surface">{selectedFgItem?.name} Mix Recipe</h3>
                  <p className="text-xs text-outline mt-0.5">Raw material inputs required per 1 unit of finished block</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-outline">Base Unit</span>
                  <div className="text-sm font-bold text-on-surface">1 Piece (pc)</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background border-b border-outline-variant text-xs uppercase font-semibold text-on-surface-variant">
                    <tr>
                      <th className="py-3 px-4">Raw Material</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4 text-right">Qty per 1 pc</th>
                      <th className="py-3 px-4 text-right">Qty per 1,000 pcs</th>
                      <th className="py-3 px-4 text-right">Wastage %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map(line => {
                      const rm = mockItems.find(i => i.id === line.raw_material_id)
                      const unit = mockUnits.find(u => u.id === line.unit_id)
                      return (
                        <tr key={line.id} className="hover:bg-background/50">
                          <td className="py-3 px-4 font-semibold text-on-surface">{rm?.name}</td>
                          <td className="py-3 px-4 font-mono text-xs text-outline">{rm?.sku}</td>
                          <td className="py-3 px-4 text-right font-medium text-on-surface">
                            {line.qty_per_unit} {unit?.symbol}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-primary">
                            {(line.qty_per_unit * 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {unit?.symbol}
                          </td>
                          <td className="py-3 px-4 text-right text-outline">{line.wastage_pct}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-background border-t border-outline-variant text-xs text-on-surface-variant">
                💡 <span className="font-semibold text-on-surface">Automatic Stock Deduction:</span> When the plant manager confirms a batch in Production Orders, the system queries this formula and automatically subtracts the exact quantity of Cement, Sand, Aggregate, and Fly Ash from raw material warehouse inventory.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create BOM Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-on-surface mb-2">Create Mix Recipe (BOM)</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Define the raw materials and proportion required for 1 finished block.
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Finished Good Product</label>
                <select className="w-full px-3 py-2 border border-outline-variant rounded-lg">
                  {mockItems.filter(i => i.type === 'finished_good').map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Notes / Mix Ratio</label>
                <input type="text" placeholder="e.g. 1:1.5:3 concrete mix ratio" className="w-full px-3 py-2 border border-outline-variant rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-outline-variant text-on-surface-variant text-sm font-medium rounded-lg hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Demo note: New BOM formula created!')
                  setShowCreateModal(false)
                }}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg shadow-xs"
              >
                Save Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
