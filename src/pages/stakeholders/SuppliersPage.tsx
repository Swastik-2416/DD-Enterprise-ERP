import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Plus, Search, Edit2, Phone, Mail,
  Trash2, X, Loader2, Landmark, MapPin, User, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import type { Supplier } from '@/types/database.types'

// ─── Data Hooks ─────────────────────────────────────────────────────────────

function useSuppliers(companyId: string) {
  return useQuery({
    queryKey: ['suppliers', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (error) throw error
      return (data || []) as Supplier[]
    },
    enabled: !!companyId,
  })
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SuppliersPage() {
  const { user, isManager } = useAuth()
  const companyId = user?.company_id || ''
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Supplier | null>(null)

  const { data: suppliers = [], isLoading } = useSuppliers(companyId)

  // Filter
  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase()
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      (s.gstin ?? '').toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      (s.contact_person ?? '').toLowerCase().includes(q)

    if (!matchesSearch) return false
    if (statusFilter === 'active') return s.is_active
    if (statusFilter === 'inactive') return !s.is_active
    return true
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (s: Supplier) => {
      const { error } = await (supabase.from('suppliers') as any)
        .update({ is_active: !s.is_active })
        .eq('id', s.id)
      if (error) throw error
    },
    onSuccess: (_, s) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', companyId] })
      toast.success(s.is_active ? 'Supplier deactivated' : 'Supplier activated')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update supplier status')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('suppliers') as any)
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', companyId] })
      setDeleteCandidate(null)
      toast.success('Supplier deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete supplier. Check for associated purchase bills.')
    },
  })

  const openAdd = () => {
    setEditSupplier(null)
    setShowForm(true)
  }

  const openEdit = (supplier: Supplier) => {
    setEditSupplier(supplier)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} vendors registered · Cement, aggregates, sand, admixtures & equipment`}
        icon={Building2}
        action={
          isManager
            ? {
                label: 'Add Supplier',
                icon: Plus,
                onClick: openAdd,
              }
            : undefined
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, city, GSTIN or phone…"
            className="w-full pl-9 pr-4 py-2 bg-surface border border-outline-variant rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-surface p-1 rounded-xl border border-outline-variant text-xs">
          {(['all', 'active', 'inactive'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium capitalize transition-colors',
                statusFilter === tab
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:bg-background'
              )}
            >
              {tab === 'all' ? `All (${suppliers.length})` : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? 'No suppliers match your search' : 'No suppliers registered'}
          description="Add raw material vendors (cement companies, quarry operators, transport) to record purchases."
          action={
            isManager
              ? {
                  label: 'Add First Supplier',
                  onClick: openAdd,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(supplier => (
            <div
              key={supplier.id}
              className="bg-surface rounded-xl border border-outline-variant p-5 hover:shadow-ambient transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>

                  {isManager && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(supplier)}
                        className="p-1.5 hover:bg-background rounded-lg text-outline hover:text-primary transition-colors"
                        title="Edit Supplier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(supplier)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-outline hover:text-red-600 transition-colors"
                        title="Delete Supplier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-on-surface text-base leading-tight mb-1">
                    {supplier.name}
                  </h3>
                  <span
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0',
                      supplier.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-surface-container text-outline border border-outline-variant'
                    )}
                  >
                    {supplier.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-xs text-outline flex items-center gap-1 mt-1 mb-3">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {supplier.address ? `${supplier.address}, ` : ''}
                  {supplier.city}
                  {supplier.state ? `, ${supplier.state}` : ''}
                </p>

                <div className="space-y-1.5 text-xs text-on-surface-variant">
                  {supplier.gstin && (
                    <div className="flex items-center gap-2">
                      <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded font-mono text-[11px]">
                        GSTIN: {supplier.gstin}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-outline">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-outline" />
                    <span className="text-on-surface font-medium">{supplier.phone}</span>
                  </div>

                  {supplier.email && (
                    <div className="flex items-center gap-2 text-outline">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-outline" />
                      <span>{supplier.email}</span>
                    </div>
                  )}

                  {supplier.contact_person && (
                    <div className="flex items-center gap-2 text-outline">
                      <User className="h-3.5 w-3.5 shrink-0 text-outline" />
                      <span>Contact: {supplier.contact_person}</span>
                    </div>
                  )}
                </div>

                {/* Bank Details Badge */}
                {(supplier.bank_name || supplier.bank_account) && (
                  <div className="mt-3 pt-3 border-t border-outline-variant/60 text-xs text-outline flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      {supplier.bank_name || 'Bank'}: {supplier.bank_account ? `••••${supplier.bank_account.slice(-4)}` : ''}
                    </span>
                    {supplier.bank_ifsc && (
                      <span className="font-mono text-[10px] text-outline ml-auto">
                        {supplier.bank_ifsc}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isManager && (
                <div className="mt-4 pt-3 border-t border-outline-variant/40 flex justify-end">
                  <button
                    type="button"
                    onClick={() => toggleActiveMutation.mutate(supplier)}
                    disabled={toggleActiveMutation.isPending}
                    className="text-xs text-outline hover:text-on-surface font-medium"
                  >
                    {supplier.is_active ? 'Mark Inactive' : 'Mark Active'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Supplier Add / Edit Modal */}
      {showForm && isManager && (
        <SupplierFormModal
          companyId={companyId}
          supplier={editSupplier}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['suppliers', companyId] })
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl shadow-xl max-w-md w-full p-6 border border-outline-variant">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-on-surface">Delete Supplier?</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              Are you sure you want to delete <strong className="text-on-surface">{deleteCandidate.name}</strong>? If this supplier has existing purchase bills, deleting will be blocked.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 border border-outline-variant text-on-surface-variant text-sm font-medium rounded-lg hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteCandidate.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Supplier'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Supplier Form Modal ────────────────────────────────────────────────────

interface SupplierFormModalProps {
  companyId: string
  supplier: Supplier | null
  onClose: () => void
  onSuccess: () => void
}

function SupplierFormModal({ companyId, supplier, onClose, onSuccess }: SupplierFormModalProps) {
  const isEdit = !!supplier

  const [name, setName] = useState(supplier?.name || '')
  const [gstin, setGstin] = useState(supplier?.gstin || '')
  const [phone, setPhone] = useState(supplier?.phone || '')
  const [email, setEmail] = useState(supplier?.email || '')
  const [contactPerson, setContactPerson] = useState(supplier?.contact_person || '')
  const [city, setCity] = useState(supplier?.city || '')
  const [state, setState] = useState(supplier?.state || 'West Bengal')
  const [address, setAddress] = useState(supplier?.address || '')

  // Bank
  const [bankName, setBankName] = useState(supplier?.bank_name || '')
  const [bankAccount, setBankAccount] = useState(supplier?.bank_account || '')
  const [bankIfsc, setBankIfsc] = useState(supplier?.bank_ifsc || '')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Supplier name is required')
      return
    }
    if (!phone.trim()) {
      toast.error('Phone number is required')
      return
    }
    if (!city.trim()) {
      toast.error('City is required')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        company_id: companyId,
        name: name.trim(),
        gstin: gstin.trim().toUpperCase() || null,
        phone: phone.trim(),
        email: email.trim() || null,
        contact_person: contactPerson.trim() || null,
        city: city.trim(),
        state: state.trim(),
        address: address.trim(),
        bank_name: bankName.trim() || null,
        bank_account: bankAccount.trim() || null,
        bank_ifsc: bankIfsc.trim().toUpperCase() || null,
        is_active: supplier ? supplier.is_active : true,
      }

      if (isEdit && supplier) {
        const { error } = await (supabase.from('suppliers') as any)
          .update(payload)
          .eq('id', supplier.id)
        if (error) throw error
        toast.success('Supplier updated successfully')
      } else {
        const { error } = await (supabase.from('suppliers') as any)
          .insert(payload)
        if (error) throw error
        toast.success('Supplier added successfully')
      }

      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save supplier')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-outline-variant my-8">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant sticky top-0 bg-surface z-10">
          <div>
            <h2 className="text-lg font-bold text-on-surface">
              {isEdit ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
            <p className="text-xs text-outline mt-0.5">
              Enter raw material vendor details, contact info, and bank credentials
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Supplier / Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. UltraTech Cement Ltd"
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                GSTIN (15 Digits)
              </label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={e => setGstin(e.target.value.toUpperCase())}
                placeholder="19AAACU1234F1Z0"
                className="w-full px-3 py-2 text-sm font-mono bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="sales@supplier.com"
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Durgapur"
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={e => setState(e.target.value)}
                placeholder="West Bengal"
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Factory / Billing Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Industrial Area, Plot No. 12..."
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            {/* Bank Details Section */}
            <div className="sm:col-span-2 border-t border-outline-variant/60 pt-4 mt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-outline mb-3 flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" />
                Bank & Payment Details (For NEFT / RTGS)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-outline mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. SBI, HDFC"
                    className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs text-outline mb-1">Account Number</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={e => setBankAccount(e.target.value)}
                    placeholder="e.g. 30219482710"
                    className="w-full px-3 py-2 text-sm font-mono bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs text-outline mb-1">IFSC Code</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={bankIfsc}
                    onChange={e => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="SBIN0001234"
                    className="w-full px-3 py-2 text-sm font-mono bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-on-surface-variant border border-outline-variant rounded-lg hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 font-medium shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Add Supplier'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
