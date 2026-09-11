import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Download, Calendar, Search, Filter,
  Building2, CheckCircle2, Clock, ArrowDownLeft
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { PurchaseInvoice, Supplier } from '@/types/database.types'

interface PurchaseWithSupplier extends PurchaseInvoice {
  supplier?: Supplier
}

function getDefaultDates() {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  const startYear = currentMonth >= 4 ? currentYear : currentYear - 1
  return {
    fromDate: `${startYear}-04-01`,
    toDate: today.toISOString().split('T')[0]
  }
}

export function PurchaseRegisterPage() {
  const { user } = useAuth()
  const companyId = user?.company_id || ''

  const defaults = getDefaultDates()
  const [fromDate, setFromDate] = useState(defaults.fromDate)
  const [toDate, setToDate] = useState(defaults.toDate)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 1. Fetch Purchase Invoices
  const { data: purchaseBills = [], isLoading } = useQuery({
    queryKey: ['purchase_register', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          *,
          supplier:suppliers(id, name, gstin, city)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })
      if (error) throw error
      return (data || []) as PurchaseWithSupplier[]
    },
    enabled: !!companyId,
  })

  // 2. Filter Purchase Invoices
  const filteredBills = useMemo(() => {
    return purchaseBills.filter(bill => {
      // Date filter
      if (fromDate && bill.date < fromDate) return false
      if (toDate && bill.date > toDate) return false

      // Status filter
      if (statusFilter !== 'all' && bill.status !== statusFilter) return false

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNumber = bill.invoice_number.toLowerCase().includes(q)
        const matchSupplierBill = bill.supplier_invoice_number?.toLowerCase().includes(q) || false
        const matchSupplier = bill.supplier?.name.toLowerCase().includes(q) || false
        const matchGstin = bill.supplier?.gstin?.toLowerCase().includes(q) || false
        if (!matchNumber && !matchSupplierBill && !matchSupplier && !matchGstin) return false
      }

      return true
    })
  }, [purchaseBills, fromDate, toDate, statusFilter, searchQuery])

  // 3. Computed Totals
  const totals = useMemo(() => {
    return filteredBills.reduce(
      (acc, bill) => {
        acc.count += 1
        acc.taxable += Number(bill.taxable_amount) || 0
        acc.cgst += Number(bill.cgst_amount) || 0
        acc.sgst += Number(bill.sgst_amount) || 0
        acc.total += Number(bill.total_amount) || 0
        return acc
      },
      { count: 0, taxable: 0, cgst: 0, sgst: 0, total: 0 }
    )
  }, [filteredBills])

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Internal Bill #',
      'Bill Date',
      'Supplier Name',
      'Supplier Invoice #',
      'Supplier GSTIN',
      'Taxable Value (INR)',
      'Input CGST (INR)',
      'Input SGST (INR)',
      'Total Input Tax Credit (INR)',
      'Total Bill Amount (INR)',
      'Status'
    ]

    const rows = filteredBills.map(bill => [
      `"${bill.invoice_number}"`,
      bill.date,
      `"${bill.supplier?.name || ''}"`,
      `"${bill.supplier_invoice_number || ''}"`,
      `"${bill.supplier?.gstin || ''}"`,
      (Number(bill.taxable_amount) || 0).toFixed(2),
      (Number(bill.cgst_amount) || 0).toFixed(2),
      (Number(bill.sgst_amount) || 0).toFixed(2),
      ((Number(bill.cgst_amount) || 0) + (Number(bill.sgst_amount) || 0)).toFixed(2),
      (Number(bill.total_amount) || 0).toFixed(2),
      bill.status.toUpperCase(),
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [`Purchase Register: DD Enterprise`, `Period: ${fromDate} to ${toDate}`, '']
        .concat([headers.join(',')])
        .concat(rows.map(r => r.join(',')))
        .join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `purchase_register_${fromDate}_to_${toDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Purchase Register
          </h1>
          <p className="text-sm text-outline mt-0.5">
            Commercial inward bills register for raw materials (cement, fly ash, sand, aggregates) and Input Tax Credit (ITC) reconciliation
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredBills.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs"
        >
          <Download className="h-4 w-4" />
          Export Register (CSV)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-outline">Taxable Purchases</span>
          <p className="text-xl font-bold text-on-surface mt-1">
            {formatCurrency(totals.taxable)}
          </p>
          <span className="text-xs text-outline">{totals.count} Inward Bills</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-emerald-700">Input Tax Credit (ITC)</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {formatCurrency(totals.cgst + totals.sgst)}
          </p>
          <span className="text-xs text-outline">CGST: {formatCurrency(totals.cgst)} · SGST: {formatCurrency(totals.sgst)}</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-outline">Total Bill Amount</span>
          <p className="text-xl font-bold text-blue-700 mt-1">
            {formatCurrency(totals.total)}
          </p>
          <span className="text-xs text-outline">Gross Supplier Invoices</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-outline">Average Bill Size</span>
          <p className="text-xl font-bold text-on-surface mt-1">
            {totals.count > 0 ? formatCurrency(totals.total / totals.count) : '₹0.00'}
          </p>
          <span className="text-xs text-outline">Per Vendor Consignment</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              placeholder="Search bill #, supplier, vendor invoice #, GSTIN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-container/40 border border-outline-variant rounded-xl text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
          </div>

          {/* From Date */}
          <div className="relative">
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-container/40 border border-outline-variant rounded-xl text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-outline pointer-events-none" />
          </div>

          {/* To Date */}
          <div className="relative">
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-container/40 border border-outline-variant rounded-xl text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-outline pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container/40 border border-outline-variant rounded-xl text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="posted">Posted (Stock Added)</option>
              <option value="approved">Approved</option>
              <option value="submitted">Submitted</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-xs uppercase tracking-wider text-outline bg-surface-container/30">
                <th className="py-3 px-4">Internal Bill #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier / Vendor</th>
                <th className="py-3 px-4">Vendor Inv #</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4 text-right">Taxable (₹)</th>
                <th className="py-3 px-4 text-right">Input CGST (₹)</th>
                <th className="py-3 px-4 text-right">Input SGST (₹)</th>
                <th className="py-3 px-4 text-right">Total ITC (₹)</th>
                <th className="py-3 px-4 text-right">Bill Total (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-outline">
                    Loading purchase register...
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-outline space-y-2">
                    <p className="font-semibold text-on-surface">No purchase bills found</p>
                    <p className="text-xs">Adjust the filters above or record your first bill in Purchase Invoices.</p>
                  </td>
                </tr>
              ) : (
                filteredBills.map(bill => {
                  const itc = (Number(bill.cgst_amount) || 0) + (Number(bill.sgst_amount) || 0)
                  return (
                    <tr key={bill.id} className="hover:bg-background/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-primary whitespace-nowrap">
                        <Link to="/procurement/purchase-invoices" className="hover:underline">
                          {bill.invoice_number}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-xs text-on-surface whitespace-nowrap">
                        {formatDate(bill.date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-on-surface whitespace-nowrap">
                        {bill.supplier?.name || 'Vendor'}
                        {bill.supplier?.city && (
                          <span className="text-xs text-outline font-normal"> · {bill.supplier.city}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-outline whitespace-nowrap">
                        {bill.supplier_invoice_number || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-outline whitespace-nowrap">
                        {bill.supplier?.gstin || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-on-surface whitespace-nowrap">
                        {formatCurrency(bill.taxable_amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-outline whitespace-nowrap">
                        {formatCurrency(bill.cgst_amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-outline whitespace-nowrap">
                        {formatCurrency(bill.sgst_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700 whitespace-nowrap">
                        {formatCurrency(itc)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-on-surface whitespace-nowrap">
                        {formatCurrency(bill.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={bill.status} />
                      </td>
                    </tr>
                  )
                })
              )}

              {/* Totals Row */}
              {filteredBills.length > 0 && (
                <tr className="bg-surface-container/30 font-bold border-t-2 border-outline-variant">
                  <td colSpan={5} className="py-3 px-4 text-xs uppercase tracking-wider text-on-surface">
                    Total ({filteredBills.length} Bills)
                  </td>
                  <td className="py-3 px-4 text-right text-on-surface whitespace-nowrap">
                    {formatCurrency(totals.taxable)}
                  </td>
                  <td className="py-3 px-4 text-right text-on-surface whitespace-nowrap">
                    {formatCurrency(totals.cgst)}
                  </td>
                  <td className="py-3 px-4 text-right text-on-surface whitespace-nowrap">
                    {formatCurrency(totals.sgst)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 whitespace-nowrap">
                    {formatCurrency(totals.cgst + totals.sgst)}
                  </td>
                  <td className="py-3 px-4 text-right text-blue-700 whitespace-nowrap">
                    {formatCurrency(totals.total)}
                  </td>
                  <td className="py-3 px-4"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
