import { useState } from 'react'
import { UserCheck, Plus, Search, Edit2, Phone, Mail, IndianRupee } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency } from '@/lib/formatters'
import { mockCustomers, getCustomerOutstanding } from '@/lib/mockData'
import { useAuth } from '@/contexts/AuthContext'
import type { Customer } from '@/types/database.types'

export function CustomersPage() {
  const { isManager } = useAuth()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)

  const outstanding = getCustomerOutstanding()
  const outstandingMap = Object.fromEntries(outstanding.map(o => [o.customer.id, o.outstanding]))

  const filtered = mockCustomers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    (c.gstin ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${mockCustomers.length} customers registered`}
        icon={UserCheck}
        actions={isManager ? (
          <button
            onClick={() => { setEditCustomer(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        ) : undefined}
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, city or GSTIN…"
          className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UserCheck} title="No customers found" description="Add your first customer to get started." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(customer => {
            const owed = outstandingMap[customer.id] ?? 0
            return (
              <div key={customer.id} className="bg-surface rounded-xl border border-outline-variant p-5 hover:shadow-ambient transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  {isManager && (
                    <button
                      onClick={() => { setEditCustomer(customer); setShowForm(true) }}
                      className="p-1.5 hover:bg-surface-container rounded-lg text-slate-400 hover:text-primary transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <h3 className="font-semibold text-on-surface text-sm leading-tight mb-1">{customer.name}</h3>
                <p className="text-xs text-outline mb-3">{customer.address}, {customer.city}</p>

                <div className="space-y-1.5">
                  {customer.gstin && (
                    <span className="text-xs bg-surface-container text-on-surface-variant px-2 py-0.5 rounded font-mono">{customer.gstin}</span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-outline">
                    <Phone className="h-3 w-3" /> {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-xs text-outline">
                      <Mail className="h-3 w-3" /> {customer.email}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Credit Limit</p>
                    <p className="text-xs font-semibold text-on-surface-variant">{formatCurrency(customer.credit_limit)}</p>
                  </div>
                  {owed > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Outstanding</p>
                      <p className="text-sm font-bold text-error flex items-center gap-0.5">
                        <IndianRupee className="h-3 w-3" />{(owed / 1000).toFixed(0)}K
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && isManager && (
        <CustomerFormModal customer={editCustomer} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

function CustomerFormModal({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const isEdit = !!customer
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h2 className="text-lg font-bold text-on-surface">{isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-lg text-outline">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Customer Name *', key: 'name', placeholder: 'Full name or company' },
              { label: 'GSTIN', key: 'gstin', placeholder: '27AAABB1234C1Z5' },
              { label: 'Phone *', key: 'phone', placeholder: '9876543210' },
              { label: 'Email', key: 'email', placeholder: 'customer@email.com' },
              { label: 'Contact Person', key: 'contact_person', placeholder: 'Name' },
              { label: 'Credit Limit (₹)', key: 'credit_limit', placeholder: '100000' },
              { label: 'City *', key: 'city', placeholder: 'City' },
              { label: 'State', key: 'state', placeholder: 'Maharashtra' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">{f.label}</label>
                <input defaultValue={(customer as any)?.[f.key] ?? ''} placeholder={f.placeholder}
                  className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Address</label>
              <textarea defaultValue={customer?.address ?? ''} rows={2}
                className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-on-surface-variant border border-outline-variant rounded-lg hover:bg-background">Cancel</button>
            <button className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 font-medium">
              {isEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
