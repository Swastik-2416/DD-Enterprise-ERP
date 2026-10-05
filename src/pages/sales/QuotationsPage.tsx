import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingBag, Plus, Search, Eye, Filter,
  Calendar, CheckCircle2, Clock, MapPin,
  Printer, Trash2, Edit3, ArrowRight,
  TrendingUp, FileText, Check, X, Building2, Package
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, formatDate, toInputDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { QuotationPrintModal } from '@/components/quotations/QuotationPrintModal'
import {
  type QuotationRecord,
  type QuoteLine,
  type SalesOrderRecord,
  SEED_QUOTATIONS
} from '@/types/sales.types'
import type { Customer, Item } from '@/types/database.types'

const LS_KEY = 'dd_quotations_list'
const LS_ORDERS_KEY = 'dd_sales_orders_list'

function generateQuoteNumber(existing: QuotationRecord[]): string {
  const seq = existing.length + 1
  const now = new Date()
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyStr = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`
  return `QT-${fyStr}-${String(seq).padStart(4, '0')}`
}

function loadStoredQuotations(): QuotationRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED_QUOTATIONS))
      return SEED_QUOTATIONS
    }
    return JSON.parse(raw)
  } catch {
    return SEED_QUOTATIONS
  }
}

function saveStoredQuotations(quotes: QuotationRecord[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(quotes))
  } catch {}
}

export function QuotationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const companyId = user?.company_id || ''

  const [quotes, setQuotes] = useState<QuotationRecord[]>(loadStoredQuotations)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedQuote, setSelectedQuote] = useState<QuotationRecord | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<QuotationRecord | null>(null)

  // Fetch Customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers_for_quotes', companyId],
    queryFn: async () => {
      let query = supabase.from('customers').select('*').order('name')
      if (companyId && companyId !== 'co-1') {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query
      if (error) return []
      return (data || []) as Customer[]
    },
  })

  // Fetch Finished Goods
  const { data: items = [] } = useQuery({
    queryKey: ['fg_items_for_quotes', companyId],
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select('id, name, sku, purchase_rate, selling_rate, gst_rate, hsn_code, unit:units(symbol)')
        .order('name')
      if (companyId && companyId !== 'co-1') {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query
      if (error) return []
      return (data || []) as unknown as (Pick<Item, 'id' | 'name' | 'sku' | 'selling_rate' | 'gst_rate' | 'hsn_code'> & {
        unit?: { symbol: string }
      })[]
    },
  })

  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      const matchSearch =
        q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
        q.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        (q.project_name && q.project_name.toLowerCase().includes(search.toLowerCase())) ||
        q.lines.some(l => l.item_name.toLowerCase().includes(search.toLowerCase()))

      const matchStatus = statusFilter === 'all' || q.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [quotes, search, statusFilter])

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = quotes.length
    const totalPipeline = quotes.reduce((sum, q) => sum + (q.status !== 'declined' ? q.total_amount : 0), 0)
    const activeSent = quotes.filter(q => q.status === 'sent').length
    const acceptedCount = quotes.filter(q => q.status === 'accepted' || q.status === 'converted').length
    return { totalCount, totalPipeline, activeSent, acceptedCount }
  }, [quotes])

  const handleUpdateStatus = (id: string, newStatus: QuotationRecord['status']) => {
    setQuotes(prev => {
      const next = prev.map(q => (q.id === id ? { ...q, status: newStatus } : q))
      saveStoredQuotations(next)
      return next
    })
    toast.success(`Quotation updated to ${newStatus.toUpperCase()}`)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this price quotation?')) {
      setQuotes(prev => {
        const next = prev.filter(q => q.id !== id)
        saveStoredQuotations(next)
        return next
      })
      toast.success('Quotation deleted')
    }
  }

  const handleSaveQuote = (record: QuotationRecord) => {
    setQuotes(prev => {
      const exists = prev.some(q => q.id === record.id)
      const next = exists ? prev.map(q => (q.id === record.id ? record : q)) : [record, ...prev]
      saveStoredQuotations(next)
      return next
    })
    setIsFormOpen(false)
    setEditingQuote(null)
    toast.success(editingQuote ? 'Quotation updated' : 'Price quotation generated successfully')
  }

  // Convert Quotation into Confirmed Sales Order
  const handleConvertToSalesOrder = (quote: QuotationRecord) => {
    let existingOrders: SalesOrderRecord[] = []
    try {
      existingOrders = JSON.parse(localStorage.getItem(LS_ORDERS_KEY) || '[]')
    } catch {}

    const seq = existingOrders.length + 1
    const now = new Date()
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const fyStr = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`
    const soNumber = `SO-${fyStr}-${String(seq).padStart(4, '0')}`

    const newSalesOrder: SalesOrderRecord = {
      id: crypto.randomUUID(),
      order_number: soNumber,
      quote_ref: quote.quote_number,
      customer_po_ref: quote.project_name ? `Project: ${quote.project_name}` : undefined,
      date: toInputDate(new Date()),
      promised_delivery_date: toInputDate(new Date(Date.now() + 7 * 86400000)),
      customer_id: quote.customer_id || 'cust-1',
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone,
      customer_gstin: quote.customer_gstin,
      site_address: quote.site_address || 'Customer site as per quotation',
      payment_terms: quote.payment_terms,
      advance_received: 0,
      balance_receivable: quote.total_amount,
      dispatch_mode: quote.freight_terms === 'Included in rate' ? 'Factory Arranged Transport' : 'Ex-Factory / Buyer Scope',
      status: 'confirmed',
      lines: quote.lines.map(l => ({
        id: crypto.randomUUID(),
        item_id: l.item_id,
        item_name: l.item_name,
        item_sku: l.item_sku,
        item_unit: l.item_unit,
        hsn_code: l.hsn_code,
        ordered_qty: l.qty,
        dispatched_qty: 0,
        pending_qty: l.qty,
        rate: l.rate,
        taxable_amount: l.taxable_amount,
        gst_rate: l.gst_rate,
        cgst_amount: l.cgst_amount,
        sgst_amount: l.sgst_amount,
        total_amount: l.total_amount,
        production_status: 'pending',
        remarks: l.remarks,
      })),
      total_qty: quote.total_qty,
      total_dispatched_qty: 0,
      taxable_amount: quote.taxable_amount,
      cgst_amount: quote.cgst_amount,
      sgst_amount: quote.sgst_amount,
      total_amount: quote.total_amount,
      created_at: new Date().toISOString(),
    }

    // Save order
    const updatedOrders = [newSalesOrder, ...existingOrders]
    try {
      localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(updatedOrders))
    } catch {}

    // Mark quote as converted
    handleUpdateStatus(quote.id, 'converted')

    toast.success(`Converted ${quote.quote_number} to Sales Order ${soNumber}!`)
    navigate('/sales/orders')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Sales Quotations"
        subtitle="Issue commercial rate estimates, paving technical proposals, contractor bids & track customer acceptances"
        icon={ShoppingBag}
        action={{
          label: 'Create Quotation',
          icon: Plus,
          onClick: () => {
            setEditingQuote(null)
            setIsFormOpen(true)
          },
        }}
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Quotations Issued"
          category="Estimates Issued"
          numericValue={metrics.totalCount}
          value={String(metrics.totalCount)}
          subtitle="Proposals generated"
          icon={ShoppingBag}
          color="blue"
        />

        <KpiCard
          title="Sent & Awaiting Response"
          category="Client Review"
          numericValue={metrics.activeSent}
          value={String(metrics.activeSent)}
          subtitle="Pending buyer decision"
          icon={Clock}
          color="amber"
        />

        <KpiCard
          title="Accepted / Confirmed"
          category="Conversion"
          numericValue={metrics.acceptedCount}
          value={String(metrics.acceptedCount)}
          subtitle="Converted to active orders"
          icon={CheckCircle2}
          color="green"
        />

        <KpiCard
          title="Quoted Pipeline Value"
          category="Estimated Pipeline"
          numericValue={metrics.totalPipeline}
          prefix="₹"
          value={`₹${metrics.totalPipeline.toLocaleString('en-IN')}`}
          subtitle="Active proposal values"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Search quote#, client, project, product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-outline flex items-center gap-1 shrink-0">
            <Filter className="h-3.5 w-3.5" /> Status:
          </span>
          {['all', 'draft', 'sent', 'accepted', 'converted', 'declined'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-full uppercase whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-primary text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <EmptyState
            title="No Price Quotations found"
            description={
              search
                ? `No quotations matching "${search}"`
                : 'Create your first commercial quotation proposal for contractors or builders.'
            }
            icon={ShoppingBag}
            action={{
              label: 'Create Quotation',
              onClick: () => {
                setEditingQuote(null)
                setIsFormOpen(true)
              },
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container/50 text-xs font-semibold text-outline uppercase tracking-wider">
                  <th className="py-3 px-4">Quote No &amp; Date</th>
                  <th className="py-3 px-4">Client &amp; Project</th>
                  <th className="py-3 px-4">Products &amp; Volume</th>
                  <th className="py-3 px-4">Commercial Terms</th>
                  <th className="py-3 px-4 text-right">Quoted Value</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredQuotes.map(quote => (
                  <tr key={quote.id} className="hover:bg-surface-container/30 transition-colors">
                    {/* Quote No */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary font-mono">{quote.quote_number}</div>
                      <div className="text-xs text-outline flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(quote.date)}
                      </div>
                      <div className="text-[10px] text-amber-600 mt-0.5">
                        Valid till: {formatDate(quote.valid_until)}
                      </div>
                    </td>

                    {/* Client & Project */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-on-surface truncate">{quote.customer_name}</div>
                      {quote.project_name && (
                        <div className="text-xs text-outline truncate mt-0.5 font-medium">
                          {quote.project_name}
                        </div>
                      )}
                      {quote.customer_phone && (
                        <div className="text-[11px] text-outline mt-0.5">
                          Phone: {quote.customer_phone}
                        </div>
                      )}
                    </td>

                    {/* Products */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-xs text-on-surface truncate">
                        {quote.lines.map(l => `${l.item_name} (${l.qty} ${l.item_unit})`).join(', ')}
                      </div>
                      <div className="text-[11px] text-outline mt-0.5">
                        Total {quote.total_qty} Sq.Ft / Pcs · {quote.lines.length} lines
                      </div>
                    </td>

                    {/* Terms */}
                    <td className="py-3 px-4">
                      <div className="text-xs text-on-surface">
                        <span className="font-semibold">Freight: </span>{quote.freight_terms}
                      </div>
                      <div className="text-[11px] text-outline mt-0.5">
                        {quote.laying_terms}
                      </div>
                    </td>

                    {/* Value */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-on-surface font-mono">
                        {formatCurrency(quote.total_amount)}
                      </div>
                      <div className="text-[11px] text-outline">GST Included</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        quote.status === 'accepted' || quote.status === 'converted'
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                          : quote.status === 'sent'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          : quote.status === 'declined'
                          ? 'bg-red-100 text-error'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        {quote.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedQuote(quote)}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Print / View Quotation Proposal"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Status progression */}
                        {quote.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(quote.id, 'sent')}
                            className="px-2 py-1 text-xs font-semibold bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 rounded-md transition-colors"
                            title="Mark as Sent to Client"
                          >
                            Mark Sent
                          </button>
                        )}

                        {quote.status === 'sent' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(quote.id, 'accepted')}
                            className="px-2 py-1 text-xs font-semibold bg-green-500/10 text-green-700 hover:bg-green-500/20 rounded-md transition-colors flex items-center gap-1"
                            title="Mark Accepted by Client"
                          >
                            <Check className="h-3 w-3" />
                            Accept
                          </button>
                        )}

                        {/* Convert to Sales Order */}
                        {(quote.status === 'accepted' || quote.status === 'sent') && (
                          <button
                            type="button"
                            onClick={() => handleConvertToSalesOrder(quote)}
                            className="px-2.5 py-1 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-md transition-colors flex items-center gap-1 shadow-xs"
                            title="Convert into Confirmed Sales Order"
                          >
                            <ArrowRight className="h-3 w-3" />
                            Make Order
                          </button>
                        )}

                        {quote.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuote(quote)
                              setIsFormOpen(true)
                            }}
                            className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container rounded-md transition-colors"
                            title="Edit Quotation"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}

                        {quote.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(quote.id)}
                            className="p-1.5 text-error hover:bg-error-container/20 rounded-md transition-colors"
                            title="Delete Quotation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quotation Form Modal */}
      {isFormOpen && (
        <QuotationFormModal
          existingQuote={editingQuote}
          customers={customers}
          items={items}
          existingQuotes={quotes}
          onSave={handleSaveQuote}
          onClose={() => {
            setIsFormOpen(false)
            setEditingQuote(null)
          }}
        />
      )}

      {/* Official Print Modal */}
      {selectedQuote && (
        <QuotationPrintModal
          quotation={selectedQuote}
          onClose={() => setSelectedQuote(null)}
        />
      )}
    </div>
  )
}

// ─── Quotation Form Modal ──────────────────────────────────────────────────────────

interface QuoteFormModalProps {
  existingQuote: QuotationRecord | null
  customers: Customer[]
  items: (Pick<Item, 'id' | 'name' | 'sku' | 'selling_rate' | 'gst_rate' | 'hsn_code'> & {
    unit?: { symbol: string }
  })[]
  existingQuotes: QuotationRecord[]
  onSave: (record: QuotationRecord) => void
  onClose: () => void
}

function QuotationFormModal({
  existingQuote,
  customers,
  items,
  existingQuotes,
  onSave,
  onClose,
}: QuoteFormModalProps) {
  const [customerId, setCustomerId] = useState(existingQuote?.customer_id || '')
  const [customerName, setCustomerName] = useState(existingQuote?.customer_name || '')
  const [customerPhone, setCustomerPhone] = useState(existingQuote?.customer_phone || '')
  const [customerEmail, setCustomerEmail] = useState(existingQuote?.customer_email || '')
  const [customerGstin, setCustomerGstin] = useState(existingQuote?.customer_gstin || '')
  const [projectName, setProjectName] = useState(existingQuote?.project_name || '')
  const [siteAddress, setSiteAddress] = useState(existingQuote?.site_address || '')

  const [date, setDate] = useState(existingQuote?.date || toInputDate(new Date()))
  const [validUntil, setValidUntil] = useState(
    existingQuote?.valid_until || toInputDate(new Date(Date.now() + 15 * 86400000))
  )
  const [freightTerms, setFreightTerms] = useState<QuotationRecord['freight_terms']>(
    existingQuote?.freight_terms || 'Extra at actuals'
  )
  const [unloadingTerms, setUnloadingTerms] = useState<QuotationRecord['unloading_terms']>(
    existingQuote?.unloading_terms || 'At Customer scope'
  )
  const [layingTerms, setLayingTerms] = useState<QuotationRecord['laying_terms']>(
    existingQuote?.laying_terms || 'Supply Only'
  )
  const [paymentTerms, setPaymentTerms] = useState(
    existingQuote?.payment_terms || '50% Advance booking, 50% prior to dispatch'
  )
  const [notes, setNotes] = useState(existingQuote?.notes || '')

  // Handle customer dropdown select
  const handleSelectCustomer = (id: string) => {
    setCustomerId(id)
    const cust = customers.find(c => c.id === id)
    if (cust) {
      setCustomerName(cust.name)
      setCustomerPhone(cust.phone || '')
      setCustomerGstin(cust.gstin || '')
      if (cust.address) setSiteAddress(`${cust.address}, ${cust.city} ${cust.state}`)
    }
  }

  // Lines
  const [lines, setLines] = useState<QuoteLine[]>(
    existingQuote?.lines || [
      {
        id: crypto.randomUUID(),
        item_id: '',
        item_name: '',
        item_sku: '',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        qty: 1000,
        rate: 35,
        taxable_amount: 35000,
        gst_rate: 18,
        cgst_amount: 3150,
        sgst_amount: 3150,
        total_amount: 41300,
        remarks: 'M-35 Grade Hydraulic Pressed',
      },
    ]
  )

  const handleSelectItem = (lineId: string, itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const rate = Number(item.selling_rate) || 35
    const gstRate = Number(item.gst_rate) || 18
    const unit = item.unit?.symbol || 'Sq.Ft'

    setLines(prev =>
      prev.map(l => {
        if (l.id !== lineId) return l
        const qty = l.qty || 1000
        const taxable = qty * rate
        const halfGst = (taxable * (gstRate / 2)) / 100
        const total = taxable + halfGst * 2

        return {
          ...l,
          item_id: item.id,
          item_name: item.name,
          item_sku: item.sku,
          item_unit: unit,
          hsn_code: item.hsn_code || '6810',
          rate,
          gst_rate: gstRate,
          taxable_amount: Math.round(taxable * 100) / 100,
          cgst_amount: Math.round(halfGst * 100) / 100,
          sgst_amount: Math.round(halfGst * 100) / 100,
          total_amount: Math.round(total * 100) / 100,
        }
      })
    )
  }

  const updateLine = (id: string, field: keyof QuoteLine, value: string | number) => {
    setLines(prev =>
      prev.map(l => {
        if (l.id !== id) return l
        const updated = { ...l, [field]: value }

        const qty = Number(field === 'qty' ? value : l.qty) || 0
        const rate = Number(field === 'rate' ? value : l.rate) || 0
        const gstRate = Number(field === 'gst_rate' ? value : l.gst_rate) || 0

        const taxable = qty * rate
        const halfGst = (taxable * (gstRate / 2)) / 100
        const total = taxable + halfGst * 2

        return {
          ...updated,
          taxable_amount: Math.round(taxable * 100) / 100,
          cgst_amount: Math.round(halfGst * 100) / 100,
          sgst_amount: Math.round(halfGst * 100) / 100,
          total_amount: Math.round(total * 100) / 100,
        }
      })
    )
  }

  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        item_id: '',
        item_name: '',
        item_sku: '',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        qty: 500,
        rate: 35,
        taxable_amount: 17500,
        gst_rate: 18,
        cgst_amount: 1575,
        sgst_amount: 1575,
        total_amount: 20650,
        remarks: '',
      },
    ])
  }

  const removeLine = (id: string) => {
    if (lines.length === 1) {
      toast.error('Quotation must contain at least one line item')
      return
    }
    setLines(prev => prev.filter(l => l.id !== id))
  }

  const totalQty = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) || 0), 0), [lines])
  const taxableTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.taxable_amount) || 0), 0), [lines])
  const cgstTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.cgst_amount) || 0), 0), [lines])
  const sgstTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.sgst_amount) || 0), 0), [lines])
  const grandTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.total_amount) || 0), 0), [lines])

  const handleSubmit = (targetStatus: QuotationRecord['status']) => {
    if (!customerName.trim()) {
      toast.error('Customer / Client Name is required')
      return
    }
    const invalidLine = lines.find(l => !l.item_id || Number(l.qty) <= 0 || Number(l.rate) < 0)
    if (invalidLine) {
      toast.error('Please select an item and valid rate for each product line')
      return
    }

    const quoteNumber = existingQuote?.quote_number || generateQuoteNumber(existingQuotes)

    const finalRecord: QuotationRecord = {
      id: existingQuote?.id || crypto.randomUUID(),
      quote_number: quoteNumber,
      date,
      valid_until: validUntil,
      customer_id: customerId || undefined,
      customer_name: customerName,
      customer_phone: customerPhone || undefined,
      customer_email: customerEmail || undefined,
      customer_gstin: customerGstin || undefined,
      project_name: projectName || undefined,
      site_address: siteAddress || undefined,
      freight_terms: freightTerms,
      unloading_terms: unloadingTerms,
      laying_terms: layingTerms,
      payment_terms: paymentTerms,
      notes: notes || undefined,
      status: targetStatus,
      lines,
      total_qty: totalQty,
      taxable_amount: taxableTotal,
      cgst_amount: cgstTotal,
      sgst_amount: sgstTotal,
      total_amount: grandTotal,
      created_at: existingQuote?.created_at || new Date().toISOString(),
    }

    onSave(finalRecord)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface shrink-0">
          <div>
            <h3 className="text-base font-bold text-on-surface">
              {existingQuote ? `Edit Price Quotation (${existingQuote.quote_number})` : 'New Price Quotation'}
            </h3>
            <p className="text-xs text-outline mt-0.5">
              Draft commercial estimate and technical specifications for paver blocks
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Client & Project Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-container/30 p-4 rounded-xl border border-outline-variant">
            {/* Customer select or text */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Select Registered Customer (Optional)
              </label>
              <select
                value={customerId}
                onChange={e => handleSelectCustomer(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface font-semibold"
              >
                <option value="">-- Choose Existing Customer or Type Name Below --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Quote Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Client / Contractor Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Metro Highway Infrastructure"
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Mobile / Office Phone"
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Valid Until Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Project / Site Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. Kalyani Expressway Flyover Paving Project"
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Client GSTIN (If any)
              </label>
              <input
                type="text"
                value={customerGstin}
                onChange={e => setCustomerGstin(e.target.value.toUpperCase())}
                placeholder="15-digit GSTIN"
                className="w-full px-3 py-2 text-sm font-mono uppercase border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Delivery Site Location
              </label>
              <input
                type="text"
                value={siteAddress}
                onChange={e => setSiteAddress(e.target.value)}
                placeholder="Site address or unloading destination"
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface"
              />
            </div>
          </div>

          {/* Commercial Terms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-surface-container/20 p-3 rounded-xl border border-outline-variant text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-on-surface mb-1">Freight Basis</label>
              <select
                value={freightTerms}
                onChange={e => setFreightTerms(e.target.value as QuotationRecord['freight_terms'])}
                className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded-md bg-surface font-medium"
              >
                <option value="Extra at actuals">Extra at actuals</option>
                <option value="Included in rate">Included in rate</option>
                <option value="Ex-factory / Buyer scope">Ex-factory / Buyer scope</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-on-surface mb-1">Unloading Scope</label>
              <select
                value={unloadingTerms}
                onChange={e => setUnloadingTerms(e.target.value as QuotationRecord['unloading_terms'])}
                className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded-md bg-surface font-medium"
              >
                <option value="At Customer scope">At Customer scope</option>
                <option value="Included by Supplier">Included by Supplier</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-on-surface mb-1">Laying / Fitting Scope</label>
              <select
                value={layingTerms}
                onChange={e => setLayingTerms(e.target.value as QuotationRecord['laying_terms'])}
                className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded-md bg-surface font-medium"
              >
                <option value="Supply Only">Supply Only</option>
                <option value="Supply & Laying with sand bed">Supply & Laying (Sand bed)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-on-surface mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                placeholder="Payment terms"
                className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded-md bg-surface"
              />
            </div>
          </div>

          {/* Product Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                Quoted Paver Block &amp; Concrete Products
              </h4>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item Line
              </button>
            </div>

            <div className="border border-outline-variant rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container/60 text-outline font-semibold uppercase">
                      <th className="py-2.5 px-3">Product Description</th>
                      <th className="py-2.5 px-2 w-20 text-center">Unit</th>
                      <th className="py-2.5 px-2 w-24 text-right">Quantity</th>
                      <th className="py-2.5 px-2 w-24 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-2 w-20 text-center">GST %</th>
                      <th className="py-2.5 px-3 w-32 text-right">Total (₹)</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {lines.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-surface-container/20">
                        <td className="py-2.5 px-3">
                          <select
                            required
                            value={line.item_id}
                            onChange={e => handleSelectItem(line.id, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs font-semibold border border-outline-variant rounded-md bg-surface"
                          >
                            <option value="">-- Choose Product --</option>
                            {items.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.name} ({i.sku})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Specifications e.g. M-35 Grade Heavy Duty (optional)"
                            value={line.remarks || ''}
                            onChange={e => updateLine(line.id, 'remarks', e.target.value)}
                            className="w-full mt-1 px-2 py-0.5 text-[11px] border border-outline-variant/60 rounded bg-surface/50"
                          />
                        </td>

                        <td className="py-2.5 px-2 text-center font-semibold text-outline">
                          {line.item_unit}
                        </td>

                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            min="1"
                            required
                            value={line.qty || ''}
                            onChange={e => updateLine(line.id, 'qty', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-xs font-mono font-bold text-right border border-outline-variant rounded-md bg-surface"
                          />
                        </td>

                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={line.rate || ''}
                            onChange={e => updateLine(line.id, 'rate', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-xs font-mono font-semibold text-right border border-outline-variant rounded-md bg-surface"
                          />
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <select
                            value={line.gst_rate}
                            onChange={e => updateLine(line.id, 'gst_rate', Number(e.target.value))}
                            className="px-1.5 py-1.5 text-xs border border-outline-variant rounded-md bg-surface text-center font-mono"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-on-surface">
                          ₹{Number(line.total_amount).toFixed(2)}
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="text-error/70 hover:text-error p-1 hover:bg-error-container/20 rounded transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Notes & Calculations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Proposal Terms &amp; Special Conditions
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Tested as per IS 15658 standards. Supply schedule within 5 days of booking advance..."
                className="w-full px-3 py-2 text-xs border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            <div className="bg-surface-container/40 p-4 rounded-xl border border-outline-variant space-y-2 text-xs">
              <div className="flex justify-between text-outline">
                <span>Total Quantity:</span>
                <span className="font-mono font-semibold text-on-surface">{totalQty} Sq.Ft / Pcs</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Taxable Value:</span>
                <span className="font-mono font-semibold text-on-surface">₹{taxableTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>GST (CGST + SGST):</span>
                <span className="font-mono font-semibold text-on-surface">₹{(cgstTotal + sgstTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-outline-variant text-sm font-bold text-on-surface">
                <span>Total Estimate:</span>
                <span className="font-mono text-primary text-base font-black">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-outline-variant flex items-center justify-between bg-surface shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container rounded-lg border border-outline-variant transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              className="px-4 py-2 text-xs font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors border border-outline-variant"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('sent')}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Generate &amp; Mark Sent
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
