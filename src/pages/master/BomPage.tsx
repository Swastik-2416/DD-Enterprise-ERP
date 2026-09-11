import { useState, useId } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Factory, Plus, Layers, Search, Edit2, Trash2,
  X, Check, AlertCircle, Loader2, Sparkles, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import type { BOM, BOMLine, Item, Unit } from '@/types/database.types'

interface BOMWithFG extends BOM {
  finished_good: Item
}

interface BOMLineWithDetails extends BOMLine {
  raw_material: Item
  unit: Unit
}

interface RecipeFormLine {
  id: string
  raw_material_id: string
  unit_id: string
  qty_per_unit: number | ''
  wastage_pct: number | ''
}

// ─── Data Hooks ─────────────────────────────────────────────────────────────

function useBoms(companyId: string) {
  return useQuery({
    queryKey: ['boms', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boms')
        .select(`
          *,
          finished_good:items(id, name, sku, type)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as BOMWithFG[]
    },
    enabled: !!companyId,
  })
}

function useBomLines(bomId: string | null) {
  return useQuery({
    queryKey: ['bom_lines', bomId],
    queryFn: async () => {
      if (!bomId) return []
      const { data, error } = await supabase
        .from('bom_lines')
        .select(`
          *,
          raw_material:items(id, name, sku, type, unit_id),
          unit:units(id, name, symbol)
        `)
        .eq('bom_id', bomId)

      if (error) throw error
      return (data || []) as BOMLineWithDetails[]
    },
    enabled: !!bomId,
  })
}

function useFinishedGoods(companyId: string) {
  return useQuery({
    queryKey: ['items_finished_goods', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, sku, type, unit_id')
        .eq('company_id', companyId)
        .eq('type', 'finished_good')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data || []) as Item[]
    },
    enabled: !!companyId,
  })
}

function useRawMaterials(companyId: string) {
  return useQuery({
    queryKey: ['items_raw_materials', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, sku, type, unit_id')
        .eq('company_id', companyId)
        .neq('type', 'finished_good')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data || []) as Item[]
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
      return (data || []) as Unit[]
    },
    enabled: !!companyId,
  })
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function BomPage() {
  const { user, isManager } = useAuth()
  const companyId = user?.company_id || ''
  const queryClient = useQueryClient()

  const [selectedBomId, setSelectedBomId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingBom, setEditingBom] = useState<BOMWithFG | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<BOMWithFG | null>(null)

  // Fetch queries
  const { data: boms = [], isLoading: bomsLoading } = useBoms(companyId)
  const { data: finishedGoods = [] } = useFinishedGoods(companyId)
  const { data: rawMaterials = [] } = useRawMaterials(companyId)
  const { data: units = [] } = useUnits(companyId)

  // Ensure an active selection
  const activeSelectedId = selectedBomId || (boms.length > 0 ? boms[0].id : null)
  const selectedBom = boms.find(b => b.id === activeSelectedId)
  const { data: bomLines = [], isLoading: linesLoading } = useBomLines(activeSelectedId)

  // Filtered recipes for search
  const filteredBoms = boms.filter(b => {
    const fgName = b.finished_good?.name || ''
    const sku = b.finished_good?.sku || ''
    const notes = b.notes || ''
    const q = searchTerm.toLowerCase()
    return fgName.toLowerCase().includes(q) || sku.toLowerCase().includes(q) || notes.toLowerCase().includes(q)
  })

  // ─── Mutations ─────────────────────────────────────────────────────────────

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ bomId, currentStatus }: { bomId: string; currentStatus: boolean }) => {
      const { error } = await (supabase.from('boms') as any)
        .update({ is_active: !currentStatus })
        .eq('id', bomId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['boms', companyId] })
      toast.success(vars.currentStatus ? 'Recipe deactivated' : 'Recipe activated')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update recipe status')
    },
  })

  // Delete BOM
  const deleteBomMutation = useMutation({
    mutationFn: async (bomId: string) => {
      const { error } = await (supabase.from('boms') as any)
        .delete()
        .eq('id', bomId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms', companyId] })
      setDeleteCandidate(null)
      setSelectedBomId(null)
      toast.success('Recipe deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete recipe. It might be referenced by production orders.')
    },
  })

  const openCreateModal = () => {
    setEditingBom(null)
    setShowModal(true)
  }

  const openEditModal = (bom: BOMWithFG) => {
    setEditingBom(bom)
    setShowModal(true)
  }

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
                onClick: openCreateModal,
              }
            : undefined
        }
      />

      {bomsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : boms.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Recipe BOMs Configured"
          description={
            finishedGoods.length === 0
              ? 'Please add at least one Finished Good item in the Items Master before creating a BOM recipe.'
              : 'Define mix recipes to automatically calculate and deduct raw materials during production.'
          }
          action={
            isManager && finishedGoods.length > 0
              ? {
                  label: 'Create First BOM Recipe',
                  onClick: openCreateModal,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: BOM Recipe List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">
                Configured Recipes ({filteredBoms.length})
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search recipe or item..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-outline-variant rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Recipe List */}
            <div className="space-y-2">
              {filteredBoms.map(bom => {
                const isSelected = bom.id === activeSelectedId
                return (
                  <div
                    key={bom.id}
                    onClick={() => setSelectedBomId(bom.id)}
                    className={cn(
                      'p-4 rounded-xl border cursor-pointer transition-all',
                      isSelected
                        ? 'bg-primary/5 border-primary/40 ring-2 ring-primary/20 shadow-xs'
                        : 'bg-surface border-outline-variant hover:bg-background/80'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-sm text-on-surface block">
                          {bom.finished_good?.name || 'Unnamed Product'}
                        </span>
                        <span className="text-xs font-mono text-outline">
                          {bom.finished_good?.sku}
                        </span>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                        v{bom.version}.0
                      </span>
                    </div>

                    {bom.notes && (
                      <p className="text-xs text-outline mt-1 line-clamp-2">{bom.notes}</p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-outline-variant/50 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-block w-2 h-2 rounded-full',
                            bom.is_active ? 'bg-emerald-500' : 'bg-outline'
                          )}
                        />
                        <span className="text-on-surface-variant text-[11px] font-medium">
                          {bom.is_active ? 'Active Formula' : 'Inactive'}
                        </span>
                      </div>
                      <span className="text-[11px] text-outline">
                        {new Date(bom.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Selected Recipe Details */}
          <div className="lg:col-span-2">
            {selectedBom ? (
              <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xs space-y-0">
                {/* Header */}
                <div className="p-5 border-b border-outline-variant bg-background/50 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-on-surface">
                        {selectedBom.finished_good?.name}
                      </h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                        v{selectedBom.version}.0
                      </span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          selectedBom.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-surface-container text-on-surface-variant border border-outline-variant'
                        )}
                      >
                        {selectedBom.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-outline mt-1 font-mono">
                      SKU: {selectedBom.finished_good?.sku} · Base Unit: 1 Piece (pc)
                    </p>
                    {selectedBom.notes && (
                      <p className="text-xs text-on-surface-variant mt-2 bg-surface p-2.5 rounded-lg border border-outline-variant/60">
                        💬 <span className="font-medium">Mix Notes:</span> {selectedBom.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions for Manager */}
                  {isManager && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            bomId: selectedBom.id,
                            currentStatus: selectedBom.is_active,
                          })
                        }
                        disabled={toggleActiveMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium border border-outline-variant rounded-lg hover:bg-background text-on-surface-variant transition-colors"
                      >
                        {selectedBom.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(selectedBom)}
                        className="px-3 py-1.5 text-xs font-medium bg-surface border border-outline-variant rounded-lg hover:bg-background text-primary flex items-center gap-1.5 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit Recipe
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(selectedBom)}
                        className="p-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Recipe"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Lines Table */}
                <div className="p-0">
                  {linesLoading ? (
                    <div className="py-12 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : bomLines.length === 0 ? (
                    <div className="p-8 text-center text-outline text-sm">
                      No raw material ingredients added to this recipe yet.
                      {isManager && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => openEditModal(selectedBom)}
                            className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg"
                          >
                            Add Ingredients
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-background border-b border-outline-variant text-xs uppercase font-semibold text-on-surface-variant">
                          <tr>
                            <th className="py-3 px-4">Raw Material Ingredient</th>
                            <th className="py-3 px-4">SKU</th>
                            <th className="py-3 px-4 text-right">Qty per 1 pc</th>
                            <th className="py-3 px-4 text-right">Wastage %</th>
                            <th className="py-3 px-4 text-right">Qty for 1,000 pcs (Gross)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/60">
                          {bomLines.map(line => {
                            const unitSymbol = line.unit?.symbol || ''
                            const qty1 = Number(line.qty_per_unit) || 0
                            const wastage = Number(line.wastage_pct) || 0
                            const total1000 = qty1 * 1000 * (1 + wastage / 100)

                            return (
                              <tr key={line.id} className="hover:bg-background/50 transition-colors">
                                <td className="py-3 px-4 font-semibold text-on-surface">
                                  {line.raw_material?.name || 'Raw Material'}
                                </td>
                                <td className="py-3 px-4 font-mono text-xs text-outline">
                                  {line.raw_material?.sku || '—'}
                                </td>
                                <td className="py-3 px-4 text-right font-medium text-on-surface">
                                  {qty1.toLocaleString('en-IN', { maximumFractionDigits: 4 })}{' '}
                                  <span className="text-xs text-outline">{unitSymbol}</span>
                                </td>
                                <td className="py-3 px-4 text-right text-outline">
                                  {wastage > 0 ? (
                                    <span className="text-amber-600 font-medium">+{wastage}%</span>
                                  ) : (
                                    <span className="text-outline">0%</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-primary">
                                  {total1000.toLocaleString('en-IN', { maximumFractionDigits: 2 })}{' '}
                                  <span className="text-xs font-normal text-on-surface-variant">{unitSymbol}</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Footer note */}
                <div className="p-4 bg-background border-t border-outline-variant text-xs text-on-surface-variant flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-on-surface">Automated Production Deductions:</span> When a batch is logged in Production Orders using this recipe, the inventory system automatically multiplies these proportions by the batch count and deducts raw materials from your factory stock ledger.
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface border border-outline-variant rounded-xl p-12 text-center text-outline">
                Select a recipe from the list to view ingredients and mix ratios.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Recipe Modal */}
      {showModal && (
        <RecipeModal
          companyId={companyId}
          editingBom={editingBom}
          existingLines={editingBom ? bomLines : []}
          finishedGoods={finishedGoods}
          rawMaterials={rawMaterials}
          units={units}
          onClose={() => {
            setShowModal(false)
            setEditingBom(null)
          }}
          onSuccess={(savedBomId) => {
            setShowModal(false)
            setEditingBom(null)
            setSelectedBomId(savedBomId)
            queryClient.invalidateQueries({ queryKey: ['boms', companyId] })
            queryClient.invalidateQueries({ queryKey: ['bom_lines', savedBomId] })
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl shadow-xl max-w-md w-full p-6 border border-outline-variant">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-on-surface">Delete Recipe?</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              Are you sure you want to delete the BOM recipe for{' '}
              <strong className="text-on-surface">{deleteCandidate.finished_good?.name}</strong> (v{deleteCandidate.version}.0)? This will also remove all associated recipe lines.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={deleteBomMutation.isPending}
                className="px-4 py-2 border border-outline-variant text-on-surface-variant text-sm font-medium rounded-lg hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteBomMutation.mutate(deleteCandidate.id)}
                disabled={deleteBomMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
              >
                {deleteBomMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Recipe'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Recipe Form Modal Component ─────────────────────────────────────────────

interface RecipeModalProps {
  companyId: string
  editingBom: BOMWithFG | null
  existingLines: BOMLineWithDetails[]
  finishedGoods: Item[]
  rawMaterials: Item[]
  units: Unit[]
  onClose: () => void
  onSuccess: (savedBomId: string) => void
}

function RecipeModal({
  companyId,
  editingBom,
  existingLines,
  finishedGoods,
  rawMaterials,
  units,
  onClose,
  onSuccess,
}: RecipeModalProps) {
  const isEdit = !!editingBom

  const [finishedGoodId, setFinishedGoodId] = useState(
    editingBom?.finished_good_id || (finishedGoods[0]?.id || '')
  )
  const [version, setVersion] = useState<number>(editingBom?.version || 1)
  const [notes, setNotes] = useState(editingBom?.notes || '')
  const [lines, setLines] = useState<RecipeFormLine[]>(() => {
    if (isEdit && existingLines.length > 0) {
      return existingLines.map(l => ({
        id: l.id,
        raw_material_id: l.raw_material_id,
        unit_id: l.unit_id,
        qty_per_unit: l.qty_per_unit,
        wastage_pct: l.wastage_pct,
      }))
    }
    // Default 1 blank line
    const firstRm = rawMaterials[0]
    return [
      {
        id: 'new-1',
        raw_material_id: firstRm?.id || '',
        unit_id: firstRm?.unit_id || (units[0]?.id || ''),
        qty_per_unit: '',
        wastage_pct: 0,
      },
    ]
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add line
  const handleAddLine = () => {
    const firstRm = rawMaterials[0]
    setLines(prev => [
      ...prev,
      {
        id: `new-${Date.now()}-${Math.random()}`,
        raw_material_id: firstRm?.id || '',
        unit_id: firstRm?.unit_id || (units[0]?.id || ''),
        qty_per_unit: '',
        wastage_pct: 0,
      },
    ])
  }

  // Remove line
  const handleRemoveLine = (index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index))
  }

  // Update line field
  const handleLineChange = (index: number, field: keyof RecipeFormLine, val: any) => {
    setLines(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      // Auto-set default unit when raw material item changes
      if (field === 'raw_material_id') {
        const item = rawMaterials.find(rm => rm.id === val)
        if (item?.unit_id) {
          copy[index].unit_id = item.unit_id
        }
      }
      return copy
    })
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!finishedGoodId) {
      toast.error('Please select a finished good product')
      return
    }

    if (lines.length === 0) {
      toast.error('Please add at least one raw material ingredient')
      return
    }

    // Validate lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.raw_material_id) {
        toast.error(`Please select a raw material for row ${i + 1}`)
        return
      }
      if (!line.unit_id) {
        toast.error(`Please select a unit for row ${i + 1}`)
        return
      }
      if (line.qty_per_unit === '' || Number(line.qty_per_unit) <= 0) {
        toast.error(`Please enter a valid quantity > 0 for row ${i + 1}`)
        return
      }
    }

    // Check for duplicate raw material lines
    const rawMaterialIds = lines.map(l => l.raw_material_id)
    const uniqueIds = new Set(rawMaterialIds)
    if (uniqueIds.size !== rawMaterialIds.length) {
      toast.error('Duplicate raw materials found in the recipe. Please combine quantities.')
      return
    }

    setIsSubmitting(true)
    try {
      let bomId = editingBom?.id

      if (isEdit && bomId) {
        // Update BOM header
        const { error: bomErr } = await (supabase.from('boms') as any)
          .update({
            finished_good_id: finishedGoodId,
            version: Number(version) || 1,
            notes: notes.trim() || null,
          })
          .eq('id', bomId)

        if (bomErr) throw bomErr

        // Delete existing lines
        const { error: delErr } = await (supabase.from('bom_lines') as any)
          .delete()
          .eq('bom_id', bomId)

        if (delErr) throw delErr
      } else {
        // Insert new BOM header
        const { data: newBom, error: bomErr } = await (supabase.from('boms') as any)
          .insert({
            company_id: companyId,
            finished_good_id: finishedGoodId,
            version: Number(version) || 1,
            notes: notes.trim() || null,
            is_active: true,
          })
          .select()
          .single()

        if (bomErr) throw bomErr
        bomId = newBom.id
      }

      // Insert lines
      const linesToInsert = lines.map(l => ({
        bom_id: bomId,
        raw_material_id: l.raw_material_id,
        unit_id: l.unit_id,
        qty_per_unit: Number(l.qty_per_unit),
        wastage_pct: Number(l.wastage_pct) || 0,
      }))

      const { error: linesErr } = await (supabase.from('bom_lines') as any)
        .insert(linesToInsert)

      if (linesErr) throw linesErr

      toast.success(isEdit ? 'Recipe updated successfully' : 'Recipe created successfully')
      if (bomId) {
        onSuccess(bomId)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save recipe')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-surface rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-outline-variant my-8">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant mb-4">
          <div>
            <h3 className="text-lg font-bold text-on-surface">
              {isEdit ? 'Edit BOM Recipe' : 'Create Bill of Materials (BOM)'}
            </h3>
            <p className="text-xs text-outline mt-0.5">
              Specify raw material proportions and estimated wastage per 1 finished paver block
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Top Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Finished Good Product <span className="text-red-500">*</span>
              </label>
              <select
                value={finishedGoodId}
                onChange={e => setFinishedGoodId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {finishedGoods.map(fg => (
                  <option key={fg.id} value={fg.id}>
                    {fg.name} ({fg.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Recipe Version
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={version}
                onChange={e => setVersion(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Notes / Mix Ratio Description
            </label>
            <input
              type="text"
              placeholder="e.g. Concrete mix ratio 1:1.5:3 (M30 Grade for 60mm paver)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Lines Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-outline">
                Raw Material Ingredients ({lines.length})
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Ingredient
              </button>
            </div>

            <div className="border border-outline-variant rounded-xl overflow-hidden bg-background/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-background border-b border-outline-variant font-semibold text-on-surface-variant">
                  <tr>
                    <th className="py-2.5 px-3">Raw Material</th>
                    <th className="py-2.5 px-2 w-28">Unit</th>
                    <th className="py-2.5 px-2 w-28 text-right">Qty per 1 pc</th>
                    <th className="py-2.5 px-2 w-24 text-right">Wastage %</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 bg-surface">
                  {lines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-background/40">
                      <td className="p-2">
                        <select
                          value={line.raw_material_id}
                          onChange={e => handleLineChange(idx, 'raw_material_id', e.target.value)}
                          required
                          className="w-full px-2 py-1.5 text-xs bg-surface border border-outline-variant rounded-md focus:ring-1 focus:ring-primary"
                        >
                          {rawMaterials.map(rm => (
                            <option key={rm.id} value={rm.id}>
                              {rm.name} ({rm.sku})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          value={line.unit_id}
                          onChange={e => handleLineChange(idx, 'unit_id', e.target.value)}
                          required
                          className="w-full px-2 py-1.5 text-xs bg-surface border border-outline-variant rounded-md focus:ring-1 focus:ring-primary"
                        >
                          {units.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.symbol})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          placeholder="e.g. 0.05"
                          value={line.qty_per_unit}
                          onChange={e => handleLineChange(idx, 'qty_per_unit', e.target.value)}
                          required
                          className="w-full px-2 py-1.5 text-xs text-right bg-surface border border-outline-variant rounded-md focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={line.wastage_pct}
                          onChange={e => handleLineChange(idx, 'wastage_pct', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs text-right bg-surface border border-outline-variant rounded-md focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length === 1}
                          className="p-1 text-outline hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                          title="Remove line"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-outline">
              💡 Tip: Enter exact quantity for 1 single finished paver block (e.g. 0.05 kg Cement). The system automatically scales this to 1,000s and full batch sizes during manufacturing.
            </p>
          </div>

          {/* Form Actions */}
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
                  Saving Recipe...
                </>
              ) : isEdit ? (
                'Update Recipe'
              ) : (
                'Save Recipe'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
