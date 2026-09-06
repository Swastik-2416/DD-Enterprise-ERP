import { useState } from 'react'
import { Building2, Plus, Search, Edit2, Phone, Mail } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { mockSuppliers } from '@/lib/mockData'
import { useAuth } from '@/contexts/AuthContext'
import type { Supplier } from '@/types/database.types'

export function SuppliersPage() {
  const { isManager } = useAuth()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)

  const filtered = mockSuppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase()) ||
    (s.gstin ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle={`${mockSuppliers.length} suppliers registered`}
        icon={Building2}
        actions={isManager ? (
          <button
            onClick={() => { setEditSupplier(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Supplier
          </button>
        ) : undefined}
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, city or GSTIN…"
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No suppliers found" description="Add your first supplier to get started." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(supplier => (
            <div key={supplier.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                {isManager && (
                  <button
                    onClick={() => { setEditSupplier(supplier); setShowForm(true) }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1">{supplier.name}</h3>
              <p className="text-xs text-slate-500 mb-3">{supplier.address}, {supplier.city}</p>

              <div className="space-y-1.5">
                {supplier.gstin && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{supplier.gstin}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone className="h-3 w-3" /> {supplier.phone}
                </div>
                {supplier.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="h-3 w-3" /> {supplier.email}
                  </div>
                )}
                {supplier.contact_person && (
                  <p className="text-xs text-slate-400">Contact: {supplier.contact_person}</p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${supplier.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {supplier.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && isManager && (
        <SupplierFormModal supplier={editSupplier} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

function SupplierFormModal({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const isEdit = !!supplier
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Supplier Name *', key: 'name', placeholder: 'Full company name' },
              { label: 'GSTIN', key: 'gstin', placeholder: '27AAABB1234C1Z5' },
              { label: 'Phone *', key: 'phone', placeholder: '9876543210' },
              { label: 'Email', key: 'email', placeholder: 'supplier@email.com' },
              { label: 'Contact Person', key: 'contact_person', placeholder: 'Name' },
              { label: 'City *', key: 'city', placeholder: 'City' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
                <input defaultValue={(supplier as any)?.[f.key] ?? ''} placeholder={f.placeholder}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
              <textarea defaultValue={supplier?.address ?? ''} rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="sm:col-span-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-600 mb-3">Bank Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Bank Name', key: 'bank_name', placeholder: 'HDFC Bank' },
                  { label: 'Account No.', key: 'bank_account', placeholder: '50200012345678' },
                  { label: 'IFSC Code', key: 'bank_ifsc', placeholder: 'HDFC0001234' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                    <input defaultValue={(supplier as any)?.[f.key] ?? ''} placeholder={f.placeholder}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium">
              {isEdit ? 'Save Changes' : 'Add Supplier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
