import { useState, useMemo } from 'react'
import {
  TrendingUp, Plus, Search, Filter,
  Calendar, CheckCircle2, Clock,
  Printer, Trash2, Edit3, Download,
  X, Recycle, Layers, IndianRupee, Landmark
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, toInputDate, formatCurrency } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'
import { OtherIncomeReceiptModal } from '@/components/finance/OtherIncomeReceiptModal'
import {
  type OtherIncomeRecord,
  type OtherIncomeCategory,
  SEED_OTHER_INCOME
} from '@/types/finance.types'

const LS_KEY = 'dd_other_income_list'

const INCOME_CATEGORIES: OtherIncomeCategory[] = [
  'Empty Cement Bags Re-sale',
  'Broken Paver Scrap & Rubble',
  'Pallet Deposits & Retentions',
  'Old Machinery / Metal Scrap',
  'Bank Interest & Fixed Deposits',
  'Fly Ash / Logistics Brokerage',
  'Miscellaneous Sundry Receipts'
]

function generateReceiptNumber(existing: OtherIncomeRecord[]): string {
  const seq = existing.length + 1
  const now = new Date()
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyStr = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`
  return `INC-${fyStr}-${String(seq).padStart(4, '0')}`
}

function loadStoredIncome(): OtherIncomeRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED_OTHER_INCOME))
      return SEED_OTHER_INCOME
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_OTHER_INCOME
  } catch {
    return SEED_OTHER_INCOME
  }
}

function saveStoredIncome(incomeList: OtherIncomeRecord[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(incomeList))
  } catch {}
}

export function OtherIncomePage() {
  const { user } = useAuth()
  const [incomeList, setIncomeList] = useState<OtherIncomeRecord[]>(loadStoredIncome)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [modeFilter, setModeFilter] = useState<string>('all')

  // Print modal state
  const [activePrintIncome, setActivePrintIncome] = useState<OtherIncomeRecord | null>(null)

  // Drawer / Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<OtherIncomeRecord | null>(null)

  // Form Fields
  const [formDate, setFormDate] = useState(toInputDate(new Date()))
  const [formCategory, setFormCategory] = useState<OtherIncomeCategory>('Empty Cement Bags Re-sale')
  const [formReceivedFrom, setFormReceivedFrom] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formPaymentMode, setFormPaymentMode] = useState<OtherIncomeRecord['payment_mode']>('Cash')
  const [formDepositAccount, setFormDepositAccount] = useState('Factory Petty Cash')
  const [formAmount, setFormAmount] = useState<number>(0)
  const [formReferenceNo, setFormReferenceNo] = useState('')
  const [formStatus, setFormStatus] = useState<OtherIncomeRecord['status']>('received')
  const [formNotes, setFormNotes] = useState('')

  // Open Form for New Income
  const handleOpenNewIncome = () => {
    setEditingIncome(null)
    setFormDate(toInputDate(new Date()))
    setFormCategory('Empty Cement Bags Re-sale')
    setFormReceivedFrom('')
    setFormPhone('')
    setFormPaymentMode('Cash')
    setFormDepositAccount('Factory Petty Cash')
    setFormAmount(0)
    setFormReferenceNo('')
    setFormStatus('received')
    setFormNotes('')
    setIsFormOpen(true)
  }

  // Open Form to Edit Income
  const handleEditIncome = (inc: OtherIncomeRecord) => {
    setEditingIncome(inc)
    setFormDate(inc.date)
    setFormCategory(inc.category)
    setFormReceivedFrom(inc.received_from)
    setFormPhone(inc.received_from_phone || '')
    setFormPaymentMode(inc.payment_mode)
    setFormDepositAccount(inc.deposit_account)
    setFormAmount(inc.amount)
    setFormReferenceNo(inc.reference_no || '')
    setFormStatus(inc.status)
    setFormNotes(inc.notes || '')
    setIsFormOpen(true)
  }

  // Save Income
  const handleSaveIncome = () => {
    if (!formReceivedFrom.trim()) {
      toast.error('Source / Buyer / Party name is required')
      return
    }
    if (formAmount <= 0) {
      toast.error('Income amount must be greater than 0')
      return
    }

    if (editingIncome) {
      const updated: OtherIncomeRecord = {
        ...editingIncome,
        date: formDate,
        category: formCategory,
        received_from: formReceivedFrom.trim(),
        received_from_phone: formPhone.trim() || undefined,
        payment_mode: formPaymentMode,
        deposit_account: formDepositAccount,
        amount: Number(formAmount) || 0,
        gst_applicable: false,
        gst_amount: 0,
        reference_no: formReferenceNo.trim() || undefined,
        status: formStatus,
        notes: formNotes.trim() || undefined
      }
      const newIncomeList = incomeList.map(i => i.id === editingIncome.id ? updated : i)
      setIncomeList(newIncomeList)
      saveStoredIncome(newIncomeList)
      toast.success(`Money receipt ${updated.receipt_number} updated`)
    } else {
      const receiptNum = generateReceiptNumber(incomeList)
      const newInc: OtherIncomeRecord = {
        id: crypto.randomUUID(),
        receipt_number: receiptNum,
        date: formDate,
        category: formCategory,
        received_from: formReceivedFrom.trim(),
        received_from_phone: formPhone.trim() || undefined,
        payment_mode: formPaymentMode,
        deposit_account: formDepositAccount,
        amount: Number(formAmount) || 0,
        gst_applicable: false,
        gst_amount: 0,
        reference_no: formReferenceNo.trim() || undefined,
        status: formStatus,
        notes: formNotes.trim() || undefined,
        created_at: new Date().toISOString()
      }
      const newIncomeList = [newInc, ...incomeList]
      setIncomeList(newIncomeList)
      saveStoredIncome(newIncomeList)
      toast.success(`Receipt ${receiptNum} recorded successfully`)
    }

    setIsFormOpen(false)
    setEditingIncome(null)
  }

  // Delete Income
  const handleDeleteIncome = (id: string, num: string) => {
    if (!confirm(`Are you sure you want to delete Income Receipt ${num}?`)) return
    const remaining = incomeList.filter(i => i.id !== id)
    setIncomeList(remaining)
    saveStoredIncome(remaining)
    toast.success(`Receipt ${num} deleted`)
  }

  // Filtered income list
  const filteredIncome = useMemo(() => {
    return incomeList.filter(i => {
      const q = search.toLowerCase()
      const matchesSearch =
        i.receipt_number.toLowerCase().includes(q) ||
        i.received_from.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.reference_no && i.reference_no.toLowerCase().includes(q)) ||
        (i.notes && i.notes.toLowerCase().includes(q))

      const matchesCat = categoryFilter === 'all' || i.category === categoryFilter
      const matchesMode = modeFilter === 'all' || i.payment_mode === modeFilter

      return matchesSearch && matchesCat && matchesMode
    })
  }, [incomeList, search, categoryFilter, modeFilter])

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalAmount = incomeList.reduce((s, i) => s + (Number(i.amount) || 0), 0)
    const cementBags = incomeList.filter(i => i.category === 'Empty Cement Bags Re-sale').reduce((s, i) => s + (Number(i.amount) || 0), 0)
    const rubbleBroken = incomeList.filter(i => i.category === 'Broken Paver Scrap & Rubble').reduce((s, i) => s + (Number(i.amount) || 0), 0)
    const scrapMetalPallet = incomeList.filter(i => i.category.includes('Scrap') || i.category.includes('Pallet')).reduce((s, i) => s + (Number(i.amount) || 0), 0)

    return {
      totalCount: incomeList.length,
      totalAmount,
      cementBags,
      rubbleBroken,
      scrapMetalPallet
    }
  }, [incomeList])

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Receipt No', 'Date', 'Category', 'Received From', 'Payment Mode', 'Deposit Account', 'Amount', 'Reference / Gate Pass', 'Status', 'Notes']
    const rows = filteredIncome.map(i => [
      i.receipt_number,
      i.date,
      `"${i.category}"`,
      `"${i.received_from}"`,
      i.payment_mode,
      `"${i.deposit_account}"`,
      i.amount,
      `"${i.reference_no || ''}"`,
      i.status,
      `"${(i.notes || '').replace(/"/g, '""')}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `dd_enterprise_other_income_${toInputDate(new Date())}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Other income register downloaded as CSV')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Other &amp; Sundry Income"
        subtitle="Record factory non-operational revenues: scrap paver rubble, empty cement bag re-sales, pallet forfeitures & bank interest"
        icon={TrendingUp}
        action={{
          label: 'Record Other Income',
          icon: Plus,
          onClick: handleOpenNewIncome,
        }}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Total Other Revenue</p>
            <p className="text-xl font-bold text-on-surface font-mono">
              ₹{metrics.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <Recycle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Empty Cement Bag Re-sales</p>
            <p className="text-xl font-bold text-amber-600 font-mono">
              ₹{metrics.cementBags.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Broken Paver Rubble / Filling</p>
            <p className="text-xl font-bold text-blue-600 font-mono">
              ₹{metrics.rubbleBroken.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Scrap Metal &amp; Pallet Deposits</p>
            <p className="text-xl font-bold text-purple-600 font-mono">
              ₹{metrics.scrapMetalPallet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
            <input
              type="text"
              placeholder="Search receipt#, source, gate pass..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={handleExportCSV}
            title="Download CSV"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-outline-variant rounded-lg text-outline hover:text-on-surface hover:bg-surface-variant transition-colors shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-hidden"
          >
            <option value="all">All Income Categories</option>
            {INCOME_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={modeFilter}
            onChange={e => setModeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-hidden"
          >
            <option value="all">All Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredIncome.length === 0 ? (
        <EmptyState
          title="No Other Income Recorded"
          description={
            search || categoryFilter !== 'all' || modeFilter !== 'all'
              ? 'No income records match your search and filter criteria.'
              : 'Log non-operational receipts like empty cement bag sales, road sub-base rubble sales, and pallet deposits.'
          }
          icon={TrendingUp}
          action={{
            label: 'Record Other Income',
            onClick: handleOpenNewIncome,
          }}
        />
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-variant/40 text-xs uppercase font-semibold text-outline border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3">Receipt &amp; Date</th>
                  <th className="px-4 py-3">Income Head</th>
                  <th className="px-4 py-3">Received From</th>
                  <th className="px-4 py-3">Payment Mode &amp; Account</th>
                  <th className="px-4 py-3 text-right">Amount (INR)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {filteredIncome.map(inc => (
                  <tr key={inc.id} className="hover:bg-surface-variant/20 transition-colors">
                    {/* Receipt & Date */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-emerald-700 font-mono text-xs sm:text-sm">
                        {inc.receipt_number}
                      </div>
                      <div className="text-xs text-outline flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(inc.date)}
                      </div>
                      {inc.reference_no && (
                        <div className="text-[11px] text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 mt-1 inline-block font-mono">
                          Ref: {inc.reference_no}
                        </div>
                      )}
                    </td>

                    {/* Income Head */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-on-surface text-xs sm:text-sm">
                        {inc.category}
                      </div>
                      {inc.notes && (
                        <p className="text-xs text-outline line-clamp-2 mt-0.5 max-w-sm">
                          {inc.notes}
                        </p>
                      )}
                    </td>

                    {/* Received From */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-on-surface">
                        {inc.received_from}
                      </div>
                      {inc.received_from_phone && (
                        <div className="text-xs text-outline font-mono">
                          {inc.received_from_phone}
                        </div>
                      )}
                    </td>

                    {/* Mode & Account */}
                    <td className="px-4 py-3 align-top">
                      <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-variant text-on-surface">
                        {inc.payment_mode}
                      </div>
                      <div className="text-xs text-outline mt-0.5">
                        {inc.deposit_account}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 align-top text-right font-mono">
                      <div className="font-bold text-emerald-700 text-sm">
                        +₹{inc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 align-top text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-300">
                        Received
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Print Receipt */}
                        <button
                          onClick={() => setActivePrintIncome(inc)}
                          title="Print Money Receipt"
                          className="p-1.5 text-outline hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleEditIncome(inc)}
                          title="Edit Receipt"
                          className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-variant rounded-md transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteIncome(inc.id, inc.receipt_number)}
                          title="Delete Receipt"
                          className="p-1.5 text-outline hover:text-error hover:bg-error/10 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Income Form Drawer */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-surface w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-outline-variant animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-variant/30">
              <div>
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  {editingIncome ? `Edit Income: ${editingIncome.receipt_number}` : 'Record Other / Sundry Income'}
                </h2>
                <p className="text-xs text-outline mt-0.5">
                  Receipt for scrap paver rubble, empty cement sacks, and sundry recoveries
                </p>
              </div>
              <button
                onClick={() => {
                  setIsFormOpen(false)
                  setEditingIncome(null)
                }}
                className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Receipt Date *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Income Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
                  >
                    {INCOME_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Received With Thanks From (Buyer / Party) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maa Sarada Recyclers / Paul Construction / HDFC Bank"
                  value={formReceivedFrom}
                  onChange={e => setFormReceivedFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9831122334"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Gate Pass / Bank UTR / Memo Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SCRAP-GP-0021"
                    value={formReferenceNo}
                    onChange={e => setFormReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={formPaymentMode}
                    onChange={e => setFormPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Deposit Account / Cash Book *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Factory Petty Cash / HDFC Bank"
                    value={formDepositAccount}
                    onChange={e => setFormDepositAccount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="p-4 bg-surface-variant/30 rounded-xl border border-outline-variant/60">
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Total Net Amount Received (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="50"
                  placeholder="0"
                  value={formAmount || ''}
                  onChange={e => setFormAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-bold font-mono border border-outline-variant rounded-lg bg-surface text-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Item Description / Quantity Details
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Sold 1,200 pcs clean empty HDPE woven cement bags @ Rs. 5.50 each collected from Pan Mixer floor."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between bg-surface-variant/30">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false)
                  setEditingIncome(null)
                }}
                className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium text-outline hover:text-on-surface transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveIncome}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                {editingIncome ? 'Update Receipt' : 'Save Money Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Money Receipt Print Modal */}
      {activePrintIncome && (
        <OtherIncomeReceiptModal
          income={activePrintIncome}
          onClose={() => setActivePrintIncome(null)}
        />
      )}
    </div>
  )
}
