import { useRef } from 'react'
import { Printer, X, Download, RotateCcw } from 'lucide-react'
import { formatCurrency, formatDate, formatNumber, amountInWords } from '@/lib/formatters'
import { useCompany } from '@/contexts/CompanyContext'
import { type PurchaseReturn, RETURN_REASONS } from '@/types/purchaseReturn.types'

interface PurchaseReturnPrintModalProps {
  purchaseReturn: PurchaseReturn | null
  onClose: () => void
}

export function PurchaseReturnPrintModal({ purchaseReturn, onClose }: PurchaseReturnPrintModalProps) {
  const { company } = useCompany()
  const printRef = useRef<HTMLDivElement>(null)

  if (!purchaseReturn) return null

  const handlePrint = () => {
    const orig = document.title
    document.title = `DebitNote_${purchaseReturn.return_number}`
    window.print()
    setTimeout(() => { document.title = orig }, 500)
  }

  const totalReturnQty = purchaseReturn.items.reduce((s, i) => s + (Number(i.return_qty) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl max-w-3xl w-full my-8 overflow-hidden print:border-none print:shadow-none print:my-0 print:max-w-none">
        {/* Controls - Hidden in print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container/50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface text-base">GST Debit Note / Purchase Return</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
              purchaseReturn.status === 'posted'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {purchaseReturn.status}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Print Debit Note</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div ref={printRef} className="p-8 print:p-6 bg-white text-slate-900 font-sans space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {company?.name || 'DD ENTERPRISE'}
              </h1>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                Concrete Paver Blocks & Interlocking Heavy Duty Tile Plant
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {company?.address || 'Near Panagarh Industrial Corridor, NH-19, Burdwan - 713148'}
              </p>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-600 mt-1">
                <span>GSTIN: <strong>{company?.gstin || '19AABCD1234E1Z5'}</strong></span>
                <span>STATE CODE: <strong>19 (West Bengal)</strong></span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                DEBIT NOTE / PURCHASE RETURN
              </span>
              <p className="text-xs font-semibold text-slate-700 mt-2 font-mono">
                Debit Note No: <strong className="text-slate-900 text-sm">{purchaseReturn.return_number}</strong>
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Date: {formatDate(purchaseReturn.date)}
              </p>
            </div>
          </div>

          {/* Supplier & Original Invoice Strip */}
          <div className="grid grid-cols-2 gap-4 p-4 border border-slate-300 rounded-lg bg-slate-50/50 text-xs">
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                Issued To (Supplier / Vendor)
              </span>
              <p className="font-bold text-slate-900 text-sm">{purchaseReturn.supplier_name}</p>
              <p className="text-slate-600 text-[11px] font-mono">
                GSTIN: <strong>{purchaseReturn.supplier?.gstin || 'N/A'}</strong>
              </p>
              <p className="text-slate-600 text-[11px]">
                City: {purchaseReturn.supplier?.city || 'West Bengal'} · Phone: {purchaseReturn.supplier?.phone || 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                Original Purchase Invoice Reference
              </span>
              <p className="font-bold text-slate-900 text-sm font-mono">{purchaseReturn.purchase_invoice_number}</p>
              <p className="text-slate-600 text-[11px]">
                Stock Dispatched From: <strong>{purchaseReturn.warehouse_name}</strong>
              </p>
              <p className="text-slate-700 text-[11px] mt-1">
                Reason: <strong className="text-rose-700 font-semibold">{RETURN_REASONS[purchaseReturn.reason] || purchaseReturn.reason}</strong>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Returned Materials & Tax Credit Reversal Details
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {purchaseReturn.items.length} items
              </span>
            </div>
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead className="bg-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2 border border-slate-300 text-center w-8">#</th>
                  <th className="p-2 border border-slate-300">Material SKU & Spec</th>
                  <th className="p-2 border border-slate-300 text-right w-20">Return Qty</th>
                  <th className="p-2 border border-slate-300 text-right w-20">Rate (₹)</th>
                  <th className="p-2 border border-slate-300 text-right w-24">Taxable (₹)</th>
                  <th className="p-2 border border-slate-300 text-center w-14">GST %</th>
                  <th className="p-2 border border-slate-300 text-right w-20">CGST (₹)</th>
                  <th className="p-2 border border-slate-300 text-right w-20">SGST (₹)</th>
                  <th className="p-2 border border-slate-300 text-right w-24">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {purchaseReturn.items.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="p-2 border border-slate-300 text-center font-bold font-sans">{idx + 1}</td>
                    <td className="p-2 border border-slate-300 font-sans font-medium text-slate-900">
                      {line.item_name}
                      <span className="block text-[10px] font-mono text-slate-500">{line.item_sku}</span>
                      {line.rejection_notes && (
                        <span className="block text-[10px] text-rose-600 italic mt-0.5">{line.rejection_notes}</span>
                      )}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-bold text-slate-900">
                      {formatNumber(line.return_qty, 0)} {line.unit}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-semibold">
                      ₹{line.rate.toFixed(2)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-bold">
                      {formatCurrency(line.taxable_amount)}
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-bold">
                      {line.gst_rate}%
                    </td>
                    <td className="p-2 border border-slate-300 text-right">
                      {formatCurrency(line.cgst_amount)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right">
                      {formatCurrency(line.sgst_amount)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-bold text-slate-900">
                      {formatCurrency(line.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Net Debit Note Amount */}
          <div className="flex justify-end">
            <div className="w-80 border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-700">
                <span>Taxable Return Value:</span>
                <span className="font-semibold">{formatCurrency(purchaseReturn.taxable_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Input CGST Reversal:</span>
                <span className="font-semibold">{formatCurrency(purchaseReturn.cgst_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Input SGST Reversal:</span>
                <span className="font-semibold">{formatCurrency(purchaseReturn.sgst_amount)}</span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-bold text-slate-900">
                <span>Net Debit Note Value:</span>
                <span className="text-rose-700">{formatCurrency(purchaseReturn.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Amount in words */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
            <span className="font-bold text-slate-700">Amount in Words: </span>
            <span className="capitalize text-slate-800 italic">
              {amountInWords(Math.round(purchaseReturn.total_amount))} Only
            </span>
          </div>

          {/* Rejection Remarks */}
          {purchaseReturn.notes && (
            <div className="p-3 bg-rose-50/50 border border-rose-200 rounded text-xs text-rose-900">
              <span className="font-bold block mb-0.5">QC Inspection Remarks:</span>
              <p className="italic">{purchaseReturn.notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-12 text-xs">
            <div className="space-y-12">
              <p className="text-slate-500 text-[10px] uppercase font-bold">1. Prepared By (QC / Stores)</p>
              <div>
                <div className="border-t border-slate-400 w-44 mb-1"></div>
                <p className="font-bold text-slate-800">{purchaseReturn.created_by}</p>
                <p className="text-[10px] text-slate-400">DD Enterprise Plant Stores</p>
              </div>
            </div>

            <div className="space-y-12 text-right">
              <p className="text-slate-500 text-[10px] uppercase font-bold">2. Authorised Signatory</p>
              <div className="flex flex-col items-end">
                <div className="border-t border-slate-400 w-44 mb-1"></div>
                <p className="font-bold text-slate-800">{purchaseReturn.approved_by || 'Managing Partner'}</p>
                <p className="text-[10px] text-slate-400">DD Enterprise Management</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
