import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Download, Printer, Calendar, User, Search,
  ArrowUpRight, ArrowDownLeft, Wallet, Building2, Phone, MapPin
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Customer, Supplier, Company } from '@/types/database.types'

interface PartyLedgerPageProps {
  partyType: 'customer' | 'supplier'
}

interface LedgerEntry {
  id: string
  date: string
  docNumber: string
  docType: string
  description: string
  debit: number
  credit: number
  balance: number
}

// Helpers for Indian Financial Year default dates (Apr 1 - Today)
function getDefaultDates() {
  const today = new Date()
  const currentMonth = today.getMonth() + 1 // 1-12
  const currentYear = today.getFullYear()
  const startYear = currentMonth >= 4 ? currentYear : currentYear - 1
  const fromDate = `${startYear}-04-01`
  const toDate = today.toISOString().split('T')[0]
  return { fromDate, toDate }
}

export function PartyLedgerPage({ partyType }: PartyLedgerPageProps) {
  const { user } = useAuth()
  const companyId = user?.company_id || ''
  const isCustomer = partyType === 'customer'

  const defaults = getDefaultDates()
  const [fromDate, setFromDate] = useState(defaults.fromDate)
  const [toDate, setToDate] = useState(defaults.toDate)
  const [selectedPartyId, setSelectedPartyId] = useState<string>('')
  const [searchFilter, setSearchFilter] = useState('')

  // 1. Fetch Company Info for Letterhead/Print
  const { data: company } = useQuery({
    queryKey: ['company_info', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()
      return (data || null) as Company | null
    },
    enabled: !!companyId,
  })

  // 2. Fetch Parties (Customers or Suppliers)
  const { data: parties = [] } = useQuery({
    queryKey: [isCustomer ? 'ledger_customers' : 'ledger_suppliers', companyId],
    queryFn: async () => {
      const table = isCustomer ? 'customers' : 'suppliers'
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('company_id', companyId)
        .order('name')
      if (error) throw error
      return (data || []) as (Customer | Supplier)[]
    },
    enabled: !!companyId,
  })

  // Auto-select first party if none selected
  const activeParties = useMemo(() => {
    return parties.filter(p => p.is_active)
  }, [parties])

  const effectivePartyId = selectedPartyId || activeParties[0]?.id || ''
  const currentParty = useMemo(() => {
    return parties.find(p => p.id === effectivePartyId)
  }, [parties, effectivePartyId])

  // 3. Fetch All Invoices / Purchase Bills for the Party
  const { data: documents = [] } = useQuery({
    queryKey: [isCustomer ? 'customer_invoices' : 'supplier_bills', effectivePartyId],
    queryFn: async () => {
      if (!effectivePartyId) return []
      if (isCustomer) {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('company_id', companyId)
          .eq('customer_id', effectivePartyId)
          .in('status', ['posted', 'approved'])
          .order('date', { ascending: true })
        if (error) throw error
        return data || []
      } else {
        const { data, error } = await supabase
          .from('purchase_invoices')
          .select('*')
          .eq('company_id', companyId)
          .eq('supplier_id', effectivePartyId)
          .in('status', ['posted', 'approved'])
          .order('date', { ascending: true })
        if (error) throw error
        return data || []
      }
    },
    enabled: !!companyId && !!effectivePartyId,
  })

  // 4. Fetch All Payments for the Party
  const { data: payments = [] } = useQuery({
    queryKey: [isCustomer ? 'customer_payments' : 'supplier_payments', effectivePartyId],
    queryFn: async () => {
      if (!effectivePartyId) return []
      const filterCol = isCustomer ? 'customer_id' : 'supplier_id'
      const paymentType = isCustomer ? 'inward' : 'outward'
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', companyId)
        .eq(filterCol, effectivePartyId)
        .eq('type', paymentType)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!companyId && !!effectivePartyId,
  })

  // 5. Compute Opening Balance and Chronological Ledger Entries
  const { openingBalance, entries, totalDebit, totalCredit, closingBalance } = useMemo(() => {
    if (!effectivePartyId) {
      return { openingBalance: 0, entries: [], totalDebit: 0, totalCredit: 0, closingBalance: 0 }
    }

    // Combine raw events
    const rawEvents: Array<{
      date: string
      createdAt: string
      docNumber: string
      docType: string
      description: string
      debit: number
      credit: number
    }> = []

    // Map Invoices
    documents.forEach((doc: any) => {
      const amount = Number(doc.total_amount) || 0
      if (isCustomer) {
        // Customer billed: Debit customer
        rawEvents.push({
          date: doc.date,
          createdAt: doc.created_at || doc.date,
          docNumber: doc.invoice_number,
          docType: doc.type === 'non_gst' ? 'Non-GST Invoice' : doc.type === 'proforma' ? 'Proforma' : 'Tax Invoice',
          description: `Sales Invoice · ${doc.status === 'posted' ? 'Stock Dispatched' : 'Approved'}`,
          debit: amount,
          credit: 0,
        })
      } else {
        // Supplier bill: Credit supplier
        rawEvents.push({
          date: doc.date,
          createdAt: doc.created_at || doc.date,
          docNumber: doc.invoice_number,
          docType: 'Purchase Bill',
          description: doc.supplier_invoice_number
            ? `Vendor Inv #${doc.supplier_invoice_number}`
            : 'Raw Material Purchase',
          debit: 0,
          credit: amount,
        })
      }
    })

    // Map Payments
    payments.forEach((pmt: any) => {
      const amount = Number(pmt.amount) || 0
      const modeLabel = pmt.mode ? pmt.mode.toUpperCase() : 'BANK'
      const refLabel = pmt.reference ? `Ref: ${pmt.reference}` : ''
      const desc = [modeLabel, refLabel, pmt.notes].filter(Boolean).join(' · ')

      if (isCustomer) {
        // Customer payment receipt: Credit customer
        rawEvents.push({
          date: pmt.date,
          createdAt: pmt.created_at || pmt.date,
          docNumber: pmt.payment_number,
          docType: 'Payment Receipt',
          description: desc || 'Inward Receipt',
          debit: 0,
          credit: amount,
        })
      } else {
        // Supplier payment disbursement: Debit supplier
        rawEvents.push({
          date: pmt.date,
          createdAt: pmt.created_at || pmt.date,
          docNumber: pmt.payment_number,
          docType: 'Payment Voucher',
          description: desc || 'Outward Payment',
          debit: amount,
          credit: 0,
        })
      }
    })

    // Sort chronologically
    rawEvents.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.createdAt.localeCompare(b.createdAt)
    })

    // Calculate opening balance before `fromDate`
    let opBal = 0
    const periodEvents: typeof rawEvents = []

    rawEvents.forEach(evt => {
      if (fromDate && evt.date < fromDate) {
        if (isCustomer) {
          opBal += (evt.debit - evt.credit)
        } else {
          opBal += (evt.credit - evt.debit)
        }
      } else if (!toDate || evt.date <= toDate) {
        periodEvents.push(evt)
      }
    })

    // Calculate running balance during selected period
    let currentRun = opBal
    let periodDebitSum = 0
    let periodCreditSum = 0

    const finalEntries: LedgerEntry[] = periodEvents.map((evt, idx) => {
      periodDebitSum += evt.debit
      periodCreditSum += evt.credit

      if (isCustomer) {
        currentRun += (evt.debit - evt.credit)
      } else {
        currentRun += (evt.credit - evt.debit)
      }

      return {
        id: `entry-${idx}`,
        date: evt.date,
        docNumber: evt.docNumber,
        docType: evt.docType,
        description: evt.description,
        debit: evt.debit,
        credit: evt.credit,
        balance: currentRun,
      }
    })

    return {
      openingBalance: opBal,
      entries: finalEntries,
      totalDebit: periodDebitSum,
      totalCredit: periodCreditSum,
      closingBalance: currentRun,
    }
  }, [effectivePartyId, isCustomer, documents, payments, fromDate, toDate])

  // Filter parties by search text
  const filteredPartyList = useMemo(() => {
    if (!searchFilter.trim()) return parties
    const q = searchFilter.toLowerCase()
    return parties.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.city && p.city.toLowerCase().includes(q)) ||
      (p.gstin && p.gstin.toLowerCase().includes(q))
    )
  }, [parties, searchFilter])

  // CSV Export handler
  const handleExportCSV = () => {
    if (!currentParty) return

    const headers = ['Date', 'Voucher / Doc No', 'Doc Type', 'Particulars', 'Debit (INR)', 'Credit (INR)', 'Balance (INR)']
    const rows = [
      ['--', 'OPENING BALANCE', '--', `Balance b/f as on ${fromDate || 'Start'}`, isCustomer && openingBalance > 0 ? openingBalance.toFixed(2) : '0.00', !isCustomer && openingBalance > 0 ? openingBalance.toFixed(2) : '0.00', openingBalance.toFixed(2)],
      ...entries.map(e => [
        e.date,
        `"${e.docNumber}"`,
        `"${e.docType}"`,
        `"${e.description.replace(/"/g, '""')}"`,
        e.debit.toFixed(2),
        e.credit.toFixed(2),
        e.balance.toFixed(2),
      ]),
      ['--', 'CLOSING BALANCE', '--', `Net Outstanding as on ${toDate || 'End'}`, totalDebit.toFixed(2), totalCredit.toFixed(2), closingBalance.toFixed(2)]
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [`Statement of Account: ${currentParty.name}`, `Period: ${fromDate} to ${toDate}`, '']
        .concat(rows.map(r => r.join(',')))
        .join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${partyType}_ledger_${currentParty.name.replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            {isCustomer ? 'Customer Statement of Account' : 'Supplier Statement of Account'}
          </h1>
          <p className="text-sm text-outline mt-0.5">
            {isCustomer
              ? 'Complete chronological debit/credit ledger, invoice billings, and payment receipts'
              : 'Chronological vendor billing, raw material purchase bills, and disbursement vouchers'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!currentParty || entries.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-surface border border-outline-variant rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors shadow-xs"
          >
            <Download className="h-4 w-4 text-outline" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            disabled={!currentParty}
            className="flex items-center gap-2 px-3.5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print Statement
          </button>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Party Selector */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">
              Select {isCustomer ? 'Customer' : 'Supplier / Vendor'}
            </label>
            <div className="relative">
              <select
                value={effectivePartyId}
                onChange={e => setSelectedPartyId(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-container/40 border border-outline-variant rounded-xl text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="" disabled>-- Select a {isCustomer ? 'Customer' : 'Supplier'} --</option>
                {parties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.city ? `(${p.city})` : ''} {p.gstin ? `· GSTIN: ${p.gstin}` : ''}
                  </option>
                ))}
              </select>
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-outline pointer-events-none" />
            </div>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">
              From Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-container/40 border border-outline-variant rounded-xl text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-outline pointer-events-none" />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">
              To Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-container/40 border border-outline-variant rounded-xl text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-outline pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Printable Statement Header (visible on print + on screen) */}
      {currentParty ? (
        <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs space-y-6">
          <div className="border-b border-outline-variant/60 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-primary">Statement of Account</span>
                <h2 className="text-xl font-bold text-on-surface mt-1">{currentParty.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-outline mt-2">
                  {currentParty.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {currentParty.phone}
                    </span>
                  )}
                  {currentParty.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {currentParty.address}, {currentParty.city || ''}
                    </span>
                  )}
                  {currentParty.gstin && (
                    <span className="font-mono bg-surface-container px-2 py-0.5 rounded text-on-surface font-medium">
                      GSTIN: {currentParty.gstin}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right text-xs text-outline space-y-1">
                <p className="font-semibold text-on-surface">{company?.name || 'DD Enterprise'}</p>
                <p>Period: <span className="font-medium text-on-surface">{formatDate(fromDate)}</span> to <span className="font-medium text-on-surface">{formatDate(toDate)}</span></p>
                <p>Generated on: {formatDate(new Date().toISOString())}</p>
              </div>
            </div>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-container/30 border border-outline-variant/60 rounded-xl p-4">
              <span className="text-xs font-semibold uppercase text-outline">Opening Balance</span>
              <p className="text-lg font-bold text-on-surface mt-1">
                {formatCurrency(openingBalance)}
              </p>
              <span className="text-[11px] text-outline">as on {formatDate(fromDate)}</span>
            </div>

            <div className="bg-surface-container/30 border border-outline-variant/60 rounded-xl p-4">
              <span className="text-xs font-semibold uppercase text-outline">
                {isCustomer ? 'Total Invoiced' : 'Total Bills Passed'}
              </span>
              <p className="text-lg font-bold text-blue-700 mt-1">
                {formatCurrency(isCustomer ? totalDebit : totalCredit)}
              </p>
              <span className="text-[11px] text-outline">During selected period</span>
            </div>

            <div className="bg-surface-container/30 border border-outline-variant/60 rounded-xl p-4">
              <span className="text-xs font-semibold uppercase text-outline">
                {isCustomer ? 'Total Received' : 'Total Paid Out'}
              </span>
              <p className="text-lg font-bold text-emerald-700 mt-1">
                {formatCurrency(isCustomer ? totalCredit : totalDebit)}
              </p>
              <span className="text-[11px] text-outline">During selected period</span>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <span className="text-xs font-semibold uppercase text-primary">Closing Outstanding</span>
              <p className="text-xl font-bold text-primary mt-1">
                {formatCurrency(closingBalance)}
              </p>
              <span className="text-[11px] text-outline">
                {closingBalance > 0
                  ? isCustomer ? 'Receivable from Customer' : 'Payable to Supplier'
                  : 'Settled / Nil'}
              </span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-xs uppercase tracking-wider text-outline bg-surface-container/20">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Document / Voucher #</th>
                  <th className="py-3 px-4">Voucher Type</th>
                  <th className="py-3 px-4">Particulars / Mode</th>
                  <th className="py-3 px-4 text-right">Debit (₹)</th>
                  <th className="py-3 px-4 text-right">Credit (₹)</th>
                  <th className="py-3 px-4 text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {/* Opening Balance Row */}
                <tr className="bg-surface-container/10 font-medium">
                  <td className="py-3 px-4 text-xs font-mono text-outline">{formatDate(fromDate)}</td>
                  <td className="py-3 px-4 font-mono text-xs text-outline">--</td>
                  <td className="py-3 px-4 text-xs uppercase font-bold text-primary">Opening Balance</td>
                  <td className="py-3 px-4 text-xs text-outline">Balance brought forward</td>
                  <td className="py-3 px-4 text-right font-semibold text-on-surface">
                    {isCustomer && openingBalance > 0 ? formatCurrency(openingBalance) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-on-surface">
                    {!isCustomer && openingBalance > 0 ? formatCurrency(openingBalance) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-primary">
                    {formatCurrency(openingBalance)}
                  </td>
                </tr>

                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-outline">
                      No new invoice or payment transactions recorded between {formatDate(fromDate)} and {formatDate(toDate)}.
                    </td>
                  </tr>
                ) : (
                  entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-background/60 transition-colors">
                      <td className="py-3 px-4 text-xs text-on-surface whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-on-surface whitespace-nowrap">
                        {entry.docNumber}
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          entry.docType.includes('Receipt') || entry.docType.includes('Payment')
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.docType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-outline max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-on-surface whitespace-nowrap">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-on-surface whitespace-nowrap">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-on-surface whitespace-nowrap">
                        {formatCurrency(entry.balance)}
                      </td>
                    </tr>
                  ))
                )}

                {/* Closing Balance Row */}
                <tr className="bg-surface-container/30 font-bold border-t-2 border-outline-variant">
                  <td colSpan={4} className="py-3.5 px-4 text-xs uppercase tracking-wider text-on-surface">
                    Period Total & Closing Balance (as on {formatDate(toDate)})
                  </td>
                  <td className="py-3.5 px-4 text-right text-on-surface whitespace-nowrap">
                    {formatCurrency(totalDebit)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-on-surface whitespace-nowrap">
                    {formatCurrency(totalCredit)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-base text-primary whitespace-nowrap">
                    {formatCurrency(closingBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center text-outline space-y-2">
          <Building2 className="h-10 w-10 mx-auto text-outline/50" />
          <p className="text-base font-semibold text-on-surface">No {isCustomer ? 'Customers' : 'Suppliers'} Found</p>
          <p className="text-xs">Create your first {isCustomer ? 'customer' : 'supplier'} to view their financial statement of account.</p>
        </div>
      )}
    </div>
  )
}
