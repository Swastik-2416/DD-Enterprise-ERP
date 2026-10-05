import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Truck, Plus, Search, Eye, Filter,
  Calendar, CheckCircle2, Clock, MapPin,
  Printer, Trash2, Edit3, Package,
  FileCheck2, ChevronRight, X, UserCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, toInputDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'
import {
  DeliveryChallanPrintModal
} from '@/components/challans/DeliveryChallanPrintModal'
import {
  type DeliveryChallanRecord,
  type ChallanLine,
  SEED_TRANSPORTERS
} from '@/types/transport.types'
import type { Customer, Item } from '@/types/database.types'

const LS_KEY = 'dd_delivery_challans_list'

function generateChallanNumber(existing: DeliveryChallanRecord[]): string {
  const seq = existing.length + 1
  const now = new Date()
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyStr = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`
  return `DC-${fyStr}-${String(seq).padStart(4, '0')}`
}

const SEED_CHALLANS: DeliveryChallanRecord[] = [
  {
    id: 'dc-seed-1',
    challan_number: 'DC-2425-0001',
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    customer_id: 'cust-1',
    customer_name: 'Metro Highway Infrastructure Ltd',
    customer_phone: '9830011223',
    customer_gstin: '19AAACM4512D1Z0',
    site_address: 'Kalyani Expressway Flyover Site, Near Madanpur, Nadia',
    invoice_ref: 'DDE/2425-0021',
    order_ref: 'SO-2425-0012',
    transporter_id: 'trans-1',
    transporter_name: 'Maa Tara Roadways',
    vehicle_number: 'WB-25-D-4521',
    driver_name: 'Bapi Mondal',
    driver_phone: '9831998877',
    lr_number: 'LR-8921',
    eway_bill_number: '281982736410',
    lines: [
      {
        id: 'cl-1',
        item_id: 'fg-1',
        item_name: 'Zig-Zag Concrete Paver Block 60mm (Grey)',
        item_sku: 'ZZ-60-GRY',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        dispatch_qty: 1500,
        packages: '6 Pallets (Shrink Wrapped)',
        weight_mt: 8.5,
        remarks: 'M-35 Grade Heavy Duty',
      },
      {
        id: 'cl-2',
        item_id: 'fg-2',
        item_name: 'Zig-Zag Concrete Paver Block 60mm (Red)',
        item_sku: 'ZZ-60-RED',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        dispatch_qty: 500,
        packages: '2 Pallets',
        weight_mt: 2.8,
        remarks: 'Red Synthetic Iron Oxide Pigment',
      }
    ],
    total_qty: 2000,
    total_weight_mt: 11.3,
    status: 'delivered',
    receiver_name: 'Anirban Sen (Site Engineer)',
    notes: 'Forklift required for offloading pallets.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'dc-seed-2',
    challan_number: 'DC-2425-0002',
    date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    customer_id: 'cust-2',
    customer_name: 'Sunrise Builders & Developers',
    customer_phone: '9836644221',
    customer_gstin: '19AABCS8899K1Z3',
    site_address: 'Sunrise Greens Housing Project, Rajarhat Action Area II, Kolkata',
    invoice_ref: 'DDE/2425-0023',
    transporter_id: 'trans-2',
    transporter_name: 'National Lorry Transport',
    vehicle_number: 'WB-23-C-1122',
    driver_name: 'Jaswant Singh',
    driver_phone: '9830554433',
    lr_number: 'LR-9014',
    eway_bill_number: '281982736522',
    lines: [
      {
        id: 'cl-3',
        item_id: 'fg-3',
        item_name: 'I-Shape Paver Block 80mm (Grey)',
        item_sku: 'ISH-80-GRY',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        dispatch_qty: 1200,
        packages: '5 Pallets',
        weight_mt: 9.6,
        remarks: 'M-40 Heavy Vehicle Road Paver',
      }
    ],
    total_qty: 1200,
    total_weight_mt: 9.6,
    status: 'dispatched',
    notes: 'Delivery window 09:00 AM - 01:00 PM',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  }
]

function loadStoredChallans(): DeliveryChallanRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED_CHALLANS))
      return SEED_CHALLANS
    }
    return JSON.parse(raw)
  } catch {
    return SEED_CHALLANS
  }
}

function saveStoredChallans(challans: DeliveryChallanRecord[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(challans))
  } catch {}
}

export function DeliveryChallansPage() {
  const { user } = useAuth()
  const { company } = useCompany()
  const companyId = user?.company_id || ''

  const [challans, setOrders] = useState<DeliveryChallanRecord[]>(loadStoredChallans)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallanRecord | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingChallan, setEditingChallan] = useState<DeliveryChallanRecord | null>(null)

  // Fetch Customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers_for_challan', companyId],
    queryFn: async () => {
      let query = supabase.from('customers').select('*').order('name')
      if (companyId && companyId !== 'co-1') {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query
      if (error) return []
      return (data || []) as Customer[]
    },
  })

  // Fetch Finished Goods Items
  const { data: items = [] } = useQuery({
    queryKey: ['fg_items_for_challan', companyId],
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select('id, name, sku, hsn_code, unit:units(symbol)')
        .order('name')
      if (companyId && companyId !== 'co-1') {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query
      if (error) return []
      return (data || []) as unknown as (Pick<Item, 'id' | 'name' | 'sku' | 'hsn_code'> & {
        unit?: { symbol: string }
      })[]
    },
  })

  // Filtered Challans
  const filteredChallans = useMemo(() => {
    return challans.filter(c => {
      const matchSearch =
        c.challan_number.toLowerCase().includes(search.toLowerCase()) ||
        c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        c.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
        c.site_address.toLowerCase().includes(search.toLowerCase())

      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [challans, search, statusFilter])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = challans.length
    const dispatched = challans.filter(c => c.status === 'dispatched').length
    const delivered = challans.filter(c => c.status === 'delivered').length
    const signedPod = challans.filter(c => c.status === 'signed_pod').length
    const totalDispatchedQty = challans.reduce((sum, c) => sum + (c.status !== 'cancelled' ? c.total_qty : 0), 0)
    return { total, dispatched, delivered, signedPod, totalDispatchedQty }
  }, [challans])

  const handleUpdateStatus = (id: string, newStatus: DeliveryChallanRecord['status']) => {
    setOrders(prev => {
      const next = prev.map(c => (c.id === id ? { ...c, status: newStatus } : c))
      saveStoredChallans(next)
      return next
    })
    toast.success(`Challan updated to ${newStatus.replace('_', ' ').toUpperCase()}`)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this delivery challan?')) {
      setOrders(prev => {
        const next = prev.filter(c => c.id !== id)
        saveStoredChallans(next)
        return next
      })
      toast.success('Delivery challan deleted')
    }
  }

  const handleSaveChallan = (record: DeliveryChallanRecord) => {
    setOrders(prev => {
      const exists = prev.some(c => c.id === record.id)
      const next = exists ? prev.map(c => (c.id === record.id ? record : c)) : [record, ...prev]
      saveStoredChallans(next)
      return next
    })
    setIsFormOpen(false)
    setEditingChallan(null)
    toast.success(editingChallan ? 'Challan updated' : 'Delivery challan issued successfully')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Delivery Challans"
        subtitle="Issue factory gate dispatch passes, truck load slips, e-way bills & track customer delivery sign-offs"
        icon={Truck}
        action={{
          label: 'Create Delivery Challan',
          icon: Plus,
          onClick: () => {
            setEditingChallan(null)
            setIsFormOpen(true)
          },
        }}
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Total Challans Issued</p>
            <p className="text-xl font-bold text-on-surface">{metrics.total}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">In Transit (Dispatched)</p>
            <p className="text-xl font-bold text-on-surface">{metrics.dispatched}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Delivered at Site</p>
            <p className="text-xl font-bold text-on-surface">{metrics.delivered}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Signed POD Received</p>
            <p className="text-xl font-bold text-on-surface">{metrics.signedPod}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Search challan#, customer, vehicle, site..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-outline flex items-center gap-1 shrink-0">
            <Filter className="h-3.5 w-3.5" /> Status:
          </span>
          {['all', 'draft', 'dispatched', 'delivered', 'signed_pod', 'cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-full uppercase whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-primary text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Challans Table */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden">
        {filteredChallans.length === 0 ? (
          <EmptyState
            title="No Delivery Challans found"
            description={
              search
                ? `No delivery challans matching "${search}"`
                : 'Create your first delivery challan to dispatch finished paver products.'
            }
            icon={Truck}
            action={{
              label: 'Create Delivery Challan',
              onClick: () => {
                setEditingChallan(null)
                setIsFormOpen(true)
              },
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container/50 text-xs font-semibold text-outline uppercase tracking-wider">
                  <th className="py-3 px-4">Challan No & Date</th>
                  <th className="py-3 px-4">Customer & Site Address</th>
                  <th className="py-3 px-4">Dispatched Items</th>
                  <th className="py-3 px-4">Vehicle & Transporter</th>
                  <th className="py-3 px-4 text-center">Total Qty</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredChallans.map(challan => (
                  <tr key={challan.id} className="hover:bg-surface-container/30 transition-colors">
                    {/* Challan No */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary font-mono">{challan.challan_number}</div>
                      <div className="text-xs text-outline flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(challan.date)}
                      </div>
                      {challan.invoice_ref && (
                        <div className="text-[10px] text-outline font-mono mt-0.5">
                          Inv: {challan.invoice_ref}
                        </div>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-on-surface truncate">{challan.customer_name}</div>
                      <div className="text-xs text-outline flex items-start gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-outline/70 mt-0.5" />
                        <span className="truncate">{challan.site_address}</span>
                      </div>
                    </td>

                    {/* Items */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-xs text-on-surface truncate">
                        {challan.lines.map(l => `${l.item_name} (${l.dispatch_qty} ${l.item_unit})`).join(', ')}
                      </div>
                      <div className="text-[11px] text-outline mt-0.5">
                        {challan.lines.length} items · {challan.total_weight_mt ? `${challan.total_weight_mt} MT` : 'Standard Load'}
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-on-surface">{challan.vehicle_number}</div>
                      <div className="text-xs text-outline">
                        {challan.transporter_name || 'Direct Transport'} · {challan.driver_name || 'Driver'}
                      </div>
                    </td>

                    {/* Total Qty */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-on-surface font-mono text-base">{challan.total_qty}</span>
                      <span className="text-[10px] text-outline block">Sq.Ft / Pcs</span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        challan.status === 'signed_pod'
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                          : challan.status === 'delivered'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          : challan.status === 'dispatched'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          : challan.status === 'cancelled'
                          ? 'bg-red-100 text-error'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        {challan.status === 'signed_pod' ? 'POD Received' : challan.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedChallan(challan)}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Print Gate Pass / Delivery Challan"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Status Progression */}
                        {challan.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(challan.id, 'dispatched')}
                            className="px-2 py-1 text-xs font-semibold bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 rounded-md transition-colors"
                            title="Dispatch from Gate"
                          >
                            Dispatch
                          </button>
                        )}

                        {challan.status === 'dispatched' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(challan.id, 'delivered')}
                            className="px-2 py-1 text-xs font-semibold bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 rounded-md transition-colors"
                            title="Mark Delivered at Site"
                          >
                            Mark Delivered
                          </button>
                        )}

                        {challan.status === 'delivered' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(challan.id, 'signed_pod')}
                            className="px-2 py-1 text-xs font-semibold bg-green-500/10 text-green-700 hover:bg-green-500/20 rounded-md transition-colors flex items-center gap-1"
                            title="Signed POD Received from Site"
                          >
                            <FileCheck2 className="h-3.5 w-3.5" />
                            Record POD
                          </button>
                        )}

                        {challan.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingChallan(challan)
                              setIsFormOpen(true)
                            }}
                            className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container rounded-md transition-colors"
                            title="Edit Challan"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}

                        {challan.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(challan.id)}
                            className="p-1.5 text-error hover:bg-error-container/20 rounded-md transition-colors"
                            title="Delete Challan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Challan Modal */}
      {isFormOpen && (
        <DeliveryChallanFormModal
          existingChallan={editingChallan}
          customers={customers}
          items={items}
          existingChallans={challans}
          onSave={handleSaveChallan}
          onClose={() => {
            setIsFormOpen(false)
            setEditingChallan(null)
          }}
        />
      )}

      {/* Print Modal */}
      {selectedChallan && (
        <DeliveryChallanPrintModal
          challan={selectedChallan}
          onClose={() => setSelectedChallan(null)}
        />
      )}
    </div>
  )
}

// ─── Delivery Challan Form Modal ──────────────────────────────────────────────────

interface ChallanFormModalProps {
  existingChallan: DeliveryChallanRecord | null
  customers: Customer[]
  items: (Pick<Item, 'id' | 'name' | 'sku' | 'hsn_code'> & { unit?: { symbol: string } })[]
  existingChallans: DeliveryChallanRecord[]
  onSave: (record: DeliveryChallanRecord) => void
  onClose: () => void
}

function DeliveryChallanFormModal({
  existingChallan,
  customers,
  items,
  existingChallans,
  onSave,
  onClose,
}: ChallanFormModalProps) {
  const [customerId, setCustomerId] = useState(existingChallan?.customer_id || '')
  const [date, setDate] = useState(existingChallan?.date || toInputDate(new Date()))
  const [siteAddress, setSiteAddress] = useState(existingChallan?.site_address || '')
  const [vehicleNumber, setVehicleNumber] = useState(existingChallan?.vehicle_number || '')
  const [transporterName, setTransporterName] = useState(existingChallan?.transporter_name || '')
  const [driverName, setDriverName] = useState(existingChallan?.driver_name || '')
  const [driverPhone, setDriverPhone] = useState(existingChallan?.driver_phone || '')
  const [lrNumber, setLrNumber] = useState(existingChallan?.lr_number || '')
  const [ewayBillNumber, setEwayBillNumber] = useState(existingChallan?.eway_bill_number || '')
  const [invoiceRef, setInvoiceRef] = useState(existingChallan?.invoice_ref || '')
  const [notes, setNotes] = useState(existingChallan?.notes || '')

  const selectedCustomer = customers.find(c => c.id === customerId)

  // Handle Customer Selection -> auto-fill site address
  const handleSelectCustomer = (id: string) => {
    setCustomerId(id)
    const cust = customers.find(c => c.id === id)
    if (cust && !siteAddress) {
      setSiteAddress(`${cust.address || ''}, ${cust.city || ''} ${cust.state || ''}`.trim())
    }
  }

  // Lines
  const [lines, setLines] = useState<ChallanLine[]>(
    existingChallan?.lines || [
      {
        id: crypto.randomUUID(),
        item_id: '',
        item_name: '',
        item_sku: '',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        dispatch_qty: 1000,
        packages: '4 Pallets',
        weight_mt: 6.5,
        remarks: 'M-35 Paver Blocks',
      },
    ]
  )

  const handleSelectItem = (lineId: string, itemId: string) => {
    const it = items.find(i => i.id === itemId)
    if (!it) return
    setLines(prev =>
      prev.map(l =>
        l.id === lineId
          ? {
              ...l,
              item_id: it.id,
              item_name: it.name,
              item_sku: it.sku,
              item_unit: it.unit?.symbol || 'Sq.Ft',
              hsn_code: it.hsn_code || '6810',
            }
          : l
      )
    )
  }

  const updateLine = (id: string, field: keyof ChallanLine, value: string | number) => {
    setLines(prev => prev.map(l => (l.id === id ? { ...l, [field]: value } : l)))
  }

  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        item_id: '',
        item_name: '',
        item_sku: '',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        dispatch_qty: 500,
        packages: '2 Pallets',
        weight_mt: 3.2,
        remarks: '',
      },
    ])
  }

  const removeLine = (id: string) => {
    if (lines.length === 1) {
      toast.error('Delivery Challan must have at least one product')
      return
    }
    setLines(prev => prev.filter(l => l.id !== id))
  }

  const totalQty = useMemo(() => lines.reduce((s, l) => s + (Number(l.dispatch_qty) || 0), 0), [lines])
  const totalWeight = useMemo(() => lines.reduce((s, l) => s + (Number(l.weight_mt) || 0), 0), [lines])

  const handleSubmit = (targetStatus: DeliveryChallanRecord['status']) => {
    if (!customerId) {
      toast.error('Please select a Customer / Consignee')
      return
    }
    if (!siteAddress.trim()) {
      toast.error('Please provide delivery site address')
      return
    }
    if (!vehicleNumber.trim()) {
      toast.error('Vehicle Number is required')
      return
    }
    const invalidLine = lines.find(l => !l.item_id || Number(l.dispatch_qty) <= 0)
    if (invalidLine) {
      toast.error('Please select an item and valid quantity for each line')
      return
    }

    const challanNumber = existingChallan?.challan_number || generateChallanNumber(existingChallans)

    const finalRecord: DeliveryChallanRecord = {
      id: existingChallan?.id || crypto.randomUUID(),
      challan_number: challanNumber,
      date,
      customer_id: customerId,
      customer_name: selectedCustomer?.name || 'Customer Site',
      customer_phone: selectedCustomer?.phone || undefined,
      customer_gstin: selectedCustomer?.gstin || undefined,
      site_address: siteAddress,
      invoice_ref: invoiceRef || undefined,
      transporter_name: transporterName || undefined,
      vehicle_number: vehicleNumber.toUpperCase().trim(),
      driver_name: driverName || undefined,
      driver_phone: driverPhone || undefined,
      lr_number: lrNumber || undefined,
      eway_bill_number: ewayBillNumber || undefined,
      lines,
      total_qty: totalQty,
      total_weight_mt: totalWeight,
      status: targetStatus,
      notes: notes || undefined,
      created_at: existingChallan?.created_at || new Date().toISOString(),
    }

    onSave(finalRecord)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface shrink-0">
          <div>
            <h3 className="text-base font-bold text-on-surface">
              {existingChallan ? `Edit Delivery Challan (${existingChallan.challan_number})` : 'New Delivery Challan & Gate Pass'}
            </h3>
            <p className="text-xs text-outline mt-0.5">
              Generate dispatch note, truck loading slip & gate pass for finished paver blocks
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Dispatch Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-container/30 p-4 rounded-xl border border-outline-variant">
            {/* Customer */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Consignee / Customer <span className="text-error">*</span>
              </label>
              <select
                required
                value={customerId}
                onChange={e => handleSelectCustomer(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city}) — GSTIN: {c.gstin || 'None'}
                  </option>
                ))}
              </select>
            </div>

            {/* Challan Date */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Dispatch Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Site Address */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Unloading Site / Delivery Address <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={siteAddress}
                onChange={e => setSiteAddress(e.target.value)}
                placeholder="Exact site landmark or address where truck will unload"
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Vehicle Number */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Vehicle No. (Truck / Lorry) <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="WB-25-D-1234"
                className="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Transporter */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Transporter Name
              </label>
              <input
                type="text"
                value={transporterName}
                onChange={e => setTransporterName(e.target.value)}
                placeholder="e.g. Maa Tara Roadways"
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Driver Name & Phone */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Driver Name &amp; Mobile
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  placeholder="Driver Name"
                  className="w-full px-2 py-2 text-xs border border-outline-variant rounded-lg bg-surface"
                />
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={e => setDriverPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full px-2 py-2 text-xs border border-outline-variant rounded-lg bg-surface"
                />
              </div>
            </div>

            {/* E-Way Bill */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                E-Way Bill No.
              </label>
              <input
                type="text"
                value={ewayBillNumber}
                onChange={e => setEwayBillNumber(e.target.value)}
                placeholder="12-digit E-Way Bill"
                className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            {/* LR No */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                L.R. / Consignment Note No.
              </label>
              <input
                type="text"
                value={lrNumber}
                onChange={e => setLrNumber(e.target.value)}
                placeholder="LR-XXXX"
                className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            {/* Invoice Ref */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Linked Tax Invoice (Optional)
              </label>
              <input
                type="text"
                value={invoiceRef}
                onChange={e => setInvoiceRef(e.target.value)}
                placeholder="e.g. DDE/2425-0024"
                className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                Concrete Finished Products Being Dispatched
              </h4>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Product Line
              </button>
            </div>

            <div className="border border-outline-variant rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container/60 text-outline font-semibold uppercase">
                      <th className="py-2.5 px-3">Product Description</th>
                      <th className="py-2.5 px-2 w-28">Packaging / Load</th>
                      <th className="py-2.5 px-2 w-24 text-right">Dispatch Qty</th>
                      <th className="py-2.5 px-2 w-16 text-center">Unit</th>
                      <th className="py-2.5 px-2 w-24 text-right">Weight (MT)</th>
                      <th className="py-2.5 px-3">Remarks / Grade</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {lines.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-surface-container/20">
                        {/* Item */}
                        <td className="py-2.5 px-3">
                          <select
                            required
                            value={line.item_id}
                            onChange={e => handleSelectItem(line.id, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs font-semibold border border-outline-variant rounded-md bg-surface"
                          >
                            <option value="">-- Choose Paver Product --</option>
                            {items.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.name} ({i.sku})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Packaging */}
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            placeholder="e.g. 4 Pallets"
                            value={line.packages || ''}
                            onChange={e => updateLine(line.id, 'packages', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded-md bg-surface"
                          />
                        </td>

                        {/* Dispatch Qty */}
                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            min="1"
                            required
                            value={line.dispatch_qty || ''}
                            onChange={e => updateLine(line.id, 'dispatch_qty', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-xs font-mono font-bold text-right border border-outline-variant rounded-md bg-surface"
                          />
                        </td>

                        {/* Unit */}
                        <td className="py-2.5 px-2 text-center font-semibold text-outline">
                          {line.item_unit}
                        </td>

                        {/* Weight MT */}
                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.0"
                            value={line.weight_mt || ''}
                            onChange={e => updateLine(line.id, 'weight_mt', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-xs font-mono text-right border border-outline-variant rounded-md bg-surface"
                          />
                        </td>

                        {/* Remarks */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="e.g. M-35 Grade Heavy Duty"
                            value={line.remarks || ''}
                            onChange={e => updateLine(line.id, 'remarks', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded-md bg-surface"
                          />
                        </td>

                        {/* Delete line */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="text-error/70 hover:text-error p-1 hover:bg-error-container/20 rounded transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Notes & Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Gate Pass Instructions / Driver Remarks
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Offloading at Site #3. Driver to collect signed copy before return..."
                className="w-full px-3 py-2 text-xs border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            <div className="bg-surface-container/40 p-4 rounded-xl border border-outline-variant flex flex-col justify-center space-y-2 text-xs">
              <div className="flex justify-between text-outline">
                <span>Total Items:</span>
                <span className="font-semibold text-on-surface">{lines.length} Line items</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Estimated Load Weight:</span>
                <span className="font-mono font-bold text-on-surface">{totalWeight.toFixed(2)} Metric Tons</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-outline-variant text-sm font-bold text-on-surface">
                <span>Total Dispatch Quantity:</span>
                <span className="font-mono text-primary text-base font-black">
                  {totalQty} Sq.Ft / Pcs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-outline-variant flex items-center justify-between bg-surface shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container rounded-lg border border-outline-variant transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              className="px-4 py-2 text-xs font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors border border-outline-variant"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('dispatched')}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
            >
              <Truck className="h-4 w-4" />
              Dispatch &amp; Generate Gate Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
