import { useState } from 'react'
import { ShoppingBag, Plus, Search, Eye, Filter, Printer, FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, amountInWords } from '@/lib/formatters'
import { mockInvoices, mockCustomers, getCustomerById } from '@/lib/mockData'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import type { Invoice } from '@/types/database.types'

export function InvoicesPage() {
  const { isManager } = useAuth()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filtered = mockInvoices.filter(inv => {
    const customer = getCustomerById(inv.customer_id)
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (customer?.name.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (inv.notes?.toLowerCase() ?? '').includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || inv.type === typeFilter
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  const totalSales = mockInvoices.reduce((s, i) => s + i.total_amount, 0)
  const totalCollected = mockInvoices.reduce((s, i) => s + i.paid_amount, 0)
  const totalOutstanding = totalSales - totalCollected
  const totalOutputGst = mockInvoices.reduce((s, i) => s + (i.cgst_amount + i.sgst_amount), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Invoices"
        subtitle="Manage tax invoices, billing for paver blocks & kerb stones, customer receipts"
        action={
          isManager
            ? {
                label: 'Create Invoice',
                icon: Plus,
                onClick: () => setShowCreateModal(true),
              }
            : undefined
        }
      />

      {/* Summary KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales Invoiced</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalSales)}</div>
          <div className="text-xs text-slate-500 mt-1">{mockInvoices.length} invoices generated</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Received</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalCollected)}</div>
          <div className="text-xs text-emerald-500 mt-1">Cleared via Bank/Cheque</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Receivables</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(totalOutstanding)}</div>
          <div className="text-xs text-amber-500 mt-1">Customer balance due</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Output Liability</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalOutputGst)}</div>
          <div className="text-xs text-blue-500 mt-1">CGST 9% + SGST 9%</div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, customer name, notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            aria-label="Filter sales invoices by type"
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Invoice Types</option>
            <option value="gst">GST Tax Invoice</option>
            <option value="non_gst">Non-GST Bill</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter sales invoices by status"
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="posted">Posted</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No sales invoices found"
            description="Try changing the search query or filters."
            action={isManager ? { label: 'Create Invoice', onClick: () => setShowCreateModal(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Taxable (₹)</th>
                  <th className="py-3 px-4 text-right">GST (₹)</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inv => {
                  const customer = getCustomerById(inv.customer_id)
                  const balance = inv.total_amount - inv.paid_amount
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-blue-600">{inv.invoice_number}</td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            inv.type === 'gst' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {inv.type === 'gst' ? 'GST Tax' : 'Non-GST'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDate(inv.date)}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{customer?.name ?? 'Unknown'}</div>
                        <div className="text-xs text-slate-400 font-mono">{customer?.gstin || 'Unregistered Buyer'}</div>
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
                      <td className="py-3 px-4 text-right">
                        {balance === 0 ? (
                          <span className="text-xs text-emerald-600 font-medium">Fully Paid</span>
                        ) : (
                          <span className="font-semibold text-amber-600">{formatCurrency(balance)}</span>
                        )}
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
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {selectedInvoice.type.toUpperCase()}
                  </span>
                  <StatusBadge status={selectedInvoice.status} />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Date: {formatDate(selectedInvoice.date)} · Due: {selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : 'Immediate'}
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
              {/* Customer Info */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-xs uppercase font-semibold text-slate-500 mb-1">Bill To / Consignee</div>
                {(() => {
                  const c = getCustomerById(selectedInvoice.customer_id)
                  return (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="font-semibold text-slate-800">{c?.name}</div>
                        <div className="text-xs text-slate-500">{c?.address}, {c?.city}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 font-mono">GSTIN: {c?.gstin || 'Unregistered'}</div>
                        <div className="text-xs text-slate-500">Phone: {c?.phone}</div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Items & particulars */}
              <div className="space-y-2">
                <div className="text-xs uppercase font-semibold text-slate-500">Invoice Items & Notes</div>
                <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200 text-sm text-slate-800">
                  {selectedInvoice.notes || 'Goods delivered per purchase order / delivery challan.'}
                </div>
              </div>

              {/* Financial summary */}
              <div className="space-y-2">
                <div className="text-xs uppercase font-semibold text-slate-500">Tax & Total Breakdown</div>
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value:</span>
                    <span className="font-medium text-slate-800">{formatCurrency(selectedInvoice.taxable_amount)}</span>
                  </div>
                  {selectedInvoice.type === 'gst' && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST (9%):</span>
                        <span className="text-slate-800">{formatCurrency(selectedInvoice.cgst_amount)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST (9%):</span>
                        <span className="text-slate-800">{formatCurrency(selectedInvoice.sgst_amount)}</span>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex justify-between text-base font-bold text-slate-900">
                    <span>Invoice Grand Total:</span>
                    <span className="text-blue-600">{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-slate-600 pt-1">
                    <span>Amount Paid:</span>
                    <span className="text-emerald-600">{formatCurrency(selectedInvoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-amber-600">
                    <span>Remaining Balance:</span>
                    <span>{formatCurrency(selectedInvoice.total_amount - selectedInvoice.paid_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Download PDF
                </button>
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

      {/* New Invoice Modal (Prototype) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Create Sales Invoice (Demo)</h3>
            <p className="text-sm text-slate-600 mb-4">
              Select customer, line items, and taxes will auto-calculate at 18% (9% CGST + 9% SGST). Finished goods inventory will automatically be decremented upon posting.
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                  {mockCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Type</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                  <option value="gst">GST Tax Invoice (18%)</option>
                  <option value="non_gst">Non-GST Bill</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Taxable Amount (₹)</label>
                <input type="number" placeholder="250000" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
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
                  alert('Demo note: New invoice would be created in Supabase with ledger entries!')
                  setShowCreateModal(false)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-xs"
              >
                Save Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
