import { useState, useMemo } from 'react'
import {
  CreditCard, Plus, Search, Filter,
  Calendar, CheckCircle2, Clock, Truck,
  Trash2, Eye, Building2, DollarSign,
  TrendingDown, FileText, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, formatDate, toInputDate } from '@/lib/formatters'
import {
  type TransporterPaymentRecord,
  type Transporter,
  type FreightTrip,
  SEED_TRANSPORTERS
} from '@/types/transport.types'

const LS_PAYMENTS_KEY = 'dd_transporter_payments_list'
const LS_TRIPS_KEY = 'dd_freight_register_trips'

function generatePaymentNumber(existing: TransporterPaymentRecord[]): string {
  const seq = existing.length + 1
  const now = new Date()
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyStr = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`
  return `TPAY-${fyStr}-${String(seq).padStart(4, '0')}`
}

const SEED_PAYMENTS: TransporterPaymentRecord[] = [
  {
    id: 'tpay-1',
    payment_number: 'TPAY-2425-0001',
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    transporter_id: 'trans-3',
    transporter_name: 'Bengal Dumper Syndicate',
    amount: 20700,
    payment_mode: 'Bank Transfer (NEFT/RTGS)',
    reference_no: 'NEFT98273641289',
    linked_trip_numbers: ['TRIP-2425-0003'],
    notes: 'Final settlement for Pakur stone chips dumper transit.',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'tpay-2',
    payment_number: 'TPAY-2425-0002',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    transporter_id: 'trans-1',
    transporter_name: 'Maa Tara Roadways',
    amount: 2000,
    payment_mode: 'Cash',
    reference_no: 'PETTY-0412',
    linked_trip_numbers: ['TRIP-2425-0001'],
    notes: 'Driver fuel advance given at factory gate before dispatch.',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  }
]

function loadStoredPayments(): TransporterPaymentRecord[] {
  try {
    const raw = localStorage.getItem(LS_PAYMENTS_KEY)
    if (!raw) {
      localStorage.setItem(LS_PAYMENTS_KEY, JSON.stringify(SEED_PAYMENTS))
      return SEED_PAYMENTS
    }
    return JSON.parse(raw)
  } catch {
    return SEED_PAYMENTS
  }
}

function saveStoredPayments(payments: TransporterPaymentRecord[]) {
  try {
    localStorage.setItem(LS_PAYMENTS_KEY, JSON.stringify(payments))
  } catch {}
}

export function TransporterPaymentsPage() {
  const [payments, setPayments] = useState<TransporterPaymentRecord[]>(loadStoredPayments)
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [prefilledTransporter, setPrefilledTransporter] = useState<string>('')

  // Calculate transporter balances based on trips in localStorage
  const transporterBalances = useMemo(() => {
    let trips: FreightTrip[] = []
    try {
      trips = JSON.parse(localStorage.getItem(LS_TRIPS_KEY) || '[]')
    } catch {}

    const balanceMap: Record<string, { totalBilled: number; totalPaid: number; balance: number }> = {}

    // Initialize all transporters
    SEED_TRANSPORTERS.forEach(t => {
      balanceMap[t.name] = { totalBilled: 0, totalPaid: 0, balance: 0 }
    })

    // Accumulate freight billed and advances from trips
    trips.forEach(tr => {
      const name = tr.transporter_name
      if (!balanceMap[name]) {
        balanceMap[name] = { totalBilled: 0, totalPaid: 0, balance: 0 }
      }
      balanceMap[name].totalBilled += tr.total_freight
      balanceMap[name].totalPaid += tr.advance_paid
    })

    // Accumulate standalone payments
    payments.forEach(p => {
      const name = p.transporter_name
      if (!balanceMap[name]) {
        balanceMap[name] = { totalBilled: 0, totalPaid: 0, balance: 0 }
      }
      balanceMap[name].totalPaid += p.amount
    })

    // Compute balance
    Object.keys(balanceMap).forEach(k => {
      const diff = balanceMap[k].totalBilled - balanceMap[k].totalPaid
      balanceMap[k].balance = diff < 0 ? 0 : diff
    })

    return balanceMap
  }, [payments])

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchSearch =
        p.payment_number.toLowerCase().includes(search.toLowerCase()) ||
        p.transporter_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.reference_no && p.reference_no.toLowerCase().includes(search.toLowerCase())) ||
        (p.notes && p.notes.toLowerCase().includes(search.toLowerCase()))

      const matchMode = modeFilter === 'all' || p.payment_mode === modeFilter
      return matchSearch && matchMode
    })
  }, [payments, search, modeFilter])

  // Metric stats
  const metrics = useMemo(() => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalOutstanding = Object.values(transporterBalances).reduce((sum, b) => sum + b.balance, 0)
    const paymentsCount = payments.length
    return { totalPaid, totalOutstanding, paymentsCount }
  }, [payments, transporterBalances])

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this payment record?')) {
      setPayments(prev => {
        const next = prev.filter(p => p.id !== id)
        saveStoredPayments(next)
        return next
      })
      toast.success('Payment voucher deleted')
    }
  }

  const handleSavePayment = (record: TransporterPaymentRecord) => {
    setPayments(prev => {
      const next = [record, ...prev]
      saveStoredPayments(next)
      return next
    })
    setIsFormOpen(false)
    setPrefilledTransporter('')
    toast.success('Transporter payment recorded successfully')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Transporter Payments"
        subtitle="Manage lorry freight settlements, driver fuel advances, trip vouchers & transport ledger balances"
        icon={CreditCard}
        action={{
          label: 'Record Payment',
          icon: Plus,
          onClick: () => {
            setPrefilledTransporter('')
            setIsFormOpen(true)
          },
        }}
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Total Freight Disbursements</p>
            <p className="text-xl font-bold text-on-surface font-mono">
              ₹{metrics.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Pending Transporter Payables</p>
            <p className="text-xl font-bold text-amber-600 font-mono">
              ₹{metrics.totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Vouchers Recorded</p>
            <p className="text-xl font-bold text-on-surface">{metrics.paymentsCount}</p>
          </div>
        </div>
      </div>

      {/* Transporter Balance Overview Cards */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-primary" />
          Transporter Outstanding Ledgers
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SEED_TRANSPORTERS.map(trans => {
            const bal = transporterBalances[trans.name] || { totalBilled: 0, totalPaid: 0, balance: 0 }
            return (
              <div
                key={trans.id}
                className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-on-surface truncate">{trans.name}</span>
                    <span className="text-[10px] text-outline px-1.5 py-0.5 bg-surface-container rounded">
                      {trans.city}
                    </span>
                  </div>
                  <p className="text-xs text-outline mt-0.5">Contact: {trans.contact_person} ({trans.phone})</p>
                  <p className="text-[11px] text-outline font-mono mt-0.5">
                    Fleet: {trans.vehicle_numbers?.join(', ') || 'Various'}
                  </p>
                </div>

                <div className="pt-2 border-t border-outline-variant flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-outline block">Outstanding Payable</span>
                    <span className="font-mono font-bold text-amber-600 text-sm">
                      ₹{bal.balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrefilledTransporter(trans.name)
                      setIsFormOpen(true)
                    }}
                    className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Pay Transporter
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Search voucher#, transporter, ref#..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-outline flex items-center gap-1 shrink-0">
            <Filter className="h-3.5 w-3.5" /> Mode:
          </span>
          {['all', 'Cash', 'Bank Transfer (NEFT/RTGS)', 'UPI', 'Cheque'].map(m => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`px-3 py-1 text-xs font-medium rounded-full uppercase whitespace-nowrap transition-colors ${
                modeFilter === m
                  ? 'bg-primary text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {m === 'Bank Transfer (NEFT/RTGS)' ? 'Bank Transfer' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden">
        {filteredPayments.length === 0 ? (
          <EmptyState
            title="No Payment Vouchers found"
            description="Record payments made to transporters for logistics settlements or diesel advances."
            icon={CreditCard}
            action={{
              label: 'Record Payment',
              onClick: () => {
                setPrefilledTransporter('')
                setIsFormOpen(true)
              },
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container/50 text-xs font-semibold text-outline uppercase tracking-wider">
                  <th className="py-3 px-4">Voucher No & Date</th>
                  <th className="py-3 px-4">Transporter</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4">Payment Mode & Reference</th>
                  <th className="py-3 px-4">Linked Trips / Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-surface-container/30 transition-colors">
                    {/* Voucher No */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary font-mono">{p.payment_number}</div>
                      <div className="text-xs text-outline flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(p.date)}
                      </div>
                    </td>

                    {/* Transporter */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-on-surface">{p.transporter_name}</div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-green-700 dark:text-green-400 font-mono text-base">
                        {formatCurrency(p.amount)}
                      </div>
                    </td>

                    {/* Mode */}
                    <td className="py-3 px-4">
                      <div className="text-xs font-semibold text-on-surface">{p.payment_mode}</div>
                      {p.reference_no && (
                        <div className="text-[11px] text-outline font-mono">Ref: {p.reference_no}</div>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 max-w-xs">
                      {p.linked_trip_numbers && p.linked_trip_numbers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {p.linked_trip_numbers.map(tn => (
                            <span key={tn} className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-semibold">
                              {tn}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-outline truncate">{p.notes || '—'}</div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 text-error hover:bg-error-container/20 rounded-md transition-colors"
                        title="Delete Payment Voucher"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      {isFormOpen && (
        <TransporterPaymentModal
          prefilledTransporter={prefilledTransporter}
          transporterBalances={transporterBalances}
          existingPayments={payments}
          onSave={handleSavePayment}
          onClose={() => {
            setIsFormOpen(false)
            setPrefilledTransporter('')
          }}
        />
      )}
    </div>
  )
}

// ─── Payment Form Modal ───────────────────────────────────────────────────────────

interface PaymentModalProps {
  prefilledTransporter?: string
  transporterBalances: Record<string, { totalBilled: number; totalPaid: number; balance: number }>
  existingPayments: TransporterPaymentRecord[]
  onSave: (record: TransporterPaymentRecord) => void
  onClose: () => void
}

function TransporterPaymentModal({
  prefilledTransporter,
  transporterBalances,
  existingPayments,
  onSave,
  onClose,
}: PaymentModalProps) {
  const [transporterName, setTransporterName] = useState(
    prefilledTransporter || SEED_TRANSPORTERS[0]?.name || 'Maa Tara Roadways'
  )
  const [date, setDate] = useState(toInputDate(new Date()))
  const [amount, setAmount] = useState<number>(0)
  const [paymentMode, setPaymentMode] = useState<TransporterPaymentRecord['payment_mode']>(
    'Bank Transfer (NEFT/RTGS)'
  )
  const [referenceNo, setReferenceNo] = useState('')
  const [tripNumbersText, setTripNumbersText] = useState('')
  const [notes, setNotes] = useState('')

  const currentBal = transporterBalances[transporterName]?.balance || 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    const paymentNumber = generatePaymentNumber(existingPayments)
    const linkedTrips = tripNumbersText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const finalRecord: TransporterPaymentRecord = {
      id: crypto.randomUUID(),
      payment_number: paymentNumber,
      date,
      transporter_id: 'trans-1',
      transporter_name: transporterName,
      amount: Number(amount),
      payment_mode: paymentMode,
      reference_no: referenceNo || undefined,
      linked_trip_numbers: linkedTrips.length > 0 ? linkedTrips : undefined,
      notes: notes || undefined,
      created_at: new Date().toISOString(),
    }

    onSave(finalRecord)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full flex flex-col border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface shrink-0">
          <div>
            <h3 className="text-base font-bold text-on-surface">Record Transporter Payment</h3>
            <p className="text-xs text-outline mt-0.5">Disburse freight settlement or fuel advance</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Select Transporter <span className="text-error">*</span>
            </label>
            <select
              required
              value={transporterName}
              onChange={e => setTransporterName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              {SEED_TRANSPORTERS.map(t => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.city})
                </option>
              ))}
            </select>
          </div>

          {/* Current balance indicator */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between text-xs">
            <span className="text-amber-800 dark:text-amber-200">Current Pending Balance:</span>
            <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-sm">
              ₹{currentBal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Payment Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Amount to Disburse (₹) <span className="text-error">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono font-bold border border-outline-variant rounded-lg bg-surface text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value as TransporterPaymentRecord['payment_mode'])}
                className="w-full px-3 py-2 text-xs border border-outline-variant rounded-lg bg-surface font-medium"
              >
                <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash (Driver Fuel)</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Reference / UTR / Cheque No.
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="UTR or Cheque#"
                className="w-full px-3 py-2 text-xs font-mono border border-outline-variant rounded-lg bg-surface"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Linked Trip Numbers (Comma separated)
            </label>
            <input
              type="text"
              value={tripNumbersText}
              onChange={e => setTripNumbersText(e.target.value)}
              placeholder="e.g. TRIP-2425-0001, TRIP-2425-0002"
              className="w-full px-3 py-2 text-xs font-mono border border-outline-variant rounded-lg bg-surface"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Remarks / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Settlement for March consignments"
              className="w-full px-3 py-2 text-xs border border-outline-variant rounded-lg bg-surface"
            />
          </div>

          <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container rounded-lg border border-outline-variant"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
