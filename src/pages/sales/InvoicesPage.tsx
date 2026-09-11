import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShoppingBag, Plus, Search, Eye, Filter, Printer,
  FileText, Trash2, X, Check, Loader2, ArrowRight,
  CheckCircle2, XCircle, Package, Sparkles, Building2, MapPin
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, amountInWords } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import { DEFAULT_WAREHOUSE_ID, GST_RATES } from '@/lib/constants'
import type { Invoice, InvoiceLine, Customer, Item, DocumentStatus, InvoiceType } from '@/types/database.types'

interface InvoiceWithCustomer extends Invoice {
  customer: Customer
}

interface InvoiceLineWithItem extends InvoiceLine {
  item: Item & { unit?: { symbol: string } }
}

interface SalesInvoiceFormLine {
  id: string
  item_id: string
  description: string
  qty: number | ''
  rate: number | ''
  gst_rate: number
}

// ─── Data Hooks ─────────────────────────────────────────────────────────────

function useInvoices(companyId: string) {
  return useQuery({
    queryKey: ['sales_invoices', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, gstin, phone, address, city, state)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []) as InvoiceWithCustomer[]
    },
    enabled: !!companyId,
  })
}

function useInvoiceLines(invoiceId: string | null) {
  return useQuery({
    queryKey: ['invoice_lines', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return []
      const { data, error } = await supabase
        .from('invoice_lines')
        .select(`
          *,
          item:items(id, name, sku, type, unit:units(id, symbol))
        `)
        .eq('invoice_id', invoiceId)

      if (error) throw error
      return (data || []) as InvoiceLineWithItem[]
    },
    enabled: !!invoiceId,
  })
}

function useCustomers(companyId: string) {
  return useQuery({
    queryKey: ['customers_list', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data || []) as Customer[]
    },
    enabled: !!companyId,
  })
}

function useItems(companyId: string) {
  return useQuery({
    queryKey: ['items_for_sales', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          unit:units(id, symbol)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data || []) as (Item & { unit?: { symbol: string } })[]
    },
    enabled: !!companyId,
  })
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function InvoicesPage() {
  const { user, isManager } = useAuth()
  const companyId = user?.company_id || ''
  const userId = user?.id || ''
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithCustomer | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices(companyId)
  const { data: customers = [] } = useCustomers(companyId)
  const { data: items = [] } = useItems(companyId)

  const { data: selectedLines = [], isLoading: linesLoading } = useInvoiceLines(
    selectedInvoice?.id || null
  )

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.customer?.name.toLowerCase() ?? '').includes(q) ||
      (inv.notes?.toLowerCase() ?? '').includes(q)
    const matchType = typeFilter === 'all' || inv.type === typeFilter
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  // Aggregates
  const totalSales = invoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0)
  const totalCollected = invoices.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0)
  const totalOutstanding = Math.max(0, totalSales - totalCollected)
  const totalOutputGst = invoices.reduce(
    (s, i) => s + (Number(i.cgst_amount) || 0) + (Number(i.sgst_amount) || 0),
    0
  )

  // ─── Status Workflow Mutations ─────────────────────────────────────────────

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      invoiceId,
      newStatus,
    }: {
      invoiceId: string
      newStatus: DocumentStatus
    }) => {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }
      if (newStatus === 'approved') {
        updateData.approved_by = userId
      }

      const { error } = await (supabase.from('invoices') as any)
        .update(updateData)
        .eq('id', invoiceId)

      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sales_invoices', companyId] })
      if (selectedInvoice && selectedInvoice.id === vars.invoiceId) {
        setSelectedInvoice(prev => (prev ? { ...prev, status: vars.newStatus } : null))
      }
      toast.success(`Invoice status updated to ${vars.newStatus}`)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update invoice status')
    },
  })

  // Post Invoice: updates status to 'posted' AND deducts finished goods from warehouse
  const postInvoiceMutation = useMutation({
    mutationFn: async (invoice: InvoiceWithCustomer) => {
      const { data: lines, error: lineErr } = await (supabase
        .from('invoice_lines') as any)
        .select('*')
        .eq('invoice_id', invoice.id)

      if (lineErr) throw lineErr
      if (!lines || lines.length === 0) {
        throw new Error('Cannot post invoice with no items')
      }

      // Mark posted
      const { error: postErr } = await (supabase.from('invoices') as any)
        .update({
          status: 'posted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      if (postErr) throw postErr

      // Deduct stock for each item line
      for (const line of lines) {
        const qtyToDeduct = Number(line.qty) || 0
        if (qtyToDeduct <= 0) continue

        // Record stock movement (sale)
        await (supabase.from('stock_movements') as any).insert({
          company_id: companyId,
          item_id: line.item_id,
          warehouse_id: DEFAULT_WAREHOUSE_ID,
          movement_type: 'sale',
          qty: -qtyToDeduct,
          ref_doc_type: 'invoice',
          ref_doc_id: invoice.id,
          ref_doc_number: invoice.invoice_number,
          date: invoice.date,
          notes: `Sales invoice dispatch to ${invoice.customer?.name || 'Customer'} (${invoice.invoice_number})`,
          created_by: userId,
        })

        // Deduct from stock_balances
        const { data: curBal } = await (supabase.from('stock_balances') as any)
          .select('qty_on_hand')
          .eq('item_id', line.item_id)
          .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
          .single()

        if (curBal) {
          const newQty = Math.max(0, (Number(curBal.qty_on_hand) || 0) - qtyToDeduct)
          await (supabase.from('stock_balances') as any)
            .update({
              qty_on_hand: newQty,
              updated_at: new Date().toISOString(),
            })
            .eq('item_id', line.item_id)
            .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
        }
      }
    },
    onSuccess: (_, invoice) => {
      queryClient.invalidateQueries({ queryKey: ['sales_invoices', companyId] })
      queryClient.invalidateQueries({ queryKey: ['stock_balances', companyId] })
      queryClient.invalidateQueries({ queryKey: ['items', companyId] })
      queryClient.invalidateQueries({ queryKey: ['customer_outstanding', companyId] })
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice(prev => (prev ? { ...prev, status: 'posted' } : null))
      }
      toast.success('Invoice posted! Finished goods deducted from warehouse stock.')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to post sales invoice')
    },
  })

  // Cancel posted invoice: reverses stock deduction
  const cancelInvoiceMutation = useMutation({
    mutationFn: async (invoice: InvoiceWithCustomer) => {
      const wasPosted = invoice.status === 'posted'

      const { error: cancelErr } = await (supabase.from('invoices') as any)
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      if (cancelErr) throw cancelErr

      if (wasPosted) {
        const { data: lines } = await (supabase
          .from('invoice_lines') as any)
          .select('*')
          .eq('invoice_id', invoice.id)

        if (lines) {
          for (const line of lines) {
            const qtyToAdd = Number(line.qty) || 0

            // Reversing stock movement
            await (supabase.from('stock_movements') as any).insert({
              company_id: companyId,
              item_id: line.item_id,
              warehouse_id: DEFAULT_WAREHOUSE_ID,
              movement_type: 'adjustment',
              qty: qtyToAdd,
              ref_doc_type: 'invoice',
              ref_doc_id: invoice.id,
              ref_doc_number: invoice.invoice_number,
              date: new Date().toISOString().split('T')[0],
              notes: `Cancelled sales invoice ${invoice.invoice_number} - stock restored`,
              created_by: userId,
            })

            const { data: curBal } = await (supabase.from('stock_balances') as any)
              .select('qty_on_hand')
              .eq('item_id', line.item_id)
              .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
              .single()

            if (curBal) {
              const newQty = (Number(curBal.qty_on_hand) || 0) + qtyToAdd
              await (supabase.from('stock_balances') as any)
                .update({
                  qty_on_hand: newQty,
                  updated_at: new Date().toISOString(),
                })
                .eq('item_id', line.item_id)
                .eq('warehouse_id', DEFAULT_WAREHOUSE_ID)
            }
          }
        }
      }
    },
    onSuccess: (_, invoice) => {
      queryClient.invalidateQueries({ queryKey: ['sales_invoices', companyId] })
      queryClient.invalidateQueries({ queryKey: ['stock_balances', companyId] })
      queryClient.invalidateQueries({ queryKey: ['customer_outstanding', companyId] })
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice(prev => (prev ? { ...prev, status: 'cancelled' } : null))
      }
      toast.success('Invoice cancelled' + (invoice.status === 'posted' ? ' and inventory restored' : ''))
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel invoice')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Invoices"
        subtitle="Manage GST tax invoices, paver block dispatches, customer billing, and receivables"
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
        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            Total Sales Invoiced
          </div>
          <div className="text-2xl font-bold text-on-surface mt-1">
            {formatCurrency(totalSales)}
          </div>
          <div className="text-xs text-outline mt-1">{invoices.length} invoices generated</div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            Payment Received
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {formatCurrency(totalCollected)}
          </div>
          <div className="text-xs text-emerald-500 mt-1">Cleared via Bank/Cheque</div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            Pending Receivables
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {formatCurrency(totalOutstanding)}
          </div>
          <div className="text-xs text-amber-500 mt-1">Customer balance due</div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            GST Output Liability
          </div>
          <div className="text-2xl font-bold text-primary mt-1">
            {formatCurrency(totalOutputGst)}
          </div>
          <div className="text-xs text-blue-500 mt-1">Eligible GST Output Tax</div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Search invoice #, customer name, notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-outline shrink-0" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            aria-label="Filter sales invoices by type"
            className="px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">All Types</option>
            <option value="gst">GST Tax Invoice</option>
            <option value="non_gst">Non-GST Bill</option>
            <option value="proforma">Proforma Invoice</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter sales invoices by status"
            className="px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">All Statuses ({invoices.length})</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="posted">Posted (Stock Deducted)</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xs">
        {invoicesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={search ? 'No sales invoices match your search' : 'No sales invoices created yet'}
            description="Generate your first sales invoice to bill customers for delivered paver blocks and kerb stones."
            action={
              isManager
                ? {
                    label: 'Create First Invoice',
                    onClick: () => setShowCreateModal(true),
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-outline-variant text-xs uppercase font-semibold text-on-surface-variant">
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
              <tbody className="divide-y divide-outline-variant/60">
                {filtered.map(inv => {
                  const balance = Math.max(0, (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0))
                  return (
                    <tr key={inv.id} className="hover:bg-background/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-primary">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full uppercase',
                            inv.type === 'gst'
                              ? 'bg-indigo-100 text-indigo-700'
                              : inv.type === 'proforma'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {inv.type === 'gst' ? 'GST' : inv.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">
                        {formatDate(inv.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-on-surface">
                          {inv.customer?.name ?? 'Unknown Customer'}
                        </div>
                        <div className="text-xs text-outline font-mono">
                          {inv.customer?.gstin || 'Unregistered Buyer'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-on-surface-variant">
                        {formatCurrency(inv.taxable_amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-on-surface-variant">
                        {formatCurrency(inv.cgst_amount + inv.sgst_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-on-surface">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {balance === 0 ? (
                          <span className="text-xs text-emerald-600 font-semibold">Fully Paid</span>
                        ) : (
                          <span className="font-bold text-amber-600">{formatCurrency(balance)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-md transition-colors"
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

      {/* Invoice Detail / Printable Tax Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-outline-variant my-8">
            <div className="p-5 border-b border-outline-variant flex items-center justify-between sticky top-0 bg-surface z-10">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span>{selectedInvoice.invoice_number}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase">
                    {selectedInvoice.type}
                  </span>
                  <StatusBadge status={selectedInvoice.status} />
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  Date: {formatDate(selectedInvoice.date)} · Due:{' '}
                  {selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : 'Immediate'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant text-on-surface-variant text-xs font-medium rounded-lg hover:bg-background"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="text-outline hover:text-on-surface text-xl font-bold p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Header: Company & Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-background p-4 rounded-xl border border-outline-variant">
                <div>
                  <div className="text-xs uppercase font-bold tracking-wider text-outline mb-1">
                    Billed By (Supplier)
                  </div>
                  <div className="font-bold text-on-surface text-base">DD Enterprise</div>
                  <div className="text-xs text-outline">
                    Manufacturer of Quality Paver Blocks & Precast Concrete Products
                  </div>
                  <div className="text-xs text-outline mt-1 font-mono">
                    GSTIN: 19AAACD1234F1Z5 · State: West Bengal (19)
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="text-xs uppercase font-bold tracking-wider text-outline mb-1">
                    Bill To / Consignee
                  </div>
                  <div className="font-bold text-on-surface text-base">
                    {selectedInvoice.customer?.name}
                  </div>
                  <div className="text-xs text-outline">
                    {selectedInvoice.customer?.address ? `${selectedInvoice.customer.address}, ` : ''}
                    {selectedInvoice.customer?.city}
                    {selectedInvoice.customer?.state ? `, ${selectedInvoice.customer.state}` : ''}
                  </div>
                  <div className="text-xs text-on-surface-variant font-mono mt-1">
                    GSTIN: {selectedInvoice.customer?.gstin || 'Unregistered Buyer'}
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2">
                <div className="text-xs uppercase font-bold tracking-wider text-outline">
                  Particulars & Items ({selectedLines.length})
                </div>

                {linesLoading ? (
                  <div className="py-8 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : selectedLines.length === 0 ? (
                  <div className="p-4 text-center text-xs text-outline border border-outline-variant rounded-lg">
                    No line items attached.
                  </div>
                ) : (
                  <div className="border border-outline-variant rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-background border-b border-outline-variant font-semibold text-on-surface-variant">
                        <tr>
                          <th className="py-2.5 px-3">Product Description</th>
                          <th className="py-2.5 px-3">HSN/SKU</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Rate</th>
                          <th className="py-2.5 px-3 text-right">Taxable</th>
                          <th className="py-2.5 px-3 text-right">GST %</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60">
                        {selectedLines.map(line => (
                          <tr key={line.id} className="hover:bg-background/40">
                            <td className="py-2.5 px-3 font-medium text-on-surface">
                              {line.item?.name || line.description || 'Product'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-outline">
                              {line.item?.sku || '6810'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium">
                              {line.qty} {line.item?.unit?.symbol || 'pcs'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {formatCurrency(line.rate)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-on-surface">
                              {formatCurrency(line.taxable_amount)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-outline">
                              {line.gst_rate}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-on-surface">
                              {formatCurrency(line.line_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Financial Totals */}
              <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Taxable Value:</span>
                  <span className="font-semibold text-on-surface">
                    {formatCurrency(selectedInvoice.taxable_amount)}
                  </span>
                </div>
                {selectedInvoice.type === 'gst' && (
                  <>
                    <div className="flex justify-between text-on-surface-variant">
                      <span>CGST (9%):</span>
                      <span className="text-on-surface">
                        {formatCurrency(selectedInvoice.cgst_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-on-surface-variant">
                      <span>SGST (9%):</span>
                      <span className="text-on-surface">
                        {formatCurrency(selectedInvoice.sgst_amount)}
                      </span>
                    </div>
                  </>
                )}
                <div className="h-px bg-outline-variant/60 my-2" />
                <div className="flex justify-between text-base font-bold text-on-surface">
                  <span>Invoice Grand Total:</span>
                  <span className="text-primary">
                    {formatCurrency(selectedInvoice.total_amount)}
                  </span>
                </div>
                <div className="text-xs text-outline italic">
                  Amount in words: {amountInWords(selectedInvoice.total_amount)}
                </div>
                <div className="flex justify-between text-sm font-medium text-on-surface-variant pt-1 border-t border-outline-variant/40">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-600 font-semibold">
                    {formatCurrency(selectedInvoice.paid_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-amber-600">
                  <span>Balance Due:</span>
                  <span>
                    {formatCurrency(
                      Math.max(0, selectedInvoice.total_amount - selectedInvoice.paid_amount)
                    )}
                  </span>
                </div>
              </div>

              {/* Workflow Actions */}
              {isManager && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant">
                  <div className="flex items-center gap-2">
                    {selectedInvoice.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            invoiceId: selectedInvoice.id,
                            newStatus: 'submitted',
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Submit for Approval
                      </button>
                    )}

                    {selectedInvoice.status === 'submitted' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            invoiceId: selectedInvoice.id,
                            newStatus: 'approved',
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve Invoice
                      </button>
                    )}

                    {selectedInvoice.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => postInvoiceMutation.mutate(selectedInvoice)}
                        disabled={postInvoiceMutation.isPending}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                      >
                        {postInvoiceMutation.isPending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Posting & Deducting Stock...
                          </>
                        ) : (
                          <>
                            <Package className="h-3.5 w-3.5" />
                            Post & Deduct Finished Stock
                          </>
                        )}
                      </button>
                    )}

                    {selectedInvoice.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              selectedInvoice.status === 'posted'
                                ? 'Are you sure you want to cancel this posted invoice? This will restore the deducted finished goods to stock.'
                                : 'Are you sure you want to cancel this invoice?'
                            )
                          ) {
                            cancelInvoiceMutation.mutate(selectedInvoice)
                          }
                        }}
                        disabled={cancelInvoiceMutation.isPending}
                        className="px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel Invoice
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="px-4 py-2 border border-outline-variant text-on-surface-variant text-xs font-semibold rounded-lg hover:bg-background"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Multi-line Create Invoice Modal */}
      {showCreateModal && isManager && (
        <CreateSalesInvoiceModal
          companyId={companyId}
          userId={userId}
          existingInvoiceCount={invoices.length}
          customers={customers}
          items={items}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries({ queryKey: ['sales_invoices', companyId] })
          }}
        />
      )}
    </div>
  )
}

// ─── Create Sales Invoice Modal ─────────────────────────────────────────────

interface CreateSalesInvoiceModalProps {
  companyId: string
  userId: string
  existingInvoiceCount: number
  customers: Customer[]
  items: (Item & { unit?: { symbol: string } })[]
  onClose: () => void
  onSuccess: () => void
}

function CreateSalesInvoiceModal({
  companyId,
  userId,
  existingInvoiceCount,
  customers,
  items,
  onClose,
  onSuccess,
}: CreateSalesInvoiceModalProps) {
  const [customerId, setCustomerId] = useState(customers[0]?.id || '')
  const [type, setType] = useState<InvoiceType>('gst')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  // Sequence generator
  const now = new Date()
  const year = now.getFullYear() % 100
  const nextYear = year + 1
  const fy = `${year}${nextYear}`
  const prefix = type === 'proforma' ? 'PRO' : 'INV'
  const generatedNumber = `${prefix}-${fy}-${String(existingInvoiceCount + 1).padStart(4, '0')}`
  const [invoiceNumber, setInvoiceNumber] = useState(generatedNumber)

  // Filter finished goods primarily
  const finishedGoods = items.filter(i => i.type === 'finished_good')
  const defaultItem = finishedGoods[0] || items[0]

  const [lines, setLines] = useState<SalesInvoiceFormLine[]>([
    {
      id: 'l-1',
      item_id: defaultItem?.id || '',
      description: defaultItem?.name || '',
      qty: 500,
      rate: defaultItem?.selling_rate || 28,
      gst_rate: type === 'gst' ? (defaultItem?.gst_rate || 18) : 0,
    },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddLine = () => {
    const item = finishedGoods[0] || items[0]
    setLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random()}`,
        item_id: item?.id || '',
        description: item?.name || '',
        qty: 500,
        rate: item?.selling_rate || 28,
        gst_rate: type === 'gst' ? (item?.gst_rate || 18) : 0,
      },
    ])
  }

  const handleRemoveLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  const handleLineChange = (idx: number, field: keyof SalesInvoiceFormLine, val: any) => {
    setLines(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: val }
      if (field === 'item_id') {
        const item = items.find(i => i.id === val)
        if (item) {
          copy[idx].rate = item.selling_rate
          copy[idx].description = item.name
          copy[idx].gst_rate = type === 'gst' ? item.gst_rate : 0
        }
      }
      return copy
    })
  }

  // Calculate totals
  let totalTaxable = 0
  let totalCgst = 0
  let totalSgst = 0

  lines.forEach(l => {
    const q = Number(l.qty) || 0
    const r = Number(l.rate) || 0
    const taxable = q * r
    const tax = type === 'gst' ? taxable * (l.gst_rate / 100) : 0
    totalTaxable += taxable
    totalCgst += tax / 2
    totalSgst += tax / 2
  })

  const grandTotal = totalTaxable + totalCgst + totalSgst

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerId) {
      toast.error('Please select a customer')
      return
    }

    if (lines.length === 0) {
      toast.error('Please add at least one line item')
      return
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (!l.item_id) {
        toast.error(`Please select an item on line ${i + 1}`)
        return
      }
      if (l.qty === '' || Number(l.qty) <= 0) {
        toast.error(`Please enter a valid quantity on line ${i + 1}`)
        return
      }
      if (l.rate === '' || Number(l.rate) < 0) {
        toast.error(`Please enter a valid rate on line ${i + 1}`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      // 1. Insert invoice header
      const { data: newInvoice, error: invErr } = await (supabase
        .from('invoices') as any)
        .insert({
          company_id: companyId,
          invoice_number: invoiceNumber.trim(),
          type: type,
          customer_id: customerId,
          date: date,
          due_date: dueDate || null,
          taxable_amount: totalTaxable,
          cgst_amount: totalCgst,
          sgst_amount: totalSgst,
          total_amount: grandTotal,
          paid_amount: 0,
          status: 'draft',
          notes: notes.trim() || null,
          created_by: userId,
        })
        .select()
        .single()

      if (invErr) throw invErr

      // 2. Insert lines
      const linesToInsert = lines.map(l => {
        const q = Number(l.qty) || 0
        const r = Number(l.rate) || 0
        const taxable = q * r
        const tax = type === 'gst' ? taxable * (l.gst_rate / 100) : 0
        return {
          invoice_id: newInvoice.id,
          item_id: l.item_id,
          description: l.description.trim() || null,
          qty: q,
          rate: r,
          taxable_amount: taxable,
          gst_rate: type === 'gst' ? l.gst_rate : 0,
          cgst_amount: tax / 2,
          sgst_amount: tax / 2,
          line_total: taxable + tax,
        }
      })

      const { error: lineErr } = await (supabase.from('invoice_lines') as any)
        .insert(linesToInsert)

      if (lineErr) throw lineErr

      toast.success('Sales invoice draft created successfully')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create sales invoice')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-outline-variant my-8">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant sticky top-0 bg-surface z-10">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Create Sales Invoice</h2>
            <p className="text-xs text-outline mt-0.5">
              Bill customers for dispatched paver blocks, calculate CGST/SGST, and deduct inventory upon posting
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Select Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Invoice Type
              </label>
              <select
                value={type}
                onChange={e => {
                  const newType = e.target.value as InvoiceType
                  setType(newType)
                  // Adjust lines gst rate
                  setLines(prev =>
                    prev.map(l => ({
                      ...l,
                      gst_rate: newType === 'gst' ? 18 : 0,
                    }))
                  )
                }}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="gst">GST Tax Invoice (18%)</option>
                <option value="non_gst">Non-GST Bill (0%)</option>
                <option value="proforma">Proforma Quotation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Delivery Site / Dispatch Memo
              </label>
              <input
                type="text"
                placeholder="e.g. Site: City Center Flyover Project, Truck WB-39-1234"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-outline">
                Products & Line Items ({lines.length})
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Product Line
              </button>
            </div>

            <div className="border border-outline-variant rounded-xl overflow-hidden bg-background/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-background border-b border-outline-variant font-semibold text-on-surface-variant">
                  <tr>
                    <th className="py-2.5 px-3">Product (Finished Good)</th>
                    <th className="py-2.5 px-2 w-24 text-right">Quantity</th>
                    <th className="py-2.5 px-2 w-28 text-right">Rate (₹)</th>
                    {type === 'gst' && <th className="py-2.5 px-2 w-24 text-right">GST %</th>}
                    <th className="py-2.5 px-3 w-32 text-right">Line Total</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 bg-surface">
                  {lines.map((line, idx) => {
                    const q = Number(line.qty) || 0
                    const r = Number(line.rate) || 0
                    const taxable = q * r
                    const tax = type === 'gst' ? taxable * (line.gst_rate / 100) : 0
                    const total = taxable + tax

                    return (
                      <tr key={line.id} className="hover:bg-background/40">
                        <td className="p-2">
                          <select
                            value={line.item_id}
                            onChange={e => handleLineChange(idx, 'item_id', e.target.value)}
                            required
                            className="w-full px-2 py-1.5 text-xs bg-surface border border-outline-variant rounded-md focus:ring-1 focus:ring-primary"
                          >
                            {items.map(it => (
                              <option key={it.id} value={it.id}>
                                {it.name} ({it.sku})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            min="1"
                            value={line.qty}
                            onChange={e =>
                              handleLineChange(
                                idx,
                                'qty',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            required
                            className="w-full px-2 py-1.5 text-xs text-right bg-surface border border-outline-variant rounded-md focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.rate}
                            onChange={e =>
                              handleLineChange(
                                idx,
                                'rate',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            required
                            className="w-full px-2 py-1.5 text-xs text-right bg-surface border border-outline-variant rounded-md focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        {type === 'gst' && (
                          <td className="p-2">
                            <select
                              value={line.gst_rate}
                              onChange={e =>
                                handleLineChange(idx, 'gst_rate', Number(e.target.value))
                              }
                              className="w-full px-2 py-1.5 text-xs bg-surface border border-outline-variant rounded-md focus:ring-1 focus:ring-primary text-right"
                            >
                              {GST_RATES.map(rate => (
                                <option key={rate} value={rate}>
                                  {rate}%
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td className="p-2 text-right font-bold text-on-surface">
                          {formatCurrency(total)}
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations Summary Box */}
          <div className="bg-background rounded-xl p-4 border border-outline-variant flex flex-col sm:flex-row justify-between gap-4 text-xs">
            <div className="space-y-1 text-outline">
              <p>💡 GST 18% is split into CGST (9%) and SGST (9%) for intra-state supply.</p>
              <p>Posting this bill will automatically reduce finished goods stock in your warehouse.</p>
            </div>
            <div className="space-y-1.5 sm:w-64">
              <div className="flex justify-between text-on-surface-variant">
                <span>Taxable Amount:</span>
                <span className="font-semibold text-on-surface">
                  {formatCurrency(totalTaxable)}
                </span>
              </div>
              {type === 'gst' && (
                <div className="flex justify-between text-on-surface-variant">
                  <span>Total Output GST:</span>
                  <span className="font-semibold text-on-surface">
                    {formatCurrency(totalCgst + totalSgst)}
                  </span>
                </div>
              )}
              <div className="h-px bg-outline-variant/60 my-1" />
              <div className="flex justify-between text-sm font-bold text-on-surface">
                <span>Invoice Total:</span>
                <span className="text-primary">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
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
                  Saving Invoice...
                </>
              ) : (
                'Save as Draft'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
