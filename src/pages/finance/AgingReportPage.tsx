import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Clock, Download, Users, Building2, Phone, AlertTriangle,
  ArrowRight, Search, FileText, ChevronRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Customer, Supplier, Invoice, PurchaseInvoice } from '@/types/database.types'

interface AgingBucket {
  current: number
  days1_30: number
  days31_60: number
  days61_90: number
  days90_plus: number
  total: number
}

interface PartyAgingRow {
  id: string
  name: string
  phone: string
  city: string
  creditLimit: number
  buckets: AgingBucket
}

export function AgingReportPage() {
  const { user } = useAuth()
  const companyId = user?.company_id || ''

  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables')
  const [searchQuery, setSearchQuery] = useState('')

  const isAR = activeTab === 'receivables'

  // 1. Fetch Customers & Suppliers
  const { data: customers = [] } = useQuery({
    queryKey: ['aging_customers', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .order('name')
      if (error) throw error
      return (data || []) as Customer[]
    },
    enabled: !!companyId,
  })

  const { data: suppliers = [] } = useQuery({
    queryKey: ['aging_suppliers', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', companyId)
        .order('name')
      if (error) throw error
      return (data || []) as Supplier[]
    },
    enabled: !!companyId,
  })

  // 2. Fetch Invoices (for Receivables)
  const { data: salesInvoices = [] } = useQuery({
    queryKey: ['aging_sales_invoices', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
      if (error) throw error
      return (data || []) as Invoice[]
    },
    enabled: !!companyId,
  })

  // 3. Fetch Purchase Invoices (for Payables)
  const { data: purchaseBills = [] } = useQuery({
    queryKey: ['aging_purchase_invoices', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*')
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
      if (error) throw error
      return (data || []) as PurchaseInvoice[]
    },
    enabled: !!companyId,
  })

  // 4. Compute Aging Matrix
  const { agingRows, totals } = useMemo(() => {
    const today = new Date()

    const getDaysDiff = (dateStr: string) => {
      const d = new Date(dateStr)
      const diffTime = today.getTime() - d.getTime()
      return Math.floor(diffTime / (1000 * 60 * 60 * 24))
    }

    if (isAR) {
      // Group unpaid customer invoice balances
      const partyMap: Record<string, AgingBucket> = {}

      customers.forEach(c => {
        partyMap[c.id] = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90_plus: 0, total: 0 }
      })

      salesInvoices.forEach(inv => {
        const totalAmt = Number(inv.total_amount) || 0
        const paidAmt = Number(inv.paid_amount) || 0
        const due = totalAmt - paidAmt

        if (due > 0.01 && partyMap[inv.customer_id]) {
          const days = getDaysDiff(inv.due_date || inv.date)
          const b = partyMap[inv.customer_id]

          b.total += due
          if (days <= 0) {
            b.current += due
          } else if (days <= 30) {
            b.days1_30 += due
          } else if (days <= 60) {
            b.days31_60 += due
          } else if (days <= 90) {
            b.days61_90 += due
          } else {
            b.days90_plus += due
          }
        }
      })

      const rows: PartyAgingRow[] = customers
        .map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          city: c.city || '',
          creditLimit: Number(c.credit_limit) || 0,
          buckets: partyMap[c.id] || { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90_plus: 0, total: 0 }
        }))
        .filter(r => r.buckets.total > 0.01)
        .sort((a, b) => b.buckets.total - a.buckets.total)

      const sumTotals = rows.reduce(
        (acc, r) => {
          acc.current += r.buckets.current
          acc.days1_30 += r.buckets.days1_30
          acc.days31_60 += r.buckets.days31_60
          acc.days61_90 += r.buckets.days61_90
          acc.days90_plus += r.buckets.days90_plus
          acc.total += r.buckets.total
          return acc
        },
        { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90_plus: 0, total: 0 }
      )

      return { agingRows: rows, totals: sumTotals }
    } else {
      // Group unpaid supplier bills
      const partyMap: Record<string, AgingBucket> = {}

      suppliers.forEach(s => {
        partyMap[s.id] = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90_plus: 0, total: 0 }
      })

      purchaseBills.forEach(bill => {
        const totalAmt = Number(bill.total_amount) || 0
        // Currently purchase bills status = posted indicates pending settlement
        if (bill.status === 'posted' && partyMap[bill.supplier_id]) {
          const days = getDaysDiff(bill.due_date || bill.date)
          const b = partyMap[bill.supplier_id]

          b.total += totalAmt
          if (days <= 0) {
            b.current += totalAmt
          } else if (days <= 30) {
            b.days1_30 += totalAmt
          } else if (days <= 60) {
            b.days31_60 += totalAmt
          } else if (days <= 90) {
            b.days61_90 += totalAmt
          } else {
            b.days90_plus += totalAmt
          }
        }
      })

      const rows: PartyAgingRow[] = suppliers
        .map(s => ({
          id: s.id,
          name: s.name,
          phone: s.phone || '',
          city: s.city || '',
          creditLimit: 0,
          buckets: partyMap[s.id] || { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90_plus: 0, total: 0 }
        }))
        .filter(r => r.buckets.total > 0.01)
        .sort((a, b) => b.buckets.total - a.buckets.total)

      const sumTotals = rows.reduce(
        (acc, r) => {
          acc.current += r.buckets.current
          acc.days1_30 += r.buckets.days1_30
          acc.days31_60 += r.buckets.days31_60
          acc.days61_90 += r.buckets.days61_90
          acc.days90_plus += r.buckets.days90_plus
          acc.total += r.buckets.total
          return acc
        },
        { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90_plus: 0, total: 0 }
      )

      return { agingRows: rows, totals: sumTotals }
    }
  }, [isAR, customers, suppliers, salesInvoices, purchaseBills])

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return agingRows
    const q = searchQuery.toLowerCase()
    return agingRows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.phone.includes(q)
    )
  }, [agingRows, searchQuery])

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      isAR ? 'Customer Name' : 'Supplier Name',
      'City',
      'Phone',
      'Total Outstanding (INR)',
      'Current / Not Due (INR)',
      '1 - 30 Days Overdue (INR)',
      '31 - 60 Days Overdue (INR)',
      '61 - 90 Days Overdue (INR)',
      '90+ Days Critical (INR)'
    ]

    const rows = filteredRows.map(r => [
      `"${r.name}"`,
      `"${r.city}"`,
      `"${r.phone}"`,
      r.buckets.total.toFixed(2),
      r.buckets.current.toFixed(2),
      r.buckets.days1_30.toFixed(2),
      r.buckets.days31_60.toFixed(2),
      r.buckets.days61_90.toFixed(2),
      r.buckets.days90_plus.toFixed(2)
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [`Outstanding Aging Report: ${isAR ? 'Accounts Receivable' : 'Accounts Payable'}`, `As of: ${formatDate(new Date().toISOString())}`, '']
        .concat([headers.join(',')])
        .concat(rows.map(row => row.join(',')))
        .join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${activeTab}_aging_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Outstanding Aging Analysis
          </h1>
          <p className="text-sm text-outline mt-0.5">
            {isAR
              ? 'Accounts Receivable (AR): Track customer unpaid invoices categorized by days past due'
              : 'Accounts Payable (AP): Track vendor inward bills categorized by days past due'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="bg-surface-container p-1 rounded-xl flex items-center gap-1 border border-outline-variant">
            <button
              onClick={() => setActiveTab('receivables')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isAR ? 'bg-primary text-white shadow-xs' : 'text-outline hover:text-on-surface'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Receivables (AR)
            </button>
            <button
              onClick={() => setActiveTab('payables')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !isAR ? 'bg-primary text-white shadow-xs' : 'text-outline hover:text-on-surface'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Payables (AP)
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-surface border border-outline-variant rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors shadow-xs"
          >
            <Download className="h-4 w-4 text-outline" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Aging KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-outline">Total Pending</span>
          <p className="text-xl font-bold text-on-surface mt-1">
            {formatCurrency(totals.total)}
          </p>
          <span className="text-[11px] text-outline">{filteredRows.length} Parties</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-emerald-700">Current (Not Due)</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {formatCurrency(totals.current)}
          </p>
          <span className="text-[11px] text-outline">Within term</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-blue-700">1 – 30 Days</span>
          <p className="text-xl font-bold text-blue-700 mt-1">
            {formatCurrency(totals.days1_30)}
          </p>
          <span className="text-[11px] text-outline">Recent overdue</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-amber-600">31 – 60 Days</span>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {formatCurrency(totals.days31_60)}
          </p>
          <span className="text-[11px] text-outline">Follow-up needed</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-orange-600">61 – 90 Days</span>
          <p className="text-xl font-bold text-orange-600 mt-1">
            {formatCurrency(totals.days61_90)}
          </p>
          <span className="text-[11px] text-outline">Aging overdue</span>
        </div>

        <div className="bg-surface rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10 p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-red-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> 90+ Days
          </span>
          <p className="text-xl font-bold text-red-600 mt-1">
            {formatCurrency(totals.days90_plus)}
          </p>
          <span className="text-[11px] text-red-500 font-medium">Critical recovery</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-3 shadow-xs">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder={`Search ${isAR ? 'customer' : 'supplier'} by name, city, phone...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-container/40 border border-outline-variant rounded-xl text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
        </div>
      </div>

      {/* Aging Table */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-xs uppercase tracking-wider text-outline bg-surface-container/30">
                <th className="py-3 px-4">{isAR ? 'Customer' : 'Supplier'}</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-right">Total Due (₹)</th>
                <th className="py-3 px-4 text-right">Current (₹)</th>
                <th className="py-3 px-4 text-right">1–30d (₹)</th>
                <th className="py-3 px-4 text-right">31–60d (₹)</th>
                <th className="py-3 px-4 text-right">61–90d (₹)</th>
                <th className="py-3 px-4 text-right text-red-600">&gt;90d (₹)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-outline space-y-2">
                    <p className="font-semibold text-on-surface">No outstanding balances found</p>
                    <p className="text-xs">
                      All {isAR ? 'customer invoices' : 'supplier bills'} are fully settled with zero pending dues.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map(row => (
                  <tr key={row.id} className="hover:bg-background/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-bold text-on-surface">{row.name}</p>
                      {row.city && <p className="text-xs text-outline">{row.city}</p>}
                    </td>
                    <td className="py-3 px-4 text-xs text-outline whitespace-nowrap">
                      {row.phone ? (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3" /> {row.phone}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-on-surface whitespace-nowrap">
                      {formatCurrency(row.buckets.total)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-medium text-emerald-700 whitespace-nowrap">
                      {row.buckets.current > 0 ? formatCurrency(row.buckets.current) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-medium text-blue-700 whitespace-nowrap">
                      {row.buckets.days1_30 > 0 ? formatCurrency(row.buckets.days1_30) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-medium text-amber-600 whitespace-nowrap">
                      {row.buckets.days31_60 > 0 ? formatCurrency(row.buckets.days31_60) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-medium text-orange-600 whitespace-nowrap">
                      {row.buckets.days61_90 > 0 ? formatCurrency(row.buckets.days61_90) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-bold text-red-600 whitespace-nowrap">
                      {row.buckets.days90_plus > 0 ? formatCurrency(row.buckets.days90_plus) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Link
                        to={isAR ? '/finance/customer-ledger' : '/finance/supplier-ledger'}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        Statement <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}

              {/* Totals Row */}
              {filteredRows.length > 0 && (
                <tr className="bg-surface-container/30 font-bold border-t-2 border-outline-variant">
                  <td colSpan={2} className="py-3.5 px-4 text-xs uppercase tracking-wider text-on-surface">
                    Total Aging Outstanding ({filteredRows.length} Parties)
                  </td>
                  <td className="py-3.5 px-4 text-right text-base text-primary whitespace-nowrap">
                    {formatCurrency(totals.total)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-700 whitespace-nowrap">
                    {formatCurrency(totals.current)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-blue-700 whitespace-nowrap">
                    {formatCurrency(totals.days1_30)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-amber-600 whitespace-nowrap">
                    {formatCurrency(totals.days31_60)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-orange-600 whitespace-nowrap">
                    {formatCurrency(totals.days61_90)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-red-600 whitespace-nowrap">
                    {formatCurrency(totals.days90_plus)}
                  </td>
                  <td className="py-3.5 px-4"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
