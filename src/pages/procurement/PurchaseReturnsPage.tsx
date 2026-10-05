import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  RotateCcw, Plus, Search, Filter, Calendar, Download, Printer,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Building2,
  Package, ShieldCheck, X, Trash2, Eye, DollarSign
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, formatCurrency, formatNumber } from '@/lib/formatters'
import { PurchaseReturnPrintModal } from '@/components/procurement/PurchaseReturnPrintModal'
import { logAuditEvent } from '@/lib/auditLogger'
import type { PurchaseInvoice, PurchaseInvoiceLine, Supplier, Item } from '@/types/database.types'
import {
  type PurchaseReturn,
  type PurchaseReturnLine,
  type ReturnReason,
  RETURN_REASONS,
  SEED_PURCHASE_RETURNS
} from '@/types/purchaseReturn.types'

const STORAGE_KEY = 'dd_purchase_returns_list'

export function PurchaseReturnsPage() {
  const { user } = useAuth()
  const companyId = user?.company_id || ''

  // 1. Returns list from local cache or seed
  const [returns, setReturns] = useState<PurchaseReturn[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return SEED_PURCHASE_RETURNS
  })

  const saveReturns = (updated: PurchaseReturn[]) => {
    setReturns(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}
  }

  // 2. Fetch Posted Purchase Invoices from Supabase
  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ['returns_purchase_invoices', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          *,
          supplier:suppliers(id, name, gstin, city, phone)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })
      if (error) return []
      return data as (PurchaseInvoice & { supplier: Supplier })[]
    },
    enabled: !!companyId,
  })

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'all' | 'posted' | 'draft'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isNewDrawerOpen, setIsNewDrawerOpen] = useState(false)

  // New Return Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [returnReason, setReturnReason] = useState<ReturnReason>('damaged_in_transit')
  const [returnNotes, setReturnNotes] = useState<string>('')
  const [returnLines, setReturnLines] = useState<Array<{
    item_id: string
    item_name: string
    item_sku: string
    unit: string
    rate: number
    gst_rate: number
    purchased_qty: number
    return_qty: number
    rejection_notes: string
  }>>([])

  // Load items when an invoice is selected
  const handleSelectInvoice = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    const inv = purchaseInvoices.find(i => i.id === invoiceId)
    if (!inv) return

    // Query invoice lines
    const { data: lines } = await (supabase.from('purchase_invoice_lines') as any)
      .select('*, item:items(id, name, sku, unit:units(symbol))')
      .eq('invoice_id', invoiceId)

    if (lines && lines.length > 0) {
      setReturnLines(
        lines.map((l: any) => ({
          item_id: l.item_id,
          item_name: l.item?.name || 'Raw Material',
          item_sku: l.item?.sku || 'RM-CODE',
          unit: l.item?.unit?.symbol || 'pcs',
          rate: Number(l.rate) || 0,
          gst_rate: Number(l.gst_rate) || 18,
          purchased_qty: Number(l.qty) || 0,
          return_qty: 0,
          rejection_notes: ''
        }))
      )
    } else {
      // Default line from invoice total
      setReturnLines([
        {
          item_id: 'item-raw-opc53',
          item_name: 'Raw Material Consignment (Cement / Aggregate)',
          item_sku: 'RM-DEF',
          unit: 'units',
          rate: Number(inv.taxable_amount) || 10000,
          gst_rate: 18,
          purchased_qty: 1,
          return_qty: 1,
          rejection_notes: 'Material rejected at gate'
        }
      ])
    }
  }

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNum = r.return_number.toLowerCase().includes(q)
        const matchSup = r.supplier_name.toLowerCase().includes(q)
        const matchInv = r.purchase_invoice_number.toLowerCase().includes(q)
        const matchNotes = r.notes?.toLowerCase().includes(q)
        const matchItems = r.items.some(i => i.item_name.toLowerCase().includes(q))
        return matchNum || matchSup || matchInv || matchNotes || matchItems
      }
      return true
    })
  }, [returns, statusFilter, searchQuery])

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = returns.length
    const postedCount = returns.filter(r => r.status === 'posted').length
    const draftCount = returns.filter(r => r.status === 'draft').length
    const totalDebitValue = returns
      .filter(r => r.status === 'posted')
      .reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
    return { totalCount, postedCount, draftCount, totalDebitValue }
  }, [returns])

  // Handle Post Return
  const handlePostReturn = async (ret: PurchaseReturn) => {
    const updated = returns.map(r => {
      if (r.id === ret.id) {
        return {
          ...r,
          status: 'posted' as const,
          approved_by: `${user?.full_name || 'Manager'} (${user?.role || 'manager'})`,
          updated_at: new Date().toISOString()
        }
      }
      return r
    })
    saveReturns(updated)

    // Log Audit Event
    await logAuditEvent({
      companyId: companyId || 'c1',
      tableName: 'purchase_returns',
      rowId: ret.return_number,
      action: 'UPDATE',
      oldData: { status: 'draft' },
      newData: { status: 'posted', total_debit: ret.total_amount },
      performedBy: user?.full_name || 'Plant Manager'
    })

    toast.success(`Debit Note ${ret.return_number} posted! Raw material inventory deducted.`)
  }

  // Handle Create Return
  const handleCreateReturn = async (status: 'draft' | 'posted') => {
    const validLines = returnLines.filter(l => l.return_qty > 0)
    if (validLines.length === 0) {
      toast.error('Please enter a return quantity greater than 0 for at least one item')
      return
    }

    const inv = purchaseInvoices.find(i => i.id === selectedInvoiceId)
    const supplierName = inv?.supplier?.name || 'Raw Material Vendor'

    let totalTaxable = 0
    let totalCgst = 0
    let totalSgst = 0

    const items: PurchaseReturnLine[] = validLines.map((l, idx) => {
      const taxable = l.return_qty * l.rate
      const cgst = (taxable * (l.gst_rate / 2)) / 100
      const sgst = (taxable * (l.gst_rate / 2)) / 100
      const lineTotal = taxable + cgst + sgst

      totalTaxable += taxable
      totalCgst += cgst
      totalSgst += sgst

      return {
        id: `prl-${Date.now()}-${idx}`,
        return_id: '',
        item_id: l.item_id,
        item_name: l.item_name,
        item_sku: l.item_sku,
        return_qty: l.return_qty,
        unit: l.unit,
        rate: l.rate,
        taxable_amount: taxable,
        gst_rate: l.gst_rate,
        cgst_amount: cgst,
        sgst_amount: sgst,
        line_total: lineTotal,
        rejection_notes: l.rejection_notes || returnNotes
      }
    })

    const grandTotal = totalTaxable + totalCgst + totalSgst
    const nextNumber = `DN-2425-${String(returns.length + 7).padStart(4, '0')}`

    const newReturn: PurchaseReturn = {
      id: `pr-${Date.now()}`,
      company_id: companyId || 'c1',
      return_number: nextNumber,
      purchase_invoice_id: selectedInvoiceId || 'pinv-manual',
      purchase_invoice_number: inv?.invoice_number || 'PINV-MANUAL',
      supplier_id: inv?.supplier_id || 'sup-manual',
      supplier_name: supplierName,
      supplier: inv?.supplier,
      date: returnDate,
      warehouse_id: '00000000-0000-0000-0000-000000000001',
      warehouse_name: 'Main Plant Raw Material Yard',
      reason: returnReason,
      status,
      taxable_amount: totalTaxable,
      cgst_amount: totalCgst,
      sgst_amount: totalSgst,
      total_amount: grandTotal,
      notes: returnNotes.trim() || null,
      items,
      created_by: `${user?.full_name || 'Storekeeper'} (${user?.role || 'manager'})`,
      approved_by: status === 'posted' ? user?.full_name || 'Manager' : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const updated = [newReturn, ...returns]
    saveReturns(updated)

    // Audit log
    await logAuditEvent({
      companyId: companyId || 'c1',
      tableName: 'purchase_returns',
      rowId: nextNumber,
      action: 'INSERT',
      newData: {
        return_number: nextNumber,
        supplier: supplierName,
        total_debit: grandTotal,
        reason: returnReason,
        status
      },
      performedBy: user?.full_name || 'Storekeeper'
    })

    toast.success(`Debit Note ${nextNumber} ${status === 'posted' ? 'posted' : 'saved as draft'}!`)
    setIsNewDrawerOpen(false)
  }

  // Export CSV
  const handleExportCSV = () => {
    const csvRows: string[] = [
      `"DD ENTERPRISE ERP - PURCHASE RETURNS / DEBIT NOTE REGISTER"`,
      `"Export Date:","${new Date().toLocaleString('en-IN')}"`,
      `"Total Records:","${filteredReturns.length}"`,
      ``,
      `"Debit Note No","Date","Supplier Name","Original Bill No","Reason","Taxable Amount","CGST","SGST","Total Debit (INR)","Status"`,
      ...filteredReturns.map(r =>
        `"${r.return_number}","${r.date}","${r.supplier_name}","${r.purchase_invoice_number}","${RETURN_REASONS[r.reason] || r.reason}","${r.taxable_amount}","${r.cgst_amount}","${r.sgst_amount}","${r.total_amount}","${r.status}"`
      )
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `DD_Purchase_Returns_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Purchase returns register exported to CSV!')
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <RotateCcw className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-on-surface">Purchase Returns (Debit Notes)</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                Vendor Rejections
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Return damaged or off-spec raw materials (cement bags, stone chips, chemicals) with GST debit note adjustment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-outline-variant text-on-surface rounded-lg text-xs font-medium hover:bg-surface-container transition-colors shadow-xs"
            title="Export CSV Register"
          >
            <Download className="h-3.5 w-3.5 text-outline" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => {
              if (purchaseInvoices.length > 0 && !selectedInvoiceId) {
                handleSelectInvoice(purchaseInvoices[0].id)
              }
              setIsNewDrawerOpen(true)
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-hover transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create Purchase Return</span>
          </button>
        </div>
      </div>

      {/* KPI Scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">Total Debit Notes</span>
          <span className="text-2xl font-bold font-mono text-on-surface mt-1 block">
            {metrics.totalCount}
          </span>
          <span className="text-[11px] text-on-surface-variant">Material rejections</span>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">Total Debited Value</span>
          <span className="text-2xl font-bold font-mono text-rose-600 mt-1 block">
            {formatCurrency(metrics.totalDebitValue)}
          </span>
          <span className="text-[11px] text-rose-600/90 font-medium">Credited back against payables</span>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">Posted & Settled</span>
          <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
            {metrics.postedCount}
          </span>
          <span className="text-[11px] text-emerald-600/90 font-medium">Stock deducted from inventory</span>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">Pending Approvals</span>
          <span className="text-2xl font-bold font-mono text-amber-600 mt-1 block">
            {metrics.draftCount}
          </span>
          <span className="text-[11px] text-amber-600/90 font-medium">Draft return notes</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1 border border-outline-variant text-xs">
          {[
            { id: 'all', label: `All (${returns.length})` },
            { id: 'posted', label: `Posted (${metrics.postedCount})` },
            { id: 'draft', label: `Draft (${metrics.draftCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-surface text-primary shadow-xs font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="h-3.5 w-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search debit note #, vendor, bill #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-surface-container text-on-surface-variant font-semibold text-[11px] border-b border-outline-variant">
              <tr>
                <th className="p-3 w-36 font-mono">Debit Note #</th>
                <th className="p-3 w-28">Date</th>
                <th className="p-3">Vendor / Supplier</th>
                <th className="p-3 w-36 font-mono">Original Bill #</th>
                <th className="p-3">Rejection Reason</th>
                <th className="p-3 w-32 text-right">Debit Value</th>
                <th className="p-3 w-28 text-center">Status</th>
                <th className="p-3 w-36 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-on-surface-variant">
                    No purchase return records found.
                  </td>
                </tr>
              ) : (
                filteredReturns.map(r => (
                  <tr key={r.id} className="hover:bg-surface-container/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-rose-600 whitespace-nowrap">
                      {r.return_number}
                    </td>
                    <td className="p-3 text-on-surface-variant font-mono whitespace-nowrap">
                      {formatDate(r.date)}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-on-surface block">{r.supplier_name}</span>
                      <span className="text-[10px] text-outline font-mono">{r.warehouse_name}</span>
                    </td>
                    <td className="p-3 font-mono font-semibold text-primary">
                      {r.purchase_invoice_number}
                    </td>
                    <td className="p-3 text-on-surface-variant">
                      <span className="font-medium text-slate-700 dark:text-slate-300 block">
                        {RETURN_REASONS[r.reason] || r.reason}
                      </span>
                      {r.notes && (
                        <span className="text-[10px] text-outline truncate block max-w-xs italic">
                          {r.notes}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-700 dark:text-rose-400 text-sm">
                      {formatCurrency(r.total_amount)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        r.status === 'posted'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {r.status === 'posted' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedReturn(r)
                            setIsPrintModalOpen(true)
                          }}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Print Debit Note"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {r.status === 'draft' && (
                          <button
                            onClick={() => handlePostReturn(r)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors shadow-xs"
                            title="Post Debit Note & Deduct Stock"
                          >
                            Post Return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Return Drawer */}
      {isNewDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl max-w-3xl w-full my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <RotateCcw className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Create Purchase Return (Debit Note)</h2>
                  <p className="text-xs text-on-surface-variant">Return rejected materials and reverse input GST</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewDrawerOpen(false)}
                className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Select Purchase Bill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-surface-container/30 border border-outline-variant rounded-xl">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Select Purchase Invoice <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={e => handleSelectInvoice(e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                  >
                    {purchaseInvoices.length > 0 ? (
                      purchaseInvoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} — {inv.supplier?.name} ({formatDate(inv.date)})
                        </option>
                      ))
                    ) : (
                      <option value="">PINV-2425-0012 — UltraTech Cement Eastern</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Return Date
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Rejection Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Reason for Return / Debit Note <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value as any)}
                    className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                  >
                    {Object.entries(RETURN_REASONS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    QC Inspection Remarks / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Moisture damaged bags or oversized aggregate chips"
                    value={returnNotes}
                    onChange={e => setReturnNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              {/* Return Items Quantities */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-on-surface">Material Items to Return</span>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    Enter return quantity for items being sent back
                  </span>
                </div>

                <div className="border border-outline-variant rounded-xl overflow-hidden divide-y divide-outline-variant">
                  {returnLines.map((line, idx) => (
                    <div key={idx} className="p-3 bg-surface flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <span className="font-semibold text-on-surface block text-xs">{line.item_name}</span>
                        <span className="text-[10px] text-outline font-mono">
                          {line.item_sku} · Billed: {line.purchased_qty} {line.unit} @ ₹{line.rate.toFixed(2)}
                        </span>
                      </div>

                      <div className="w-28">
                        <label className="block text-[10px] text-on-surface-variant mb-0.5">Return Qty</label>
                        <input
                          type="number"
                          min="0"
                          max={line.purchased_qty || 9999}
                          value={line.return_qty}
                          onChange={e => {
                            const val = Math.max(0, Number(e.target.value) || 0)
                            setReturnLines(prev =>
                              prev.map((l, i) => i === idx ? { ...l, return_qty: val } : l)
                            )
                          }}
                          className="w-full px-2.5 py-1 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none font-mono"
                        />
                      </div>

                      <div className="w-20 text-right font-mono">
                        <label className="block text-[10px] text-on-surface-variant mb-0.5">Return Val</label>
                        <span className="font-bold text-rose-600 block text-xs pt-1">
                          {formatCurrency(line.return_qty * line.rate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container/30">
              <button
                type="button"
                onClick={() => setIsNewDrawerOpen(false)}
                className="px-4 py-2 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateReturn('draft')}
                  className="px-4 py-2 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg font-medium transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateReturn('posted')}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-xs"
                >
                  Post Debit Note & Deduct Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      <PurchaseReturnPrintModal
        purchaseReturn={selectedReturn}
        onClose={() => {
          setIsPrintModalOpen(false)
          setSelectedReturn(null)
        }}
      />
    </div>
  )
}
