import { useState } from 'react'
import { BarChart3, Printer, FileText, ArrowRight, ShieldCheck, Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatCurrency } from '@/lib/formatters'
import { mockInvoices, mockPurchaseInvoices } from '@/lib/mockData'
import { cn } from '@/lib/cn'

export function GstReportPage() {
  // Sales (Outward)
  const postedSales = mockInvoices.filter(i => i.status === 'posted')
  const totalSalesTaxable = postedSales.reduce((s, i) => s + i.taxable_amount, 0)
  const outputCgst = postedSales.reduce((s, i) => s + i.cgst_amount, 0)
  const outputSgst = postedSales.reduce((s, i) => s + i.sgst_amount, 0)
  const totalOutputGst = outputCgst + outputSgst

  // Purchases (Inward ITC)
  const postedPurchases = mockPurchaseInvoices.filter(i => i.status === 'posted')
  const totalPurchaseTaxable = postedPurchases.reduce((s, i) => s + i.taxable_amount, 0)
  const inputCgst = postedPurchases.reduce((s, i) => s + i.cgst_amount, 0)
  const inputSgst = postedPurchases.reduce((s, i) => s + i.sgst_amount, 0)
  const totalInputItc = inputCgst + inputSgst

  // Net Payable
  const netCgstPayable = Math.max(0, outputCgst - inputCgst)
  const netSgstPayable = Math.max(0, outputSgst - inputSgst)
  const netTotalPayable = netCgstPayable + netSgstPayable

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Summary & Returns (GSTR-1 / 3B)"
        subtitle="Intra-state CGST & SGST reconciliation, Input Tax Credit (ITC) ledger & net tax liability"
        action={{
          label: 'Print GSTR Summary',
          icon: Printer,
          onClick: () => window.print(),
        }}
      />

      {/* Tax Position Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Regular GST Taxpayer · FY 2026-27 (Q1-Q2)
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
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Output Tax Liability</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">GSTR-1</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalOutputGst)}</div>
          <div className="text-xs text-slate-500 mt-1">On taxable sales of {formatCurrency(totalSalesTaxable)}</div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>CGST (9%):</span>
              <span className="font-semibold text-slate-800">{formatCurrency(outputCgst)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST (9%):</span>
              <span className="font-semibold text-slate-800">{formatCurrency(outputSgst)}</span>
            </div>
          </div>
        </div>

        {/* Input Tax Credit */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Input Tax Credit (ITC)</span>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">GSTR-2B / 3B</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(totalInputItc)}</div>
          <div className="text-xs text-slate-500 mt-1">On taxable inward of {formatCurrency(totalPurchaseTaxable)}</div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Input CGST:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(inputCgst)}</span>
            </div>
            <div className="flex justify-between">
              <span>Input SGST:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(inputSgst)}</span>
            </div>
          </div>
        </div>

        {/* Net Tax to Pay */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">3. Net Electronic Cash Ledger</span>
            <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded">Form PMT-06</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(netTotalPayable)}</div>
          <div className="text-xs text-amber-600 font-medium mt-1">Due by 20th of subsequent month</div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Tax saved via ITC:</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(totalInputItc)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash outflow:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(netTotalPayable)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GSTR-1 Outward Supplies Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Outward Supplies Register (Sales / GSTR-1)</h3>
            <p className="text-xs text-slate-500">All posted tax invoices and registered recipients</p>
          </div>
          <span className="text-xs font-medium text-slate-600 font-mono">HSN: 6810 (18% GST)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Taxable Value</th>
                <th className="py-3 px-4 text-right">CGST (9%)</th>
                <th className="py-3 px-4 text-right">SGST (9%)</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {postedSales.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-medium text-blue-600">{inv.invoice_number}</td>
                  <td className="py-3 px-4 text-slate-600">{inv.date}</td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      inv.type === 'gst' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                    )}>
                      {inv.type === 'gst' ? 'B2B GST' : 'Non-GST'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(inv.taxable_amount)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(inv.cgst_amount)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(inv.sgst_amount)}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(inv.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GSTR-3B Inward Supplies Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Inward Supplies Eligible for ITC (Purchases / GSTR-3B)</h3>
            <p className="text-xs text-slate-500">Eligible input tax credit on raw materials (Cement 28%, Aggregate 5%, Sand 5%)</p>
          </div>
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded">100% Eligible ITC</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="py-3 px-4">Purchase Bill #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier Bill Ref</th>
                <th className="py-3 px-4 text-right">Taxable Value</th>
                <th className="py-3 px-4 text-right">Input CGST</th>
                <th className="py-3 px-4 text-right">Input SGST</th>
                <th className="py-3 px-4 text-right">Bill Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {postedPurchases.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-medium text-blue-600">{inv.invoice_number}</td>
                  <td className="py-3 px-4 text-slate-600">{inv.date}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-500">{inv.supplier_invoice_number || '—'}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(inv.taxable_amount)}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-medium">{formatCurrency(inv.cgst_amount)}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-medium">{formatCurrency(inv.sgst_amount)}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(inv.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
