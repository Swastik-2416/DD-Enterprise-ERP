import { useState, useMemo, useRef, useEffect } from 'react'
import { Printer, Copy, Check, X, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react'
import { formatDate, amountInWords } from '@/lib/formatters'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { PurchaseInvoice, PurchaseInvoiceLine, Supplier, Item } from '@/types/database.types'

interface PurchaseInvoicePrintModalProps {
  invoice: PurchaseInvoice & { supplier?: Supplier }
  lines: (PurchaseInvoiceLine & { item?: Item & { unit?: { symbol: string } } })[]
  onClose: () => void
}

export function PurchaseInvoicePrintModal({ invoice, lines, onClose }: PurchaseInvoicePrintModalProps) {
  const [copied, setCopied] = useState(false)
  const [fitToScreen, setFitToScreen] = useState(false)
  const [showMetaFields, setShowMetaFields] = useState(false)
  const [vehicleNo, setVehicleNo] = useState('')
  const [challanNo, setChallanNo] = useState('')
  const [poRef, setPoRef] = useState('')

  // ── Calculations ─────────────────────────────────────────────────────────────
  const totalQty = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) || 0), 0), [lines])
  const totalTaxable = useMemo(() =>
    Number(invoice.taxable_amount) || lines.reduce((s, l) => s + (Number(l.taxable_amount) || 0), 0),
    [invoice.taxable_amount, lines])
  const cgstTotal = Number(invoice.cgst_amount) || 0
  const sgstTotal = Number(invoice.sgst_amount) || 0
  const totalTax = cgstTotal + sgstTotal
  const grandTotal = Number(invoice.total_amount) || (totalTaxable + totalTax)

  // ── Parse metadata from notes ─────────────────────────────────────────────
  const parsedMeta = useMemo(() => {
    try {
      if (invoice.notes?.startsWith('{') && invoice.notes?.endsWith('}'))
        return JSON.parse(invoice.notes)
    } catch { /* not JSON */ }
    return null
  }, [invoice.notes])

  const paymentType = parsedMeta?.payment_type || 'CREDIT'
  const placeOfSupply = parsedMeta?.place_of_supply || invoice.supplier?.state || 'West Bengal'
  const termsDetail = parsedMeta?.terms_detail || ''
  const displayNotes = parsedMeta?.display_notes || (!parsedMeta ? invoice.notes : '')

  const spacerCount = Math.max(3, 8 - lines.length)

  // ── Grouped HSN tax lines ─────────────────────────────────────────────────
  const hsnGroups = useMemo(() => {
    const map: Record<string, { taxable: number; cgst: number; sgst: number; rate: number }> = {}
    lines.forEach(l => {
      const hsn = l.item?.hsn_code || 'N/A'
      const rate = Number(l.gst_rate) || 0
      if (!map[hsn]) map[hsn] = { taxable: 0, cgst: 0, sgst: 0, rate }
      map[hsn].taxable += Number(l.taxable_amount) || 0
      map[hsn].cgst += Number(l.cgst_amount) || 0
      map[hsn].sgst += Number(l.sgst_amount) || 0
    })
    return Object.entries(map).map(([hsn, v]) => ({ hsn, ...v }))
  }, [lines])

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const orig = document.title
    document.title = `Purchase_Bill_${invoice.invoice_number}`
    window.print()
    setTimeout(() => { document.title = orig }, 500)
  }

  const handleCopy = () => {
    const text =
      `PURCHASE BILL: ${invoice.invoice_number}\n` +
      `Vendor: ${invoice.supplier?.name || 'Unknown'}\n` +
      `Date: ${formatDate(invoice.date)}\n` +
      `Vendor Bill Ref: ${invoice.supplier_invoice_number || 'N/A'}\n` +
      `Total: ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
      `Payment Type: ${paymentType}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">

      {/* ── Print CSS (A4, zero margins, suppress browser headers) ── */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0mm !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden !important; }
          #printable-purchase-bill, #printable-purchase-bill * { visibility: visible !important; }
          #printable-purchase-bill {
            position: absolute !important; left: 7mm !important; top: 7mm !important;
            right: 7mm !important; width: calc(100% - 14mm) !important;
            max-width: calc(100% - 14mm) !important;
            height: calc(297mm - 14mm) !important; min-height: calc(297mm - 14mm) !important;
            margin: 0 !important; padding: 0 !important; border: 2px solid #000 !important;
            box-shadow: none !important; background: #fff !important; color: #000 !important;
            box-sizing: border-box !important; display: flex !important; flex-direction: column !important;
            justify-content: space-between !important; page-break-inside: avoid !important;
          }
          #printable-purchase-bill table { border-collapse: collapse !important; width: 100% !important; }
          #printable-purchase-bill th, #printable-purchase-bill td { border-color: #000 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Modal Shell ── */}
      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full h-[94vh] flex flex-col border border-outline-variant overflow-hidden">

        {/* Top Nav Bar */}
        <div className="px-5 py-3 bg-surface border-b border-outline-variant flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-on-surface">Purchase Bill Preview</h3>
            <span className="text-xs font-mono bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md">
              {invoice.invoice_number}
            </span>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFitToScreen(!fitToScreen)}
              title={fitToScreen ? 'Show full size' : 'Fit entire page in view'}
              className="px-2.5 py-1 text-xs font-medium text-outline hover:text-on-surface hover:bg-surface-container rounded-lg border border-outline-variant flex items-center gap-1 transition-colors"
            >
              {fitToScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span>{fitToScreen ? 'Actual Size' : 'Fit Page'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Optional metadata customiser */}
        <div className="bg-surface border-b border-outline-variant px-5 py-2 text-xs shrink-0 no-print">
          <button
            type="button"
            onClick={() => setShowMetaFields(!showMetaFields)}
            className="flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <span>Customize Dispatch Details (Vehicle, Challan, PO Ref)</span>
            {showMetaFields ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showMetaFields && (
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-outline-variant/60">
              {[
                { label: 'Vehicle No.', value: vehicleNo, set: setVehicleNo, placeholder: 'e.g. WB25F8077' },
                { label: 'Vendor Challan No.', value: challanNo, set: setChallanNo, placeholder: 'Challan number' },
                { label: 'PO Reference', value: poRef, set: setPoRef, placeholder: 'Purchase Order no.' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[10px] uppercase text-outline font-semibold">{f.label}</label>
                  <input
                    type="text"
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full mt-0.5 px-2 py-1 text-xs border border-outline-variant rounded bg-background font-mono"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Scrollable Paper Area ── */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-5 bg-slate-200/80 flex justify-center items-start">
          <div
            id="printable-purchase-bill"
            className={`bg-white text-black w-full max-w-[760px] min-h-[980px] shadow-2xl border-2 border-black text-[10px] leading-tight font-sans box-border flex flex-col justify-between transition-transform origin-top ${
              fitToScreen ? 'scale-[0.78] sm:scale-[0.82] -mb-40' : ''
            }`}
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {/* ── Top Section ── */}
            <div className="flex-1 flex flex-col">

              {/* 1. Title Bar */}
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-black bg-white shrink-0">
                <div className="w-28"></div>
                <h1 className="text-base font-black tracking-widest text-center uppercase flex-1 text-black">
                  PURCHASE VOUCHER
                </h1>
                <div className="w-48 text-right font-bold text-[9.5px] uppercase tracking-wider text-black">
                  ORIGINAL
                </div>
              </div>

              {/* 2. Header Grid: Company (left) + Bill Info (right) */}
              <div className="grid grid-cols-12 border-b border-black shrink-0">
                {/* Left: Company Details */}
                <div className="col-span-7 p-2.5 flex items-start gap-3 border-r border-black">
                  <div className="shrink-0 w-20 flex flex-col items-center justify-start pt-1">
                    <img
                      src="/logo.png"
                      alt="DD ENTERPRISE"
                      className="w-20 h-auto object-contain"
                      onError={e => { (e.target as HTMLElement).style.display = 'none' }}
                    />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <h2 className="text-xs font-black tracking-wider uppercase text-black leading-none mb-0.5">
                      D. D. ENTERPRISE
                    </h2>
                    <p className="text-[9px] text-black leading-tight">
                      Khelia, Arkhali, Amdanga, Beside NH-34 (12)<br />
                      North 24 Parganas, West Bengal - 743221
                    </p>
                    <p className="font-bold text-[9.5px] text-black pt-0.5">
                      GSTIN : <span className="font-mono">19AFDPD4677G1ZD</span>
                    </p>
                    <p className="text-[8.5px]">
                      <span className="font-semibold">Name:</span> TAPAN DEY ·{' '}
                      <span className="font-semibold">Phone:</span> 9433393977
                    </p>
                    <p className="text-[8.5px]">
                      <span className="font-semibold">Email:</span> info@ddenterprisepaverblock.co.in
                    </p>
                  </div>
                </div>

                {/* Right: Invoice Meta */}
                <div className="col-span-5 flex flex-col justify-between">
                  <div className="grid grid-cols-2 border-b border-black">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Voucher No.</span>
                      <strong className="text-xs font-black">{invoice.invoice_number}</strong>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Date</span>
                      <span className="font-bold text-xs">{formatDate(invoice.date)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 border-b border-black">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Due Date</span>
                      <span className="font-bold text-xs">{invoice.due_date ? formatDate(invoice.due_date) : '—'}</span>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Payment</span>
                      <span className="font-bold text-xs uppercase">{paymentType}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Vehicle No.</span>
                      <strong className="text-xs font-black font-mono">{vehicleNo || '—'}</strong>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Challan No.</span>
                      <span className="font-bold text-xs font-mono">{challanNo || invoice.supplier_invoice_number || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Vendor Detail Box */}
              <div className="p-2.5 border-b border-black space-y-0.5 shrink-0">
                <span className="text-[8.5px] font-bold uppercase text-black/70 tracking-wider">Vendor Detail</span>
                <h3 className="text-xs font-black uppercase text-black">
                  {invoice.supplier?.name || 'UNKNOWN VENDOR'}
                </h3>
                <p className="text-[9px] text-black">
                  {invoice.supplier?.address ? `${invoice.supplier.address}, ` : ''}
                  {invoice.supplier?.city || ''}{invoice.supplier?.state ? `, ${invoice.supplier.state}` : ''}
                </p>
                <div className="flex flex-wrap gap-4 text-[9px] pt-0.5">
                  <p><span className="font-semibold">Phone :</span> {invoice.supplier?.phone || '—'}</p>
                  <p><span className="font-semibold">Place of Supply :</span> {placeOfSupply}</p>
                  {invoice.supplier?.gstin && (
                    <p><span className="font-semibold">GSTIN :</span> {invoice.supplier.gstin}</p>
                  )}
                  {poRef && (
                    <p><span className="font-semibold">PO Ref :</span> {poRef}</p>
                  )}
                </div>
              </div>

              {/* 4. Items Table (with continuous vertical lines & spacer rows) */}
              <div className="border-b border-black flex-1 flex flex-col">
                <table className="w-full text-left text-[9.5px] border-collapse h-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="border-b border-black font-bold uppercase text-center text-[8.5px] bg-slate-50">
                      <th className="py-1.5 px-1 border-r border-black w-7 text-center">No.</th>
                      <th className="py-1.5 px-2 border-r border-black text-left">Item / Description</th>
                      <th className="py-1.5 px-1 border-r border-black w-14 text-center">HSN Code</th>
                      <th className="py-1.5 px-1 border-r border-black w-14 text-right">Qty</th>
                      <th className="py-1.5 px-1 border-r border-black w-10 text-center">UOM</th>
                      <th className="py-1.5 px-2 border-r border-black w-16 text-right">Rate (₹)</th>
                      <th className="py-1.5 px-2 w-24 text-right">Taxable Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Item rows */}
                    {lines.map((line, idx) => (
                      <tr key={line.id} className="align-top border-b border-black/30">
                        <td className="py-1.5 px-1 border-r border-black text-center font-mono">{idx + 1}</td>
                        <td className="py-1.5 px-2 border-r border-black font-semibold text-black">
                          {line.item?.name || 'Raw Material'}
                          {line.item?.sku && (
                            <span className="block text-[8.5px] italic font-normal text-black/70">
                              SKU: {line.item.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-1 border-r border-black text-center font-mono text-[9px]">
                          {line.item?.hsn_code || 'N/A'}
                        </td>
                        <td className="py-1.5 px-1 border-r border-black text-right font-bold font-mono">{line.qty}</td>
                        <td className="py-1.5 px-1 border-r border-black text-center uppercase font-medium">
                          {line.item?.unit?.symbol || 'PCS'}
                        </td>
                        <td className="py-1.5 px-2 border-r border-black text-right font-mono">
                          {Number(line.rate).toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold">
                          {Number(line.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}

                    {/* Spacer rows to fill page */}
                    {Array.from({ length: spacerCount }).map((_, i) => (
                      <tr key={`sp-${i}`} className="h-8 border-b border-black/15">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td></td>
                      </tr>
                    ))}

                    {/* Subtotal */}
                    <tr className="border-t border-black">
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="py-1 px-2 border-r border-black text-right text-black font-semibold">Subtotal</td>
                      <td className="py-1 px-2 text-right font-mono font-bold">
                        {totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* CGST row */}
                    {cgstTotal > 0 && (
                      <tr className="border-t border-black">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="py-1 px-2 border-r border-black text-right text-black">CGST</td>
                        <td className="py-1 px-2 text-right font-mono">{cgstTotal.toFixed(2)}</td>
                      </tr>
                    )}

                    {/* SGST row */}
                    {sgstTotal > 0 && (
                      <tr className="border-t border-black">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="py-1 px-2 border-r border-black text-right text-black">SGST</td>
                        <td className="py-1 px-2 text-right font-mono">{sgstTotal.toFixed(2)}</td>
                      </tr>
                    )}

                    {/* Grand Total row */}
                    <tr className="border-t-2 border-black font-bold text-[11px] bg-slate-50">
                      <td colSpan={3} className="py-1.5 px-3 text-right uppercase tracking-wider border-r border-black">TOTAL</td>
                      <td className="py-1.5 px-1 text-right font-mono border-r border-black">{totalQty}</td>
                      <td className="border-r border-black"></td>
                      <td colSpan={2} className="py-1.5 px-2 text-right font-mono font-black text-sm">
                        ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Bottom Section ── */}
            <div className="shrink-0">

              {/* 5. Amount in Words */}
              <div className="p-2 border-b border-black bg-white">
                <div className="flex justify-between items-center text-[8px] text-black/70 uppercase font-semibold">
                  <span>TOTAL IN WORDS</span>
                  <span>(E &amp; O.E.)</span>
                </div>
                <p className="font-black text-[9.5px] tracking-wide uppercase mt-0.5">
                  {amountInWords(grandTotal)}
                </p>
              </div>

              {/* 6. HSN Tax Summary Table */}
              <div className="border-b border-black bg-white">
                <table className="w-full text-[8.5px] border-collapse text-center" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="border-b border-black font-bold uppercase bg-slate-50">
                      <th rowSpan={2} className="py-1 px-1 border-r border-black w-24">HSN CODE</th>
                      <th rowSpan={2} className="py-1 px-2 border-r border-black text-right w-24">TAXABLE VALUE</th>
                      <th colSpan={2} className="py-0.5 px-1 border-r border-black">CGST</th>
                      <th colSpan={2} className="py-0.5 px-1 border-r border-black">SGST</th>
                      <th rowSpan={2} className="py-1 px-2 text-right w-24">TOTAL TAX</th>
                    </tr>
                    <tr className="border-b border-black font-semibold text-[8px]">
                      <th className="py-0.5 px-1 border-r border-black w-10">%</th>
                      <th className="py-0.5 px-1 border-r border-black text-right w-16">Amount</th>
                      <th className="py-0.5 px-1 border-r border-black w-10">%</th>
                      <th className="py-0.5 px-1 border-r border-black text-right w-16">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hsnGroups.map(g => (
                      <tr key={g.hsn} className="border-b border-black">
                        <td className="py-1 px-1 border-r border-black font-mono">{g.hsn}</td>
                        <td className="py-1 px-2 border-r border-black text-right font-mono">
                          {g.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-1 border-r border-black">{g.cgst > 0 ? `${g.rate / 2}%` : '0%'}</td>
                        <td className="py-1 px-1 border-r border-black text-right font-mono">{g.cgst.toFixed(2)}</td>
                        <td className="py-1 px-1 border-r border-black">{g.sgst > 0 ? `${g.rate / 2}%` : '0%'}</td>
                        <td className="py-1 px-1 border-r border-black text-right font-mono">{g.sgst.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right font-mono font-semibold">
                          {(g.cgst + g.sgst).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-1 px-1 border-r border-black uppercase text-right">TOTAL</td>
                      <td className="py-1 px-2 border-r border-black text-right font-mono">
                        {totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border-r border-black"></td>
                      <td className="py-1 px-1 border-r border-black text-right font-mono">{cgstTotal.toFixed(2)}</td>
                      <td className="border-r border-black"></td>
                      <td className="py-1 px-1 border-r border-black text-right font-mono">{sgstTotal.toFixed(2)}</td>
                      <td className="py-1 px-2 text-right font-mono font-bold">{totalTax.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="px-2 py-1 border-t border-black text-[8.5px] bg-white">
                  <span className="font-semibold text-black/70">Total Tax in words: </span>
                  <strong className="uppercase">
                    {totalTax > 0 ? amountInWords(totalTax) : 'ZERO RUPEES ONLY'}
                  </strong>
                </div>
              </div>

              {/* 7. Terms & Signatures */}
              <div className="grid grid-cols-12 bg-white min-h-[140px]">
                <div className="col-span-7 p-2.5 space-y-1 border-r border-black text-[8px] leading-snug flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-[8.5px] uppercase">TERMS AND CONDITIONS :- D. D. ENTERPRISE</p>
                    {termsDetail ? (
                      <p className="text-black/90 whitespace-pre-line mt-0.5">{termsDetail}</p>
                    ) : (
                      <ol className="list-decimal pl-3 space-y-0.5 text-black/90">
                        <li>Goods received subject to weighbridge and quality check.</li>
                        <li>Payment terms: 30 days credit from invoice date.</li>
                        <li>Disputes subject to local jurisdiction only.</li>
                        <li>This is a computer-generated document.</li>
                      </ol>
                    )}
                    {displayNotes && (
                      <p className="mt-1 text-black/80"><span className="font-semibold">Remarks: </span>{displayNotes}</p>
                    )}
                  </div>
                  <div className="pt-2">
                    <p className="font-bold text-[8px] uppercase text-black">
                      D. D. ENTERPRISE — Paver Block, Chequered Tile &amp; Roof Tile
                    </p>
                  </div>
                </div>

                <div className="col-span-5 p-2.5 flex flex-col justify-between text-right">
                  <span className="text-[7.5px] text-black/60">(E &amp; O.E.)</span>
                  <div>
                    <div className="pt-12 pb-1">
                      <p className="font-bold text-[9px] uppercase tracking-wider text-black border-t border-black pt-1">
                        Receiver's Verification &amp; Gate Stamp
                      </p>
                    </div>
                    <div className="pt-10 pb-1 mt-2 border-t border-black">
                      <p className="font-bold text-[9px] uppercase tracking-wider text-black pt-1">
                        AUTHORISED SIGNATORY
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Controls Bar ── */}
        <div className="px-6 py-3 bg-surface border-t border-outline-variant flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="text-xs text-outline font-medium">
            Purchase Voucher · {invoice.invoice_number}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-5 py-2 border border-outline-variant text-on-surface font-semibold text-xs rounded-full hover:bg-surface-container transition-all"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-7 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
