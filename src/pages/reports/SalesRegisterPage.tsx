import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Download, Calendar, Search, Filter,
  Building2, CheckCircle2, Clock, AlertCircle, ArrowUpRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Invoice, Customer } from '@/types/database.types'

interface InvoiceWithParty extends Invoice {
  customer?: Customer
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

export function SalesRegisterPage() {
  const { user } = useAuth()
  const companyId = user?.company_id || ''

  const defaults = getDefaultDates()
  const [fromDate, setFromDate] = useState(defaults.fromDate)
  const [toDate, setToDate] = useState(defaults.toDate)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 1. Fetch Sales Invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['sales_register', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, gstin, city)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })
      if (error) throw error
      return (data || []) as InvoiceWithParty[]
    },
    enabled: !!companyId,
  })

  // 2. Filter Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Date filter
      if (fromDate && inv.date < fromDate) return false
      if (toDate && inv.date > toDate) return false

      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false

      // Type filter
      if (typeFilter !== 'all' && inv.type !== typeFilter) return false

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNumber = inv.invoice_number.toLowerCase().includes(q)
        const matchCustomer = inv.customer?.name.toLowerCase().includes(q) || false
        const matchGstin = inv.customer?.gstin?.toLowerCase().includes(q) || false
        if (!matchNumber && !matchCustomer && !matchGstin) return false
      }

      return true
    })
  }, [invoices, fromDate, toDate, statusFilter, typeFilter, searchQuery])

  // 3. Computed Totals
  const totals = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, inv) => {
        acc.count += 1
        acc.taxable += Number(inv.taxable_amount) || 0
        acc.cgst += Number(inv.cgst_amount) || 0
        acc.sgst += Number(inv.sgst_amount) || 0
        acc.total += Number(inv.total_amount) || 0
        const paid = Number(inv.paid_amount) || 0
        acc.paid += paid
        acc.due += Math.max(0, (Number(inv.total_amount) || 0) - paid)
        return acc
      },
      { count: 0, taxable: 0, cgst: 0, sgst: 0, total: 0, paid: 0, due: 0 }
    )
  }, [filteredInvoices])

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Invoice Number',
      'Date',
      'Customer Name',
      'Customer GSTIN',
      'Type',
      'Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'Total Invoice Amount (INR)',
      'Paid Amount (INR)',
      'Balance Due (INR)',
      'Status'
    ]

    const rows = filteredInvoices.map(inv => [
      `"${inv.invoice_number}"`,
      inv.date,
      `"${inv.customer?.name || ''}"`,
      `"${inv.customer?.gstin || ''}"`,
      inv.type.toUpperCase(),
      (Number(inv.taxable_amount) || 0).toFixed(2),
      (Number(inv.cgst_amount) || 0).toFixed(2),
      (Number(inv.sgst_amount) || 0).toFixed(2),
      (Number(inv.total_amount) || 0).toFixed(2),
      (Number(inv.paid_amount) || 0).toFixed(2),
      Math.max(0, (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0)).toFixed(2),
      inv.status.toUpperCase(),
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [`Sales Register: DD Enterprise`, `Period: ${fromDate} to ${toDate}`, '']
        .concat([headers.join(',')])
        .concat(rows.map(r => r.join(',')))
        .join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `sales_register_${fromDate}_to_${toDate}.csv`)
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
            Sales Register
          </h1>
          <p className="text-sm text-outline mt-0.5">
            Commercial outward supplies register with taxable turnover, CGST/SGST tax breakdown, and customer balances
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredInvoices.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs"
        >
          <Download className="h-4 w-4" />
          Export Register (CSV)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-outline">Taxable Turnover</span>
          <p className="text-xl font-bold text-on-surface mt-1">
            {formatCurrency(totals.taxable)}
          </p>
          <span className="text-xs text-outline">{totals.count} Invoices</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-outline">Output GST (CGST + SGST)</span>
          <p className="text-xl font-bold text-blue-700 mt-1">
            {formatCurrency(totals.cgst + totals.sgst)}
          </p>
          <span className="text-xs text-outline">CGST: {formatCurrency(totals.cgst)} · SGST: {formatCurrency(totals.sgst)}</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-outline">Gross Invoiced Total</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {formatCurrency(totals.total)}
          </p>
          <span className="text-xs text-outline">Collected: {formatCurrency(totals.paid)}</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-red-600">Total Outstanding Due</span>
          <p className="text-xl font-bold text-red-600 mt-1">
            {formatCurrency(totals.due)}
          </p>
          <span className="text-xs text-outline">Pending collections</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              placeholder="Search invoice #, customer name, GSTIN..."
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
              <option value="posted">Posted (Dispatched)</option>
              <option value="approved">Approved</option>
              <option value="submitted">Submitted</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-xs uppercase tracking-wider text-outline bg-surface-container/30">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Taxable (₹)</th>
                <th className="py-3 px-4 text-right">CGST (₹)</th>
                <th className="py-3 px-4 text-right">SGST (₹)</th>
                <th className="py-3 px-4 text-right">Total (₹)</th>
                <th className="py-3 px-4 text-right">Due (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-outline">
                    Loading sales register...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-outline space-y-2">
                    <p className="font-semibold text-on-surface">No sales invoices found</p>
                    <p className="text-xs">Adjust the filters above or create your first invoice in Sales Invoices.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const due = Math.max(0, (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0))
                  return (
                    <tr key={inv.id} className="hover:bg-background/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-primary whitespace-nowrap">
                        <Link to="/sales/invoices" className="hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-xs text-on-surface whitespace-nowrap">
                        {formatDate(inv.date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-on-surface whitespace-nowrap">
                        {inv.customer?.name || 'Customer'}
                        {inv.customer?.city && (
                          <span className="text-xs text-outline font-normal"> · {inv.customer.city}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-outline whitespace-nowrap">
                        {inv.customer?.gstin || '-'}
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inv.type === 'gst'
                            ? 'bg-blue-100 text-blue-800'
                            : inv.type === 'non_gst'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {inv.type === 'non_gst' ? 'Non-GST' : inv.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-on-surface whitespace-nowrap">
                        {formatCurrency(inv.taxable_amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-outline whitespace-nowrap">
                        {formatCurrency(inv.cgst_amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-outline whitespace-nowrap">
                        {formatCurrency(inv.sgst_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-on-surface whitespace-nowrap">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                        {due > 0 ? (
                          <span className="text-red-600">{formatCurrency(due)}</span>
                        ) : (
                          <span className="text-emerald-600 text-xs font-bold">PAID</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  )
                })
              )}

              {/* Totals Row */}
              {filteredInvoices.length > 0 && (
                <tr className="bg-surface-container/30 font-bold border-t-2 border-outline-variant">
                  <td colSpan={5} className="py-3 px-4 text-xs uppercase tracking-wider text-on-surface">
                    Total ({filteredInvoices.length} Invoices)
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
                    {formatCurrency(totals.total)}
                  </td>
                  <td className="py-3 px-4 text-right text-red-600 whitespace-nowrap">
                    {formatCurrency(totals.due)}
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
