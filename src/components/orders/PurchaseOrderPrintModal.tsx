import { useState, useMemo } from 'react'
import { Printer, Copy, Check, X, Maximize2, Minimize2 } from 'lucide-react'
import { formatDate, amountInWords } from '@/lib/formatters'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useCompany } from '@/contexts/CompanyContext'
import type { Supplier } from '@/types/database.types'

export interface POLine {
  id: string
  item_id: string
  item_name: string
  item_sku: string
  item_unit: string
  hsn_code?: string
  qty: number
  rate: number
  taxable_amount: number
  gst_rate: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  remarks?: string
}

export interface PurchaseOrderRecord {
  id: string
  po_number: string
  supplier_id: string
  supplier_name: string
  supplier?: Partial<Supplier>
  date: string
  expected_delivery_date: string
  payment_terms: string
  delivery_location: string
  delivery_mode: string
  notes?: string
  status: 'draft' | 'submitted' | 'approved' | 'posted' | 'cancelled'
  lines: POLine[]
  total_qty: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  created_at: string
}

interface PurchaseOrderPrintModalProps {
  order: PurchaseOrderRecord
  onClose: () => void
}

export function PurchaseOrderPrintModal({ order, onClose }: PurchaseOrderPrintModalProps) {
  const { company } = useCompany()
  const [copied, setCopied] = useState(false)
  const [fitToScreen, setFitToScreen] = useState(false)

  // Calculations
  const lines = order.lines || []
  const totalQty = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) || 0), 0), [lines])
  const taxableTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.taxable_amount) || 0), 0), [lines])
  const cgstTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.cgst_amount) || 0), 0), [lines])
  const sgstTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.sgst_amount) || 0), 0), [lines])
  const grandTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.total_amount) || 0), 0), [lines])

  // Group by HSN
  const hsnGroups = useMemo(() => {
    const map: Record<string, { taxable: number; cgst: number; sgst: number; rate: number }> = {}
    lines.forEach(l => {
      const hsn = l.hsn_code || 'N/A'
      const rate = Number(l.gst_rate) || 0
      if (!map[hsn]) map[hsn] = { taxable: 0, cgst: 0, sgst: 0, rate }
      map[hsn].taxable += Number(l.taxable_amount) || 0
      map[hsn].cgst += Number(l.cgst_amount) || 0
      map[hsn].sgst += Number(l.sgst_amount) || 0
    })
    return Object.entries(map).map(([hsn, v]) => ({ hsn, ...v }))
  }, [lines])

  const handlePrint = () => {
    const orig = document.title
    document.title = `Purchase_Order_${order.po_number}`
    window.print()
    setTimeout(() => { document.title = orig }, 500)
  }

  const handleCopy = () => {
    const text =
      `PURCHASE ORDER: ${order.po_number}\n` +
      `Vendor: ${order.supplier_name}\n` +
      `Date: ${formatDate(order.date)}\n` +
      `Delivery Date: ${formatDate(order.expected_delivery_date)}\n` +
      `Total Qty: ${totalQty}\n` +
      `Total Value: ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
      `Delivery Site: ${order.delivery_location}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      {/* Print CSS (A4 portrait, crisp borders, exact colors) */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0mm !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden !important; }
          #printable-purchase-order, #printable-purchase-order * { visibility: visible !important; }
          #printable-purchase-order {
            position: absolute !important; left: 7mm !important; top: 7mm !important;
            right: 7mm !important; width: calc(100% - 14mm) !important;
            max-width: calc(100% - 14mm) !important;
            height: calc(297mm - 14mm) !important; min-height: calc(297mm - 14mm) !important;
            margin: 0 !important; padding: 0 !important; border: 2px solid #000 !important;
            box-shadow: none !important; background: #fff !important; color: #000 !important;
            box-sizing: border-box !important; display: flex !important; flex-direction: column !important;
            justify-content: space-between !important; page-break-inside: avoid !important;
          }
          #printable-purchase-order table { border-collapse: collapse !important; width: 100% !important; }
          #printable-purchase-order th, #printable-purchase-order td { border-color: #000 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Modal Shell */}
      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full h-[94vh] flex flex-col border border-outline-variant overflow-hidden">
        {/* Top Controls Bar */}
        <div className="px-5 py-3 bg-surface border-b border-outline-variant flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-on-surface">Purchase Order Document</h3>
            <span className="text-xs font-mono bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md">
              {order.po_number}
            </span>
            <StatusBadge status={order.status} />
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
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
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

        {/* Scrollable Printable Paper Container */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-5 bg-slate-200/80 dark:bg-slate-950 flex justify-center items-start">
          <div
            id="printable-purchase-order"
            className={`bg-white text-black w-full max-w-[760px] min-h-[980px] shadow-2xl border-2 border-black text-[10px] leading-tight font-sans box-border flex flex-col justify-between transition-transform origin-top ${
              fitToScreen ? 'scale-[0.78] sm:scale-[0.82] -mb-40' : ''
            }`}
          >
            {/* Top Container */}
            <div className="flex-1 flex flex-col">
              {/* 1. Header Banner */}
              <div className="border-b-2 border-black p-2 bg-slate-50 flex justify-between items-center shrink-0">
                <div className="w-48 text-[9px] font-bold text-black uppercase tracking-wider">
                  OFFICIAL RAW MATERIAL ORDER
                </div>
                <h1 className="text-base sm:text-lg font-black tracking-widest uppercase text-center flex-1">
                  PURCHASE ORDER
                </h1>
                <div className="w-48 text-right font-bold text-[9.5px] uppercase tracking-wider text-black">
                  ORIGINAL FOR SUPPLIER
                </div>
              </div>

              {/* 2. Header Grid: Company (Left) & Order Details (Right) */}
              <div className="grid grid-cols-12 border-b border-black shrink-0">
                {/* Left: Company Details */}
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
                      {company.contact_person && <><span className="font-semibold">Name:</span> {company.contact_person} · </>}
                      <span className="font-semibold">Phone:</span> {company.phone}
                    </p>
                    <p className="text-[8.5px]">
                      <span className="font-semibold">Email:</span> {company.email}
                    </p>
                  </div>
                </div>

                {/* Right: PO Meta */}
                <div className="col-span-5 flex flex-col justify-between">
                  <div className="grid grid-cols-2 border-b border-black">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">PO Number</span>
                      <strong className="text-xs font-black">{order.po_number}</strong>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">PO Date</span>
                      <span className="font-bold text-xs">{formatDate(order.date)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-b border-black">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Delivery By</span>
                      <span className="font-bold text-xs">{formatDate(order.expected_delivery_date)}</span>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Payment Terms</span>
                      <span className="font-bold text-xs">{order.payment_terms || 'As Agreed'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Delivery Mode</span>
                      <span className="font-bold text-xs">{order.delivery_mode || 'Supplier Arranged'}</span>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Financial Year</span>
                      <span className="font-bold text-xs font-mono">{company.active_fy}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Vendor (Supplier) & Delivery Address Section */}
              <div className="grid grid-cols-12 border-b border-black shrink-0">
                {/* Vendor Details */}
                <div className="col-span-7 p-2.5 border-r border-black">
                  <span className="text-[8.5px] text-black/70 block uppercase font-bold tracking-wider mb-0.5">
                    VENDOR / SUPPLIER (DETAILS):
                  </span>
                  <div className="text-xs font-black tracking-wide uppercase text-black">
                    {order.supplier_name}
                  </div>
                  <div className="text-[9px] text-black leading-tight mt-0.5">
                    {order.supplier?.address || 'Vendor Plant / Office Address'}, {order.supplier?.city || ''} {order.supplier?.state || ''}
                  </div>
                  <div className="font-bold text-[9px] text-black mt-1">
                    GSTIN : <span className="font-mono">{order.supplier?.gstin || 'UNREGISTERED'}</span>
                  </div>
                  {order.supplier?.phone && (
                    <div className="text-[8.5px] text-black mt-0.5">
                      Phone: {order.supplier.phone}
                    </div>
                  )}
                </div>

                {/* Delivery Site Address */}
                <div className="col-span-5 p-2.5 flex flex-col justify-between">
                  <div>
                    <span className="text-[8.5px] text-black/70 block uppercase font-bold tracking-wider mb-0.5">
                      DISPATCH &amp; DELIVERY TO:
                    </span>
                    <strong className="text-[10px] uppercase block font-black">
                      {company.name} (PLANT SITE)
                    </strong>
                    <p className="text-[8.5px] leading-tight text-black mt-0.5">
                      {order.delivery_location || company.address}
                    </p>
                  </div>
                  <div className="text-[8px] text-black/70 border-t border-black/40 pt-1 mt-1">
                    <span className="font-semibold">Gate Entry Hours: </span>07:00 AM – 06:00 PM
                  </div>
                </div>
              </div>

              {/* 4. Table: Line Items */}
              <div className="flex-1 flex flex-col">
                <table className="w-full border-collapse border-b border-black text-[9px]">
                  <thead>
                    <tr className="border-b border-black bg-slate-100 font-bold text-black uppercase tracking-wider text-[8px]">
                      <th className="py-1 px-1 border-r border-black text-center w-7">#</th>
                      <th className="py-1 px-2 border-r border-black text-left">Description of Goods</th>
                      <th className="py-1 px-1 border-r border-black text-center w-14">HSN</th>
                      <th className="py-1 px-1 border-r border-black text-right w-14">Qty</th>
                      <th className="py-1 px-1 border-r border-black text-center w-10">Unit</th>
                      <th className="py-1 px-1.5 border-r border-black text-right w-16">Rate (₹)</th>
                      <th className="py-1 px-1.5 border-r border-black text-right w-18">Taxable (₹)</th>
                      <th className="py-1 px-1 border-r border-black text-center w-12">GST %</th>
                      <th className="py-1 px-2 text-right w-20">Amount (₹)</th>
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
                        <td className="py-1 px-1 border-r border-black text-center font-mono text-[8px]">{line.hsn_code || '—'}</td>
                        <td className="py-1 px-1 border-r border-black text-right font-mono font-bold">{line.qty}</td>
                        <td className="py-1 px-1 border-r border-black text-center uppercase text-[8px]">{line.item_unit}</td>
                        <td className="py-1 px-1.5 border-r border-black text-right font-mono">{Number(line.rate).toFixed(2)}</td>
                        <td className="py-1 px-1.5 border-r border-black text-right font-mono">{Number(line.taxable_amount).toFixed(2)}</td>
                        <td className="py-1 px-1 border-r border-black text-center font-mono text-[8px]">{line.gst_rate}%</td>
                        <td className="py-1 px-2 text-right font-mono font-bold">{Number(line.total_amount).toFixed(2)}</td>
                      </tr>
                    ))}

                    {/* Subtotal row */}
                    <tr className="border-t border-black font-bold text-[9px] bg-slate-50">
                      <td colSpan={3} className="py-1 px-2 text-right border-r border-black uppercase text-[8px]">
                        Subtotal Taxable
                      </td>
                      <td className="py-1 px-1 text-right font-mono border-r border-black">{totalQty}</td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="py-1 px-1.5 text-right font-mono border-r border-black">
                        {taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border-r border-black"></td>
                      <td className="py-1 px-2 text-right font-mono font-bold">
                        {taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* CGST */}
                    {cgstTotal > 0 && (
                      <tr className="border-t border-black/40 text-[8.5px]">
                        <td colSpan={7} className="py-0.5 px-2 text-right border-r border-black text-black/70">
                          Add: CGST Output / Input Tax
                        </td>
                        <td className="border-r border-black"></td>
                        <td className="py-0.5 px-2 text-right font-mono">
                          {cgstTotal.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {/* SGST */}
                    {sgstTotal > 0 && (
                      <tr className="border-t border-black/40 text-[8.5px]">
                        <td colSpan={7} className="py-0.5 px-2 text-right border-r border-black text-black/70">
                          Add: SGST Output / Input Tax
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
                        TOTAL ORDER VALUE
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono border-r border-black">
                        {totalQty}
                      </td>
                      <td className="border-r border-black"></td>
                      <td colSpan={3} className="border-r border-black text-right text-[8px] text-black/70 uppercase pr-2">
                        Round Off &amp; Taxes Included
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
              {/* 5. Total in Words */}
              <div className="p-2 border-b border-black bg-white">
                <div className="flex justify-between items-center text-[7.5px] text-black/70 uppercase font-semibold">
                  <span>TOTAL ORDER VALUE IN WORDS</span>
                  <span>(E &amp; O.E.)</span>
                </div>
                <p className="font-black text-[9.5px] tracking-wide uppercase mt-0.5">
                  {amountInWords(grandTotal)}
                </p>
              </div>

              {/* 6. HSN Summary */}
              {hsnGroups.length > 0 && (
                <div className="border-b border-black bg-white">
                  <table className="w-full border-collapse text-[8px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-black font-semibold text-black/80 uppercase">
                        <th className="py-0.5 px-1 border-r border-black text-left">HSN/SAC</th>
                        <th className="py-0.5 px-2 border-r border-black text-right">Taxable Value</th>
                        <th className="py-0.5 px-1 border-r border-black text-right">CGST</th>
                        <th className="py-0.5 px-1 border-r border-black text-right">SGST</th>
                        <th className="py-0.5 px-2 text-right">Total Tax Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hsnGroups.map(g => (
                        <tr key={g.hsn} className="border-b border-black/20">
                          <td className="py-0.5 px-1 border-r border-black font-mono">{g.hsn}</td>
                          <td className="py-0.5 px-2 border-r border-black text-right font-mono">{g.taxable.toFixed(2)}</td>
                          <td className="py-0.5 px-1 border-r border-black text-right font-mono">{g.cgst.toFixed(2)}</td>
                          <td className="py-0.5 px-1 border-r border-black text-right font-mono">{g.sgst.toFixed(2)}</td>
                          <td className="py-0.5 px-2 text-right font-mono">{(g.cgst + g.sgst).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 7. Commercial Terms & Signatures */}
              <div className="grid grid-cols-12 bg-white min-h-[130px]">
                <div className="col-span-7 p-2.5 space-y-1 border-r border-black text-[8px] leading-snug flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-[8.5px] uppercase">INSTRUCTIONS &amp; TERMS FOR SUPPLIER</p>
                    <ol className="list-decimal pl-3 space-y-0.5 text-black/90">
                      <li>Deliveries must be accompanied by original Challan &amp; Weighbridge Slip.</li>
                      <li>Goods subject to plant gate inspection &amp; lab approval before unloading.</li>
                      <li>Substandard / moisture-damaged material will be rejected at vendor's cost.</li>
                      <li>Mention this PO Number on all dispatch bills and invoices.</li>
                      <li>{company.jurisdiction || 'Subject to home jurisdiction.'}</li>
                    </ol>
                    {order.notes && (
                      <p className="mt-1 text-black/80"><span className="font-semibold">Special Instructions: </span>{order.notes}</p>
                    )}
                  </div>
                  <div className="pt-1">
                    <p className="font-bold text-[8px] uppercase text-black">
                      {company.name} — {company.trade_name || 'Paver Block & Tile Factory'}
                    </p>
                  </div>
                </div>

                <div className="col-span-5 p-2.5 flex flex-col justify-between text-right">
                  <div className="text-left text-[7.5px] text-black/70">
                    <span>Accepted &amp; Confirmed by Vendor:</span>
                    <div className="mt-4 border-b border-black/40 pb-1">Sign / Stamp: </div>
                  </div>
                  <div className="pt-6 pb-1">
                    <p className="font-bold text-[9px] uppercase tracking-wider text-black border-t border-black pt-1">
                      FOR {company.name}
                    </p>
                    <p className="text-[7.5px] text-black/70">PURCHASE MANAGER / AUTHORISED SIGNATORY</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="px-6 py-3 bg-surface border-t border-outline-variant flex items-center justify-between no-print">
          <span className="text-xs text-outline">
            Press Print / PDF to save as official signed Purchase Order
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
