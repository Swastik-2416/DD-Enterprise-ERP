import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart, Plus, Search, Eye, Filter,
  Calendar, CheckCircle2, Clock, Truck,
  Printer, Trash2, Edit3, ArrowRight,
  Package, FileText, ChevronRight, X, Building2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, toInputDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'
import {
  PurchaseOrderPrintModal,
  type PurchaseOrderRecord,
  type POLine
} from '@/components/orders/PurchaseOrderPrintModal'
import type { Supplier, Item } from '@/types/database.types'

const LS_KEY = 'dd_purchase_orders_list'

function generatePONumber(existing: PurchaseOrderRecord[]): string {
  const seq = existing.length + 1
  const now = new Date()
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyStr = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`
  return `PO-${fyStr}-${String(seq).padStart(4, '0')}`
}

const SEED_ORDERS: PurchaseOrderRecord[] = [
  {
    id: 'po-seed-1',
    po_number: 'PO-2425-0001',
    supplier_id: 'sup-1',
    supplier_name: 'Ultratech Cement Ltd (Depot)',
    supplier: {
      id: 'sup-1',
      name: 'Ultratech Cement Ltd (Depot)',
      gstin: '19AAACU4033C1ZZ',
      city: 'Barasat',
      state: 'West Bengal',
      address: 'Barasat Industrial Park, NH-34',
      phone: '9831122334',
    },
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    expected_delivery_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    payment_terms: '30 Days Credit',
    delivery_location: 'Beside NH-34, Amdanga Factory Site, North 24 Parganas - 743221',
    delivery_mode: 'Road / Lorry Freight',
    notes: 'Grade 53 OPC fresh batch only. Weighbridge slip mandatory at entry.',
    status: 'approved',
    lines: [
      {
        id: 'pol-1',
        item_id: 'item-cem-1',
        item_name: 'OPC 53 Grade Cement',
        item_sku: 'CEM-53',
        item_unit: 'Bags',
        hsn_code: '2523',
        qty: 400,
        rate: 380,
        taxable_amount: 152000,
        gst_rate: 28,
        cgst_amount: 21280,
        sgst_amount: 21280,
        total_amount: 194560,
        remarks: '50 Kg HDPE moisture-proof bags',
      }
    ],
    total_qty: 400,
    taxable_amount: 152000,
    cgst_amount: 21280,
    sgst_amount: 21280,
    total_amount: 194560,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'po-seed-2',
    po_number: 'PO-2425-0002',
    supplier_id: 'sup-2',
    supplier_name: 'Pakur Stone Quarry Suppliers',
    supplier: {
      id: 'sup-2',
      name: 'Pakur Stone Quarry Suppliers',
      gstin: '20AAAFP1234F1Z5',
      city: 'Pakur',
      state: 'Jharkhand',
      address: 'Industrial Quarry Road, Pakur',
      phone: '9434455667',
    },
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    expected_delivery_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    payment_terms: '15 Days Credit',
    delivery_location: 'Beside NH-34, Amdanga Factory Site, North 24 Parganas - 743221',
    delivery_mode: 'Dump Truck / Dumper',
    notes: 'Clean black basalt 10mm chips, free from silt and soil.',
    status: 'submitted',
    lines: [
      {
        id: 'pol-2',
        item_id: 'item-agg-1',
        item_name: '10mm Black Stone Chips',
        item_sku: 'AGG-10MM',
        item_unit: 'MT',
        hsn_code: '2517',
        qty: 50,
        rate: 1650,
        taxable_amount: 82500,
        gst_rate: 5,
        cgst_amount: 2062.5,
        sgst_amount: 2062.5,
        total_amount: 86625,
        remarks: 'Direct from Pakur quarry',
      }
    ],
    total_qty: 50,
    taxable_amount: 82500,
    cgst_amount: 2062.5,
    sgst_amount: 2062.5,
    total_amount: 86625,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  }
]

function loadStoredOrders(): PurchaseOrderRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED_ORDERS))
      return SEED_ORDERS
    }
    return JSON.parse(raw)
  } catch {
    return SEED_ORDERS
  }
}

function saveStoredOrders(orders: PurchaseOrderRecord[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(orders))
  } catch {}
}

export function PurchaseOrdersPage() {
  const { user, isManager } = useAuth()
  const { company } = useCompany()
  const companyId = user?.company_id || ''

  // State
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>(loadStoredOrders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderRecord | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrderRecord | null>(null)

  // Fetch Suppliers from Supabase
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers_for_po', companyId],
    queryFn: async () => {
      let query = supabase.from('suppliers').select('*').order('name')
      if (companyId && companyId !== 'co-1') {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query
      if (error) return []
      return (data || []) as Supplier[]
    },
  })

  // Fetch Items from Supabase
  const { data: items = [] } = useQuery({
    queryKey: ['items_for_po', companyId],
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select('id, name, sku, purchase_rate, gst_rate, hsn_code, unit:units(symbol)')
        .order('name')
      if (companyId && companyId !== 'co-1') {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query
      if (error) return []
      return (data || []) as unknown as (Pick<Item, 'id' | 'name' | 'sku' | 'purchase_rate' | 'gst_rate' | 'hsn_code'> & {
        unit?: { symbol: string }
      })[]
    },
  })

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch =
        o.po_number.toLowerCase().includes(search.toLowerCase()) ||
        o.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
        o.lines.some(l => l.item_name.toLowerCase().includes(search.toLowerCase()))

      const matchStatus = statusFilter === 'all' || o.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [orders, search, statusFilter])

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = orders.length
    const totalVal = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_amount : 0), 0)
    const pendingCount = orders.filter(o => o.status === 'submitted').length
    const activeCount = orders.filter(o => o.status === 'approved' || o.status === 'posted').length
    return { totalCount, totalVal, pendingCount, activeCount }
  }, [orders])

  // Workflow Handlers
  const handleUpdateStatus = (poId: string, newStatus: PurchaseOrderRecord['status']) => {
    setOrders(prev => {
      const next = prev.map(o => (o.id === poId ? { ...o, status: newStatus } : o))
      saveStoredOrders(next)
      return next
    })
    toast.success(`Purchase order status updated to ${newStatus.toUpperCase()}`)
  }

  const handleDelete = (poId: string) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      setOrders(prev => {
        const next = prev.filter(o => o.id !== poId)
        saveStoredOrders(next)
        return next
      })
      toast.success('Purchase order deleted')
    }
  }

  const handleSaveOrder = (newOrder: PurchaseOrderRecord) => {
    setOrders(prev => {
      const exists = prev.some(o => o.id === newOrder.id)
      const next = exists ? prev.map(o => (o.id === newOrder.id ? newOrder : o)) : [newOrder, ...prev]
      saveStoredOrders(next)
      return next
    })
    setIsFormOpen(false)
    setEditingOrder(null)
    toast.success(editingOrder ? 'Purchase order updated' : 'Purchase order created successfully')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Purchase Orders"
        subtitle="Issue raw material orders, cement contracts, aggregate requisitions & track supplier fulfillment"
        icon={ShoppingCart}
        action={{
          label: 'Create Purchase Order',
          icon: Plus,
          onClick: () => {
            setEditingOrder(null)
            setIsFormOpen(true)
          },
        }}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Total POs</p>
            <p className="text-xl font-bold text-on-surface">{metrics.totalCount}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Active / Approved Orders</p>
            <p className="text-xl font-bold text-on-surface">{metrics.activeCount}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Pending Approval</p>
            <p className="text-xl font-bold text-on-surface">{metrics.pendingCount}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Total Committed Value</p>
            <p className="text-lg font-bold text-on-surface font-mono">
              ₹{metrics.totalVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Search by PO#, vendor, or item..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-outline flex items-center gap-1 shrink-0">
            <Filter className="h-3.5 w-3.5" /> Status:
          </span>
          {['all', 'draft', 'submitted', 'approved', 'posted', 'cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-full uppercase whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-primary text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <EmptyState
            title="No Purchase Orders found"
            description={
              search
                ? `No orders matching "${search}"`
                : 'Create your first raw material purchase order to start tracking procurement.'
            }
            icon={ShoppingCart}
            action={{
              label: 'Create Purchase Order',
              onClick: () => {
                setEditingOrder(null)
                setIsFormOpen(true)
              },
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container/50 text-xs font-semibold text-outline uppercase tracking-wider">
                  <th className="py-3 px-4">PO Number & Date</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Items Ordered</th>
                  <th className="py-3 px-4">Expected Delivery</th>
                  <th className="py-3 px-4 text-right">Order Value</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-surface-container/30 transition-colors">
                    {/* PO No & Date */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary font-mono">{order.po_number}</div>
                      <div className="text-xs text-outline flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(order.date)}
                      </div>
                    </td>

                    {/* Vendor */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-on-surface">{order.supplier_name}</div>
                      <div className="text-xs text-outline">
                        {order.supplier?.city || 'Vendor Plant'} · GSTIN: {order.supplier?.gstin || 'N/A'}
                      </div>
                    </td>

                    {/* Items */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-xs text-on-surface truncate">
                        {order.lines.map(l => `${l.item_name} (${l.qty} ${l.item_unit})`).join(', ')}
                      </div>
                      <div className="text-[11px] text-outline mt-0.5">
                        {order.lines.length} {order.lines.length === 1 ? 'item' : 'items'} · Total Qty: {order.total_qty}
                      </div>
                    </td>

                    {/* Delivery Date */}
                    <td className="py-3 px-4">
                      <div className="text-xs text-on-surface font-medium">
                        {formatDate(order.expected_delivery_date)}
                      </div>
                      <div className="text-[11px] text-outline flex items-center gap-1 mt-0.5">
                        <Truck className="h-3 w-3" />
                        {order.delivery_mode}
                      </div>
                    </td>

                    {/* Value */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-on-surface font-mono">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <div className="text-[11px] text-outline">Tax: ₹{(order.cgst_amount + order.sgst_amount).toFixed(2)}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Print / View Purchase Order"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Approval workflow buttons */}
                        {order.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order.id, 'submitted')}
                            className="px-2 py-1 text-xs font-semibold bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 rounded-md transition-colors"
                            title="Submit for Approval"
                          >
                            Submit
                          </button>
                        )}

                        {order.status === 'submitted' && isManager && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order.id, 'approved')}
                            className="px-2 py-1 text-xs font-semibold bg-green-500/10 text-green-700 hover:bg-green-500/20 rounded-md transition-colors"
                            title="Approve Order"
                          >
                            Approve
                          </button>
                        )}

                        {order.status === 'approved' && isManager && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order.id, 'posted')}
                            className="px-2 py-1 text-xs font-semibold bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 rounded-md transition-colors"
                            title="Mark Order as Dispatched / Confirmed"
                          >
                            Mark Active
                          </button>
                        )}

                        {order.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOrder(order)
                              setIsFormOpen(true)
                            }}
                            className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container rounded-md transition-colors"
                            title="Edit Draft"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}

                        {order.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(order.id)}
                            className="p-1.5 text-error hover:bg-error-container/20 rounded-md transition-colors"
                            title="Delete PO"
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

      {/* PO Form Drawer / Modal */}
      {isFormOpen && (
        <PurchaseOrderFormModal
          existingOrder={editingOrder}
          suppliers={suppliers}
          items={items}
          existingOrders={orders}
          factoryAddress={company.address}
          onSave={handleSaveOrder}
          onClose={() => {
            setIsFormOpen(false)
            setEditingOrder(null)
          }}
        />
      )}

      {/* Official Printable PO Modal */}
      {selectedOrder && (
        <PurchaseOrderPrintModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  )
}

// ─── Purchase Order Creation / Edit Modal ──────────────────────────────────────────

interface POFormModalProps {
  existingOrder: PurchaseOrderRecord | null
  suppliers: Supplier[]
  items: (Pick<Item, 'id' | 'name' | 'sku' | 'purchase_rate' | 'gst_rate' | 'hsn_code'> & {
    unit?: { symbol: string }
  })[]
  existingOrders: PurchaseOrderRecord[]
  factoryAddress: string
  onSave: (order: PurchaseOrderRecord) => void
  onClose: () => void
}

function PurchaseOrderFormModal({
  existingOrder,
  suppliers,
  items,
  existingOrders,
  factoryAddress,
  onSave,
  onClose,
}: POFormModalProps) {
  const [supplierId, setSupplierId] = useState(existingOrder?.supplier_id || '')
  const [date, setDate] = useState(existingOrder?.date || toInputDate(new Date()))
  const [deliveryDate, setDeliveryDate] = useState(
    existingOrder?.expected_delivery_date ||
      toInputDate(new Date(Date.now() + 7 * 86400000))
  )
  const [paymentTerms, setPaymentTerms] = useState(
    existingOrder?.payment_terms || '30 Days Credit'
  )
  const [deliveryLocation, setDeliveryLocation] = useState(
    existingOrder?.delivery_location || factoryAddress || 'Factory Site, Beside NH-34, Amdanga'
  )
  const [deliveryMode, setDeliveryMode] = useState(
    existingOrder?.delivery_mode || 'Road / Lorry Freight'
  )
  const [notes, setNotes] = useState(existingOrder?.notes || '')
  const [status, setStatus] = useState<PurchaseOrderRecord['status']>(
    existingOrder?.status || 'draft'
  )

  // Lines
  const [lines, setLines] = useState<POLine[]>(
    existingOrder?.lines || [
      {
        id: crypto.randomUUID(),
        item_id: '',
        item_name: '',
        item_sku: '',
        item_unit: 'Pcs',
        hsn_code: '',
        qty: 1,
        rate: 0,
        taxable_amount: 0,
        gst_rate: 18,
        cgst_amount: 0,
        sgst_amount: 0,
        total_amount: 0,
        remarks: '',
      },
    ]
  )

  const selectedSupplier = suppliers.find(s => s.id === supplierId)

  // Update a line field
  const updateLine = (id: string, field: keyof POLine, value: string | number) => {
    setLines(prev =>
      prev.map(l => {
        if (l.id !== id) return l
        const updated = { ...l, [field]: value }

        const qty = Number(field === 'qty' ? value : l.qty) || 0
        const rate = Number(field === 'rate' ? value : l.rate) || 0
        const gstRate = Number(field === 'gst_rate' ? value : l.gst_rate) || 0

        const taxable = qty * rate
        const halfGst = (taxable * (gstRate / 2)) / 100
        const total = taxable + halfGst * 2

        return {
          ...updated,
          taxable_amount: Math.round(taxable * 100) / 100,
          cgst_amount: Math.round(halfGst * 100) / 100,
          sgst_amount: Math.round(halfGst * 100) / 100,
          total_amount: Math.round(total * 100) / 100,
        }
      })
    )
  }

  const handleSelectItem = (lineId: string, itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const rate = Number(item.purchase_rate) || 0
    const gstRate = Number(item.gst_rate) || 18
    const unit = item.unit?.symbol || 'Pcs'

    setLines(prev =>
      prev.map(l => {
        if (l.id !== lineId) return l
        const qty = l.qty || 1
        const taxable = qty * rate
        const halfGst = (taxable * (gstRate / 2)) / 100
        const total = taxable + halfGst * 2

        return {
          ...l,
          item_id: item.id,
          item_name: item.name,
          item_sku: item.sku,
          item_unit: unit,
          hsn_code: item.hsn_code || '',
          rate,
          gst_rate: gstRate,
          taxable_amount: Math.round(taxable * 100) / 100,
          cgst_amount: Math.round(halfGst * 100) / 100,
          sgst_amount: Math.round(halfGst * 100) / 100,
          total_amount: Math.round(total * 100) / 100,
        }
      })
    )
  }

  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        item_id: '',
        item_name: '',
        item_sku: '',
        item_unit: 'Pcs',
        hsn_code: '',
        qty: 1,
        rate: 0,
        taxable_amount: 0,
        gst_rate: 18,
        cgst_amount: 0,
        sgst_amount: 0,
        total_amount: 0,
        remarks: '',
      },
    ])
  }

  const removeLine = (id: string) => {
    if (lines.length === 1) {
      toast.error('Purchase Order must have at least one line item')
      return
    }
    setLines(prev => prev.filter(l => l.id !== id))
  }

  // Totals
  const totalQty = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) || 0), 0), [lines])
  const taxableTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.taxable_amount) || 0), 0), [lines])
  const cgstTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.cgst_amount) || 0), 0), [lines])
  const sgstTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.sgst_amount) || 0), 0), [lines])
  const grandTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.total_amount) || 0), 0), [lines])

  const handleSubmit = (targetStatus: PurchaseOrderRecord['status']) => {
    if (!supplierId) {
      toast.error('Please select a Vendor')
      return
    }
    const invalidLine = lines.find(l => !l.item_id || Number(l.qty) <= 0 || Number(l.rate) < 0)
    if (invalidLine) {
      toast.error('Please select an item, positive quantity, and valid rate for each line')
      return
    }

    const poNumber = existingOrder?.po_number || generatePONumber(existingOrders)

    const finalOrder: PurchaseOrderRecord = {
      id: existingOrder?.id || crypto.randomUUID(),
      po_number: poNumber,
      supplier_id: supplierId,
      supplier_name: selectedSupplier?.name || 'Selected Vendor',
      supplier: selectedSupplier
        ? {
            id: selectedSupplier.id,
            name: selectedSupplier.name,
            gstin: selectedSupplier.gstin,
            city: selectedSupplier.city,
            state: selectedSupplier.state,
            address: selectedSupplier.address,
            phone: selectedSupplier.phone,
          }
        : undefined,
      date,
      expected_delivery_date: deliveryDate,
      payment_terms: paymentTerms,
      delivery_location: deliveryLocation,
      delivery_mode: deliveryMode,
      notes,
      status: targetStatus,
      lines,
      total_qty: totalQty,
      taxable_amount: taxableTotal,
      cgst_amount: cgstTotal,
      sgst_amount: sgstTotal,
      total_amount: grandTotal,
      created_at: existingOrder?.created_at || new Date().toISOString(),
    }

    onSave(finalOrder)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface shrink-0">
          <div>
            <h3 className="text-base font-bold text-on-surface">
              {existingOrder ? `Edit Purchase Order (${existingOrder.po_number})` : 'New Purchase Order'}
            </h3>
            <p className="text-xs text-outline mt-0.5">
              Specify vendor details, ordered quantities, rates & delivery terms
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
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-container/30 p-4 rounded-xl border border-outline-variant">
            {/* Vendor */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Vendor / Raw Material Supplier <span className="text-error">*</span>
              </label>
              <select
                required
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Choose Vendor / Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city}) — GSTIN: {s.gstin || 'None'}
                  </option>
                ))}
              </select>
              {selectedSupplier && (
                <p className="text-[11px] text-outline mt-1">
                  Address: {selectedSupplier.address}, {selectedSupplier.city} · Phone: {selectedSupplier.phone}
                </p>
              )}
            </div>

            {/* PO Date */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Order Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
              </input>
            </div>

            {/* Expected Delivery */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Expected Delivery Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="Immediate / Cash on Delivery">Immediate / Cash on Delivery</option>
                <option value="15 Days Credit">15 Days Credit</option>
                <option value="30 Days Credit">30 Days Credit</option>
                <option value="45 Days Credit">45 Days Credit</option>
                <option value="50% Advance, Balance on Delivery">50% Advance, Balance on Delivery</option>
                <option value="Against L/R / Transport Copy">Against L/R / Transport Copy</option>
              </select>
            </div>

            {/* Delivery Mode */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Delivery Mode
              </label>
              <select
                value={deliveryMode}
                onChange={e => setDeliveryMode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="Road / Lorry Freight">Road / Lorry Freight</option>
                <option value="Dump Truck / Dumper">Dump Truck / Dumper</option>
                <option value="Supplier Arranged Transport">Supplier Arranged Transport</option>
                <option value="Ex-Factory / Self Pickup">Ex-Factory / Self Pickup</option>
              </select>
            </div>

            {/* Delivery Address */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Delivery / Plant Site Location
              </label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={e => setDeliveryLocation(e.target.value)}
                placeholder="Factory site address"
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                Raw Materials &amp; Goods Required
              </h4>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item Line
              </button>
            </div>

            <div className="border border-outline-variant rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container/60 text-outline font-semibold uppercase">
                      <th className="py-2.5 px-3">Item / SKU</th>
                      <th className="py-2.5 px-2 w-20 text-center">Unit</th>
                      <th className="py-2.5 px-2 w-24 text-right">Quantity</th>
                      <th className="py-2.5 px-2 w-28 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-2 w-20 text-center">GST %</th>
                      <th className="py-2.5 px-3 w-32 text-right">Total (₹)</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {lines.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-surface-container/20">
                        {/* Item select */}
                        <td className="py-2.5 px-3">
                          <select
                            required
                            value={line.item_id}
                            onChange={e => handleSelectItem(line.id, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs font-medium border border-outline-variant rounded-md bg-surface"
                          >
                            <option value="">-- Select Material / Item --</option>
                            {items.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.name} ({i.sku})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Specification / Batch notes (optional)"
                            value={line.remarks || ''}
                            onChange={e => updateLine(line.id, 'remarks', e.target.value)}
                            className="w-full mt-1 px-2 py-0.5 text-[11px] border border-outline-variant/60 rounded bg-surface/50"
                          />
                        </td>

                        {/* Unit */}
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-semibold text-outline">{line.item_unit || 'Pcs'}</span>
                        </td>

                        {/* Qty */}
                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            required
                            value={line.qty || ''}
                            onChange={e => updateLine(line.id, 'qty', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-xs font-mono text-right border border-outline-variant rounded-md bg-surface"
                          />
                        </td>

                        {/* Rate */}
                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={line.rate || ''}
                            onChange={e => updateLine(line.id, 'rate', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-xs font-mono text-right border border-outline-variant rounded-md bg-surface font-semibold"
                          />
                        </td>

                        {/* GST % */}
                        <td className="py-2.5 px-2 text-center">
                          <select
                            value={line.gst_rate}
                            onChange={e => updateLine(line.id, 'gst_rate', Number(e.target.value))}
                            className="px-1.5 py-1.5 text-xs border border-outline-variant rounded-md bg-surface text-center font-mono"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>

                        {/* Total */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-on-surface">
                          ₹{Number(line.total_amount).toFixed(2)}
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

          {/* Notes & Calculations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Special Remarks / Delivery Notes for Supplier
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Weighbridge slip required at factory gate, unload at yard #2..."
                className="w-full px-3 py-2 text-xs border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            {/* Calculations Box */}
            <div className="bg-surface-container/40 p-4 rounded-xl border border-outline-variant space-y-2 text-xs">
              <div className="flex justify-between text-outline">
                <span>Total Quantity:</span>
                <span className="font-mono font-semibold text-on-surface">{totalQty}</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Taxable Amount:</span>
                <span className="font-mono font-semibold text-on-surface">₹{taxableTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>CGST:</span>
                <span className="font-mono font-semibold text-on-surface">₹{cgstTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>SGST:</span>
                <span className="font-mono font-semibold text-on-surface">₹{sgstTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-outline-variant text-sm font-bold text-on-surface">
                <span>Grand Total:</span>
                <span className="font-mono text-primary text-base font-black">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
              onClick={() => handleSubmit('submitted')}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Submit Purchase Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
