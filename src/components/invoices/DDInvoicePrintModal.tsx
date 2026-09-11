import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Printer, Share2, MessageSquare, Mail, Copy, Check,
  X, ChevronDown, ChevronUp, Truck, Phone,
  ArrowRight, CheckCircle2, XCircle, Package, Loader2, ExternalLink
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
  // Share Menu Dropdown State
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // Dispatch details & overrides
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      {/* Print Isolated CSS */}
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
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 12mm 14mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Outer Modal Container */}
      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full h-[94vh] flex flex-col border border-outline-variant overflow-hidden">
        {/* Modal Top Nav (No print) */}
        <div className="px-5 py-3.5 bg-surface border-b border-outline-variant flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-on-surface">Tax Invoice Preview</h3>
            <span className="text-xs font-mono bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md">
              {invoice.invoice_number}
            </span>
            <StatusBadge status={invoice.status} />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
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
                  placeholder="WB 25F 8077"
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-outline-variant rounded bg-background"
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
                  className="w-full mt-0.5 px-2 py-1 text-xs border border-outline-variant rounded bg-background"
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

        {/* Scrollable Paper Container: All contents stay fully inside the white sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/75 dark:bg-slate-950/80 flex justify-center">
          {/* Printable Invoice Sheet: Modern, Clean, Professional */}
          <div
            id="printable-invoice"
            className="bg-white text-slate-900 w-full max-w-[760px] shadow-xl rounded-md p-6 sm:p-8 border border-slate-200 flex flex-col box-border min-h-[980px]"
            style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
          >
            {/* 1. Header: DD Paver Logo, Company Credentials & Tax Invoice Badge */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-200">
              {/* Left: Logo & Company Address */}
              <div className="flex items-start gap-3.5 max-w-[480px]">
                <img
                  src="/logo.png"
                  alt="DD PAVER"
                  className="h-14 sm:h-16 w-auto object-contain shrink-0"
                  onError={e => {
                    ;(e.target as HTMLElement).style.display = 'none'
                  }}
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
                      D. D. ENTERPRISE
                    </h1>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Khelia, Arkhali, Amdanga, Beside NH-34 (12)<br />
                    North 24 Parganas, West Bengal - 743221
                  </p>
                  <div className="pt-1 text-[10.5px] text-slate-700 space-y-0.5">
                    <div className="font-semibold text-slate-900">
                      GSTIN : <span className="font-mono font-bold text-blue-900">19AFDPD4677G1ZD</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      UDYAM: <span className="font-medium text-slate-700">UDYAM-WB-14-0057640</span> · BIS Lic: <span className="font-medium text-slate-700">CM/L-5100295395</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Contact: <span className="font-medium text-slate-700">9433393977</span> · <span className="font-medium text-slate-700">info@ddenterprisepaverblock.co.in</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Invoice Card */}
              <div className="sm:text-right w-full sm:w-auto bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0 border-slate-200">
                <div className="inline-block bg-slate-900 text-white font-black text-xs uppercase tracking-widest px-3 py-1 rounded-sm mb-2">
                  TAX INVOICE
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex sm:justify-end gap-2 text-slate-600">
                    <span className="font-medium">Invoice No:</span>
                    <strong className="font-mono text-slate-900 font-bold">{invoice.invoice_number}</strong>
                  </div>
                  <div className="flex sm:justify-end gap-2 text-slate-600">
                    <span className="font-medium">Date:</span>
                    <strong className="text-slate-900 font-semibold">{formatDate(invoice.date)}</strong>
                  </div>
                  <div className="flex sm:justify-end gap-2 text-slate-600 text-[11px]">
                    <span>Reverse Charge:</span>
                    <span className="font-semibold text-slate-900">No</span>
                  </div>
                  {vehicleNo && (
                    <div className="flex sm:justify-end gap-2 text-slate-600 text-[11px]">
                      <span>Vehicle No:</span>
                      <strong className="font-mono text-slate-900">{vehicleNo}</strong>
                    </div>
                  )}
                  {lrNo && (
                    <div className="flex sm:justify-end gap-2 text-slate-600 text-[11px]">
                      <span>L.R. No:</span>
                      <strong className="font-mono text-slate-900">{lrNo}</strong>
                    </div>
                  )}
                  {ewayNo && (
                    <div className="flex sm:justify-end gap-2 text-slate-600 text-[11px]">
                      <span>E-Way Bill:</span>
                      <strong className="font-mono text-slate-900">{ewayNo}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Customer / Bill To Card */}
            <div className="my-4 bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Billed To / Consignee
                </span>
                <h2 className="font-bold text-slate-900 text-sm">
                  {invoice.customer?.name || 'Cash Customer'}
                </h2>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  {invoice.customer?.address ? `${invoice.customer.address}, ` : ''}
                  {invoice.customer?.city || 'North 24 Parganas'}, {invoice.customer?.state || 'West Bengal'}
                </p>
                {invoice.customer?.phone && (
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Phone: <span className="font-medium text-slate-800">{invoice.customer.phone}</span>
                  </p>
                )}
              </div>

              <div className="sm:text-right space-y-1">
                <div className="text-[11px]">
                  <span className="text-slate-500">GSTIN / Unique ID: </span>
                  <span className="font-mono font-bold text-slate-900">
                    {invoice.customer?.gstin || 'Unregistered Consumer'}
                  </span>
                </div>
                <div className="text-[11px]">
                  <span className="text-slate-500">Place of Supply: </span>
                  <span className="font-semibold text-slate-800">
                    {invoice.customer?.state ? `${invoice.customer.state} (19)` : 'West Bengal (19)'}
                  </span>
                </div>
                <div className="text-[11px]">
                  <span className="text-slate-500">Supply Type: </span>
                  <span className="font-semibold text-slate-800">Intrastate (CGST + SGST)</span>
                </div>
              </div>
            </div>

            {/* 3. Products Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden my-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-2 px-2.5 text-center w-8">#</th>
                    <th className="py-2 px-3">Product Description</th>
                    <th className="py-2 px-2 text-center w-16">HSN/SAC</th>
                    <th className="py-2 px-2 text-right w-16">Qty</th>
                    <th className="py-2 px-2 text-center w-12">UOM</th>
                    <th className="py-2 px-3 text-right w-20">Rate (₹)</th>
                    <th className="py-2 px-3 text-right w-24">Taxable (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        {line.item?.name || line.description || 'Concrete Paver Block'}
                        {line.description && line.description !== line.item?.name && (
                          <span className="block text-[10.5px] text-slate-500 font-normal mt-0.5">
                            {line.description}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-600 text-[11px]">
                        {line.item?.hsn_code || '6810'}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900">
                        {line.qty}
                      </td>
                      <td className="py-2 px-2 text-center uppercase text-slate-600 text-[11px]">
                        {line.item?.unit?.symbol || 'PCS'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {Number(line.rate).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                        {Number(line.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}

                  {/* Clean row spacer if only 1 line item to maintain proportions */}
                  {lines.length === 1 && (
                    <tr className="h-6">
                      <td colSpan={7} className="border-b border-transparent"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Totals and Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start my-3">
              {/* Left Column: Amount in words & note */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Amount Chargeable (in words)
                </span>
                <p className="font-bold text-xs text-slate-900 uppercase leading-snug">
                  {amountInWords(grandTotal)}
                </p>
                <span className="text-[10px] text-slate-400 block pt-1">(E & O.E.)</span>
              </div>

              {/* Right Column: Breakdown & Grand Total */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Items Taxable Amount:</span>
                  <span className="font-mono font-medium text-slate-900">
                    ₹ {itemsTaxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {freightCharge > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Freight / Transport:</span>
                    <span className="font-mono font-medium text-slate-900">
                      ₹ {freightCharge.toFixed(2)}
                    </span>
                  </div>
                )}

                {unloadingCharge > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Unloading Charges:</span>
                    <span className="font-mono font-medium text-slate-900">
                      ₹ {unloadingCharge.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>CGST (9%):</span>
                  <span className="font-mono font-medium text-slate-900">
                    ₹ {cgstTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>SGST (9%):</span>
                  <span className="font-mono font-medium text-slate-900">
                    ₹ {sgstTotal.toFixed(2)}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span className="font-mono font-medium">
                      - ₹ {discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Grand Total (Incl. Taxes):</span>
                  <span className="text-base font-black text-blue-900 font-mono">
                    ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. HSN Tax Summary Table: Crisp and perfectly sized */}
            <div className="my-2 border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-[10px] text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 font-bold uppercase text-slate-700 border-b border-slate-200">
                    <th className="py-1.5 px-2 border-r border-slate-200">HSN Code</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200">Taxable Value</th>
                    <th className="py-1.5 px-2 border-r border-slate-200">CGST Rate</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200">CGST Amount</th>
                    <th className="py-1.5 px-2 border-r border-slate-200">SGST Rate</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200">SGST Amount</th>
                    <th className="py-1.5 px-2 text-right">Total Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 font-mono">
                    <td className="py-1.5 px-2 border-r border-slate-100 font-semibold text-slate-800">6810</td>
                    <td className="py-1.5 px-2 text-right border-r border-slate-100">
                      {itemsTaxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-100">9%</td>
                    <td className="py-1.5 px-2 text-right border-r border-slate-100">{cgstTotal.toFixed(2)}</td>
                    <td className="py-1.5 px-2 border-r border-slate-100">9%</td>
                    <td className="py-1.5 px-2 text-right border-r border-slate-100">{sgstTotal.toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right font-bold text-slate-900">{totalTaxAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="bg-slate-50/70 font-bold text-slate-900">
                    <td className="py-1.5 px-2 uppercase border-r border-slate-200">Total</td>
                    <td className="py-1.5 px-2 text-right border-r border-slate-200 font-mono">
                      {itemsTaxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border-r border-slate-200"></td>
                    <td className="py-1.5 px-2 text-right border-r border-slate-200 font-mono">{cgstTotal.toFixed(2)}</td>
                    <td className="border-r border-slate-200"></td>
                    <td className="py-1.5 px-2 text-right border-r border-slate-200 font-mono">{sgstTotal.toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-blue-900 font-black">
                      ₹ {totalTaxAmount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="px-3 py-1 bg-slate-50 text-[10px] text-slate-600 border-t border-slate-200">
                <span className="font-medium">Total Tax in Words: </span>
                <strong className="uppercase text-slate-800">
                  {totalTaxAmount > 0 ? amountInWords(totalTaxAmount) : 'ZERO RUPEES ONLY'}
                </strong>
              </div>
            </div>

            {/* 6. Terms & Conditions and Signature: Pushed to bottom nicely */}
            <div className="mt-auto pt-4 border-t border-slate-200 grid grid-cols-12 gap-4 text-xs">
              <div className="col-span-7 space-y-1 text-[10px] text-slate-600 leading-snug">
                <p className="font-bold uppercase text-slate-800 tracking-wider">
                  Terms & Conditions
                </p>
                <ol className="list-decimal pl-3.5 space-y-0.5">
                  <li>Subject to home Jurisdiction.</li>
                  <li>Our Responsibility Ceases as soon as goods leave our Factory.</li>
                  <li>Goods once sold will not be taken back.</li>
                  <li>Delivery Ex-Premises.</li>
                </ol>
                <p className="text-blue-900 font-semibold pt-1">
                  ⭐ Review our Products & Services on Google: <span className="font-bold">D. D. ENTERPRISE</span>
                </p>
              </div>

              <div className="col-span-5 flex flex-col justify-between items-end text-right">
                <span className="text-[11px] font-bold text-slate-900 uppercase">
                  For D. D. ENTERPRISE
                </span>
                <div className="pt-10 w-44 border-t border-slate-400 text-center">
                  <p className="font-bold text-[10px] uppercase text-slate-800 tracking-wider">
                    Authorised Signatory
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Controls Bar (No print): Strictly TWO sleek rounded buttons */}
        <div className="px-6 py-4 bg-surface border-t border-outline-variant flex items-center justify-center gap-4 shrink-0 no-print relative">
          {/* Share Action Dropdown / Popover */}
          {showShareMenu && (
            <div
              ref={shareMenuRef}
              className="absolute bottom-16 sm:bottom-18 bg-surface border border-outline-variant rounded-2xl shadow-2xl p-2.5 w-64 space-y-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
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
            className="flex items-center justify-center gap-2 px-8 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>

          {/* Button 2: Share (Sleek Rounded Button with Dropdown Trigger) */}
          <button
            type="button"
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="flex items-center justify-center gap-2 px-8 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  )
}
