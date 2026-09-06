import { useState } from 'react'
import { CreditCard, Plus, Search, ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { mockPayments, mockCustomers, mockSuppliers, getCustomerById, getSupplierById } from '@/lib/mockData'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import type { Payment, PaymentType } from '@/types/database.types'

interface PaymentsPageProps {
  defaultType?: PaymentType
}

export function PaymentsPage({ defaultType }: PaymentsPageProps) {
  const { isManager } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'inward' | 'outward'>(defaultType ?? 'all')
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)

  const filtered = mockPayments.filter(p => {
    const partyName = p.party_type === 'customer'
      ? getCustomerById(p.customer_id ?? '')?.name ?? ''
      : getSupplierById(p.supplier_id ?? '')?.name ?? ''

    const matchTab = activeTab === 'all' || p.type === activeTab
    const matchSearch =
      p.payment_number.toLowerCase().includes(search.toLowerCase()) ||
      (p.reference?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      partyName.toLowerCase().includes(search.toLowerCase())
    const matchMode = modeFilter === 'all' || p.mode.toLowerCase().includes(modeFilter.toLowerCase())

    return matchTab && matchSearch && matchMode
  })

  const totalInward = mockPayments
    .filter(p => p.type === 'inward' && p.status === 'posted')
    .reduce((s, p) => s + p.amount, 0)

  const totalOutward = mockPayments
    .filter(p => p.type === 'outward' && p.status === 'posted')
    .reduce((s, p) => s + p.amount, 0)

  const netCashflow = totalInward - totalOutward

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments & Receipts"
        subtitle="Manage customer collections, supplier disbursements, and bank/cash vouchers"
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
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Receipts</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalInward)}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Inflow from clients</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier Payments</span>
            <div className="h-7 w-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalOutward)}</div>
          <div className="text-xs text-rose-600 font-medium mt-1">Outflow for raw materials</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Cash Position</span>
            <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className={cn('text-2xl font-bold mt-2', netCashflow >= 0 ? 'text-blue-600' : 'text-rose-600')}>
            {formatCurrency(netCashflow)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Operating surplus</div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-4 py-1.5 rounded-md transition-all',
              activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            All Vouchers ({mockPayments.length})
          </button>
          <button
            onClick={() => setActiveTab('inward')}
            className={cn(
              'px-4 py-1.5 rounded-md transition-all',
              activeTab === 'inward' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Customer Receipts
          </button>
          <button
            onClick={() => setActiveTab('outward')}
            className={cn(
              'px-4 py-1.5 rounded-md transition-all',
              activeTab === 'outward' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Supplier Payments
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference or party..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select
            value={modeFilter}
            onChange={e => setModeFilter(e.target.value)}
            aria-label="Filter payments by mode"
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden"
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
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments found"
            description="No transaction records match the current filter selection."
            action={isManager ? { label: 'Record Payment', onClick: () => setShowModal(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Reference #</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => {
                  const partyName = p.party_type === 'customer'
                    ? getCustomerById(p.customer_id ?? '')?.name ?? 'Customer'
                    : getSupplierById(p.supplier_id ?? '')?.name ?? 'Supplier'

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{p.payment_number}</td>
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
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDate(p.date)}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{partyName}</td>
                      <td className="py-3 px-4 text-slate-600">{p.mode}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{p.reference || '—'}</td>
                      <td className={cn(
                        'py-3 px-4 text-right font-bold',
                        p.type === 'inward' ? 'text-emerald-600' : 'text-slate-900'
                      )}>
                        {p.type === 'inward' ? '+' : '-'}{formatCurrency(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Demo Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Record Payment Voucher</h3>
            <p className="text-sm text-slate-600 mb-4">
              Enter customer receipt or vendor disbursement. When confirmed in Supabase, customer/supplier ledgers and outstanding balances are reconciled automatically.
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Type</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                  <option value="inward">Inward (Customer Receipt)</option>
                  <option value="outward">Outward (Supplier Payment)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
                <input type="number" placeholder="50000" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                  <option>Bank Transfer (NEFT/RTGS)</option>
                  <option>Cheque</option>
                  <option>UPI</option>
                  <option>Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Reference / UTR #</label>
                <input type="text" placeholder="e.g. UTR2026090600123" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Demo note: Payment saved and allocated against invoices!')
                  setShowModal(false)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-xs"
              >
                Post Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
