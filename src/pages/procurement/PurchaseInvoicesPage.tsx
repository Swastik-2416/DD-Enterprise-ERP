import { useState } from 'react'
import { ShoppingCart, Plus, Search, Eye, Filter, Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { mockPurchaseInvoices, mockSuppliers, getSupplierById } from '@/lib/mockData'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import type { PurchaseInvoice, DocumentStatus } from '@/types/database.types'

export function PurchaseInvoicesPage() {
  const { isManager } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filtered = mockPurchaseInvoices.filter(inv => {
    const supplier = getSupplierById(inv.supplier_id)
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.supplier_invoice_number?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (supplier?.name.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (inv.notes?.toLowerCase() ?? '').includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalTaxable = mockPurchaseInvoices.reduce((s, i) => s + i.taxable_amount, 0)
  const totalTax = mockPurchaseInvoices.reduce((s, i) => s + (i.cgst_amount + i.sgst_amount), 0)
  const totalAmount = mockPurchaseInvoices.reduce((s, i) => s + i.total_amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Invoices"
        subtitle="Manage supplier bills, inward raw materials, and input tax credits (ITC)"
        action={
          isManager
            ? {
                label: 'New Purchase Invoice',
                icon: Plus,
                onClick: () => setShowCreateModal(true),
              }
            : undefined
        }
      />

      {/* Summary KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Taxable Value</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalTaxable)}</div>
          <div className="text-xs text-slate-500 mt-1">{mockPurchaseInvoices.length} total bills</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total GST (CGST + SGST)</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalTax)}</div>
          <div className="text-xs text-blue-500 mt-1">Eligible Input Tax Credit</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Purchase Value</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalAmount)}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Intra-state transactions</div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice #, supplier, or items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter purchase invoices by status"
            className="w-full md:w-44 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="posted">Posted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No purchase invoices found"
            description="Try adjusting your search criteria or create a new invoice."
            action={isManager ? { label: 'New Purchase Invoice', onClick: () => setShowCreateModal(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Supplier Bill #</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">CGST + SGST</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inv => {
                  const supplier = getSupplierById(inv.supplier_id)
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-blue-600">{inv.invoice_number}</td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDate(inv.date)}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{supplier?.name ?? 'Unknown'}</div>
                        <div className="text-xs text-slate-400 font-mono">{supplier?.gstin || 'Unregistered'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                        {inv.supplier_invoice_number || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(inv.taxable_amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatCurrency(inv.cgst_amount + inv.sgst_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>{selectedInvoice.invoice_number}</span>
                  <StatusBadge status={selectedInvoice.status} />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dated: {formatDate(selectedInvoice.date)} · Due: {selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : 'Immediate'}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Supplier Info */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-xs uppercase font-semibold text-slate-500 mb-1">Supplier Details</div>
                {(() => {
                  const s = getSupplierById(selectedInvoice.supplier_id)
                  return (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="font-semibold text-slate-800">{s?.name}</div>
                        <div className="text-xs text-slate-500">{s?.address}, {s?.city}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 font-mono">GSTIN: {s?.gstin || 'Unregistered'}</div>
                        <div className="text-xs text-slate-500">Contact: {s?.phone}</div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Bill Details */}
              <div className="space-y-2">
                <div className="text-xs uppercase font-semibold text-slate-500">Bill Breakdown</div>
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Supplier Ref Bill No:</span>
                    <span className="font-mono font-medium text-slate-800">{selectedInvoice.supplier_invoice_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Notes / Item description:</span>
                    <span className="text-slate-800">{selectedInvoice.notes || '—'}</span>
                  </div>
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value:</span>
                    <span className="font-medium text-slate-800">{formatCurrency(selectedInvoice.taxable_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST:</span>
                    <span className="text-slate-800">{formatCurrency(selectedInvoice.cgst_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST:</span>
                    <span className="text-slate-800">{formatCurrency(selectedInvoice.sgst_amount)}</span>
                  </div>
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex justify-between text-base font-bold text-slate-900">
                    <span>Total Amount:</span>
                    <span className="text-blue-600">{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal (Prototype Demonstration) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Create Purchase Invoice (Demo)</h3>
            <p className="text-sm text-slate-600 mb-4">
              In prototype mode, mock records are pre-loaded. In production connected with Supabase, this form creates direct entries with auto-calculated CGST/SGST and inventory stock updates.
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Supplier</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                  {mockSuppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Invoice Number</label>
                <input type="text" placeholder="e.g. UC/2526/9021" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Taxable Amount (₹)</label>
                  <input type="number" placeholder="50000" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                    <option value="28">28% (Cement)</option>
                    <option value="5">5% (Sand/Aggregate)</option>
                    <option value="18">18% (Consumables)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Demo note: New invoice would be posted to Supabase with automatic stock movement trigger!')
                  setShowCreateModal(false)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-xs"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
