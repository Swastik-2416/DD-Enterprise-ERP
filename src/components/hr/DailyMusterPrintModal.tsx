import { useState } from 'react'
import { Printer, Copy, Check, X } from 'lucide-react'
import { formatDate } from '@/lib/formatters'
import { useCompany } from '@/contexts/CompanyContext'
import type { DailyAttendanceRecord } from '@/types/hr.types'

interface DailyMusterPrintModalProps {
  date: string
  shift: string
  records: DailyAttendanceRecord[]
  onClose: () => void
}

export function DailyMusterPrintModal({
  date,
  shift,
  records,
  onClose
}: DailyMusterPrintModalProps) {
  const { company } = useCompany()
  const [copied, setCopied] = useState(false)

  const totalPresent = records.filter(r => r.status === 'present').length
  const totalHalfDay = records.filter(r => r.status === 'half_day').length
  const totalAbsent = records.filter(r => r.status === 'absent').length
  const totalOtHours = records.reduce((s, r) => s + (Number(r.ot_hours) || 0), 0)
  const totalWageBill = records.reduce((s, r) => s + (Number(r.total_earned) || 0), 0)

  const handlePrint = () => {
    const orig = document.title
    document.title = `Labour_Muster_${date}_${shift.replace(/[\s()]/g, '_')}`
    window.print()
    setTimeout(() => { document.title = orig }, 500)
  }

  const handleCopy = () => {
    const text =
      `DAILY FACTORY LABOUR MUSTER: ${formatDate(date)}\n` +
      `Shift: ${shift}\n` +
      `Total Present: ${totalPresent} | Half Day: ${totalHalfDay} | Absent: ${totalAbsent}\n` +
      `Total OT Hours: ${totalOtHours} hrs\n` +
      `Estimated Daily Wage Bill: ₹${totalWageBill.toLocaleString('en-IN')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden !important; }
          #printable-muster-sheet, #printable-muster-sheet * { visibility: visible !important; }
          #printable-muster-sheet {
            position: absolute !important; left: 8mm !important; top: 8mm !important;
            right: 8mm !important; width: calc(100% - 16mm) !important;
            max-width: calc(100% - 16mm) !important;
            margin: 0 !important; padding: 12px !important; border: 2px solid #000 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 border-b border-outline-variant bg-surface-variant/40 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
              FORM D MUSTER
            </span>
            <span className="text-sm font-bold text-on-surface">Factory Daily Labour Muster</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-outline-variant rounded-lg text-outline hover:text-on-surface hover:bg-surface transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Summary'}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Muster
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-variant transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Muster Sheet Paper */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div
            id="printable-muster-sheet"
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
                    Concrete Paver Blocks, Tiles &amp; Kerb Stones Manufacturing Plant
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {company?.address || 'Factory Site, Nadia, West Bengal'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block border-2 border-black px-3 py-0.5 font-black text-xs uppercase tracking-wider bg-slate-50">
                    LABOUR MUSTER ROLL
                  </div>
                  <div className="text-xs font-mono font-bold mt-1 text-slate-900">
                    Date: {formatDate(date)}
                  </div>
                  <div className="text-[11px] text-slate-700 font-medium mt-0.5">
                    {shift}
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Summary Strip */}
            <div className="grid grid-cols-4 gap-2 border border-black p-2 bg-slate-50 text-center text-xs">
              <div>
                <span className="text-[10px] uppercase text-slate-600 font-bold block">Present</span>
                <span className="font-bold text-emerald-800 text-sm">{totalPresent}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-600 font-bold block">Half Day</span>
                <span className="font-bold text-amber-800 text-sm">{totalHalfDay}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-600 font-bold block">Absent</span>
                <span className="font-bold text-red-700 text-sm">{totalAbsent}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-600 font-bold block">Daily Wages Bill</span>
                <span className="font-bold text-black text-sm font-mono">₹{totalWageBill.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Muster Table */}
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-slate-200 border-b border-black text-[10px] font-bold uppercase">
                  <th className="border-r border-black p-1.5 text-center w-8">SL</th>
                  <th className="border-r border-black p-1.5 text-left">Worker Name &amp; Dept</th>
                  <th className="border-r border-black p-1.5 text-center w-20">Status</th>
                  <th className="border-r border-black p-1.5 text-right w-16">Base Rate</th>
                  <th className="border-r border-black p-1.5 text-right w-14">OT (Hrs)</th>
                  <th className="border-r border-black p-1.5 text-right w-20">Earned</th>
                  <th className="p-1.5 text-center w-28">Signature / Thumb</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, idx) => (
                  <tr key={r.id} className="border-b border-black/60 h-8">
                    <td className="border-r border-black p-1.5 text-center font-mono">{idx + 1}</td>
                    <td className="border-r border-black p-1.5">
                      <span className="font-bold text-black">{r.worker_name}</span>
                      <span className="text-[10px] text-slate-600 block">{r.department}</span>
                    </td>
                    <td className="border-r border-black p-1.5 text-center">
                      <span className={`inline-block font-black text-[11px] px-1.5 py-0.5 uppercase ${
                        r.status === 'present'
                          ? 'text-emerald-900 bg-emerald-100 rounded'
                          : r.status === 'half_day'
                          ? 'text-amber-900 bg-amber-100 rounded'
                          : 'text-red-900 bg-red-100 rounded'
                      }`}>
                        {r.status === 'present' ? 'P' : r.status === 'half_day' ? 'HD' : 'A'}
                      </span>
                    </td>
                    <td className="border-r border-black p-1.5 text-right font-mono">
                      ₹{r.daily_wage}
                    </td>
                    <td className="border-r border-black p-1.5 text-right font-mono font-medium">
                      {r.ot_hours > 0 ? `${r.ot_hours} h` : '-'}
                    </td>
                    <td className="border-r border-black p-1.5 text-right font-mono font-bold text-black">
                      ₹{r.total_earned.toLocaleString('en-IN')}
                    </td>
                    <td className="p-1.5 text-center"></td>
                  </tr>
                ))}
                <tr className="border-t-2 border-black bg-slate-100 font-bold">
                  <td colSpan={3} className="border-r border-black p-2 text-right uppercase text-[11px]">
                    Total Shift Wages Payable:
                  </td>
                  <td className="border-r border-black p-2 text-right"></td>
                  <td className="border-r border-black p-2 text-right font-mono">{totalOtHours} h</td>
                  <td className="border-r border-black p-2 text-right font-mono text-sm text-black">
                    ₹{totalWageBill.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2"></td>
                </tr>
              </tbody>
            </table>

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-12 pt-12 text-center text-xs">
              <div className="border-t border-black pt-1">
                <span className="font-semibold text-slate-900">Factory Labour Supervisor</span>
              </div>
              <div className="border-t border-black pt-1">
                <span className="font-bold text-black">Factory Manager / Accountant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
