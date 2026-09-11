import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard, Plus, Search, ArrowDownLeft, ArrowUpRight,
  Filter, X, Check, Loader2, Landmark, User, Building2,
  Calendar, Printer, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import type { Payment, PaymentType, Customer, Supplier, Invoice } from '@/types/database.types'

interface PaymentWithParties extends Payment {
  customer?: Customer
  supplier?: Supplier
}

interface PaymentsPageProps {
  defaultType?: PaymentType
}

// ─── Data Hooks ─────────────────────────────────────────────────────────────

function usePayments(companyId: string) {
  return useQuery({
    queryKey: ['payments', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customer:customers(id, name, gstin, phone, city),
          supplier:suppliers(id, name, gstin, phone, city)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []) as PaymentWithParties[]
    },
    enabled: !!companyId,
  })
}

function useCustomers(companyId: string) {
  return useQuery({
    queryKey: ['customers_list', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data || []) as Customer[]
    },
    enabled: !!companyId,
  })
}

function useSuppliers(companyId: string) {
  return useQuery({
    queryKey: ['suppliers_list', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data || []) as Supplier[]
    },
    enabled: !!companyId,
  })
}

function useCustomerInvoices(companyId: string, customerId: string) {
  return useQuery({
    queryKey: ['customer_unpaid_invoices', companyId, customerId],
    queryFn: async () => {
      if (!customerId) return []
      const { data, error } = await (supabase.from('invoices') as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })

      if (error) throw error
      return (data || []) as Invoice[]
    },
    enabled: !!companyId && !!customerId,
  })
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PaymentsPage({ defaultType }: PaymentsPageProps) {
  const { user, isManager } = useAuth()
  const companyId = user?.company_id || ''
  const userId = user?.id || ''
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'all' | 'inward' | 'outward'>(defaultType ?? 'all')
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithParties | null>(null)
  const [showModal, setShowModal] = useState(false)

  const { data: payments = [], isLoading } = usePayments(companyId)
  const { data: customers = [] } = useCustomers(companyId)
  const { data: suppliers = [] } = useSuppliers(companyId)

  const filtered = payments.filter(p => {
    const partyName =
      p.party_type === 'customer'
        ? p.customer?.name ?? ''
        : p.supplier?.name ?? ''

    const matchTab = activeTab === 'all' || p.type === activeTab
    const q = search.toLowerCase()
    const matchSearch =
      p.payment_number.toLowerCase().includes(q) ||
      (p.reference?.toLowerCase() ?? '').includes(q) ||
      partyName.toLowerCase().includes(q)
    const matchMode =
      modeFilter === 'all' || p.mode.toLowerCase().includes(modeFilter.toLowerCase())

    return matchTab && matchSearch && matchMode
  })

  // Totals
  const totalInward = payments
    .filter(p => p.type === 'inward' && p.status === 'posted')
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)

  const totalOutward = payments
    .filter(p => p.type === 'outward' && p.status === 'posted')
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)

  const netCashflow = totalInward - totalOutward

  // Cancel Voucher Mutation
  const cancelVoucherMutation = useMutation({
    mutationFn: async (p: PaymentWithParties) => {
      const { error } = await (supabase.from('payments') as any)
        .update({ status: 'cancelled' })
        .eq('id', p.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', companyId] })
      queryClient.invalidateQueries({ queryKey: ['sales_invoices', companyId] })
      queryClient.invalidateQueries({ queryKey: ['customer_outstanding', companyId] })
      setSelectedPayment(null)
      toast.success('Payment voucher cancelled')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel voucher')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments & Receipts"
        subtitle="Track customer receipts, vendor disbursements, banking transactions, and invoice reconciliations"
        action={
          isManager
            ? {
                label: 'Record Payment',
                icon: Plus,
                onClick: () => setShowModal(true),
              }
            : undefined
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Customer Receipts
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface mt-2">
            {formatCurrency(totalInward)}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Inflow from clients</div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Supplier Payments
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface mt-2">
            {formatCurrency(totalOutward)}
          </div>
          <div className="text-xs text-rose-600 font-medium mt-1">Outflow for raw materials</div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Net Cash Position
            </span>
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div
            className={cn(
              'text-2xl font-bold mt-2',
              netCashflow >= 0 ? 'text-primary' : 'text-rose-600'
            )}
          >
            {formatCurrency(netCashflow)}
          </div>
          <div className="text-xs text-outline mt-1">Net Operating Balance</div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex bg-surface-container p-1 rounded-xl border border-outline-variant text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-4 py-1.5 rounded-lg transition-all',
              activeTab === 'all'
                ? 'bg-surface text-on-surface shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            All Vouchers ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inward')}
            className={cn(
              'px-4 py-1.5 rounded-lg transition-all',
              activeTab === 'inward'
                ? 'bg-surface text-emerald-700 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            Customer Receipts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outward')}
            className={cn(
              'px-4 py-1.5 rounded-lg transition-all',
              activeTab === 'outward'
                ? 'bg-surface text-rose-700 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            Supplier Payments
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
            <input
              type="text"
              placeholder="Search reference or party..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <select
            value={modeFilter}
            onChange={e => setModeFilter(e.target.value)}
            aria-label="Filter payments by mode"
            className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm focus:outline-hidden"
          >
            <option value="all">All Modes</option>
            <option value="bank">NEFT / RTGS</option>
            <option value="cheque">Cheque</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={search ? 'No payments match your search' : 'No payment vouchers recorded'}
            description="Record incoming payments from client buyers or outgoing disbursements to raw material suppliers."
            action={
              isManager
                ? {
                    label: 'Record First Payment',
                    onClick: () => setShowModal(true),
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-outline-variant text-xs uppercase font-semibold text-on-surface-variant">
                <tr>
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Reference #</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {filtered.map(p => {
                  const partyName =
                    p.party_type === 'customer'
                      ? p.customer?.name ?? 'Customer'
                      : p.supplier?.name ?? 'Supplier'

                  return (
                    <tr key={p.id} className="hover:bg-background/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-on-surface">
                        {p.payment_number}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                            p.type === 'inward'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          )}
                        >
                          {p.type === 'inward' ? (
                            <>
                              <ArrowDownLeft className="h-3 w-3" />
                              Receipt
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3 w-3" />
                              Payment
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-on-surface">{partyName}</td>
                      <td className="py-3 px-4 text-on-surface-variant capitalize">
                        {p.mode.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-outline">
                        {p.reference || '—'}
                      </td>
                      <td
                        className={cn(
                          'py-3 px-4 text-right font-bold',
                          p.type === 'inward' ? 'text-emerald-600' : 'text-rose-600'
                        )}
                      >
                        {p.type === 'inward' ? '+' : '-'}
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedPayment(p)}
                          className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Voucher Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 border border-outline-variant my-8">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant mb-4">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span>{selectedPayment.payment_number}</span>
                  <StatusBadge status={selectedPayment.status} />
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  Voucher Date: {formatDate(selectedPayment.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="text-outline hover:text-on-surface text-xl font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-background rounded-xl p-4 border border-outline-variant space-y-2">
                <div className="flex justify-between text-xs text-outline">
                  <span>Transaction Type:</span>
                  <span className="font-semibold text-on-surface uppercase">
                    {selectedPayment.type === 'inward' ? 'Inward Receipt' : 'Outward Disbursement'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Party Name:</span>
                  <span className="font-bold text-on-surface">
                    {selectedPayment.party_type === 'customer'
                      ? selectedPayment.customer?.name
                      : selectedPayment.supplier?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Payment Mode:</span>
                  <span className="capitalize font-medium text-on-surface">
                    {selectedPayment.mode.replace('_', ' ')}
                  </span>
                </div>
                {selectedPayment.reference && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Reference / UTR:</span>
                    <span className="font-mono text-xs text-on-surface">
                      {selectedPayment.reference}
                    </span>
                  </div>
                )}
                <div className="h-px bg-outline-variant/60 my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Amount:</span>
                  <span
                    className={
                      selectedPayment.type === 'inward' ? 'text-emerald-600' : 'text-rose-600'
                    }
                  >
                    {formatCurrency(selectedPayment.amount)}
                  </span>
                </div>
              </div>

              {selectedPayment.notes && (
                <div className="p-3 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface-variant">
                  💬 <span className="font-medium">Memo:</span> {selectedPayment.notes}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 border border-outline-variant text-xs font-medium rounded-lg hover:bg-background flex items-center gap-1 text-on-surface-variant"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </button>

                {isManager && selectedPayment.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Cancel this payment voucher?')) {
                        cancelVoucherMutation.mutate(selectedPayment)
                      }
                    }}
                    disabled={cancelVoucherMutation.isPending}
                    className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 flex items-center gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel Voucher
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showModal && isManager && (
        <RecordPaymentModal
          companyId={companyId}
          userId={userId}
          existingPaymentCount={payments.length}
          customers={customers}
          suppliers={suppliers}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['payments', companyId] })
            queryClient.invalidateQueries({ queryKey: ['sales_invoices', companyId] })
            queryClient.invalidateQueries({ queryKey: ['customer_outstanding', companyId] })
          }}
        />
      )}
    </div>
  )
}

// ─── Record Payment Modal Component ──────────────────────────────────────────

interface RecordPaymentModalProps {
  companyId: string
  userId: string
  existingPaymentCount: number
  customers: Customer[]
  suppliers: Supplier[]
  onClose: () => void
  onSuccess: () => void
}

function RecordPaymentModal({
  companyId,
  userId,
  existingPaymentCount,
  customers,
  suppliers,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const [type, setType] = useState<PaymentType>('inward')
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer')
  const [customerId, setCustomerId] = useState(customers[0]?.id || '')
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '')
  const [amount, setAmount] = useState<number | ''>('')
  const [mode, setMode] = useState('bank_transfer')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')

  // Query unpaid invoices for customer
  const { data: customerInvoices = [] } = useCustomerInvoices(
    companyId,
    partyType === 'customer' ? customerId : ''
  )

  const unpaidInvoices = customerInvoices.filter(
    inv => (Number(inv.total_amount) || 0) > (Number(inv.paid_amount) || 0)
  )

  const now = new Date()
  const year = now.getFullYear() % 100
  const fy = `${year}${year + 1}`
  const prefix = type === 'inward' ? 'REC' : 'PAY'
  const paymentNumber = `${prefix}-${fy}-${String(existingPaymentCount + 1).padStart(4, '0')}`

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (partyType === 'customer' && !customerId) {
      toast.error('Please select a customer')
      return
    }
    if (partyType === 'supplier' && !supplierId) {
      toast.error('Please select a supplier')
      return
    }

    setIsSubmitting(true)
    try {
      const payAmount = Number(amount)

      // 1. Insert payment row
      const { error: payErr } = await (supabase.from('payments') as any).insert({
        company_id: companyId,
        payment_number: paymentNumber,
        type: type,
        party_type: partyType,
        customer_id: partyType === 'customer' ? customerId : null,
        supplier_id: partyType === 'supplier' ? supplierId : null,
        date: date,
        mode: mode,
        reference: reference.trim() || null,
        amount: payAmount,
        allocated_amount: selectedInvoiceId ? payAmount : 0,
        unallocated_amount: selectedInvoiceId ? 0 : payAmount,
        status: 'posted',
        notes: notes.trim() || null,
        created_by: userId,
      })

      if (payErr) throw payErr

      // 2. If allocated to an invoice, increment invoice's paid_amount
      if (selectedInvoiceId) {
        const inv = customerInvoices.find(i => i.id === selectedInvoiceId)
        if (inv) {
          const currentPaid = Number(inv.paid_amount) || 0
          const total = Number(inv.total_amount) || 0
          const newPaid = Math.min(total, currentPaid + payAmount)

          await (supabase.from('invoices') as any)
            .update({
              paid_amount: newPaid,
              updated_at: new Date().toISOString(),
            })
            .eq('id', selectedInvoiceId)
        }
      }

      toast.success(
        type === 'inward'
          ? 'Customer receipt voucher saved & allocated!'
          : 'Supplier payment voucher saved!'
      )
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment voucher')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-outline-variant my-8">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant mb-4">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Record Payment Voucher</h3>
            <p className="text-xs text-outline mt-0.5">
              Record customer collection receipt or vendor disbursement
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-background"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Transaction Type
              </label>
              <select
                value={type}
                onChange={e => {
                  const t = e.target.value as PaymentType
                  setType(t)
                  setPartyType(t === 'inward' ? 'customer' : 'supplier')
                }}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="inward">Inward (Customer Receipt)</option>
                <option value="outward">Outward (Supplier Payment)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Voucher Number
              </label>
              <input
                type="text"
                disabled
                value={paymentNumber}
                className="w-full px-3 py-2 text-sm font-mono bg-background border border-outline-variant rounded-lg text-outline"
              />
            </div>
          </div>

          {/* Party Selection */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Select {partyType === 'customer' ? 'Customer' : 'Supplier'}{' '}
              <span className="text-red-500">*</span>
            </label>
            {partyType === 'customer' ? (
              <select
                value={customerId}
                onChange={e => {
                  setCustomerId(e.target.value)
                  setSelectedInvoiceId('')
                }}
                required
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="50000"
                value={amount}
                onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Payment Mode
              </label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="bank_transfer">NEFT / RTGS / IMPS</option>
                <option value="upi">UPI (GPay / PhonePe)</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Reference / UTR / Cheque #
              </label>
              <input
                type="text"
                placeholder="e.g. UTR12345678"
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Optional Invoice Allocation for Inward Receipts */}
          {partyType === 'customer' && unpaidInvoices.length > 0 && (
            <div className="p-3 bg-background rounded-xl border border-outline-variant space-y-1.5">
              <label className="block text-xs font-semibold text-on-surface">
                Allocate to Pending Invoice (Optional)
              </label>
              <select
                value={selectedInvoiceId}
                onChange={e => setSelectedInvoiceId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary"
              >
                <option value="">General On-Account Receipt (No specific invoice)</option>
                {unpaidInvoices.map(inv => {
                  const due =
                    (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0)
                  return (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} · Due: {formatCurrency(due)} (Total: {formatCurrency(inv.total_amount)})
                    </option>
                  )
                })}
              </select>
              <p className="text-[11px] text-outline">
                Selecting an invoice updates its paid status directly in the sales register.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Notes / Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Advance for 10,000 pcs 60mm paver order"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-on-surface-variant border border-outline-variant rounded-lg hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 font-medium shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting Voucher...
                </>
              ) : (
                'Post Voucher'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
