import { useState, useMemo } from 'react'
import { Printer, Copy, Check, X, Maximize2, Minimize2 } from 'lucide-react'
import { formatDate } from '@/lib/formatters'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useCompany } from '@/contexts/CompanyContext'
import type { DeliveryChallanRecord } from '@/types/transport.types'

interface DeliveryChallanPrintModalProps {
  challan: DeliveryChallanRecord
  onClose: () => void
}

type ChallanCopy =
  | 'ORIGINAL FOR CONSIGNEE'
  | 'DUPLICATE FOR TRANSPORTER'
  | 'TRIPLICATE FOR GATE SECURITY'
  | 'OFFICE COPY'

export function DeliveryChallanPrintModal({ challan, onClose }: DeliveryChallanPrintModalProps) {
  const { company } = useCompany()
  const [copyType, setCopyType] = useState<ChallanCopy>('ORIGINAL FOR CONSIGNEE')
  const [copied, setCopied] = useState(false)
  const [fitToScreen, setFitToScreen] = useState(false)

  const lines = challan.lines || []
  const totalQty = useMemo(() => lines.reduce((s, l) => s + (Number(l.dispatch_qty) || 0), 0), [lines])
  const totalWeight = useMemo(() => lines.reduce((s, l) => s + (Number(l.weight_mt) || 0), 0), [lines])

  const handlePrint = () => {
    const orig = document.title
    document.title = `Delivery_Challan_${challan.challan_number}`
    window.print()
    setTimeout(() => { document.title = orig }, 500)
  }

  const handleCopy = () => {
    const text =
      `DELIVERY CHALLAN: ${challan.challan_number}\n` +
      `Customer: ${challan.customer_name}\n` +
      `Site: ${challan.site_address}\n` +
      `Vehicle: ${challan.vehicle_number}\n` +
      `Date: ${formatDate(challan.date)}\n` +
      `Total Qty: ${totalQty}\n` +
      `E-Way: ${challan.eway_bill_number || 'N/A'}`
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
          #printable-challan, #printable-challan * { visibility: visible !important; }
          #printable-challan {
            position: absolute !important; left: 7mm !important; top: 7mm !important;
            right: 7mm !important; width: calc(100% - 14mm) !important;
            max-width: calc(100% - 14mm) !important;
            height: calc(297mm - 14mm) !important; min-height: calc(297mm - 14mm) !important;
            margin: 0 !important; padding: 0 !important; border: 2px solid #000 !important;
            box-shadow: none !important; background: #fff !important; color: #000 !important;
            box-sizing: border-box !important; display: flex !important; flex-direction: column !important;
            justify-content: space-between !important; page-break-inside: avoid !important;
          }
          #printable-challan table { border-collapse: collapse !important; width: 100% !important; }
          #printable-challan th, #printable-challan td { border-color: #000 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full h-[94vh] flex flex-col border border-outline-variant overflow-hidden">
        {/* Top Controls */}
        <div className="px-5 py-3 bg-surface border-b border-outline-variant flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-on-surface">Delivery Challan</h3>
            <span className="text-xs font-mono bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md">
              {challan.challan_number}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary">
              {challan.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={copyType}
              onChange={e => setCopyType(e.target.value as ChallanCopy)}
              className="px-2.5 py-1.5 text-xs border border-outline-variant rounded-lg bg-surface font-semibold text-on-surface"
            >
              <option value="ORIGINAL FOR CONSIGNEE">ORIGINAL FOR CONSIGNEE</option>
              <option value="DUPLICATE FOR TRANSPORTER">DUPLICATE FOR TRANSPORTER</option>
              <option value="TRIPLICATE FOR GATE SECURITY">TRIPLICATE FOR GATE SECURITY</option>
              <option value="OFFICE COPY">OFFICE COPY</option>
            </select>
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

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-5 bg-slate-200/80 dark:bg-slate-950 flex justify-center items-start">
          <div
            id="printable-challan"
            className={`bg-white text-black w-full max-w-[760px] min-h-[980px] shadow-2xl border-2 border-black text-[10px] leading-tight font-sans box-border flex flex-col justify-between transition-transform origin-top ${
              fitToScreen ? 'scale-[0.78] sm:scale-[0.82] -mb-40' : ''
            }`}
          >
            <div className="flex-1 flex flex-col">
              {/* 1. Header Banner */}
              <div className="border-b-2 border-black p-2 bg-slate-50 flex justify-between items-center shrink-0">
                <div className="w-48 text-[9px] font-bold text-black uppercase tracking-wider">
                  DISPATCH PASS &amp; LOAD SLIP
                </div>
                <h1 className="text-base sm:text-lg font-black tracking-widest uppercase text-center flex-1">
                  DELIVERY CHALLAN
                </h1>
                <div className="w-48 text-right font-bold text-[9.5px] uppercase tracking-wider text-black">
                  {copyType}
                </div>
              </div>

              {/* 2. Company Info (Left) & Challan Metadata (Right) */}
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
                      {company.contact_person && <><span className="font-semibold">Dispatch Incharge:</span> {company.contact_person} · </>}
                      <span className="font-semibold">Phone:</span> {company.phone}
                    </p>
                  </div>
                </div>

                <div className="col-span-5 flex flex-col justify-between">
                  <div className="grid grid-cols-2 border-b border-black">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Challan No.</span>
                      <strong className="text-xs font-black">{challan.challan_number}</strong>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Challan Date</span>
                      <span className="font-bold text-xs">{formatDate(challan.date)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-b border-black">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Vehicle No.</span>
                      <strong className="text-xs font-mono font-black">{challan.vehicle_number}</strong>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">L.R. / GR No.</span>
                      <span className="font-bold text-xs font-mono">{challan.lr_number || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">E-Way Bill No.</span>
                      <span className="font-bold text-xs font-mono">{challan.eway_bill_number || '—'}</span>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Invoice Ref</span>
                      <span className="font-bold text-xs font-mono">{challan.invoice_ref || 'PENDING'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Consignee / Delivery Address & Transporter Details */}
              <div className="grid grid-cols-12 border-b border-black shrink-0">
                <div className="col-span-7 p-2.5 border-r border-black">
                  <span className="text-[8.5px] text-black/70 block uppercase font-bold tracking-wider mb-0.5">
                    CONSIGNEE / DELIVER TO (BUYER):
                  </span>
                  <div className="text-xs font-black tracking-wide uppercase text-black">
                    {challan.customer_name}
                  </div>
                  <div className="text-[9px] text-black leading-tight mt-0.5">
                    {challan.site_address}
                  </div>
                  <div className="font-bold text-[9px] text-black mt-1">
                    GSTIN : <span className="font-mono">{challan.customer_gstin || 'UNREGISTERED'}</span>
                  </div>
                  {challan.customer_phone && (
                    <div className="text-[8.5px] text-black mt-0.5">
                      Site Contact: {challan.customer_phone}
                    </div>
                  )}
                </div>

                <div className="col-span-5 p-2.5 flex flex-col justify-between">
                  <div>
                    <span className="text-[8.5px] text-black/70 block uppercase font-bold tracking-wider mb-0.5">
                      TRANSPORT &amp; DRIVER:
                    </span>
                    <strong className="text-[10px] uppercase block font-black">
                      {challan.transporter_name || 'Direct Factory Logistics'}
                    </strong>
                    <div className="text-[9px] leading-tight text-black mt-0.5">
                      Driver: <span className="font-semibold">{challan.driver_name || 'Self / Company Driver'}</span>
                      {challan.driver_phone && <> ({challan.driver_phone})</>}
                    </div>
                  </div>
                  <div className="text-[8px] text-black/70 border-t border-black/40 pt-1 mt-1">
                    <span className="font-semibold">Dispatch Point: </span>Factory Gate, Amdanga NH-34
                  </div>
                </div>
              </div>

              {/* 4. Table: Line Items */}
              <div className="flex-1 flex flex-col">
                <table className="w-full border-collapse border-b border-black text-[9px]">
                  <thead>
                    <tr className="border-b border-black bg-slate-100 font-bold text-black uppercase tracking-wider text-[8px]">
                      <th className="py-1 px-1 border-r border-black text-center w-8">#</th>
                      <th className="py-1 px-2 border-r border-black text-left">Description of Concrete Products</th>
                      <th className="py-1 px-1 border-r border-black text-center w-14">HSN</th>
                      <th className="py-1 px-2 border-r border-black text-left w-28">Packaging / Load Type</th>
                      <th className="py-1 px-2 border-r border-black text-right w-20">Dispatch Qty</th>
                      <th className="py-1 px-1 border-r border-black text-center w-12">Unit</th>
                      <th className="py-1 px-2 border-r border-black text-right w-20">Weight (MT)</th>
                      <th className="py-1 px-2 text-left">Remarks / Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={line.id || idx} className="border-b border-black/30">
                        <td className="py-1 px-1 border-r border-black text-center font-mono text-[8px]">{idx + 1}</td>
                        <td className="py-1 px-2 border-r border-black font-bold uppercase">
                          {line.item_name}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-center font-mono text-[8px]">
                          {line.hsn_code || '6810'}
                        </td>
                        <td className="py-1 px-2 border-r border-black text-[8.5px]">
                          {line.packages || 'Standard Load'}
                        </td>
                        <td className="py-1 px-2 border-r border-black text-right font-mono font-black text-[10px]">
                          {line.dispatch_qty}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-center uppercase text-[8px]">
                          {line.item_unit}
                        </td>
                        <td className="py-1 px-2 border-r border-black text-right font-mono">
                          {line.weight_mt ? `${line.weight_mt} MT` : '—'}
                        </td>
                        <td className="py-1 px-2 text-[8px] text-black/80">
                          {line.remarks || 'Standard BIS M-35/M-40 grade'}
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr className="border-t-2 border-black font-bold text-[10px] bg-slate-100">
                      <td colSpan={4} className="py-1.5 px-3 text-right uppercase tracking-wider border-r border-black">
                        TOTAL DISPATCH QUANTITY
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-black text-xs border-r border-black">
                        {totalQty}
                      </td>
                      <td className="border-r border-black"></td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold border-r border-black">
                        {totalWeight > 0 ? `${totalWeight.toFixed(2)} MT` : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-[8.5px] uppercase font-bold text-slate-700">
                        Total {lines.length} Line Items
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: Terms & Signatures */}
            <div className="shrink-0">
              <div className="grid grid-cols-12 bg-white border-t border-black min-h-[140px]">
                <div className="col-span-6 p-2 space-y-1 border-r border-black text-[8px] leading-snug">
                  <p className="font-bold text-[8.5px] uppercase text-black">DECLARATIONS &amp; RECEIVER'S NOTE:</p>
                  <ol className="list-decimal pl-3 space-y-0.5 text-black/90">
                    <li>Certified that the particulars given above are true and correct.</li>
                    <li>Goods unloaded at site are subject to inspection and physical counting.</li>
                    <li>Breakage/damages during transit must be reported immediately on challan copy.</li>
                    <li>Unloading at customer site is under customer's supervision and liability.</li>
                  </ol>
                  {challan.notes && (
                    <p className="mt-1 text-black/80"><span className="font-semibold">Dispatch Note: </span>{challan.notes}</p>
                  )}
                  <div className="pt-2 text-black/70">
                    <span>Gate Out Time: ______________</span> · <span>Security Check Passed: [ ✓ ]</span>
                  </div>
                </div>

                <div className="col-span-6 p-2 grid grid-cols-2 gap-2 text-center text-[8px]">
                  {/* Driver Acknowledgement */}
                  <div className="border border-black/40 rounded p-1.5 flex flex-col justify-between">
                    <span className="text-[7.5px] uppercase font-semibold text-black/70">Driver Sign &amp; Date:</span>
                    <div className="pt-10 border-t border-black/30">
                      <p className="font-semibold text-black uppercase">Received for Transit</p>
                      <p className="text-[7px] text-black/60">({challan.driver_name || 'Driver'})</p>
                    </div>
                  </div>

                  {/* Consignee Seal & Stamp */}
                  <div className="border border-black/40 rounded p-1.5 flex flex-col justify-between">
                    <span className="text-[7.5px] uppercase font-semibold text-black/70">Consignee Sign &amp; Rubber Stamp:</span>
                    <div className="pt-10 border-t border-black/30">
                      <p className="font-semibold text-black uppercase">Goods Received at Site</p>
                      <p className="text-[7px] text-black/60">(Date &amp; Receiver Signature)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Signatory Bar */}
              <div className="p-2 border-t border-black bg-slate-50 flex justify-between items-center text-[8.5px]">
                <div>
                  <span className="font-semibold">Registered Office &amp; Plant: </span>
                  <span>{company.address}, {company.city} (PIN: {company.pincode})</span>
                </div>
                <div className="text-right">
                  <span className="font-bold uppercase tracking-wider">For {company.name}</span>
                  <span className="ml-4 font-semibold text-black/70">AUTHORISED DISPATCH SIGNATORY</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-surface border-t border-outline-variant flex items-center justify-between no-print">
          <span className="text-xs text-outline">
            Official Gate Pass / Delivery Challan document ready for printing or POD recording
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg border border-outline-variant transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
