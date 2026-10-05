import { useState } from 'react'
import { Printer, Copy, Check, X, Building2 } from 'lucide-react'
import { formatDate, amountInWords, formatCurrency } from '@/lib/formatters'
import { useCompany } from '@/contexts/CompanyContext'
import type { ExpenseRecord } from '@/types/finance.types'

interface ExpenseVoucherModalProps {
  expense: ExpenseRecord
  onClose: () => void
}

export function ExpenseVoucherModal({ expense, onClose }: ExpenseVoucherModalProps) {
  const { company } = useCompany()
  const [copied, setCopied] = useState(false)

  const handlePrint = () => {
    const orig = document.title
    document.title = `Payment_Voucher_${expense.voucher_number}`
    window.print()
    setTimeout(() => { document.title = orig }, 500)
  }

  const handleCopy = () => {
    const text =
      `PAYMENT VOUCHER: ${expense.voucher_number}\n` +
      `Date: ${formatDate(expense.date)}\n` +
      `Category: ${expense.category}\n` +
      `Payee: ${expense.payee_name}\n` +
      `Amount: ₹${expense.amount.toLocaleString('en-IN')}\n` +
      `Mode: ${expense.payment_mode} (${expense.account_ref})\n` +
      `Remarks: ${expense.notes || '-'}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      <style>{`
        @media print {
          @page { size: A5 landscape; margin: 5mm !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden !important; }
          #printable-expense-voucher, #printable-expense-voucher * { visibility: visible !important; }
          #printable-expense-voucher {
            position: absolute !important; left: 5mm !important; top: 5mm !important;
            right: 5mm !important; width: calc(100% - 10mm) !important;
            max-width: calc(100% - 10mm) !important;
            margin: 0 !important; padding: 12px !important; border: 2px solid #000 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 border-b border-outline-variant bg-surface-variant/40 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
              {expense.voucher_number}
            </span>
            <span className="text-sm font-bold text-on-surface">Payment / Expense Voucher</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-outline-variant rounded-lg text-outline hover:text-on-surface hover:bg-surface transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Voucher
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-variant transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div
            id="printable-expense-voucher"
            className="w-full bg-white text-black p-6 rounded-lg shadow-sm border border-slate-300 text-xs font-sans space-y-4"
          >
            {/* Header */}
            <div className="border-b-2 border-black pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                    {company?.name || 'DD ENTERPRISE'}
                  </h1>
                  <p className="text-[11px] text-slate-700 font-medium">
                    Manufacturers of Concrete Paver Blocks, Tiles &amp; Kerb Stones
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {company?.address || 'Factory Site, Nadia, West Bengal'}
                    {company?.phone ? ` · Ph: ${company.phone}` : ''}
                  </p>
                  {company?.gstin && (
                    <p className="text-[10px] font-mono font-bold mt-0.5 text-slate-800">
                      GSTIN: {company.gstin}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <div className="inline-block border-2 border-black px-3 py-1 font-black text-xs uppercase tracking-wider bg-slate-50">
                    PAYMENT DEBIT VOUCHER
                  </div>
                  <div className="text-xs font-mono font-bold mt-1 text-slate-900">
                    Voucher No: {expense.voucher_number}
                  </div>
                  <div className="text-xs text-slate-700 mt-0.5 font-medium">
                    Date: <span className="font-semibold text-black">{formatDate(expense.date)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Voucher Body Details */}
            <div className="grid grid-cols-2 gap-4 border border-black p-3 bg-slate-50/50">
              <div>
                <span className="text-[10px] text-slate-600 block uppercase font-bold">Paid To (Payee):</span>
                <span className="text-sm font-bold text-black">{expense.payee_name}</span>
                {expense.payee_phone && (
                  <span className="block text-xs font-mono text-slate-700">Phone: {expense.payee_phone}</span>
                )}
                {expense.invoice_ref && (
                  <span className="block text-[11px] text-slate-700 mt-1 font-mono">
                    Bill / Memo Ref: <strong className="text-black">{expense.invoice_ref}</strong>
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-600 block uppercase font-bold">Debit Head / Category:</span>
                <span className="text-xs font-bold text-black bg-slate-200 px-2 py-0.5 rounded inline-block">
                  {expense.category}
                </span>
                <div className="mt-1 text-[11px] text-slate-700">
                  Paid Via: <strong className="text-black">{expense.payment_mode}</strong>
                </div>
                <div className="text-[11px] text-slate-700">
                  Account: <strong className="text-black">{expense.account_ref}</strong>
                </div>
              </div>
            </div>

            {/* Particulars Table */}
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-slate-200 border-b border-black text-[11px] font-bold">
                  <th className="border-r border-black p-2 text-left w-12">SL</th>
                  <th className="border-r border-black p-2 text-left">Particulars &amp; Expense Description</th>
                  <th className="p-2 text-right w-36">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-20 align-top">
                  <td className="border-r border-black p-2 font-mono text-center">1</td>
                  <td className="border-r border-black p-2">
                    <p className="font-semibold text-black">{expense.category}</p>
                    <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                      {expense.notes || `Disbursement towards ${expense.category.toLowerCase()} for factory operations.`}
                    </p>
                    {expense.gst_paid > 0 && (
                      <p className="text-[10px] text-slate-600 mt-1 font-mono">
                        (Includes GST Input Tax: ₹{expense.gst_paid.toLocaleString('en-IN')})
                      </p>
                    )}
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-sm text-black">
                    ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="border-t-2 border-black bg-slate-100 font-bold">
                  <td colSpan={2} className="border-r border-black p-2 text-right uppercase text-[11px]">
                    Total Amount Paid:
                  </td>
                  <td className="p-2 text-right font-mono text-base text-black">
                    ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Amount in words */}
            <div className="border border-black p-2 bg-slate-50 text-[11px]">
              <span className="font-bold uppercase text-[10px] text-slate-600 block">Amount in Words:</span>
              <span className="font-bold text-black italic">
                Rupees {amountInWords(expense.amount)} Only
              </span>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-3 gap-6 pt-10 text-center text-[11px]">
              <div className="border-t border-black pt-1">
                <span className="font-medium text-slate-800">Prepared By</span>
              </div>
              <div className="border-t border-black pt-1">
                <span className="font-medium text-slate-800">Verified / Factory Accountant</span>
              </div>
              <div className="border-t border-black pt-1">
                <span className="font-bold text-black">Receiver's Signature / Payee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
