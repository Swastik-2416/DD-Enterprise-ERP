import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, Edit2, Trash2, X, Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import { seedStandardUnitsAndCategories } from '@/lib/seedDefaults'
import type { ItemCategory, ItemType } from '@/types/database.types'

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

// ─── Page ──────────────────────────────────────────────────────────────────────

export function CategoriesPage() {
  const { user, isManager } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.company_id ?? ''

  const { data: categories = [], isLoading } = useCategories(companyId)

  const [showForm, setShowForm] = useState(false)
  const [editCat, setEditCat] = useState<ItemCategory | null>(null)

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('item_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', companyId] })
      toast.success('Category deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const [isSeeding, setIsSeeding] = useState(false)

  const handleSeed = async () => {
    setIsSeeding(true)
    try {
      const res = await seedStandardUnitsAndCategories(companyId)
      qc.invalidateQueries({ queryKey: ['categories', companyId] })
      toast.success(`Standard factory categories added! (+${res.categoriesAdded} categories)`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed categories')
    } finally {
      setIsSeeding(false)
    }
  }

  function openEdit(cat: ItemCategory) {
    setEditCat(cat)
    setShowForm(true)
  }

  function openAdd() {
    setEditCat(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Item Categories"
        subtitle={`${categories.length} categories · classification groups for inventory and GST HSN mapping`}
        icon={Package}
        actions={
          isManager ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-outline-variant text-on-surface text-sm font-medium rounded-lg hover:bg-surface-container transition-colors shadow-xs"
              >
                {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                Load Standard Categories
              </button>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
              >
                <Plus className="h-4 w-4" /> Add Category
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Skeleton loader */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-outline-variant rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-surface-container rounded w-3/4 mb-3" />
              <div className="h-3 bg-surface-container rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && categories.length === 0 && (
        <EmptyState
          icon={Package}
          title="No categories yet"
          description="Add your first item category to classify raw materials, finished goods and consumables."
          action={isManager ? { label: 'Add Category', onClick: openAdd } : undefined}
        />
      )}

      {/* Category cards */}
      {!isLoading && categories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="bg-surface border border-outline-variant rounded-xl p-5 shadow-ambient group">
              <div className="flex items-center justify-between">
                <span className="font-bold text-on-surface">{cat.name}</span>
                <span className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                  TYPE_COLORS[cat.type]
                )}>
                  {TYPE_LABELS[cat.type]}
                </span>
              </div>
              <p className="text-xs text-outline mt-2">
                System classification type for ledger posting and GST HSN mapping.
              </p>
              {isManager && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-outline-variant opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(cat)}
                    className="flex items-center gap-1 text-xs text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${cat.name}"? This cannot be undone.`)) {
                        deleteMutation.mutate(cat.id)
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-error hover:bg-error/10 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && isManager && (
        <CategoryFormModal
          cat={editCat}
          companyId={companyId}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// ─── Form modal ────────────────────────────────────────────────────────────────

interface FormModalProps {
  cat: ItemCategory | null
  companyId: string
  onClose: () => void
}

function CategoryFormModal({ cat, companyId, onClose }: FormModalProps) {
  const qc = useQueryClient()
  const isEdit = !!cat
  const [name, setName] = useState(cat?.name ?? '')
  const [type, setType] = useState<ItemType>(cat?.type ?? 'raw_material')

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Category name is required')
      if (isEdit) {
        const { error } = await (supabase
          .from('item_categories') as any)
          .update({ name: name.trim(), type })
          .eq('id', cat.id)
        if (error) throw error
      } else {
        const { error } = await (supabase
          .from('item_categories') as any)
          .insert({ name: name.trim(), type, company_id: companyId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', companyId] })
      toast.success(isEdit ? 'Category updated' : 'Category added')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h2 className="text-lg font-bold text-on-surface">{isEdit ? 'Edit Category' : 'Add Category'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-lg transition-colors text-outline">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
              Category Name *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="e.g. Cement & Aggregates"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
              Type *
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ItemType)}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-on-surface-variant border border-outline-variant rounded-lg hover:bg-background transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-60"
          >
            {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Category'}
          </button>
        </div>
      </div>
    </div>
  )
}
