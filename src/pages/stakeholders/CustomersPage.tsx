import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserCheck, Plus, Search, Edit2, Phone, Mail,
  IndianRupee, Trash2, X, Loader2, MapPin, User,
  AlertTriangle, ShieldAlert
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import type { Customer } from '@/types/database.types'

// ─── Data Hooks ─────────────────────────────────────────────────────────────

function useCustomers(companyId: string) {
  return useQuery({
    queryKey: ['customers', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (error) throw error
      return (data || []) as Customer[]
    },
    enabled: !!companyId,
  })
}

function useCustomerOutstanding(companyId: string) {
  return useQuery({
    queryKey: ['customer_outstanding', companyId],
    queryFn: async () => {
      // Query invoices to aggregate pending balances per customer
      const { data, error } = await (supabase.from('invoices') as any)
        .select('customer_id, total_amount, paid_amount, status')
        .eq('company_id', companyId)
        .neq('status', 'cancelled')

      if (error) {
        // Table might be empty or query might return error during setup
        console.warn('Invoices query warning:', error)
        return {}
      }

      const map: Record<string, number> = {}
      ;(data as { customer_id: string; total_amount: number; paid_amount: number }[])?.forEach(inv => {
        if (!inv.customer_id) return
        const balance = Math.max(0, (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0))
        map[inv.customer_id] = (map[inv.customer_id] || 0) + balance
      })
      return map
    },
    enabled: !!companyId,
  })
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CustomersPage() {
  const { user, isManager } = useAuth()
  const companyId = user?.company_id || ''
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Customer | null>(null)

  const { data: customers = [], isLoading } = useCustomers(companyId)
  const { data: outstandingMap = {} } = useCustomerOutstanding(companyId)

  // Filter
  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      (c.gstin ?? '').toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.contact_person ?? '').toLowerCase().includes(q)

    if (!matchesSearch) return false
    if (statusFilter === 'active') return c.is_active
    if (statusFilter === 'inactive') return !c.is_active
    return true
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (c: Customer) => {
      const { error } = await (supabase.from('customers') as any)
        .update({ is_active: !c.is_active })
        .eq('id', c.id)
      if (error) throw error
    },
    onSuccess: (_, c) => {
      queryClient.invalidateQueries({ queryKey: ['customers', companyId] })
      toast.success(c.is_active ? 'Customer deactivated' : 'Customer activated')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update customer status')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('customers') as any)
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', companyId] })
      setDeleteCandidate(null)
      toast.success('Customer deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete customer. Check for associated invoices.')
    },
  })

  const openAdd = () => {
    setEditCustomer(null)
    setShowForm(true)
  }

  const openEdit = (customer: Customer) => {
    setEditCustomer(customer)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} client accounts registered · Builders, contractors, developers & government agencies`}
        icon={UserCheck}
        action={
          isManager
            ? {
                label: 'Add Customer',
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
            placeholder="Search by client, city, GSTIN or phone…"
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
              {tab === 'all' ? `All (${customers.length})` : tab}
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
          icon={UserCheck}
          title={search ? 'No customers match your search' : 'No customers registered'}
          description="Register your buyer clients (civil contractors, project owners) to generate sales invoices and track payments."
          action={
            isManager
              ? {
                  label: 'Add First Customer',
                  onClick: openAdd,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(customer => {
            const owed = outstandingMap[customer.id] ?? 0
            const creditLimit = Number(customer.credit_limit) || 0
            const isNearCreditLimit = creditLimit > 0 && owed >= creditLimit * 0.85
            const isOverCreditLimit = creditLimit > 0 && owed > creditLimit

            return (
              <div
                key={customer.id}
                className="bg-surface rounded-xl border border-outline-variant p-5 hover:shadow-ambient transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <UserCheck className="h-5 w-5 text-emerald-600" />
                    </div>

                    {isManager && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(customer)}
                          className="p-1.5 hover:bg-background rounded-lg text-outline hover:text-primary transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(customer)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-outline hover:text-red-600 transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-on-surface text-base leading-tight mb-1">
                      {customer.name}
                    </h3>
                    <span
                      className={cn(
                        'text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0',
                        customer.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-surface-container text-outline border border-outline-variant'
                      )}
                    >
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-xs text-outline flex items-center gap-1 mt-1 mb-3">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {customer.address ? `${customer.address}, ` : ''}
                    {customer.city}
                    {customer.state ? `, ${customer.state}` : ''}
                  </p>

                  <div className="space-y-1.5 text-xs text-on-surface-variant">
                    {customer.gstin && (
                      <div className="flex items-center gap-2">
                        <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded font-mono text-[11px]">
                          GSTIN: {customer.gstin}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-outline">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-outline" />
                      <span className="text-on-surface font-medium">{customer.phone}</span>
                    </div>

                    {customer.email && (
                      <div className="flex items-center gap-2 text-outline">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-outline" />
                        <span>{customer.email}</span>
                      </div>
                    )}

                    {customer.contact_person && (
                      <div className="flex items-center gap-2 text-outline">
                        <User className="h-3.5 w-3.5 shrink-0 text-outline" />
                        <span>Contact: {customer.contact_person}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Health / Credit Limit Footer */}
                <div className="mt-4 pt-3 border-t border-outline-variant/60">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div>
                      <p className="text-outline text-[11px]">Credit Limit</p>
                      <p className="font-semibold text-on-surface">
                        {creditLimit > 0 ? formatCurrency(creditLimit) : 'No Limit'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-outline text-[11px]">Outstanding Due</p>
                      <p
                        className={cn(
                          'font-bold text-sm flex items-center justify-end gap-0.5',
                          owed > 0 ? 'text-red-600' : 'text-emerald-600'
                        )}
                      >
                        {formatCurrency(owed)}
                      </p>
                    </div>
                  </div>

                  {isOverCreditLimit && (
                    <div className="mt-2 px-2 py-1 bg-red-50 border border-red-200 rounded-md text-[11px] text-red-700 font-medium flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3 shrink-0 text-red-600" />
                      <span>Credit limit exceeded by {formatCurrency(owed - creditLimit)}</span>
                    </div>
                  )}
                  {isNearCreditLimit && !isOverCreditLimit && (
                    <div className="mt-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                      <span>Near credit limit ({(owed / creditLimit * 100).toFixed(0)}% utilized)</span>
                    </div>
                  )}

                  {isManager && (
                    <div className="mt-3 pt-2 border-t border-outline-variant/40 flex justify-end">
                      <button
                        type="button"
                        onClick={() => toggleActiveMutation.mutate(customer)}
                        disabled={toggleActiveMutation.isPending}
                        className="text-xs text-outline hover:text-on-surface font-medium"
                      >
                        {customer.is_active ? 'Mark Inactive' : 'Mark Active'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Customer Add / Edit Modal */}
      {showForm && isManager && (
        <CustomerFormModal
          companyId={companyId}
          customer={editCustomer}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['customers', companyId] })
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl shadow-xl max-w-md w-full p-6 border border-outline-variant">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-on-surface">Delete Customer?</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              Are you sure you want to delete <strong className="text-on-surface">{deleteCandidate.name}</strong>? If this customer has existing invoices, deleting will be blocked.
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
                  'Delete Customer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Customer Form Modal ────────────────────────────────────────────────────

interface CustomerFormModalProps {
  companyId: string
  customer: Customer | null
  onClose: () => void
  onSuccess: () => void
}

function CustomerFormModal({ companyId, customer, onClose, onSuccess }: CustomerFormModalProps) {
  const isEdit = !!customer

  const [name, setName] = useState(customer?.name || '')
  const [gstin, setGstin] = useState(customer?.gstin || '')
  const [phone, setPhone] = useState(customer?.phone || '')
  const [email, setEmail] = useState(customer?.email || '')
  const [contactPerson, setContactPerson] = useState(customer?.contact_person || '')
  const [creditLimit, setCreditLimit] = useState<number | ''>(
    customer?.credit_limit !== undefined ? customer.credit_limit : 100000
  )
  const [city, setCity] = useState(customer?.city || '')
  const [state, setState] = useState(customer?.state || 'West Bengal')
  const [address, setAddress] = useState(customer?.address || '')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Customer name is required')
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
        credit_limit: Number(creditLimit) || 0,
        city: city.trim(),
        state: state.trim(),
        address: address.trim(),
        is_active: customer ? customer.is_active : true,
      }

      if (isEdit && customer) {
        const { error } = await (supabase.from('customers') as any)
          .update(payload)
          .eq('id', customer.id)
        if (error) throw error
        toast.success('Customer updated successfully')
      } else {
        const { error } = await (supabase.from('customers') as any)
          .insert(payload)
        if (error) throw error
        toast.success('Customer registered successfully')
      }

      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save customer')
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
              {isEdit ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <p className="text-xs text-outline mt-0.5">
              Client details, GSTIN, credit limits, and delivery address
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
                Customer / Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Apex Infrastructure Ltd"
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
                placeholder="19AABCA1234E1Z8"
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
                placeholder="9830012345"
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
                placeholder="billing@apexinfra.com"
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Contact Person / Site Engineer
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                placeholder="e.g. Subhash Ghosh"
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Credit Limit (₹)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={creditLimit}
                onChange={e => setCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="100000"
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
                placeholder="e.g. Kolkata, Asansol"
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
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
                Site / Office Delivery Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Site address or main administrative office..."
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
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
                'Add Customer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
