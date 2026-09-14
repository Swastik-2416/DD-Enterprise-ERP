import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Printer, Share2, MessageSquare, Mail, Copy, Check,
  X, ChevronDown, ChevronUp, Truck, Phone,
  ArrowRight, CheckCircle2, XCircle, Package, Loader2, Maximize2, Minimize2
} from 'lucide-react'
import { formatCurrency, formatDate, amountInWords } from '@/lib/formatters'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Invoice, InvoiceLine, Customer, Item } from '@/types/database.types'

interface DDInvoicePrintModalProps {
  invoice: Invoice & { customer?: Customer }
  lines: (InvoiceLine & { item?: Item })[]
  onClose: () => void
  isManager?: boolean
  onSubmitForApproval?: () => void
  onApproveInvoice?: () => void
  onPostInvoice?: () => void
  onCancelInvoice?: () => void
  isPosting?: boolean
  isUpdating?: boolean
}

type InvoiceCopy =
  | 'ORIGINAL FOR RECIPIENT'
  | 'DUPLICATE FOR TRANSPORTER'
  | 'TRIPLICATE FOR SUPPLIER'
  | 'OFFICE COPY'

export function DDInvoicePrintModal({
  invoice,
  lines,
  onClose,
  isManager,
  onSubmitForApproval,
  onApproveInvoice,
  onPostInvoice,
  onCancelInvoice,
  isPosting,
  isUpdating
}: DDInvoicePrintModalProps) {
  // Copy Type State (Dropdown)
  const [copyType, setCopyType] = useState<InvoiceCopy>('ORIGINAL FOR RECIPIENT')

  // Share Menu Dropdown State
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // Zoom / Fit View Mode (Fit entire single sheet on screen vs 100% zoom)
  const [fitToScreen, setFitToScreen] = useState(false)

  // Dispatch details & overrides (Dynamic; NO hardcoded fallback)
  const [showTransportFields, setShowTransportFields] = useState(false)
  const [vehicleNo, setVehicleNo] = useState(
    invoice.notes?.match(/Vehicle:\s*([^,|;\n]+)/i)?.[1]?.trim() || ''
  )
  const [lrNo, setLrNo] = useState(
    invoice.notes?.match(/LR:\s*([^,|;\n]+)/i)?.[1]?.trim() || ''
  )
  const [ewayNo, setEwayNo] = useState(
    invoice.notes?.match(/Eway:\s*([^,|;\n]+)/i)?.[1]?.trim() || ''
  )
  const [freightCharge, setFreightCharge] = useState<number>(0)
  const [unloadingCharge, setUnloadingCharge] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<number>(0)

  // Close share menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false)
      }
    }
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareMenu])

  // Calculations
  const totalQty = useMemo(() => {
    return lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0)
  }, [lines])

  const itemsTaxableTotal = useMemo(() => {
    return lines.reduce((sum, line) => sum + (Number(line.taxable_amount) || 0), 0)
  }, [lines])

  const cgstTotal = Number(invoice.cgst_amount) || 0
  const sgstTotal = Number(invoice.sgst_amount) || 0
  const totalTaxAmount = cgstTotal + sgstTotal

  const grandTotal = useMemo(() => {
    return Math.max(
      0,
      itemsTaxableTotal + cgstTotal + sgstTotal + freightCharge + unloadingCharge - discountAmount
    )
  }, [itemsTaxableTotal, cgstTotal, sgstTotal, freightCharge, unloadingCharge, discountAmount])

  // Print Action without browser URL/title header
  const handlePrint = () => {
    const originalTitle = document.title
    document.title = ''
    window.print()
    setTimeout(() => {
      document.title = originalTitle
    }, 500)
  }

  // WhatsApp Action
  const handleWhatsApp = () => {
    const customerPhone = invoice.customer?.phone?.replace(/\D/g, '') || ''
    const text = encodeURIComponent(
      `*D. D. ENTERPRISE - TAX INVOICE*\n` +
      `--------------------------------\n` +
      `Invoice No: ${invoice.invoice_number}\n` +
      `Date: ${formatDate(invoice.date)}\n` +
      `Customer: ${invoice.customer?.name || 'Valued Customer'}\n` +
      `Copy: ${copyType}\n` +
      `Total Quantity: ${totalQty} pcs\n` +
      `Grand Total: ${formatCurrency(grandTotal)}\n` +
      `--------------------------------\n` +
      `Paver Blocks, Chequered Tiles & Concrete Products\n` +
      `Beside NH-34, Amdanga, North 24 Parganas, WB\n` +
      `Thank you for choosing DD Enterprise!`
    )
    const phoneParam = customerPhone
      ? customerPhone.startsWith('91') ? customerPhone : `91${customerPhone}`
      : ''
    window.open(phoneParam ? `https://wa.me/${phoneParam}?text=${text}` : `https://wa.me/?text=${text}`, '_blank')
    setShowShareMenu(false)
  }

  // Email Action
  const handleEmail = () => {
    const customerEmail = invoice.customer?.email || ''
    const subject = encodeURIComponent(`Tax Invoice ${invoice.invoice_number} - D. D. ENTERPRISE`)
    const body = encodeURIComponent(
      `Dear ${invoice.customer?.name || 'Customer'},\n\n` +
      `Please find the details of Tax Invoice ${invoice.invoice_number} dated ${formatDate(invoice.date)}.\n\n` +
      `Invoice Amount: ${formatCurrency(grandTotal)}\n` +
      `Quantity: ${totalQty} pcs\n\n` +
      `Warm regards,\nD. D. ENTERPRISE\nBeside NH-34, Amdanga, North 24 Parganas, West Bengal - 743221\nPhone: 9433393977\nWebsite: www.ddpaver.co.in`
    )
    window.open(`mailto:${customerEmail}?subject=${subject}&body=${body}`, '_blank')
    setShowShareMenu(false)
  }

  // SMS Action
  const handleSMS = () => {
    const customerPhone = invoice.customer?.phone?.replace(/\D/g, '') || ''
    const text = encodeURIComponent(
      `D.D. ENTERPRISE: Tax Invoice ${invoice.invoice_number} dated ${formatDate(invoice.date)} for ${formatCurrency(grandTotal)} (${totalQty} pcs) is issued. Thank you!`
    )
    window.open(`sms:${customerPhone}?body=${text}`, '_blank')
    setShowShareMenu(false)
  }

  // Copy Summary Action
  const handleCopySummary = () => {
    const text =
      `D. D. ENTERPRISE - TAX INVOICE\n` +
      `--------------------------------\n` +
      `Invoice No: ${invoice.invoice_number}\n` +
      `Date: ${formatDate(invoice.date)}\n` +
      `Customer: ${invoice.customer?.name || 'Customer'}\n` +
      `Quantity: ${totalQty} pcs\n` +
      `Grand Total: ${formatCurrency(grandTotal)}\n` +
      `GSTIN: 19AFDPD4677G1ZD\n` +
      `Place of Supply: West Bengal (19)`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setShowShareMenu(false)
    }, 1500)
  }

  // Number of empty spacer rows to make the table gracefully fill the page
  const spacerCount = Math.max(4, 9 - lines.length)

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      {/* Print Isolated CSS: Zero Margin to Suppress Browser Headers & URLs + Full A4 Page Height */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          #printable-invoice {
            position: absolute !important;
            left: 7mm !important;
            top: 7mm !important;
            right: 7mm !important;
            width: calc(100% - 14mm) !important;
            max-width: calc(100% - 14mm) !important;
            height: calc(297mm - 14mm) !important;
            min-height: calc(297mm - 14mm) !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            transform: none !important;
          }
          #printable-invoice table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          #printable-invoice th,
          #printable-invoice td {
            border-color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Outer Modal Container */}
      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full h-[94vh] flex flex-col border border-outline-variant overflow-hidden">
        {/* Modal Top Nav (No print) */}
        <div className="px-5 py-3 bg-surface border-b border-outline-variant flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-on-surface">Tax Invoice Preview</h3>
            <span className="text-xs font-mono bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md">
              {invoice.invoice_number}
            </span>
            <StatusBadge status={invoice.status} />
          </div>

          <div className="flex items-center gap-2">
            {/* Fit to screen toggle */}
            <button
              type="button"
              onClick={() => setFitToScreen(!fitToScreen)}
              title={fitToScreen ? "Show full size" : "Fit entire page in view"}
              className="px-2.5 py-1 text-xs font-medium text-outline hover:text-on-surface hover:bg-surface-container rounded-lg border border-outline-variant flex items-center gap-1 transition-colors"
            >
              {fitToScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span>{fitToScreen ? "Actual Size" : "Fit Page"}</span>
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

        {/* Workflow Approval / Posting Strip if Manager (No print) */}
        {isManager && (
          <div className="px-5 py-2 bg-surface-container border-b border-outline-variant flex flex-wrap items-center justify-between gap-2 shrink-0 no-print">
            <span className="text-xs text-outline font-medium">
              Actions for this invoice:
            </span>
            <div className="flex items-center gap-2">
              {invoice.status === 'draft' && onSubmitForApproval && (
                <button
                  type="button"
                  onClick={onSubmitForApproval}
                  disabled={isUpdating}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Submit for Approval
                </button>
              )}
              {invoice.status === 'submitted' && onApproveInvoice && (
                <button
                  type="button"
                  onClick={onApproveInvoice}
                  disabled={isUpdating}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve Invoice
                </button>
              )}
              {invoice.status === 'approved' && onPostInvoice && (
                <button
                  type="button"
                  onClick={onPostInvoice}
                  disabled={isPosting}
                  className="px-3 py-1 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Posting Stock...
                    </>
                  ) : (
                    <>
                      <Package className="h-3.5 w-3.5" />
                      Post & Deduct Stock
                    </>
                  )}
                </button>
              )}
              {invoice.status !== 'cancelled' && onCancelInvoice && (
                <button
                  type="button"
                  onClick={onCancelInvoice}
                  disabled={isUpdating || isPosting}
                  className="px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dispatch Details Customizer Drawer (No print) */}
        <div className="bg-surface border-b border-outline-variant px-5 py-2 text-xs shrink-0 no-print">
          <button
            type="button"
            onClick={() => setShowTransportFields(!showTransportFields)}
            className="flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Customize Dispatch & Surcharges (Vehicle, Freight, Unloading)</span>
            {showTransportFields ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showTransportFields && (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-2 pt-2 border-t border-outline-variant/60">
              <div>
                <label className="block text-[10px] uppercase text-outline font-semibold">Vehicle No</label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={e => setVehicleNo(e.target.value)}
                  placeholder="e.g. WB 25F 8077"
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-outline-variant rounded bg-background uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-outline font-semibold">L.R. No.</label>
                <input
                  type="text"
                  value={lrNo}
                  onChange={e => setLrNo(e.target.value)}
                  placeholder="Lorry Receipt"
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-outline-variant rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-outline font-semibold">E-Way No.</label>
                <input
                  type="text"
                  value={ewayNo}
                  onChange={e => setEwayNo(e.target.value)}
                  placeholder="E-Way Bill"
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-outline-variant rounded bg-background font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-outline font-semibold">Freight (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={freightCharge || ''}
                  onChange={e => setFreightCharge(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-outline-variant rounded bg-background text-right"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-outline font-semibold">Unloading (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={unloadingCharge || ''}
                  onChange={e => setUnloadingCharge(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-outline-variant rounded bg-background text-right"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-outline font-semibold">Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-outline-variant rounded bg-background text-right text-red-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Paper Container: Full Page View with Continuous Vertical Lines */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-5 bg-slate-200/80 dark:bg-slate-950 flex justify-center items-start">
          {/* Printable Invoice Sheet: Full Page Height, Solid Complete Borders */}
          <div
            id="printable-invoice"
            className={`bg-white text-black w-full max-w-[760px] min-h-[980px] shadow-2xl border-2 border-black text-[10px] leading-tight font-sans box-border flex flex-col justify-between transition-transform origin-top ${
              fitToScreen ? 'scale-[0.78] sm:scale-[0.82] -mb-40' : ''
            }`}
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {/* Top Container: Header, Metadata, Customer, Products */}
            <div className="flex-1 flex flex-col">
              {/* 1. Document Top Title Bar */}
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-black bg-white shrink-0">
                <div className="w-28"></div>
                <h1 className="text-base font-black tracking-widest text-center uppercase flex-1 text-black">
                  TAX INVOICE
                </h1>
                <div className="w-48 text-right font-bold text-[9.5px] uppercase tracking-wider text-black">
                  {copyType}
                </div>
              </div>

              {/* 2. Header Grid: Company Info (Left) & Document Info (Right) */}
              <div className="grid grid-cols-12 border-b border-black shrink-0">
                {/* Left Column (58%): Company Details */}
                <div className="col-span-7 p-2.5 flex items-start gap-3 border-r border-black">
                  <div className="shrink-0 w-20 flex flex-col items-center justify-start pt-1">
                    <img
                      src="/logo.png"
                      alt="DD PAVER"
                      className="w-20 h-auto object-contain"
                      onError={e => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                    <span className="text-[6.5px] text-center font-bold tracking-tighter text-blue-900 mt-1 uppercase leading-tight">
                      STRONGER BASE, BETTER SPACE
                    </span>
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
                      <span className="font-semibold">UDYAM:</span> UDYAM-WB-14-0057640 · <span className="font-semibold">BIS Lic:</span> CM/L-5100295395
                    </p>
                    <p className="text-[8.5px]">
                      <span className="font-semibold">Name:</span> TAPAN DEY · <span className="font-semibold">Phone:</span> 9433393977
                    </p>
                    <p className="text-[8.5px]">
                      <span className="font-semibold">Email:</span> info@ddenterprisepaverblock.co.in
                    </p>
                    <p className="text-[8.5px]">
                      <span className="font-semibold">Website:</span> www.ddpaver.co.in
                    </p>
                  </div>
                </div>

                {/* Right Column (42%): Invoice Metadata */}
                <div className="col-span-5 flex flex-col justify-between">
                  <div className="grid grid-cols-2 border-b border-black">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Invoice No.</span>
                      <strong className="text-xs font-black">{invoice.invoice_number}</strong>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Invoice Date</span>
                      <span className="font-bold text-xs">{formatDate(invoice.date)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-b border-black">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Reverse Charge</span>
                      <span className="font-bold text-xs">No</span>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">L.R. No.</span>
                      <span className="font-bold text-xs font-mono">{lrNo || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="p-2 border-r border-black">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">E-Way No.</span>
                      <span className="font-bold text-xs font-mono">{ewayNo || '—'}</span>
                    </div>
                    <div className="p-2">
                      <span className="text-[8.5px] text-black/70 block uppercase font-medium">Vehicle Number</span>
                      <strong className="text-xs font-black font-mono">{vehicleNo || '—'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Customer Detail Box */}
              <div className="p-2.5 border-b border-black space-y-0.5 shrink-0">
                <span className="text-[8.5px] font-bold uppercase text-black/70 tracking-wider">
                  Customer Detail
                </span>
                <h3 className="text-xs font-black uppercase text-black">
                  {invoice.customer?.name || 'CASH CUSTOMER'}
                </h3>
                {invoice.customer?.contact_person && (
                  <p className="text-[9px]">{invoice.customer.contact_person}</p>
                )}
                <p className="text-[9px] text-black">
                  {invoice.customer?.address ? `${invoice.customer.address}, ` : ''}
                  {invoice.customer?.city || 'North 24 Parganas'}, {invoice.customer?.state || 'West Bengal'}
                </p>
                <div className="flex flex-wrap gap-4 text-[9px] pt-0.5">
                  <p>
                    <span className="font-semibold">Phone :</span> {invoice.customer?.phone || '—'}
                  </p>
                  <p>
                    <span className="font-semibold">Place of Supply :</span>{' '}
                    {invoice.customer?.state ? `${invoice.customer.state} ( 19 )` : 'West Bengal ( 19 )'}
                  </p>
                  {invoice.customer?.gstin && (
                    <p>
                      <span className="font-semibold">GSTIN :</span> {invoice.customer.gstin}
                    </p>
                  )}
                </div>
              </div>

              {/* 4. Products Table (Complete Continuous Vertical Dividing Lines All The Way Down) */}
              <div className="border-b border-black flex-1 flex flex-col">
                <table className="w-full text-left text-[9.5px] border-collapse h-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="border-b border-black font-bold uppercase text-center text-[8.5px] bg-slate-50">
                      <th className="py-1.5 px-1 border-r border-black w-7 text-center">No.</th>
                      <th className="py-1.5 px-2 border-r border-black text-left">Product Name</th>
                      <th className="py-1.5 px-1 border-r border-black w-14 text-center">HSN Code</th>
                      <th className="py-1.5 px-1 border-r border-black w-14 text-right">Quantity</th>
                      <th className="py-1.5 px-1 border-r border-black w-10 text-center">UOM</th>
                      <th className="py-1.5 px-2 border-r border-black w-16 text-right">Price</th>
                      <th className="py-1.5 px-2 w-24 text-right">Taxable Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Item Lines */}
                    {lines.map((line, idx) => (
                      <tr key={line.id} className="align-top border-b border-black/30">
                        <td className="py-1.5 px-1 border-r border-black text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2 border-r border-black font-semibold text-black">
                          {line.item?.name || line.description || 'Concrete Paver Block'}
                          {line.description && line.description !== line.item?.name && (
                            <span className="block text-[8.5px] italic font-normal text-black/75">
                              {line.description}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-1 border-r border-black text-center font-mono text-[9px]">
                          {line.item?.hsn_code || '6810'}
                        </td>
                        <td className="py-1.5 px-1 border-r border-black text-right font-bold font-mono">
                          {line.qty}
                        </td>
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

                    {/* Empty Spacer Rows to Fill Full Page Height with Continuous Vertical Lines */}
                    {Array.from({ length: spacerCount }).map((_, i) => (
                      <tr key={`spacer-${i}`} className="h-8 border-b border-black/15">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td></td>
                      </tr>
                    ))}

                    {/* Subtotal Row with all vertical lines continuous */}
                    <tr className="border-t border-black">
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="py-1 px-2 border-r border-black text-right text-black font-semibold">
                        Subtotal
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold">
                        {itemsTaxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* Freight Row */}
                    {freightCharge > 0 && (
                      <tr className="border-t border-black">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="py-1 px-2 border-r border-black text-right text-black">
                          Freight Charge
                        </td>
                        <td className="py-1 px-2 text-right font-mono">
                          {freightCharge.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {/* Unloading Row */}
                    {unloadingCharge > 0 && (
                      <tr className="border-t border-black">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="py-1 px-2 border-r border-black text-right text-black">
                          Unloading Charge
                        </td>
                        <td className="py-1 px-2 text-right font-mono">
                          {unloadingCharge.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {/* CGST Row */}
                    {cgstTotal > 0 && (
                      <tr className="border-t border-black">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="py-1 px-2 border-r border-black text-right text-black">
                          CGST (9%)
                        </td>
                        <td className="py-1 px-2 text-right font-mono">
                          {cgstTotal.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {/* SGST Row */}
                    {sgstTotal > 0 && (
                      <tr className="border-t border-black">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="py-1 px-2 border-r border-black text-right text-black">
                          SGST (9%)
                        </td>
                        <td className="py-1 px-2 text-right font-mono">
                          {sgstTotal.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {/* Discount Row */}
                    {discountAmount > 0 && (
                      <tr className="border-t border-black">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="py-1 px-2 border-r border-black text-right text-red-600">
                          Discount
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-red-600">
                          -{discountAmount.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {/* Total Row */}
                    <tr className="border-t-2 border-black font-bold text-[11px] bg-slate-50">
                      <td colSpan={3} className="py-1.5 px-3 text-right uppercase tracking-wider border-r border-black">
                        TOTAL
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono border-r border-black">
                        {totalQty}
                      </td>
                      <td className="border-r border-black"></td>
                      <td colSpan={2} className="py-1.5 px-2 text-right font-mono font-black text-sm">
                        ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Container: Total in Words, HSN Tax Summary, Terms & Signatures */}
            <div className="shrink-0">
              {/* 5. Total in Words */}
              <div className="p-2 border-b border-black bg-white">
                <div className="flex justify-between items-center text-[8px] text-black/70 uppercase font-semibold">
                  <span>TOTAL IN WORDS</span>
                  <span>(E & O.E.)</span>
                </div>
                <p className="font-black text-[9.5px] tracking-wide uppercase mt-0.5">
                  {amountInWords(grandTotal)}
                </p>
              </div>

              {/* 6. HSN Summary Table (Solid Borders and Column Alignment) */}
              <div className="border-b border-black bg-white">
                <table className="w-full text-[8.5px] border-collapse text-center" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="border-b border-black font-bold uppercase bg-slate-50">
                      <th rowSpan={2} className="py-1 px-1 border-r border-black w-24">HSN CODE</th>
                      <th rowSpan={2} className="py-1 px-2 border-r border-black text-right w-24">TAXABLE VALUE</th>
                      <th colSpan={2} className="py-0.5 px-1 border-r border-black">CGST</th>
                      <th colSpan={2} className="py-0.5 px-1 border-r border-black">SGST</th>
                      <th rowSpan={2} className="py-1 px-2 text-right w-24">TOTAL</th>
                    </tr>
                    <tr className="border-b border-black font-semibold text-[8px]">
                      <th className="py-0.5 px-1 border-r border-black w-10">%</th>
                      <th className="py-0.5 px-1 border-r border-black text-right w-16">Amount</th>
                      <th className="py-0.5 px-1 border-r border-black w-10">%</th>
                      <th className="py-0.5 px-1 border-r border-black text-right w-16">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="py-1 px-1 border-r border-black font-mono">6810</td>
                      <td className="py-1 px-2 border-r border-black text-right font-mono">
                        {itemsTaxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-1 px-1 border-r border-black">
                        {cgstTotal > 0 ? '9%' : '0%'}
                      </td>
                      <td className="py-1 px-1 border-r border-black text-right font-mono">
                        {cgstTotal.toFixed(2)}
                      </td>
                      <td className="py-1 px-1 border-r border-black">
                        {sgstTotal > 0 ? '9%' : '0%'}
                      </td>
                      <td className="py-1 px-1 border-r border-black text-right font-mono">
                        {sgstTotal.toFixed(2)}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-semibold">
                        {totalTaxAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="font-bold">
                      <td className="py-1 px-1 border-r border-black uppercase text-right">TOTAL</td>
                      <td className="py-1 px-2 border-r border-black text-right font-mono">
                        {itemsTaxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border-r border-black"></td>
                      <td className="py-1 px-1 border-r border-black text-right font-mono">
                        {cgstTotal.toFixed(2)}
                      </td>
                      <td className="border-r border-black"></td>
                      <td className="py-1 px-1 border-r border-black text-right font-mono">
                        {sgstTotal.toFixed(2)}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold">
                        {totalTaxAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="px-2 py-1 border-t border-black text-[8.5px] bg-white">
                  <span className="font-semibold text-black/70">Total Tax in words: </span>
                  <strong className="uppercase">
                    {totalTaxAmount > 0 ? amountInWords(totalTaxAmount) : 'ZERO RUPEES ONLY'}
                  </strong>
                </div>
              </div>

              {/* 7. Terms & Signatures (Generous Height for Seal & Signature) */}
              <div className="grid grid-cols-12 bg-white min-h-[140px]">
                <div className="col-span-7 p-2.5 space-y-1 border-r border-black text-[8px] leading-snug flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-[8.5px] uppercase">TERMS AND CONDITIONS :- D. D. ENTERPRISE</p>
                    <ol className="list-decimal pl-3 space-y-0.5 text-black/90">
                      <li>Subject to our home Jurisdiction.</li>
                      <li>Our Responsibility Ceases as soon as goods leaves our Factory.</li>
                      <li>Goods once sold will not taken back.</li>
                      <li>Delivery Ex-Premises.</li>
                    </ol>
                  </div>
                  <div className="pt-2">
                    <p className="font-bold text-[8px] text-blue-900">Review our Product & Services on Google</p>
                    <p className="font-bold text-[8px] uppercase text-black">
                      D. D. ENTERPRISE - Paver Block, Chequered Tile & Roof Tile
                    </p>
                  </div>
                </div>

                <div className="col-span-5 p-2.5 flex flex-col justify-between text-right">
                  <span className="text-[7.5px] text-black/60">(E & O.E.)</span>
                  <div className="pt-14 pb-1">
                    <p className="font-bold text-[9px] uppercase tracking-wider text-black border-t border-black pt-1">
                      AUTHORISED SIGNATORY
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Controls Bar (No print): Dropdown for Copy + 2 Rounded Buttons */}
        <div className="px-6 py-3 bg-surface border-t border-outline-variant flex flex-wrap items-center justify-between gap-3 shrink-0 no-print relative">
          {/* Left: Copy Type Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-outline shrink-0">Copy Type:</label>
            <select
              value={copyType}
              onChange={e => setCopyType(e.target.value as InvoiceCopy)}
              className="text-xs font-bold py-2 px-3.5 rounded-full border border-outline-variant bg-surface text-on-surface shadow-xs cursor-pointer focus:ring-2 focus:ring-primary/20"
            >
              <option value="ORIGINAL FOR RECIPIENT">Original (Recipient)</option>
              <option value="DUPLICATE FOR TRANSPORTER">Duplicate (Transporter)</option>
              <option value="TRIPLICATE FOR SUPPLIER">Transport / Triplicate</option>
              <option value="OFFICE COPY">Office Copy</option>
            </select>
          </div>

          {/* Right: Print & Share Buttons */}
          <div className="flex items-center gap-3">
            {/* Share Action Dropdown / Popover */}
            {showShareMenu && (
              <div
                ref={shareMenuRef}
                className="absolute right-6 bottom-16 bg-surface border border-outline-variant rounded-2xl shadow-2xl p-2.5 w-64 space-y-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-outline">
                  Share Invoice
                </div>

                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-emerald-500/10 hover:text-emerald-600 rounded-xl transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleEmail}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-orange-500/10 hover:text-orange-600 rounded-xl transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  onClick={handleSMS}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-sky-500/10 hover:text-sky-600 rounded-xl transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-sky-500/15 text-sky-600 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span>SMS</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container rounded-xl transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-surface-container text-on-surface flex items-center justify-center shrink-0">
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </div>
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
                </button>
              </div>
            )}

            {/* Button 1: Print (Sleek Rounded Button) */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-7 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>

            {/* Button 2: Share (Sleek Rounded Button with Dropdown Trigger) */}
            <button
              type="button"
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center justify-center gap-2 px-7 py-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
