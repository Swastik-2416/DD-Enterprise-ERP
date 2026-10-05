import { useState, useMemo } from 'react'
import {
  TrendingDown, Plus, Search, Filter,
  Calendar, CheckCircle2, Clock,
  Printer, Trash2, Edit3, Download,
  X, Zap, Fuel, Wrench, Building2, ShieldCheck, FileSpreadsheet, IndianRupee
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, toInputDate, formatCurrency } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'
import { ExpenseVoucherModal } from '@/components/finance/ExpenseVoucherModal'
import {
  type ExpenseRecord,
  type ExpenseCategory,
  SEED_EXPENSES
} from '@/types/finance.types'

const LS_KEY = 'dd_expenses_list'

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Electricity & Power',
  'Diesel & DG Fuel',
  'Factory Rent & Land Lease',
  'Plant & Machinery Maintenance',
  'Mould Repairs & Hardfacing',
  'Wooden Pallets & Racks',
  'Testing & Lab Certifications',
  'Labour Welfare & Safety Gear',
  'Admin, Printing & Stationery',
  'Bank Charges & Interest',
  'Miscellaneous Expenses'
]

function generateVoucherNumber(existing: ExpenseRecord[]): string {
  const seq = existing.length + 1
  const now = new Date()
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyStr = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`
  return `EXP-${fyStr}-${String(seq).padStart(4, '0')}`
}

function loadStoredExpenses(): ExpenseRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED_EXPENSES))
      return SEED_EXPENSES
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_EXPENSES
  } catch {
    return SEED_EXPENSES
  }
}

function saveStoredExpenses(expenses: ExpenseRecord[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(expenses))
  } catch {}
}

export function ExpensesPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(loadStoredExpenses)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [modeFilter, setModeFilter] = useState<string>('all')

  // Print voucher modal state
  const [activePrintExpense, setActivePrintExpense] = useState<ExpenseRecord | null>(null)

  // Drawer / Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null)

  // Form Fields
  const [formDate, setFormDate] = useState(toInputDate(new Date()))
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Electricity & Power')
  const [formPayee, setFormPayee] = useState('')
  const [formPayeePhone, setFormPayeePhone] = useState('')
  const [formPaymentMode, setFormPaymentMode] = useState<ExpenseRecord['payment_mode']>('Bank Transfer')
  const [formAccountRef, setFormAccountRef] = useState('HDFC Bank (Current A/c)')
  const [formAmount, setFormAmount] = useState<number>(0)
  const [formGstPaid, setFormGstPaid] = useState<number>(0)
  const [formInvoiceRef, setFormInvoiceRef] = useState('')
  const [formStatus, setFormStatus] = useState<ExpenseRecord['status']>('paid')
  const [formNotes, setFormNotes] = useState('')

  // Open Form for New Expense
  const handleOpenNewExpense = () => {
    setEditingExpense(null)
    setFormDate(toInputDate(new Date()))
    setFormCategory('Electricity & Power')
    setFormPayee('')
    setFormPayeePhone('')
    setFormPaymentMode('Bank Transfer')
    setFormAccountRef('HDFC Bank (Current A/c)')
    setFormAmount(0)
    setFormGstPaid(0)
    setFormInvoiceRef('')
    setFormStatus('paid')
    setFormNotes('')
    setIsFormOpen(true)
  }

  // Open Form to Edit Expense
  const handleEditExpense = (exp: ExpenseRecord) => {
    setEditingExpense(exp)
    setFormDate(exp.date)
    setFormCategory(exp.category)
    setFormPayee(exp.payee_name)
    setFormPayeePhone(exp.payee_phone || '')
    setFormPaymentMode(exp.payment_mode)
    setFormAccountRef(exp.account_ref)
    setFormAmount(exp.amount)
    setFormGstPaid(exp.gst_paid || 0)
    setFormInvoiceRef(exp.invoice_ref || '')
    setFormStatus(exp.status)
    setFormNotes(exp.notes || '')
    setIsFormOpen(true)
  }

  // Save Expense
  const handleSaveExpense = () => {
    if (!formPayee.trim()) {
      toast.error('Payee or vendor name is required')
      return
    }
    if (formAmount <= 0) {
      toast.error('Expense amount must be greater than 0')
      return
    }

    if (editingExpense) {
      const updated: ExpenseRecord = {
        ...editingExpense,
        date: formDate,
        category: formCategory,
        payee_name: formPayee.trim(),
        payee_phone: formPayeePhone.trim() || undefined,
        payment_mode: formPaymentMode,
        account_ref: formAccountRef,
        amount: Number(formAmount) || 0,
        gst_paid: Number(formGstPaid) || 0,
        is_tax_deductible: true,
        invoice_ref: formInvoiceRef.trim() || undefined,
        status: formStatus,
        notes: formNotes.trim() || undefined
      }
      const newExpenses = expenses.map(e => e.id === editingExpense.id ? updated : e)
      setExpenses(newExpenses)
      saveStoredExpenses(newExpenses)
      toast.success(`Expense voucher ${updated.voucher_number} updated`)
    } else {
      const voucherNum = generateVoucherNumber(expenses)
      const newExp: ExpenseRecord = {
        id: crypto.randomUUID(),
        voucher_number: voucherNum,
        date: formDate,
        category: formCategory,
        payee_name: formPayee.trim(),
        payee_phone: formPayeePhone.trim() || undefined,
        payment_mode: formPaymentMode,
        account_ref: formAccountRef,
        amount: Number(formAmount) || 0,
        gst_paid: Number(formGstPaid) || 0,
        is_tax_deductible: true,
        invoice_ref: formInvoiceRef.trim() || undefined,
        status: formStatus,
        notes: formNotes.trim() || undefined,
        created_at: new Date().toISOString()
      }
      const newExpenses = [newExp, ...expenses]
      setExpenses(newExpenses)
      saveStoredExpenses(newExpenses)
      toast.success(`Expense voucher ${voucherNum} recorded successfully`)
    }

    setIsFormOpen(false)
    setEditingExpense(null)
  }

  // Delete Expense
  const handleDeleteExpense = (id: string, num: string) => {
    if (!confirm(`Are you sure you want to delete Expense Voucher ${num}?`)) return
    const remaining = expenses.filter(e => e.id !== id)
    setExpenses(remaining)
    saveStoredExpenses(remaining)
    toast.success(`Expense ${num} deleted`)
  }

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const q = search.toLowerCase()
      const matchesSearch =
        e.voucher_number.toLowerCase().includes(q) ||
        e.payee_name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.invoice_ref && e.invoice_ref.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q))

      const matchesCat = categoryFilter === 'all' || e.category === categoryFilter
      const matchesMode = modeFilter === 'all' || e.payment_mode === modeFilter

      return matchesSearch && matchesCat && matchesMode
    })
  }, [expenses, search, categoryFilter, modeFilter])

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalAmount = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const electricity = expenses.filter(e => e.category === 'Electricity & Power').reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const dieselFuel = expenses.filter(e => e.category === 'Diesel & DG Fuel').reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const repairs = expenses.filter(e => e.category.includes('Maintenance') || e.category.includes('Repairs')).reduce((s, e) => s + (Number(e.amount) || 0), 0)

    return {
      totalCount: expenses.length,
      totalAmount,
      electricity,
      dieselFuel,
      repairs
    }
  }, [expenses])

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Voucher No', 'Date', 'Category', 'Payee Name', 'Payment Mode', 'Account', 'Amount', 'GST Paid', 'Bill Ref', 'Status', 'Notes']
    const rows = filteredExpenses.map(e => [
      e.voucher_number,
      e.date,
      `"${e.category}"`,
      `"${e.payee_name}"`,
      e.payment_mode,
      `"${e.account_ref}"`,
      e.amount,
      e.gst_paid,
      `"${e.invoice_ref || ''}"`,
      e.status,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `dd_enterprise_expenses_${toInputDate(new Date())}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Expense ledger downloaded as CSV')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indirect & Factory Expenses"
        subtitle="Track factory overheads, electricity, generator diesel, machinery repairs, and operational outlays"
        icon={TrendingDown}
        action={{
          label: 'Record Expense',
          icon: Plus,
          onClick: handleOpenNewExpense,
        }}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-600 shrink-0">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Total Indirect Expenses</p>
            <p className="text-xl font-bold text-on-surface font-mono">
              ₹{metrics.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Electricity &amp; Power</p>
            <p className="text-xl font-bold text-amber-600 font-mono">
              ₹{metrics.electricity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Diesel &amp; DG Sets Fuel</p>
            <p className="text-xl font-bold text-blue-600 font-mono">
              ₹{metrics.dieselFuel.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Repairs &amp; Maintenance</p>
            <p className="text-xl font-bold text-purple-600 font-mono">
              ₹{metrics.repairs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
              placeholder="Search voucher#, payee, bill ref..."
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
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={modeFilter}
            onChange={e => setModeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-hidden"
          >
            <option value="all">All Modes</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredExpenses.length === 0 ? (
        <EmptyState
          title="No Expenses Recorded"
          description={
            search || categoryFilter !== 'all' || modeFilter !== 'all'
              ? 'No expense vouchers match your search and filter criteria.'
              : 'Record factory overheads like electricity, DG fuel, repairs, and land lease.'
          }
          icon={TrendingDown}
          action={{
            label: 'Record First Expense',
            onClick: handleOpenNewExpense,
          }}
        />
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-variant/40 text-xs uppercase font-semibold text-outline border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3">Voucher &amp; Date</th>
                  <th className="px-4 py-3">Expense Head</th>
                  <th className="px-4 py-3">Payee / Vendor</th>
                  <th className="px-4 py-3">Payment Mode &amp; Account</th>
                  <th className="px-4 py-3 text-right">Amount (INR)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {filteredExpenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-surface-variant/20 transition-colors">
                    {/* Voucher & Date */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-primary font-mono text-xs sm:text-sm">
                        {expense.voucher_number}
                      </div>
                      <div className="text-xs text-outline flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(expense.date)}
                      </div>
                      {expense.invoice_ref && (
                        <div className="text-[11px] text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 mt-1 inline-block font-mono">
                          Bill: {expense.invoice_ref}
                        </div>
                      )}
                    </td>

                    {/* Expense Head */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-on-surface text-xs sm:text-sm">
                        {expense.category}
                      </div>
                      {expense.notes && (
                        <p className="text-xs text-outline line-clamp-2 mt-0.5 max-w-sm">
                          {expense.notes}
                        </p>
                      )}
                    </td>

                    {/* Payee / Vendor */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-on-surface">
                        {expense.payee_name}
                      </div>
                      {expense.payee_phone && (
                        <div className="text-xs text-outline font-mono">
                          {expense.payee_phone}
                        </div>
                      )}
                    </td>

                    {/* Mode & Account */}
                    <td className="px-4 py-3 align-top">
                      <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-variant text-on-surface">
                        {expense.payment_mode}
                      </div>
                      <div className="text-xs text-outline mt-0.5">
                        {expense.account_ref}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 align-top text-right font-mono">
                      <div className="font-bold text-on-surface text-sm">
                        ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      {expense.gst_paid > 0 && (
                        <div className="text-[11px] text-outline">
                          Incl. GST: ₹{expense.gst_paid.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 align-top text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-300">
                        Paid
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Print Voucher */}
                        <button
                          onClick={() => setActivePrintExpense(expense)}
                          title="Print Payment Voucher"
                          className="p-1.5 text-outline hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleEditExpense(expense)}
                          title="Edit Expense"
                          className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-variant rounded-md transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteExpense(expense.id, expense.voucher_number)}
                          title="Delete Expense"
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

      {/* Expense Form Drawer */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-surface w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-outline-variant animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-variant/30">
              <div>
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  {editingExpense ? `Edit Expense: ${editingExpense.voucher_number}` : 'Record Factory / Indirect Expense'}
                </h2>
                <p className="text-xs text-outline mt-0.5">
                  Log operational disbursements for power, diesel, plant repairs, and overheads
                </p>
              </div>
              <button
                onClick={() => {
                  setIsFormOpen(false)
                  setEditingExpense(null)
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
                    Disbursement Date *
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
                    Expense Head / Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Payee / Vendor / Party Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. WBSEDCL / Maa Tara Filling Station / Ghosh Engineering"
                  value={formPayee}
                  onChange={e => setFormPayee(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Payee Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9830022441"
                    value={formPayeePhone}
                    onChange={e => setFormPayeePhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Bill / Cash Memo / Invoice Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WBSEDCL/SEP/9912"
                    value={formInvoiceRef}
                    onChange={e => setFormInvoiceRef(e.target.value)}
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
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Debited Account / Petty Cash *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank / Factory Petty Cash"
                    value={formAccountRef}
                    onChange={e => setFormAccountRef(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-surface-variant/30 rounded-xl border border-outline-variant/60">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Total Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="50"
                    placeholder="0"
                    value={formAmount || ''}
                    onChange={e => setFormAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-base font-bold font-mono border border-outline-variant rounded-lg bg-surface text-red-600 focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    GST Included (Optional ₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formGstPaid || ''}
                    onChange={e => setFormGstPaid(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-[10px] text-outline mt-0.5 block">For GST input credit if tax invoice</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Particulars / Description / Machine Log Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. 350 Litres high speed diesel for Kirloskar 125 kVA generator during 14 hour power disruption."
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
                  setEditingExpense(null)
                }}
                className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium text-outline hover:text-on-surface transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveExpense}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                {editingExpense ? 'Update Expense' : 'Save Expense Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Voucher Print Modal */}
      {activePrintExpense && (
        <ExpenseVoucherModal
          expense={activePrintExpense}
          onClose={() => setActivePrintExpense(null)}
        />
      )}
    </div>
  )
}
