import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShoppingCart, Plus, Search, Eye, Filter, Trash2,
  X, Check, AlertCircle, Loader2, ArrowRight, CheckCircle2,
  XCircle, FileText, Calendar, Building2, Package, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import { DEFAULT_WAREHOUSE_ID, GST_RATES } from '@/lib/constants'
import type { PurchaseInvoice, PurchaseInvoiceLine, Supplier, Item, DocumentStatus } from '@/types/database.types'

interface PurchaseInvoiceWithSupplier extends PurchaseInvoice {
  supplier: Supplier
}

interface PurchaseInvoiceLineWithItem extends PurchaseInvoiceLine {
  item: Item & { unit?: { symbol: string } }
}

interface InvoiceFormLine {
  id: string
  item_id: string
  qty: number | ''
  rate: number | ''
  gst_rate: number
}

// ─── Data Hooks ─────────────────────────────────────────────────────────────

function usePurchaseInvoices(companyId: string) {
  return useQuery({
    queryKey: ['purchase_invoices', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          *,
          supplier:suppliers(id, name, gstin, phone, address, city, state)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []) as PurchaseInvoiceWithSupplier[]
    },
    enabled: !!companyId,
  })
}

function usePurchaseInvoiceLines(invoiceId: string | null) {
  return useQuery({
    queryKey: ['purchase_invoice_lines', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return []
      const { data, error } = await supabase
        .from('purchase_invoice_lines')
        .select(`
          *,
          item:items(id, name, sku, type, unit:units(id, symbol))
        `)
        .eq('invoice_id', invoiceId)

      if (error) throw error
      return (data || []) as PurchaseInvoiceLineWithItem[]
    },
    enabled: !!invoiceId,
  })
}

function useSuppliers(companyId: string) {
  return useQuery({
    queryKey: ['suppliers_list', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data || []) as Supplier[]
    },
    enabled: !!companyId,
  })
}

function useItems(companyId: string) {
  return useQuery({
    queryKey: ['items_for_purchase', companyId],
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

export function PurchaseInvoicesPage() {
  const { user, isManager } = useAuth()
  const companyId = user?.company_id || ''
  const userId = user?.id || ''
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoiceWithSupplier | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoiceWithSupplier | null>(null)

  const { data: invoices = [], isLoading: invoicesLoading } = usePurchaseInvoices(companyId)
  const { data: suppliers = [] } = useSuppliers(companyId)
  const { data: items = [] } = useItems(companyId)

  // Selected invoice lines for detail modal
  const { data: selectedLines = [], isLoading: linesLoading } = usePurchaseInvoiceLines(
    selectedInvoice?.id || null
  )

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.supplier_invoice_number?.toLowerCase() ?? '').includes(q) ||
      (inv.supplier?.name.toLowerCase() ?? '').includes(q) ||
      (inv.notes?.toLowerCase() ?? '').includes(q)
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchSearch && matchStatus
  })

  // Aggregates
  const totalTaxable = invoices.reduce((s, i) => s + (Number(i.taxable_amount) || 0), 0)
  const totalTax = invoices.reduce(
    (s, i) => s + (Number(i.cgst_amount) || 0) + (Number(i.sgst_amount) || 0),
    0
  )
  const totalAmount = invoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0)

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

      const { error } = await (supabase.from('purchase_invoices') as any)
        .update(updateData)
        .eq('id', invoiceId)

      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_invoices', companyId] })
      if (selectedInvoice && selectedInvoice.id === vars.invoiceId) {
        setSelectedInvoice(prev => (prev ? { ...prev, status: vars.newStatus } : null))
      }
      toast.success(`Invoice status updated to ${vars.newStatus}`)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update invoice status')
    },
  })

  // Post Invoice mutation: changes status to 'posted' AND adds inward stock movements + balances
  const postInvoiceMutation = useMutation({
    mutationFn: async (invoice: PurchaseInvoiceWithSupplier) => {
      // 1. Fetch line items
      const { data: lines, error: lineErr } = await (supabase
        .from('purchase_invoice_lines') as any)
        .select('*')
        .eq('invoice_id', invoice.id)

      if (lineErr) throw lineErr
      if (!lines || lines.length === 0) {
        throw new Error('Cannot post invoice with no items')
      }

      // 2. Mark invoice as posted
      const { error: postErr } = await (supabase.from('purchase_invoices') as any)
        .update({
          status: 'posted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      if (postErr) throw postErr

      // 3. For each line, insert stock movement and update stock balance
      for (const line of lines) {
        const qtyToAdd = Number(line.qty) || 0
        if (qtyToAdd <= 0) continue

        // Record stock movement
        await (supabase.from('stock_movements') as any).insert({
          company_id: companyId,
          item_id: line.item_id,
          warehouse_id: DEFAULT_WAREHOUSE_ID,
          movement_type: 'purchase',
          qty: qtyToAdd,
          ref_doc_type: 'purchase_invoice',
          ref_doc_id: invoice.id,
          ref_doc_number: invoice.invoice_number,
          date: invoice.date,
          notes: `Purchase bill from ${invoice.supplier?.name || 'Vendor'} (${invoice.supplier_invoice_number || invoice.invoice_number})`,
          created_by: userId,
        })

        // Check current balance
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
        } else {
          await (supabase.from('stock_balances') as any).insert({
            item_id: line.item_id,
            warehouse_id: DEFAULT_WAREHOUSE_ID,
            qty_on_hand: qtyToAdd,
            updated_at: new Date().toISOString(),
          })
        }
      }
    },
    onSuccess: (_, invoice) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_invoices', companyId] })
      queryClient.invalidateQueries({ queryKey: ['items', companyId] })
      queryClient.invalidateQueries({ queryKey: ['stock_balances', companyId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stock_balances', companyId] })
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice(prev => (prev ? { ...prev, status: 'posted' } : null))
      }
      toast.success('Bill posted! Stock balance increased for raw materials.')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to post purchase invoice')
    },
  })

  // Cancel posted invoice: reverses stock movement
  const cancelInvoiceMutation = useMutation({
    mutationFn: async (invoice: PurchaseInvoiceWithSupplier) => {
      const wasPosted = invoice.status === 'posted'

      // 1. Mark cancelled
      const { error: cancelErr } = await (supabase.from('purchase_invoices') as any)
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      if (cancelErr) throw cancelErr

      // 2. If it was previously posted, reverse stock balances
      if (wasPosted) {
        const { data: lines } = await (supabase
          .from('purchase_invoice_lines') as any)
          .select('*')
          .eq('invoice_id', invoice.id)

        if (lines) {
          for (const line of lines) {
            const qtyToDeduct = Number(line.qty) || 0

            // Reversing stock movement
            await (supabase.from('stock_movements') as any).insert({
              company_id: companyId,
              item_id: line.item_id,
              warehouse_id: DEFAULT_WAREHOUSE_ID,
              movement_type: 'adjustment',
              qty: -qtyToDeduct,
              ref_doc_type: 'purchase_invoice',
              ref_doc_id: invoice.id,
              ref_doc_number: invoice.invoice_number,
              date: new Date().toISOString().split('T')[0],
              notes: `Cancelled purchase bill ${invoice.invoice_number} - reversed stock`,
              created_by: userId,
            })

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
        }
      }
    },
    onSuccess: (_, invoice) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_invoices', companyId] })
      queryClient.invalidateQueries({ queryKey: ['stock_balances', companyId] })
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice(prev => (prev ? { ...prev, status: 'cancelled' } : null))
      }
      toast.success('Invoice cancelled' + (invoice.status === 'posted' ? ' and stock movement reversed' : ''))
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel invoice')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Invoices"
        subtitle="Manage vendor bills, inward raw material consignments, and GST Input Tax Credit (ITC)"
        action={
          isManager
            ? {
                label: 'New Purchase Invoice',
                icon: Plus,
                onClick: () => {
                  setEditingInvoice(null)
                  setShowCreateModal(true)
                },
              }
            : undefined
        }
      />

      {/* Summary KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            Total Taxable Value
          </div>
          <div className="text-2xl font-bold text-on-surface mt-1">
            {formatCurrency(totalTaxable)}
          </div>
          <div className="text-xs text-outline mt-1">{invoices.length} total bills</div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            Total GST (CGST + SGST)
          </div>
          <div className="text-2xl font-bold text-primary mt-1">
            {formatCurrency(totalTax)}
          </div>
          <div className="text-xs text-blue-500 mt-1">Eligible Input Tax Credit (ITC)</div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            Total Inward Purchase Value
          </div>
          <div className="text-2xl font-bold text-on-surface mt-1">
            {formatCurrency(totalAmount)}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">All Recorded Purchases</div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Search by invoice #, supplier, or items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-outline shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter purchase invoices by status"
            className="w-full md:w-44 px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">All Statuses ({invoices.length})</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="posted">Posted (Stock In)</option>
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
            icon={ShoppingCart}
            title={search ? 'No purchase invoices match your search' : 'No purchase bills recorded yet'}
            description="Create your first purchase invoice to record incoming raw material supplies and update factory inventory."
            action={
              isManager
                ? {
                    label: 'Record First Purchase Bill',
                    onClick: () => {
                      setEditingInvoice(null)
                      setShowCreateModal(true)
                    },
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
              <tbody className="divide-y divide-outline-variant/60">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-background/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-primary">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-on-surface">
                        {inv.supplier?.name ?? 'Unknown Vendor'}
                      </div>
                      <div className="text-xs text-outline font-mono">
                        {inv.supplier?.gstin || 'Unregistered'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant font-mono text-xs">
                      {inv.supplier_invoice_number || '—'}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-outline-variant my-8">
            <div className="p-6 border-b border-outline-variant flex items-center justify-between sticky top-0 bg-surface z-10">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span>{selectedInvoice.invoice_number}</span>
                  <StatusBadge status={selectedInvoice.status} />
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  Dated: {formatDate(selectedInvoice.date)} · Due:{' '}
                  {selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : 'Immediate'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-outline hover:text-on-surface text-xl font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Supplier Info */}
              <div className="bg-background rounded-xl p-4 border border-outline-variant">
                <div className="text-xs uppercase font-bold tracking-wider text-outline mb-2">
                  Supplier / Vendor Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="font-semibold text-on-surface">
                      {selectedInvoice.supplier?.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-outline">
                      {selectedInvoice.supplier?.address ? `${selectedInvoice.supplier.address}, ` : ''}
                      {selectedInvoice.supplier?.city}
                      {selectedInvoice.supplier?.state ? `, ${selectedInvoice.supplier.state}` : ''}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-xs text-on-surface-variant font-mono">
                      GSTIN: {selectedInvoice.supplier?.gstin || 'Unregistered'}
                    </div>
                    <div className="text-xs text-outline">
                      Phone: {selectedInvoice.supplier?.phone || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="space-y-2">
                <div className="text-xs uppercase font-bold tracking-wider text-outline">
                  Purchased Items ({selectedLines.length})
                </div>

                {linesLoading ? (
                  <div className="py-8 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : selectedLines.length === 0 ? (
                  <div className="p-4 text-center text-xs text-outline border border-outline-variant rounded-lg">
                    No line item details found for this bill.
                  </div>
                ) : (
                  <div className="border border-outline-variant rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-background border-b border-outline-variant font-semibold text-on-surface-variant">
                        <tr>
                          <th className="py-2.5 px-3">Item / Description</th>
                          <th className="py-2.5 px-3">SKU</th>
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
                              {line.item?.name || 'Raw Material'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-outline">
                              {line.item?.sku || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium">
                              {line.qty} {line.item?.unit?.symbol || ''}
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
                  <span>Supplier Ref Bill No:</span>
                  <span className="font-mono font-medium text-on-surface">
                    {selectedInvoice.supplier_invoice_number || 'N/A'}
                  </span>
                </div>
                {selectedInvoice.notes && (
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Notes / Consignment:</span>
                    <span className="text-on-surface font-medium">{selectedInvoice.notes}</span>
                  </div>
                )}
                <div className="h-px bg-outline-variant/60 my-2" />
                <div className="flex justify-between text-on-surface-variant">
                  <span>Taxable Value:</span>
                  <span className="font-medium text-on-surface">
                    {formatCurrency(selectedInvoice.taxable_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>CGST (Intra-state 50%):</span>
                  <span className="text-on-surface">
                    {formatCurrency(selectedInvoice.cgst_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>SGST (Intra-state 50%):</span>
                  <span className="text-on-surface">
                    {formatCurrency(selectedInvoice.sgst_amount)}
                  </span>
                </div>
                <div className="h-px bg-outline-variant/60 my-2" />
                <div className="flex justify-between text-base font-bold text-on-surface">
                  <span>Grand Total (Bill Value):</span>
                  <span className="text-primary">
                    {formatCurrency(selectedInvoice.total_amount)}
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
                        Approve Bill
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
                            Posting & Updating Stock...
                          </>
                        ) : (
                          <>
                            <Package className="h-3.5 w-3.5" />
                            Post Bill & Update Stock
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
                                ? 'Are you sure you want to cancel this posted bill? This will reverse and deduct the stock added by this bill.'
                                : 'Are you sure you want to cancel this bill?'
                            )
                          ) {
                            cancelInvoiceMutation.mutate(selectedInvoice)
                          }
                        }}
                        disabled={cancelInvoiceMutation.isPending}
                        className="px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel Bill
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
        <CreateInvoiceModal
          companyId={companyId}
          userId={userId}
          existingInvoiceCount={invoices.length}
          suppliers={suppliers}
          items={items}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries({ queryKey: ['purchase_invoices', companyId] })
          }}
        />
      )}
    </div>
  )
}

// ─── Create Invoice Modal ───────────────────────────────────────────────────

interface CreateInvoiceModalProps {
  companyId: string
  userId: string
  existingInvoiceCount: number
  suppliers: Supplier[]
  items: (Item & { unit?: { symbol: string } })[]
  onClose: () => void
  onSuccess: () => void
}

function CreateInvoiceModal({
  companyId,
  userId,
  existingInvoiceCount,
  suppliers,
  items,
  onClose,
  onSuccess,
}: CreateInvoiceModalProps) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  // Sequence generator
  const now = new Date()
  const year = now.getFullYear() % 100
  const nextYear = year + 1
  const fy = `${year}${nextYear}`
  const generatedNumber = `PUR-${fy}-${String(existingInvoiceCount + 1).padStart(4, '0')}`
  const [invoiceNumber, setInvoiceNumber] = useState(generatedNumber)

  // Dynamic lines
  const firstItem = items[0]
  const [lines, setLines] = useState<InvoiceFormLine[]>([
    {
      id: 'l-1',
      item_id: firstItem?.id || '',
      qty: 1,
      rate: firstItem?.purchase_rate || 0,
      gst_rate: firstItem?.gst_rate || 18,
    },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Line helpers
  const handleAddLine = () => {
    const defaultItem = items[0]
    setLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random()}`,
        item_id: defaultItem?.id || '',
        qty: 1,
        rate: defaultItem?.purchase_rate || 0,
        gst_rate: defaultItem?.gst_rate || 18,
      },
    ])
  }

  const handleRemoveLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  const handleLineChange = (idx: number, field: keyof InvoiceFormLine, val: any) => {
    setLines(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: val }
      // If item changes, auto fill rate and gst_rate
      if (field === 'item_id') {
        const item = items.find(i => i.id === val)
        if (item) {
          copy[idx].rate = item.purchase_rate
          copy[idx].gst_rate = item.gst_rate
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
    const tax = taxable * (l.gst_rate / 100)
    totalTaxable += taxable
    totalCgst += tax / 2
    totalSgst += tax / 2
  })

  const grandTotal = totalTaxable + totalCgst + totalSgst

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!supplierId) {
      toast.error('Please select a supplier')
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
        .from('purchase_invoices') as any)
        .insert({
          company_id: companyId,
          invoice_number: invoiceNumber.trim(),
          supplier_invoice_number: supplierInvoiceNumber.trim() || null,
          supplier_id: supplierId,
          date: date,
          due_date: dueDate || null,
          taxable_amount: totalTaxable,
          cgst_amount: totalCgst,
          sgst_amount: totalSgst,
          total_amount: grandTotal,
          status: 'draft',
          notes: notes.trim() || null,
          created_by: userId,
        })
        .select()
        .single()

      if (invErr) throw invErr

      // 2. Insert line items
      const linesToInsert = lines.map(l => {
        const q = Number(l.qty) || 0
        const r = Number(l.rate) || 0
        const taxable = q * r
        const tax = taxable * (l.gst_rate / 100)
        return {
          invoice_id: newInvoice.id,
          item_id: l.item_id,
          qty: q,
          rate: r,
          taxable_amount: taxable,
          gst_rate: l.gst_rate,
          cgst_amount: tax / 2,
          sgst_amount: tax / 2,
          line_total: taxable + tax,
        }
      })

      const { error: lineErr } = await (supabase.from('purchase_invoice_lines') as any)
        .insert(linesToInsert)

      if (lineErr) throw lineErr

      toast.success('Purchase invoice draft created successfully')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create purchase invoice')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-outline-variant my-8">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant sticky top-0 bg-surface z-10">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Record Purchase Invoice</h2>
            <p className="text-xs text-outline mt-0.5">
              Enter incoming vendor bill details, line item quantities, and GST rates
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
          {/* Header row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Select Supplier <span className="text-red-500">*</span>
              </label>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                System Invoice #
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
                Vendor Bill / Ref #
              </label>
              <input
                type="text"
                placeholder="e.g. UT/2526/9021"
                value={supplierInvoiceNumber}
                onChange={e => setSupplierInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                Notes / Delivery Truck No
              </label>
              <input
                type="text"
                placeholder="e.g. WB-41-9876, 500 bags Portland Cement"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-outline">
                Bill Items ({lines.length})
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item Line
              </button>
            </div>

            <div className="border border-outline-variant rounded-xl overflow-hidden bg-background/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-background border-b border-outline-variant font-semibold text-on-surface-variant">
                  <tr>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-2 w-24 text-right">Quantity</th>
                    <th className="py-2.5 px-2 w-28 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-2 w-24 text-right">GST %</th>
                    <th className="py-2.5 px-3 w-32 text-right">Line Total</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 bg-surface">
                  {lines.map((line, idx) => {
                    const q = Number(line.qty) || 0
                    const r = Number(line.rate) || 0
                    const taxable = q * r
                    const tax = taxable * (line.gst_rate / 100)
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
                            min="0.001"
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
              <p>💡 Intra-state purchases calculate CGST (50%) and SGST (50%) automatically.</p>
              <p>Posting this bill will automatically add these quantities to your warehouse stock.</p>
            </div>
            <div className="space-y-1.5 sm:w-64">
              <div className="flex justify-between text-on-surface-variant">
                <span>Taxable Amount:</span>
                <span className="font-semibold text-on-surface">
                  {formatCurrency(totalTaxable)}
                </span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Total GST:</span>
                <span className="font-semibold text-on-surface">
                  {formatCurrency(totalCgst + totalSgst)}
                </span>
              </div>
              <div className="h-px bg-outline-variant/60 my-1" />
              <div className="flex justify-between text-sm font-bold text-on-surface">
                <span>Grand Total:</span>
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
