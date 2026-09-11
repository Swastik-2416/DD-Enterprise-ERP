import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Unit } from '@/types/database.types'

// ─── Data hook ─────────────────────────────────────────────────────────────────

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

export function UnitsPage() {
  const { user, isManager } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.company_id ?? ''

  const { data: units = [], isLoading } = useUnits(companyId)
  const [showForm, setShowForm] = useState(false)
  const [editUnit, setEditUnit] = useState<Unit | null>(null)

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('units').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units', companyId] })
      toast.success('Unit deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function openEdit(unit: Unit) { setEditUnit(unit); setShowForm(true) }
  function openAdd() { setEditUnit(null); setShowForm(true) }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Units of Measurement"
        subtitle={`${units.length} units · standard UoM for raw materials, production output, and GST invoicing`}
        icon={Settings}
        actions={
          isManager ? (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Unit
            </button>
          ) : undefined
        }
      />

      {/* Skeleton */}
      {isLoading && (
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden max-w-3xl animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-outline-variant last:border-0">
              <div className="h-4 bg-surface-container rounded w-1/3" />
              <div className="h-4 bg-surface-container rounded w-12" />
              <div className="h-4 bg-surface-container rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && units.length === 0 && (
        <EmptyState
          icon={Settings}
          title="No units defined"
          description="Add your first unit of measurement (e.g. Pieces, Bags, MT) to use in items and invoices."
          action={isManager ? { label: 'Add Unit', onClick: openAdd } : undefined}
        />
      )}

      {!isLoading && units.length > 0 && (
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xs max-w-3xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/80 border-b border-outline-variant text-xs uppercase font-semibold text-on-surface-variant">
              <tr>
                <th className="py-3 px-4">Unit Name</th>
                <th className="py-3 px-4">Symbol / UQC</th>
                <th className="py-3 px-4">Status</th>
                {isManager && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map(unit => (
                <tr key={unit.id} className="hover:bg-background/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-on-surface">{unit.name}</td>
                  <td className="py-3 px-4 font-mono font-bold text-primary">{unit.symbol}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Active
                    </span>
                  </td>
                  {isManager && (
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(unit)}
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete unit "${unit.name}"?`)) {
                              deleteMutation.mutate(unit.id)
                            }
                          }}
                          className="p-1.5 hover:bg-error/10 rounded-lg text-error transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-slate-100 bg-background text-xs text-outline">
            {units.length} unit{units.length !== 1 ? 's' : ''} defined
          </div>
        </div>
      )}

      {showForm && isManager && (
        <UnitFormModal unit={editUnit} companyId={companyId} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

// ─── Form modal ────────────────────────────────────────────────────────────────

interface UnitFormProps {
  unit: Unit | null
  companyId: string
  onClose: () => void
}

function UnitFormModal({ unit, companyId, onClose }: UnitFormProps) {
  const qc = useQueryClient()
  const isEdit = !!unit
  const [name, setName] = useState(unit?.name ?? '')
  const [symbol, setSymbol] = useState(unit?.symbol ?? '')

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Unit name is required')
      if (!symbol.trim()) throw new Error('Symbol is required')
      if (isEdit) {
        const { error } = await (supabase
          .from('units') as any)
          .update({ name: name.trim(), symbol: symbol.trim() })
          .eq('id', unit.id)
        if (error) throw error
      } else {
        const { error } = await (supabase
          .from('units') as any)
          .insert({ name: name.trim(), symbol: symbol.trim(), company_id: companyId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units', companyId] })
      toast.success(isEdit ? 'Unit updated' : 'Unit added')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h2 className="text-lg font-bold text-on-surface">{isEdit ? 'Edit Unit' : 'Add Unit'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-lg transition-colors text-outline">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
              Unit Name *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="e.g. Pieces"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
              Symbol / UQC *
            </label>
            <input
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="e.g. pcs"
            />
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
            {isEdit ? 'Save Changes' : 'Add Unit'}
          </button>
        </div>
      </div>
    </div>
  )
}
