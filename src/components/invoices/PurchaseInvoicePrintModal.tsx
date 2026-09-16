import { useState, useMemo } from 'react'
import { Printer, Copy, Check, X } from 'lucide-react'
import { formatCurrency, formatDate, amountInWords } from '@/lib/formatters'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { PurchaseInvoice, PurchaseInvoiceLine, Supplier, Item } from '@/types/database.types'

interface PurchaseInvoicePrintModalProps {
  invoice: PurchaseInvoice & { supplier?: Supplier }
  lines: (PurchaseInvoiceLine & { item?: Item & { unit?: { symbol: string } } })[]
  onClose: () => void
}

export function PurchaseInvoicePrintModal({
  invoice,
  lines,
  onClose,
}: PurchaseInvoicePrintModalProps) {
  const [copied, setCopied] = useState(false)

  // Calculations
  const totalQty = useMemo(() => {
    return lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0)
  }, [lines])

  const totalTaxable = useMemo(() => {
    return Number(invoice.taxable_amount) || lines.reduce((sum, line) => sum + (Number(line.taxable_amount) || 0), 0)
  }, [invoice.taxable_amount, lines])

  const cgstTotal = Number(invoice.cgst_amount) || 0
  const sgstTotal = Number(invoice.sgst_amount) || 0
  const totalTax = cgstTotal + sgstTotal
  const grandTotal = Number(invoice.total_amount) || (totalTaxable + totalTax)

  // Parse notes or metadata
  const parsedMeta = useMemo(() => {
    try {
      if (invoice.notes && invoice.notes.startsWith('{') && invoice.notes.endsWith('}')) {
        return JSON.parse(invoice.notes)
      }
    } catch {
      // Not JSON
    }
    return null
  }, [invoice.notes])

  const paymentType = parsedMeta?.payment_type || 'CREDIT'
  const deliveryMode = parsedMeta?.delivery_mode || ''
  const placeOfSupply = parsedMeta?.place_of_supply || invoice.supplier?.state || 'West Bengal'
  const termsTitle = parsedMeta?.terms_title || 'Terms & Conditions'
  const termsDetail = parsedMeta?.terms_detail || ''
  const displayNotes = parsedMeta?.display_notes || (!parsedMeta ? invoice.notes : '')

  const handlePrint = () => {
    const originalTitle = document.title
    document.title = `Purchase_Bill_${invoice.invoice_number}`
    window.print()
    setTimeout(() => {
      document.title = originalTitle
    }, 500)
  }

  const handleCopy = () => {
    const text =
      `PURCHASE INVOICE: ${invoice.invoice_number}\n` +
      `Vendor: ${invoice.supplier?.name || 'Unknown'}\n` +
      `Date: ${formatDate(invoice.date)}\n` +
      `Supplier Bill Ref: ${invoice.supplier_invoice_number || 'N/A'}\n` +
      `Total Value: ${formatCurrency(grandTotal)}\n` +
      `Payment Type: ${paymentType}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      {/* Isolated Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-purchase-bill, #printable-purchase-bill * {
            visibility: visible;
          }
          #printable-purchase-bill {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 16px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col border border-outline-variant overflow-hidden">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant bg-background/80 no-print">
          <div className="flex items-center gap-3">
            <span className="font-heading font-bold text-on-surface text-base">
              Purchase Invoice Voucher
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
              {invoice.invoice_number}
            </span>
            <StatusBadge status={invoice.status} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-outline-variant bg-surface hover:bg-background text-on-surface-variant flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Voucher (P)
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-background transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="overflow-y-auto p-6 flex-1 bg-surface-container/20">
          <div
            id="printable-purchase-bill"
            className="bg-white border border-outline-variant rounded-xl p-6 sm:p-8 max-w-3xl mx-auto shadow-sm text-black"
            style={{ minHeight: '900px' }}
          >
            {/* Top Company & Title Header */}
            <div className="border-b-2 border-primary/80 pb-4 mb-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xl font-heading font-black tracking-tight text-primary uppercase">
                    D. D. ENTERPRISE
                  </div>
                  <div className="text-xs text-gray-600 max-w-sm mt-0.5">
                    Beside NH-34, Amdanga, North 24 Parganas, West Bengal - 743221
                  </div>
                  <div className="text-xs text-gray-700 mt-1 font-mono">
                    <span className="font-semibold text-gray-900">GSTIN:</span> 19AFDPD4677G1ZD &nbsp;|&nbsp;
                    <span className="font-semibold text-gray-900"> Ph:</span> 9433393977
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded">
                    Purchase Voucher
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    <div><span className="font-semibold">Voucher #:</span> <span className="font-mono font-bold text-gray-900">{invoice.invoice_number}</span></div>
                    <div><span className="font-semibold">Date:</span> <span className="font-mono">{formatDate(invoice.date)}</span></div>
                    {invoice.due_date && (
                      <div><span className="font-semibold">Due Date:</span> <span className="font-mono">{formatDate(invoice.due_date)}</span></div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor & Invoice Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs border border-gray-200 rounded-lg p-3 bg-gray-50/50 mb-5">
              <div>
                <div className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-1">
                  Vendor (M/S):
                </div>
                <div className="font-bold text-sm text-gray-900">
                  {invoice.supplier?.name || 'Unregistered Supplier'}
                </div>
                <div className="text-gray-600 mt-0.5 whitespace-pre-line">
                  {invoice.supplier?.address || 'Address not recorded'}
                  {invoice.supplier?.city ? `, ${invoice.supplier.city}` : ''}
                  {invoice.supplier?.state ? ` - ${invoice.supplier.state}` : ''}
                </div>
                <div className="font-mono text-gray-800 mt-1">
                  <span className="font-semibold">GSTIN/PAN:</span> {invoice.supplier?.gstin || 'N/A'}
                </div>
                {invoice.supplier?.phone && (
                  <div className="text-gray-700">
                    <span className="font-semibold">Contact:</span> {invoice.supplier.phone}
                  </div>
                )}
              </div>

              <div className="border-l border-gray-200 pl-4 space-y-1">
                <div className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-1">
                  Bill & Inward Details:
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Supplier Ref Bill #:</span>
                  <span className="font-mono font-bold text-gray-900">{invoice.supplier_invoice_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Type:</span>
                  <span className="font-bold text-primary uppercase">{paymentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Place of Supply:</span>
                  <span className="font-medium text-gray-900">{placeOfSupply}</span>
                </div>
                {deliveryMode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Mode:</span>
                    <span className="text-gray-900">{deliveryMode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Items Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-5">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 border-b border-gray-200 font-bold text-gray-700 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Item / Description</th>
                    <th className="py-2.5 px-2 text-right w-20">Qty</th>
                    <th className="py-2.5 px-2 text-center w-16">UOM</th>
                    <th className="py-2.5 px-3 text-right w-24">Price (₹)</th>
                    <th className="py-2.5 px-3 text-right w-24">Taxable</th>
                    <th className="py-2.5 px-2 text-right w-16">GST %</th>
                    <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lines.map((line, idx) => {
                    const uom = line.item?.unit?.symbol || 'PCS'
                    return (
                      <tr key={line.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-gray-900">{line.item?.name || 'Raw Material Item'}</div>
                          {line.item?.sku && (
                            <div className="text-[10px] text-gray-500 font-mono">SKU: {line.item.sku}</div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-medium">{line.qty}</td>
                        <td className="py-2 px-2 text-center text-gray-600 font-mono text-[11px]">{uom}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(line.rate).replace('₹', '')}</td>
                        <td className="py-2 px-3 text-right font-mono font-medium">{formatCurrency(line.taxable_amount).replace('₹', '')}</td>
                        <td className="py-2 px-2 text-right font-mono text-gray-600">{line.gst_rate}%</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">{formatCurrency(line.line_total).replace('₹', '')}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-amber-50/60 border-t-2 border-gray-300 font-semibold text-gray-900">
                  <tr>
                    <td colSpan={2} className="py-2 px-3 text-right font-bold uppercase text-[11px]">
                      Total
                    </td>
                    <td className="py-2 px-2 text-right font-mono">{totalQty}</td>
                    <td></td>
                    <td></td>
                    <td className="py-2 px-3 text-right font-mono">{formatCurrency(totalTaxable).replace('₹', '')}</td>
                    <td></td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-primary">{formatCurrency(grandTotal).replace('₹', '')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Summary & Signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs mb-8">
              <div className="space-y-3">
                {termsDetail && (
                  <div className="border border-gray-200 rounded p-2.5 bg-gray-50">
                    <div className="font-bold text-gray-700 uppercase text-[10px]">{termsTitle}</div>
                    <div className="text-gray-600 whitespace-pre-line mt-1">{termsDetail}</div>
                  </div>
                )}
                {displayNotes && (
                  <div className="text-gray-600">
                    <span className="font-semibold text-gray-800">Remarks:</span> {displayNotes}
                  </div>
                )}
                <div className="bg-gray-50 border border-gray-200 rounded p-2.5">
                  <div className="text-[10px] uppercase font-bold text-gray-500">Amount in Words</div>
                  <div className="font-mono text-xs font-bold text-gray-900 mt-0.5 uppercase">
                    {amountInWords(grandTotal)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 border border-gray-200 rounded p-3 bg-gray-50/50">
                <div className="flex justify-between text-gray-600">
                  <span>Taxable Value:</span>
                  <span className="font-mono font-medium text-gray-900">{formatCurrency(totalTaxable)}</span>
                </div>
                {cgstTotal > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>CGST:</span>
                    <span className="font-mono text-gray-900">{formatCurrency(cgstTotal)}</span>
                  </div>
                )}
                {sgstTotal > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>SGST:</span>
                    <span className="font-mono text-gray-900">{formatCurrency(sgstTotal)}</span>
                  </div>
                )}
                {totalTax > 0 && cgstTotal === 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>IGST:</span>
                    <span className="font-mono text-gray-900">{formatCurrency(totalTax)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-300 my-1" />
                <div className="flex justify-between text-sm font-bold text-gray-900">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary text-base">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 text-center text-xs">
              <div>
                <div className="h-10"></div>
                <div className="border-t border-gray-300 pt-1 font-medium text-gray-700">
                  Receiver's Verification & Gate Stamp
                </div>
              </div>
              <div>
                <div className="h-10"></div>
                <div className="border-t border-gray-300 pt-1 font-medium text-gray-700">
                  For D. D. ENTERPRISE (Authorized Signatory)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
