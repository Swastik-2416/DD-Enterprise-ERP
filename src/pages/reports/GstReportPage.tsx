import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3, Printer, FileText, ArrowRight, ShieldCheck,
  Download, Loader2, Calendar, FileSpreadsheet
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import type { Invoice, PurchaseInvoice, Customer, Supplier } from '@/types/database.types'

interface SalesWithCustomer extends Invoice {
  customer?: Customer
}

interface PurchaseWithSupplier extends PurchaseInvoice {
  supplier?: Supplier
}

export function GstReportPage() {
  const { user } = useAuth()
  const companyId = user?.company_id || ''

  // ─── Live Queries ─────────────────────────────────────────────────────────

  const { data: postedSales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['gst_sales', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, gstin)
        `)
        .eq('company_id', companyId)
        .eq('status', 'posted')
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []) as SalesWithCustomer[]
    },
    enabled: !!companyId,
  })

  const { data: postedPurchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ['gst_purchases', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          *,
          supplier:suppliers(id, name, gstin)
        `)
        .eq('company_id', companyId)
        .eq('status', 'posted')
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []) as PurchaseWithSupplier[]
    },
    enabled: !!companyId,
  })

  // Sales (Outward)
  const totalSalesTaxable = postedSales.reduce((s, i) => s + (Number(i.taxable_amount) || 0), 0)
  const outputCgst = postedSales.reduce((s, i) => s + (Number(i.cgst_amount) || 0), 0)
  const outputSgst = postedSales.reduce((s, i) => s + (Number(i.sgst_amount) || 0), 0)
  const totalOutputGst = outputCgst + outputSgst

  // Purchases (Inward ITC)
  const totalPurchaseTaxable = postedPurchases.reduce(
    (s, i) => s + (Number(i.taxable_amount) || 0),
    0
  )
  const inputCgst = postedPurchases.reduce((s, i) => s + (Number(i.cgst_amount) || 0), 0)
  const inputSgst = postedPurchases.reduce((s, i) => s + (Number(i.sgst_amount) || 0), 0)
  const totalInputItc = inputCgst + inputSgst

  // Net Payable
  const netCgstPayable = Math.max(0, outputCgst - inputCgst)
  const netSgstPayable = Math.max(0, outputSgst - inputSgst)
  const netTotalPayable = netCgstPayable + netSgstPayable

  // CSV Export helper
  const exportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,'

    // GSTR-1 Outward section
    csvContent += 'GSTR-1 OUTWARD SUPPLIES (SALES)\r\n'
    csvContent += 'Invoice Number,Date,Customer,GSTIN,Type,Taxable Value,CGST,SGST,Total\r\n'
    postedSales.forEach(s => {
      csvContent += `"${s.invoice_number}","${s.date}","${s.customer?.name || ''}","${s.customer?.gstin || ''}","${s.type}",${s.taxable_amount},${s.cgst_amount},${s.sgst_amount},${s.total_amount}\r\n`
    })

    csvContent += '\r\n\r\nGSTR-3B INWARD SUPPLIES (PURCHASES / ITC)\r\n'
    csvContent += 'Bill Number,Date,Supplier,Supplier GSTIN,Supplier Ref Bill,Taxable Value,Input CGST,Input SGST,Total\r\n'
    postedPurchases.forEach(p => {
      csvContent += `"${p.invoice_number}","${p.date}","${p.supplier?.name || ''}","${p.supplier?.gstin || ''}","${p.supplier_invoice_number || ''}",${p.taxable_amount},${p.cgst_amount},${p.sgst_amount},${p.total_amount}\r\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `GST_Report_DD_Enterprise_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('GST Report downloaded as CSV')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Summary & Returns (GSTR-1 / 3B)"
        subtitle="Intra-state CGST & SGST reconciliation, Input Tax Credit (ITC) ledger & net tax liability"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-outline-variant bg-surface text-on-surface-variant text-xs font-semibold rounded-lg hover:bg-background transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Export CSV / Excel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-2xs"
            >
              <Printer className="h-4 w-4" />
              Print GSTR Summary
            </button>
          </div>
        }
      />

      {/* Tax Position Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 text-white shadow-ambient">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Regular GST Taxpayer · FY 2025–26
            </div>
            <div className="text-3xl font-extrabold mt-1 tracking-tight">
              {formatCurrency(netTotalPayable)}
            </div>
            <p className="text-sm text-blue-100/80 mt-1">
              Net Tax Payable after full Input Tax Credit (ITC) set-off
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-6 text-sm">
            <div>
              <div className="text-xs text-blue-200">Net CGST Payable</div>
              <div className="text-lg font-bold">{formatCurrency(netCgstPayable)}</div>
            </div>
            <div>
              <div className="text-xs text-blue-200">Net SGST Payable</div>
              <div className="text-lg font-bold">{formatCurrency(netSgstPayable)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Step Reconciliation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Output Tax */}
        <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-wider">
              1. Output Tax Liability
            </span>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">
              GSTR-1
            </span>
          </div>
          <div className="text-2xl font-bold text-on-surface mt-2">
            {formatCurrency(totalOutputGst)}
          </div>
          <div className="text-xs text-outline mt-1">
            On taxable sales of {formatCurrency(totalSalesTaxable)} ({postedSales.length} bills)
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant/60 space-y-1.5 text-xs text-on-surface-variant">
            <div className="flex justify-between">
              <span>CGST (9%):</span>
              <span className="font-semibold text-on-surface">{formatCurrency(outputCgst)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST (9%):</span>
              <span className="font-semibold text-on-surface">{formatCurrency(outputSgst)}</span>
            </div>
          </div>
        </div>

        {/* Input Tax Credit */}
        <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-wider">
              2. Input Tax Credit (ITC)
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
              GSTR-2B / 3B
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(totalInputItc)}
          </div>
          <div className="text-xs text-outline mt-1">
            On taxable inward of {formatCurrency(totalPurchaseTaxable)} ({postedPurchases.length} bills)
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant/60 space-y-1.5 text-xs text-on-surface-variant">
            <div className="flex justify-between">
              <span>Input CGST:</span>
              <span className="font-semibold text-on-surface">{formatCurrency(inputCgst)}</span>
            </div>
            <div className="flex justify-between">
              <span>Input SGST:</span>
              <span className="font-semibold text-on-surface">{formatCurrency(inputSgst)}</span>
            </div>
          </div>
        </div>

        {/* Net Tax to Pay */}
        <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-wider">
              3. Net Cash Ledger Balance
            </span>
            <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded">
              Form PMT-06
            </span>
          </div>
          <div className="text-2xl font-bold text-on-surface mt-2">
            {formatCurrency(netTotalPayable)}
          </div>
          <div className="text-xs text-amber-600 font-medium mt-1">
            Due by 20th of subsequent month
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant/60 space-y-1.5 text-xs text-on-surface-variant">
            <div className="flex justify-between">
              <span>Tax saved via ITC:</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(totalInputItc)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Actual cash outflow:</span>
              <span className="font-semibold text-on-surface">
                {formatCurrency(netTotalPayable)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GSTR-1 Outward Supplies Table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-outline-variant bg-background/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface">
              Outward Supplies Register (Sales / GSTR-1)
            </h3>
            <p className="text-xs text-outline">
              All posted tax invoices and registered recipients ({postedSales.length} records)
            </p>
          </div>
          <span className="text-xs font-medium text-on-surface-variant font-mono">
            HSN: 6810 (18% GST)
          </span>
        </div>

        {salesLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : postedSales.length === 0 ? (
          <div className="p-8 text-center text-outline text-xs">
            No posted sales invoices found in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-outline-variant text-xs uppercase font-semibold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer & GSTIN</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Taxable Value</th>
                  <th className="py-3 px-4 text-right">CGST (9%)</th>
                  <th className="py-3 px-4 text-right">SGST (9%)</th>
                  <th className="py-3 px-4 text-right">Invoice Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {postedSales.map(inv => (
                  <tr key={inv.id} className="hover:bg-background/50">
                    <td className="py-3 px-4 font-mono font-medium text-primary">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-on-surface">{inv.customer?.name}</div>
                      <div className="text-xs text-outline font-mono">
                        {inv.customer?.gstin || 'Unregistered'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full uppercase',
                          inv.type === 'gst'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-surface-container text-on-surface-variant'
                        )}
                      >
                        {inv.type === 'gst' ? 'B2B GST' : inv.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(inv.taxable_amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-on-surface-variant">
                      {formatCurrency(inv.cgst_amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-on-surface-variant">
                      {formatCurrency(inv.sgst_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-on-surface">
                      {formatCurrency(inv.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GSTR-3B Inward Supplies Table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-outline-variant bg-background/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface">
              Inward Supplies Eligible for ITC (Purchases / GSTR-3B)
            </h3>
            <p className="text-xs text-outline">
              Eligible input tax credit on raw materials ({postedPurchases.length} records)
            </p>
          </div>
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
            100% Eligible ITC
          </span>
        </div>

        {purchasesLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : postedPurchases.length === 0 ? (
          <div className="p-8 text-center text-outline text-xs">
            No posted purchase bills found in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-outline-variant text-xs uppercase font-semibold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Purchase Bill #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier & GSTIN</th>
                  <th className="py-3 px-4">Supplier Bill Ref</th>
                  <th className="py-3 px-4 text-right">Taxable Value</th>
                  <th className="py-3 px-4 text-right">Input CGST</th>
                  <th className="py-3 px-4 text-right">Input SGST</th>
                  <th className="py-3 px-4 text-right">Bill Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {postedPurchases.map(inv => (
                  <tr key={inv.id} className="hover:bg-background/50">
                    <td className="py-3 px-4 font-mono font-medium text-primary">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-on-surface">{inv.supplier?.name}</div>
                      <div className="text-xs text-outline font-mono">
                        {inv.supplier?.gstin || 'Unregistered'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-outline">
                      {inv.supplier_invoice_number || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(inv.taxable_amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                      {formatCurrency(inv.cgst_amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                      {formatCurrency(inv.sgst_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-on-surface">
                      {formatCurrency(inv.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
