import { useState, useMemo } from 'react'
import { Printer, Copy, Check, X, Maximize2, Minimize2 } from 'lucide-react'
import { formatDate, amountInWords, formatCurrency } from '@/lib/formatters'
import { useCompany } from '@/contexts/CompanyContext'
import type { QuotationRecord } from '@/types/sales.types'

interface QuotationPrintModalProps {
  quotation: QuotationRecord
  onClose: () => void
}

export function QuotationPrintModal({ quotation, onClose }: QuotationPrintModalProps) {
  const { company } = useCompany()
  const [copied, setCopied] = useState(false)
  const [fitToScreen, setFitToScreen] = useState(false)

  const lines = quotation.lines || []
  const totalQty = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) || 0), 0), [lines])
  const taxableTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.taxable_amount) || 0), 0), [lines])
  const cgstTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.cgst_amount) || 0), 0), [lines])
  const sgstTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.sgst_amount) || 0), 0), [lines])
  const grandTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.total_amount) || 0), 0), [lines])

  const hsnGroups = useMemo(() => {
    const map: Record<string, { taxable: number; cgst: number; sgst: number; rate: number }> = {}
    lines.forEach(l => {
      const hsn = l.hsn_code || '6810'
      const rate = Number(l.gst_rate) || 18
      if (!map[hsn]) map[hsn] = { taxable: 0, cgst: 0, sgst: 0, rate }
      map[hsn].taxable += Number(l.taxable_amount) || 0
      map[hsn].cgst += Number(l.cgst_amount) || 0
      map[hsn].sgst += Number(l.sgst_amount) || 0
    })
    return Object.entries(map).map(([hsn, v]) => ({ hsn, ...v }))
  }, [lines])

  const handlePrint = () => {
    const orig = document.title
    document.title = `Quotation_${quotation.quote_number}`
    window.print()
    setTimeout(() => { document.title = orig }, 500)
  }

  const handleCopy = () => {
    const text =
      `PRICE QUOTATION: ${quotation.quote_number}\n` +
      `Client: ${quotation.customer_name}\n` +
      `Project: ${quotation.project_name || 'General Supply'}\n` +
      `Date: ${formatDate(quotation.date)} (Valid Until: ${formatDate(quotation.valid_until)})\n` +
      `Total Qty: ${totalQty} Sq.Ft / Pcs\n` +
      `Total Quote: ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
      `Freight: ${quotation.freight_terms}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0mm !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden !important; }
          #printable-quotation, #printable-quotation * { visibility: visible !important; }
          #printable-quotation {
            position: absolute !important; left: 7mm !important; top: 7mm !important;
            right: 7mm !important; width: calc(100% - 14mm) !important;
            max-width: calc(100% - 14mm) !important;
            height: calc(297mm - 14mm) !important; min-height: calc(297mm - 14mm) !important;
            margin: 0 !important; padding: 0 !important; border: 2px solid #000 !important;
            box-shadow: none !important; background: #fff !important; color: #000 !important;
            box-sizing: border-box !important; display: flex !important; flex-direction: column !important;
            justify-content: space-between !important; page-break-inside: avoid !important;
          }
          #printable-quotation table { border-collapse: collapse !important; width: 100% !important; }
          #printable-quotation th, #printable-quotation td { border-color: #000 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full h-[94vh] flex flex-col border border-outline-variant overflow-hidden">
        {/* Top Controls */}
        <div className="px-5 py-3 bg-surface border-b border-outline-variant flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-on-surface">Price Quotation Proposal</h3>
            <span className="text-xs font-mono bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md">
              {quotation.quote_number}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase bg-primary/10 text-primary">
              {quotation.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFitToScreen(v => !v)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg border border-outline-variant transition-colors"
            >
              {fitToScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span>{fitToScreen ? 'Actual Size' : 'Fit View'}</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg border border-outline-variant transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-primary text-white font-medium rounded-lg shadow-xs hover:bg-primary/90 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-5 bg-slate-200/80 dark:bg-slate-950 flex justify-center items-start">
          <div
            id="printable-quotation"
            className={`bg-white text-black w-full max-w-[760px] min-h-[980px] shadow-2xl border-2 border-black text-[10px] leading-tight font-sans box-border flex flex-col justify-between transition-transform origin-top ${
              fitToScreen ? 'scale-[0.78] sm:scale-[0.82] -mb-40' : ''
            }`}
          >
            <div className="flex-1 flex flex-col">
              {/* 1. Header Banner */}
              <div className="border-b-2 border-black p-2 bg-slate-50 flex justify-between items-center shrink-0">
                <div className="w-48 text-[9px] font-bold text-black uppercase tracking-wider">
                  COMMERCIAL PRICE ESTIMATE
                </div>
                <h1 className="text-base sm:text-lg font-black tracking-widest uppercase text-center flex-1">
                  PRICE QUOTATION
                </h1>
                <div className="w-48 text-right font-bold text-[9.5px] uppercase tracking-wider text-black">
                  VALID FOR {formatDate(quotation.valid_until)}
                </div>
              </div>

              {/* 2. Company Info (Left) & Quotation Meta (Right) */}
              <div className="grid grid-cols-12 border-b border-black shrink-0">
                <div className="col-span-7 p-2.5 flex items-start gap-3 border-r border-black">
                  <div className="shrink-0 w-20 flex flex-col items-center justify-start pt-1">
                    <img
                      src={company.logo_url || '/logo.png'}
                      alt={company.name}
                      className="w-20 h-auto object-contain"
                      onError={e => { (e.target as HTMLElement).style.display = 'none' }}
                    />
                    {company.tagline && (
                      <span className="text-[6.5px] text-center font-bold tracking-tighter text-blue-900 mt-1 uppercase leading-tight">
                        {company.tagline}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <h2 className="text-xs font-black tracking-wider uppercase text-black leading-none mb-0.5">
                      {company.name}
                    </h2>
                    <p className="text-[9px] text-black leading-tight">
                      {company.address}<br />
                      {company.city}, {company.state} - {company.pincode}
                    </p>
                    <p className="font-bold text-[9.5px] text-black pt-0.5">
                      GSTIN : <span className="font-mono">{company.gstin}</span>
                    </p>
                    <p className="text-[8.5px]">
                      {company.udyam_reg && <><span className="font-semibold">UDYAM:</span> {company.udyam_reg} · </>}
                      {company.bis_license && <><span className="font-semibold">BIS Lic:</span> {company.bis_license}</>}
                    </p>
                    <p className="text-[8.5px]">
                      <span className="font-semibold">Sales Desk:</span> {company.phone} · {company.email}
                    </p>
                  </div>
                </div>

                <div className="col-span-5 flex flex-col justify-between">
                  <div className="grid grid-cols-2 border-b border-black">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Quote Ref No.</span>
                      <strong className="text-xs font-black">{quotation.quote_number}</strong>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Quote Date</span>
                      <span className="font-bold text-xs">{formatDate(quotation.date)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-b border-black">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Validity Period</span>
                      <span className="font-bold text-xs">{formatDate(quotation.valid_until)}</span>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Freight Basis</span>
                      <span className="font-bold text-xs">{quotation.freight_terms}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Laying Scope</span>
                      <span className="font-bold text-xs">{quotation.laying_terms}</span>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Unloading</span>
                      <span className="font-bold text-xs">{quotation.unloading_terms}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Client & Project Details */}
              <div className="grid grid-cols-12 border-b border-black shrink-0">
                <div className="col-span-7 p-2.5 border-r border-black">
                  <span className="text-[8.5px] text-black/70 block uppercase font-bold tracking-wider mb-0.5">
                    CLIENT / PROSPECTIVE BUYER:
                  </span>
                  <div className="text-xs font-black tracking-wide uppercase text-black">
                    {quotation.customer_name}
                  </div>
                  <div className="text-[9px] text-black leading-tight mt-0.5">
                    {quotation.site_address || 'Site Delivery Location as requested'}
                  </div>
                  <div className="font-bold text-[9px] text-black mt-1">
                    GSTIN : <span className="font-mono">{quotation.customer_gstin || 'UNREGISTERED / INDIVIDUAL'}</span>
                  </div>
                  {quotation.customer_phone && (
                    <div className="text-[8.5px] text-black mt-0.5">
                      Contact: {quotation.customer_phone} {quotation.customer_email && `· ${quotation.customer_email}`}
                    </div>
                  )}
                </div>

                <div className="col-span-5 p-2.5 flex flex-col justify-between">
                  <div>
                    <span className="text-[8.5px] text-black/70 block uppercase font-bold tracking-wider mb-0.5">
                      PROJECT / SITE REFERENCE:
                    </span>
                    <strong className="text-[10px] uppercase block font-black">
                      {quotation.project_name || 'General Construction Paving'}
                    </strong>
                    <div className="text-[8.5px] text-black mt-1">
                      Payment Terms: <span className="font-semibold">{quotation.payment_terms}</span>
                    </div>
                  </div>
                  <div className="text-[8px] text-black/70 border-t border-black/40 pt-1 mt-1">
                    <span className="font-semibold">Plant Dispatch: </span>Beside NH-34, Amdanga Factory
                  </div>
                </div>
              </div>

              {/* 4. Table: Line Items */}
              <div className="flex-1 flex flex-col">
                <table className="w-full border-collapse border-b border-black text-[9px]">
                  <thead>
                    <tr className="border-b border-black bg-slate-100 font-bold text-black uppercase tracking-wider text-[8px]">
                      <th className="py-1 px-1 border-r border-black text-center w-7">#</th>
                      <th className="py-1 px-2 border-r border-black text-left">Description of Concrete Products</th>
                      <th className="py-1 px-1 border-r border-black text-center w-14">HSN</th>
                      <th className="py-1 px-2 border-r border-black text-right w-20">Quantity</th>
                      <th className="py-1 px-1 border-r border-black text-center w-12">Unit</th>
                      <th className="py-1 px-2 border-r border-black text-right w-20">Rate (₹)</th>
                      <th className="py-1 px-2 border-r border-black text-right w-24">Taxable (₹)</th>
                      <th className="py-1 px-1 border-r border-black text-center w-12">GST %</th>
                      <th className="py-1 px-2 text-right w-24">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={line.id || idx} className="border-b border-black/30">
                        <td className="py-1 px-1 border-r border-black text-center font-mono text-[8px]">{idx + 1}</td>
                        <td className="py-1 px-2 border-r border-black">
                          <span className="font-bold uppercase">{line.item_name}</span>
                          {line.remarks && (
                            <span className="text-black/60 block text-[7.5px] italic">{line.remarks}</span>
                          )}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-center font-mono text-[8px]">{line.hsn_code || '6810'}</td>
                        <td className="py-1 px-2 border-r border-black text-right font-mono font-bold">{line.qty}</td>
                        <td className="py-1 px-1 border-r border-black text-center uppercase text-[8px]">{line.item_unit}</td>
                        <td className="py-1 px-2 border-r border-black text-right font-mono">{Number(line.rate).toFixed(2)}</td>
                        <td className="py-1 px-2 border-r border-black text-right font-mono">{Number(line.taxable_amount).toFixed(2)}</td>
                        <td className="py-1 px-1 border-r border-black text-center font-mono text-[8px]">{line.gst_rate}%</td>
                        <td className="py-1 px-2 text-right font-mono font-bold">{Number(line.total_amount).toFixed(2)}</td>
                      </tr>
                    ))}

                    {/* Subtotal */}
                    <tr className="border-t border-black font-bold text-[9px] bg-slate-50">
                      <td colSpan={3} className="py-1 px-2 text-right border-r border-black uppercase text-[8px]">
                        Subtotal Taxable
                      </td>
                      <td className="py-1 px-2 text-right font-mono border-r border-black">{totalQty}</td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="py-1 px-2 text-right font-mono border-r border-black">
                        {taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border-r border-black"></td>
                      <td className="py-1 px-2 text-right font-mono font-bold">
                        {taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* Tax Breakdown */}
                    {cgstTotal > 0 && (
                      <tr className="border-t border-black/40 text-[8.5px]">
                        <td colSpan={7} className="py-0.5 px-2 text-right border-r border-black text-black/70">
                          Add: Central GST (CGST 9%)
                        </td>
                        <td className="border-r border-black"></td>
                        <td className="py-0.5 px-2 text-right font-mono">
                          {cgstTotal.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {sgstTotal > 0 && (
                      <tr className="border-t border-black/40 text-[8.5px]">
                        <td colSpan={7} className="py-0.5 px-2 text-right border-r border-black text-black/70">
                          Add: State GST (SGST 9%)
                        </td>
                        <td className="border-r border-black"></td>
                        <td className="py-0.5 px-2 text-right font-mono">
                          {sgstTotal.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {/* Grand Total */}
                    <tr className="border-t-2 border-black font-bold text-[10px] bg-slate-100">
                      <td colSpan={3} className="py-1.5 px-3 text-right uppercase tracking-wider border-r border-black">
                        TOTAL ESTIMATE (GST INCLUDED)
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono border-r border-black">
                        {totalQty}
                      </td>
                      <td className="border-r border-black"></td>
                      <td colSpan={3} className="border-r border-black text-right text-[8px] text-black/70 uppercase pr-2">
                        Gross Proposal Amount
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-black text-xs">
                        ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Container */}
            <div className="shrink-0">
              {/* Total in words */}
              <div className="p-2 border-b border-black bg-white">
                <div className="flex justify-between items-center text-[7.5px] text-black/70 uppercase font-semibold">
                  <span>TOTAL ESTIMATE IN WORDS</span>
                  <span>(E &amp; O.E.)</span>
                </div>
                <p className="font-black text-[9.5px] tracking-wide uppercase mt-0.5">
                  {amountInWords(grandTotal)}
                </p>
              </div>

              {/* Commercial Terms & Signatures */}
              <div className="grid grid-cols-12 bg-white min-h-[140px]">
                <div className="col-span-7 p-2.5 space-y-1 border-r border-black text-[8px] leading-snug flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-[8.5px] uppercase">COMMERCIAL TERMS &amp; CONDITIONS:</p>
                    <ol className="list-decimal pl-3 space-y-0.5 text-black/90">
                      <li>Paver blocks manufactured as per IS 15658 standards with vibro-hydraulic compaction.</li>
                      <li>Prices quoted are valid for 15 days from issue date.</li>
                      <li>Delivery schedule: Within 3 to 7 working days upon receipt of booking advance.</li>
                      <li>Breakage allowance up to 1.5% is standard during transit and handling.</li>
                      <li>{company.jurisdiction || 'Subject to home jurisdiction.'}</li>
                    </ol>
                    {quotation.notes && (
                      <p className="mt-1 text-black/80"><span className="font-semibold">Special Terms: </span>{quotation.notes}</p>
                    )}
                  </div>
                  <div className="pt-1">
                    <p className="font-bold text-[8px] uppercase text-black">
                      {company.name} — {company.trade_name || 'Paver Block & Concrete Products'}
                    </p>
                  </div>
                </div>

                <div className="col-span-5 p-2.5 flex flex-col justify-between text-right">
                  <div className="text-left text-[7.5px] text-black/70">
                    <span>Client Confirmation / Order Acceptance:</span>
                    <div className="mt-4 border-b border-black/40 pb-1">Signature &amp; Date: </div>
                  </div>
                  <div className="pt-6 pb-1">
                    <p className="font-bold text-[9px] uppercase tracking-wider text-black border-t border-black pt-1">
                      FOR {company.name}
                    </p>
                    <p className="text-[7.5px] text-black/70">AUTHORISED MARKETING / SALES SIGNATORY</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-surface border-t border-outline-variant flex items-center justify-between no-print">
          <span className="text-xs text-outline">
            Official commercial proposal ready to print, email, or share with prospective clients
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg border border-outline-variant transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  )
}
