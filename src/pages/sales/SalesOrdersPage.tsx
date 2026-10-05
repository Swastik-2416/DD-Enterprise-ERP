import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingBag, Plus, Search, Eye, Filter,
  Calendar, CheckCircle2, Clock, MapPin,
  Printer, Trash2, Edit3, Package,
  Truck, ArrowUpRight, ChevronRight, X, AlertCircle,
  TrendingUp, CreditCard, Factory, IndianRupee
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, toInputDate, formatCurrency } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'
import { SalesOrderPrintModal } from '@/components/orders/SalesOrderPrintModal'
import {
  type SalesOrderRecord,
  type SalesOrderLine,
  SEED_SALES_ORDERS
} from '@/types/sales.types'
import type { Customer, Item } from '@/types/database.types'

const LS_KEY = 'dd_sales_orders_list'
const LS_CHALLANS_KEY = 'dd_delivery_challans_list'

interface ItemOption {
  id: string
  name: string
  sku: string
  selling_rate: number
  gst_rate: number
  hsn_code: string | null
  unit?: { symbol: string }
}

function generateOrderNumber(existing: SalesOrderRecord[]): string {
  const seq = existing.length + 1
  const now = new Date()
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyStr = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`
  return `SO-${fyStr}-${String(seq).padStart(4, '0')}`
}

function loadStoredOrders(): SalesOrderRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED_SALES_ORDERS))
      return SEED_SALES_ORDERS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_SALES_ORDERS
  } catch {
    return SEED_SALES_ORDERS
  }
}

function saveStoredOrders(orders: SalesOrderRecord[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(orders))
  } catch {}
}

const FALLBACK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    company_id: 'c1',
    name: 'Metro Highway Infrastructure Ltd',
    gstin: '19AAACM4512D1Z0',
    email: 'procurement@metroinfra.in',
    phone: '9830011223',
    address: 'Kalyani Expressway Flyover Site, Near Madanpur',
    city: 'Nadia',
    state: 'West Bengal',
    contact_person: 'Mr. Debashis Roy',
    credit_limit: 1500000,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cust-2',
    company_id: 'c1',
    name: 'Eastern Railways Engineering Division',
    gstin: '19AAAGR1122E1Z8',
    email: 'works.sealdah@easternrailway.gov.in',
    phone: '9433012345',
    address: 'Barasat Railway Yard Extension Project',
    city: 'North 24 Parganas',
    state: 'West Bengal',
    contact_person: 'Executive Engineer',
    credit_limit: 2500000,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cust-3',
    company_id: 'c1',
    name: 'Bengal Ambuja Housing Projects Ltd',
    gstin: '19AABCB8890F1ZX',
    email: 'purchase@bengalambuja.com',
    phone: '9831098765',
    address: 'Udayan Gated Township Phase 2, EM Bypass',
    city: 'Kolkata',
    state: 'West Bengal',
    contact_person: 'Mr. Animesh Ghosh',
    credit_limit: 800000,
    is_active: true,
    created_at: new Date().toISOString()
  }
]

const FALLBACK_ITEMS: ItemOption[] = [
  {
    id: 'fg-1',
    sku: 'ZZ-60-GRY',
    name: 'Zig-Zag Concrete Paver Block 60mm (Grey)',
    unit: { symbol: 'Sq.Ft' },
    hsn_code: '6810',
    gst_rate: 18,
    selling_rate: 34
  },
  {
    id: 'fg-2',
    sku: 'ZZ-60-RED',
    name: 'Zig-Zag Concrete Paver Block 60mm (Red)',
    unit: { symbol: 'Sq.Ft' },
    hsn_code: '6810',
    gst_rate: 18,
    selling_rate: 38
  },
  {
    id: 'fg-3',
    sku: 'ISH-80-GRY',
    name: 'I-Shape Paver Block 80mm Heavy Duty (Grey)',
    unit: { symbol: 'Sq.Ft' },
    hsn_code: '6810',
    gst_rate: 18,
    selling_rate: 44
  },
  {
    id: 'fg-4',
    sku: 'HEX-60-YEL',
    name: 'Hexagonal Paver Block 60mm (Yellow)',
    unit: { symbol: 'Sq.Ft' },
    hsn_code: '6810',
    gst_rate: 18,
    selling_rate: 42
  },
  {
    id: 'fg-5',
    sku: 'KB-300-GRY',
    name: 'Precast Concrete Kerb Stone 300x150x100mm',
    unit: { symbol: 'Pcs' },
    hsn_code: '6810',
    gst_rate: 18,
    selling_rate: 65
  }
]

export function SalesOrdersPage() {
  const { user } = useAuth()
  const { company } = useCompany()
  const navigate = useNavigate()
  const companyId = user?.company_id || ''

  const [orders, setOrders] = useState<SalesOrderRecord[]>(loadStoredOrders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Print modal state
  const [activePrintOrder, setActivePrintOrder] = useState<SalesOrderRecord | null>(null)

  // Drawer / Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<SalesOrderRecord | null>(null)

  // Quick Advance modal
  const [advanceModalOrder, setAdvanceModalOrder] = useState<SalesOrderRecord | null>(null)
  const [advanceInputVal, setAdvanceInputVal] = useState<string>('')

  // Form Fields
  const [formCustomerId, setFormCustomerId] = useState('')
  const [formCustomerName, setFormCustomerName] = useState('')
  const [formCustomerPhone, setFormCustomerPhone] = useState('')
  const [formCustomerGstin, setFormCustomerGstin] = useState('')
  const [formSiteAddress, setFormSiteAddress] = useState('')
  const [formQuoteRef, setFormQuoteRef] = useState('')
  const [formCustomerPoRef, setFormCustomerPoRef] = useState('')
  const [formOrderDate, setFormOrderDate] = useState(toInputDate(new Date()))
  const [formPromisedDate, setFormPromisedDate] = useState(toInputDate(new Date(Date.now() + 7 * 86400000)))
  const [formDispatchMode, setFormDispatchMode] = useState('Road / Lorry Freight (Multiple Trips)')
  const [formPaymentTerms, setFormPaymentTerms] = useState('50% Advance booking, 50% prior to dispatch')
  const [formAdvanceReceived, setFormAdvanceReceived] = useState<number>(0)
  const [formStatus, setFormStatus] = useState<SalesOrderRecord['status']>('confirmed')
  const [formNotes, setFormNotes] = useState('')

  // Line Items in Form
  const [formLines, setFormLines] = useState<SalesOrderLine[]>([])

  // Line item adder state
  const [selectedItemId, setSelectedItemId] = useState('')
  const [lineQty, setLineQty] = useState<number>(1000)
  const [lineRate, setLineRate] = useState<number>(34)
  const [lineGst, setLineGst] = useState<number>(18)
  const [lineProdStatus, setLineProdStatus] = useState<'pending' | 'in_production' | 'ready'>('pending')
  const [lineRemarks, setLineRemarks] = useState('')

  // Fetch Customers from Supabase
  const { data: customers = FALLBACK_CUSTOMERS } = useQuery({
    queryKey: ['customers_for_orders', companyId],
    queryFn: async () => {
      let query = supabase.from('customers').select('*').order('name')
      if (companyId && companyId !== 'co-1') {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query
      if (error || !data || data.length === 0) return FALLBACK_CUSTOMERS
      return data as Customer[]
    },
    staleTime: 60000
  })

  // Fetch Finished Goods from Supabase
  const { data: fgItems = FALLBACK_ITEMS } = useQuery({
    queryKey: ['fg_items_for_orders', companyId],
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select('id, name, sku, purchase_rate, selling_rate, gst_rate, hsn_code, unit:units(symbol)')
        .order('name')
      if (companyId && companyId !== 'co-1') {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query
      if (error || !data || data.length === 0) return FALLBACK_ITEMS
      return (data || []) as unknown as ItemOption[]
    },
    staleTime: 60000
  })

  // Handle Customer Selection in Form
  const handleSelectCustomer = (custId: string) => {
    setFormCustomerId(custId)
    const found = customers.find(c => c.id === custId)
    if (found) {
      setFormCustomerName(found.name)
      setFormCustomerPhone(found.phone || '')
      setFormCustomerGstin(found.gstin || '')
      const fullAddr = [found.address, found.city, found.state].filter(Boolean).join(', ')
      setFormSiteAddress(fullAddr)
    }
  }

  // Handle Item Selection for Line Item Adder
  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId)
    const it = fgItems.find(i => i.id === itemId)
    if (it) {
      setLineRate(Number(it.selling_rate) || 0)
      setLineGst(Number(it.gst_rate) || 18)
    }
  }

  // Add Line Item
  const handleAddLine = () => {
    if (!selectedItemId) {
      toast.error('Please select a finished goods product')
      return
    }
    if (lineQty <= 0) {
      toast.error('Quantity must be greater than 0')
      return
    }
    const item = fgItems.find(i => i.id === selectedItemId)
    if (!item) return

    const taxable = Math.round(lineQty * lineRate * 100) / 100
    const halfGst = lineGst / 2
    const cgst = Math.round((taxable * halfGst) / 100 * 100) / 100
    const sgst = cgst
    const total = Math.round((taxable + cgst + sgst) * 100) / 100
    const unitSymbol = item.unit?.symbol || 'Sq.Ft'

    const newLine: SalesOrderLine = {
      id: crypto.randomUUID(),
      item_id: item.id,
      item_name: item.name,
      item_sku: item.sku,
      item_unit: unitSymbol,
      hsn_code: item.hsn_code || '6810',
      ordered_qty: lineQty,
      dispatched_qty: 0,
      pending_qty: lineQty,
      rate: lineRate,
      taxable_amount: taxable,
      gst_rate: lineGst,
      cgst_amount: cgst,
      sgst_amount: sgst,
      total_amount: total,
      production_status: lineProdStatus,
      remarks: lineRemarks.trim() || undefined
    }

    setFormLines([...formLines, newLine])
    setSelectedItemId('')
    setLineQty(1000)
    setLineRemarks('')
    setLineProdStatus('pending')
  }

  // Remove Line Item
  const handleRemoveLine = (id: string) => {
    setFormLines(formLines.filter(l => l.id !== id))
  }

  // Totals calculations for the form
  const formTotals = useMemo(() => {
    const totalQty = formLines.reduce((s, l) => s + (Number(l.ordered_qty) || 0), 0)
    const taxable = formLines.reduce((s, l) => s + (Number(l.taxable_amount) || 0), 0)
    const cgst = formLines.reduce((s, l) => s + (Number(l.cgst_amount) || 0), 0)
    const sgst = formLines.reduce((s, l) => s + (Number(l.sgst_amount) || 0), 0)
    const grand = formLines.reduce((s, l) => s + (Number(l.total_amount) || 0), 0)
    const balance = Math.max(0, Math.round((grand - (formAdvanceReceived || 0)) * 100) / 100)
    return { totalQty, taxable, cgst, sgst, grand, balance }
  }, [formLines, formAdvanceReceived])

  // Open Form for New Order
  const handleOpenNewOrder = () => {
    setEditingOrder(null)
    setFormCustomerId('')
    setFormCustomerName('')
    setFormCustomerPhone('')
    setFormCustomerGstin('')
    setFormSiteAddress('')
    setFormQuoteRef('')
    setFormCustomerPoRef('')
    setFormOrderDate(toInputDate(new Date()))
    setFormPromisedDate(toInputDate(new Date(Date.now() + 7 * 86400000)))
    setFormDispatchMode('Road / Lorry Freight (Multiple Trips)')
    setFormPaymentTerms('50% Advance booking, 50% prior to dispatch')
    setFormAdvanceReceived(0)
    setFormStatus('confirmed')
    setFormNotes('')
    setFormLines([])
    setIsFormOpen(true)
  }

  // Open Form to Edit Order
  const handleEditOrder = (so: SalesOrderRecord) => {
    setEditingOrder(so)
    setFormCustomerId(so.customer_id)
    setFormCustomerName(so.customer_name)
    setFormCustomerPhone(so.customer_phone || '')
    setFormCustomerGstin(so.customer_gstin || '')
    setFormSiteAddress(so.site_address)
    setFormQuoteRef(so.quote_ref || '')
    setFormCustomerPoRef(so.customer_po_ref || '')
    setFormOrderDate(so.date)
    setFormPromisedDate(so.promised_delivery_date)
    setFormDispatchMode(so.dispatch_mode)
    setFormPaymentTerms(so.payment_terms)
    setFormAdvanceReceived(so.advance_received || 0)
    setFormStatus(so.status)
    setFormNotes(so.notes || '')
    setFormLines(so.lines || [])
    setIsFormOpen(true)
  }

  // Save Order
  const handleSaveOrder = () => {
    if (!formCustomerName.trim()) {
      toast.error('Customer name or selection is required')
      return
    }
    if (!formSiteAddress.trim()) {
      toast.error('Site or delivery address is required')
      return
    }
    if (formLines.length === 0) {
      toast.error('Add at least one product line item')
      return
    }

    const totalDispatched = formLines.reduce((s, l) => s + (Number(l.dispatched_qty) || 0), 0)

    if (editingOrder) {
      const updated: SalesOrderRecord = {
        ...editingOrder,
        customer_id: formCustomerId || editingOrder.customer_id,
        customer_name: formCustomerName,
        customer_phone: formCustomerPhone || undefined,
        customer_gstin: formCustomerGstin || undefined,
        site_address: formSiteAddress,
        quote_ref: formQuoteRef || undefined,
        customer_po_ref: formCustomerPoRef || undefined,
        date: formOrderDate,
        promised_delivery_date: formPromisedDate,
        dispatch_mode: formDispatchMode,
        payment_terms: formPaymentTerms,
        advance_received: Number(formAdvanceReceived) || 0,
        balance_receivable: formTotals.balance,
        status: formStatus,
        notes: formNotes || undefined,
        lines: formLines,
        total_qty: formTotals.totalQty,
        total_dispatched_qty: totalDispatched,
        taxable_amount: formTotals.taxable,
        cgst_amount: formTotals.cgst,
        sgst_amount: formTotals.sgst,
        total_amount: formTotals.grand
      }
      const newOrders = orders.map(o => o.id === editingOrder.id ? updated : o)
      setOrders(newOrders)
      saveStoredOrders(newOrders)
      toast.success(`Sales Order ${updated.order_number} updated`)
    } else {
      const newOrderNum = generateOrderNumber(orders)
      const newOrder: SalesOrderRecord = {
        id: crypto.randomUUID(),
        order_number: newOrderNum,
        quote_ref: formQuoteRef || undefined,
        customer_po_ref: formCustomerPoRef || undefined,
        date: formOrderDate,
        promised_delivery_date: formPromisedDate,
        customer_id: formCustomerId || 'cust-manual',
        customer_name: formCustomerName,
        customer_phone: formCustomerPhone || undefined,
        customer_gstin: formCustomerGstin || undefined,
        site_address: formSiteAddress,
        payment_terms: formPaymentTerms,
        advance_received: Number(formAdvanceReceived) || 0,
        balance_receivable: formTotals.balance,
        dispatch_mode: formDispatchMode,
        status: formStatus,
        notes: formNotes || undefined,
        lines: formLines,
        total_qty: formTotals.totalQty,
        total_dispatched_qty: 0,
        taxable_amount: formTotals.taxable,
        cgst_amount: formTotals.cgst,
        sgst_amount: formTotals.sgst,
        total_amount: formTotals.grand,
        created_at: new Date().toISOString()
      }
      const newOrders = [newOrder, ...orders]
      setOrders(newOrders)
      saveStoredOrders(newOrders)
      toast.success(`Sales Order ${newOrderNum} created successfully`)
    }

    setIsFormOpen(false)
    setEditingOrder(null)
  }

  // Update Status directly from row dropdown
  const handleUpdateStatus = (id: string, newStatus: SalesOrderRecord['status']) => {
    const updated = orders.map(o => {
      if (o.id === id) {
        return { ...o, status: newStatus }
      }
      return o
    })
    setOrders(updated)
    saveStoredOrders(updated)
    toast.success(`Order status changed to ${newStatus.replace(/_/g, ' ')}`)
  }

  // Update Line Item Production Status
  const handleUpdateLineProdStatus = (orderId: string, lineId: string, newStatus: 'pending' | 'in_production' | 'ready') => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        const newLines = o.lines.map(l => l.id === lineId ? { ...l, production_status: newStatus } : l)
        const allReady = newLines.every(l => l.production_status === 'ready')
        const anyInProd = newLines.some(l => l.production_status === 'in_production' || l.production_status === 'ready')
        let inferredStatus = o.status
        if (allReady && o.status !== 'fulfilled' && o.status !== 'partially_dispatched') {
          inferredStatus = 'ready_for_dispatch'
        } else if (anyInProd && o.status === 'confirmed') {
          inferredStatus = 'in_production'
        }
        return { ...o, lines: newLines, status: inferredStatus }
      }
      return o
    })
    setOrders(updated)
    saveStoredOrders(updated)
    toast.success('Production status updated')
  }

  // Quick Advance Modal Handler
  const handleOpenAdvanceModal = (o: SalesOrderRecord) => {
    setAdvanceModalOrder(o)
    setAdvanceInputVal(String(o.advance_received || 0))
  }

  const handleSaveAdvance = () => {
    if (!advanceModalOrder) return
    const newAdv = parseFloat(advanceInputVal) || 0
    const newBal = Math.max(0, Math.round((advanceModalOrder.total_amount - newAdv) * 100) / 100)
    const updated = orders.map(o => {
      if (o.id === advanceModalOrder.id) {
        return {
          ...o,
          advance_received: newAdv,
          balance_receivable: newBal
        }
      }
      return o
    })
    setOrders(updated)
    saveStoredOrders(updated)
    setAdvanceModalOrder(null)
    toast.success(`Advance payment updated for ${advanceModalOrder.order_number}`)
  }

  // Delete Order
  const handleDeleteOrder = (id: string, num: string) => {
    if (!confirm(`Are you sure you want to delete Sales Order ${num}?`)) return
    const remaining = orders.filter(o => o.id !== id)
    setOrders(remaining)
    saveStoredOrders(remaining)
    toast.success(`Order ${num} deleted`)
  }

  // Dispatch Action -> Prepares delivery challan and redirects
  const handleCreateDeliveryChallan = (order: SalesOrderRecord) => {
    let existingChallans: any[] = []
    try {
      existingChallans = JSON.parse(localStorage.getItem(LS_CHALLANS_KEY) || '[]')
    } catch {}

    const seq = existingChallans.length + 1
    const now = new Date()
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const fyStr = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`
    const dcNumber = `DC-${fyStr}-${String(seq).padStart(4, '0')}`

    const newChallan = {
      id: crypto.randomUUID(),
      challan_number: dcNumber,
      date: toInputDate(new Date()),
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_gstin: order.customer_gstin,
      site_address: order.site_address,
      order_ref: order.order_number,
      vehicle_number: 'WB-25-D-4521',
      transporter_name: 'Maa Tara Roadways',
      status: 'pending',
      lines: order.lines.map(l => ({
        id: crypto.randomUUID(),
        item_id: l.item_id,
        item_name: l.item_name,
        item_sku: l.item_sku,
        item_unit: l.item_unit,
        ordered_qty: l.ordered_qty,
        dispatched_qty: l.pending_qty > 0 ? l.pending_qty : l.ordered_qty,
        rate: l.rate,
        amount: Math.round((l.pending_qty > 0 ? l.pending_qty : l.ordered_qty) * l.rate)
      })),
      total_qty: order.lines.reduce((s, l) => s + (l.pending_qty > 0 ? l.pending_qty : l.ordered_qty), 0),
      total_amount: order.total_amount,
      notes: `Dispatched against Sales Order ${order.order_number}`
    }

    try {
      localStorage.setItem(LS_CHALLANS_KEY, JSON.stringify([newChallan, ...existingChallans]))
      toast.success(`Draft Delivery Challan ${dcNumber} generated from this order! Redirecting...`)
      setTimeout(() => navigate('/sales/delivery-challans'), 600)
    } catch {
      navigate('/sales/delivery-challans')
    }
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase()
      const matchesSearch =
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        (o.customer_po_ref && o.customer_po_ref.toLowerCase().includes(q)) ||
        (o.quote_ref && o.quote_ref.toLowerCase().includes(q)) ||
        o.site_address.toLowerCase().includes(q) ||
        o.lines.some(l => l.item_name.toLowerCase().includes(q) || l.item_sku.toLowerCase().includes(q))

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [orders, search, statusFilter])

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalCount = orders.length
    const inProduction = orders.filter(o => o.status === 'in_production').length
    const readyForDispatch = orders.filter(o => o.status === 'ready_for_dispatch').length
    const totalOrderValue = orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0)
    const totalAdvanceCollected = orders.reduce((s, o) => s + (Number(o.advance_received) || 0), 0)
    const totalBalanceDue = orders.reduce((s, o) => s + (Number(o.balance_receivable) || 0), 0)

    return {
      totalCount,
      inProduction,
      readyForDispatch,
      totalOrderValue,
      totalAdvanceCollected,
      totalBalanceDue
    }
  }, [orders])

  const renderStatusBadge = (st: SalesOrderRecord['status']) => {
    switch (st) {
      case 'confirmed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-700 border border-sky-300">Confirmed</span>
      case 'in_production':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 border border-amber-300 animate-pulse">In Production</span>
      case 'ready_for_dispatch':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-700 border border-purple-300">Ready for Dispatch</span>
      case 'partially_dispatched':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-700 border border-orange-300">Partial Dispatch</span>
      case 'fulfilled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-300">Fulfilled</span>
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-700 border border-red-300">Cancelled</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-700 border border-slate-300">Draft</span>
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        subtitle="Confirmed customer orders, factory casting commitments, booking advances & dispatch tracking"
        icon={ShoppingBag}
        action={{
          label: 'New Sales Order',
          icon: Plus,
          onClick: handleOpenNewOrder,
        }}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Total Sales Orders</p>
            <p className="text-xl font-bold text-on-surface">{metrics.totalCount}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <Factory className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">In Production (Curing/Casting)</p>
            <p className="text-xl font-bold text-amber-600">{metrics.inProduction}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Ready For Dispatch (Yard Stock)</p>
            <p className="text-xl font-bold text-purple-600">{metrics.readyForDispatch}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Order Book Value</p>
            <p className="text-base font-bold text-on-surface font-mono">
              ₹{metrics.totalOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-outline">
              Advance: <span className="text-emerald-700 font-semibold font-mono">₹{metrics.totalAdvanceCollected.toLocaleString('en-IN')}</span>
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
            placeholder="Search order#, customer, PO, product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-outline flex items-center gap-1 shrink-0">
            <Filter className="h-3.5 w-3.5" /> Status:
          </span>
          {['all', 'confirmed', 'in_production', 'ready_for_dispatch', 'partially_dispatched', 'fulfilled', 'cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-full uppercase whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-primary text-white'
                  : 'bg-surface-variant text-outline hover:text-on-surface'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No Sales Orders Found"
          description={
            search || statusFilter !== 'all'
              ? 'No sales orders match your search and filter criteria.'
              : 'Create confirmed sales orders to schedule factory manufacturing and track delivery commitments.'
          }
          icon={ShoppingBag}
          action={{
            label: 'Create First Sales Order',
            onClick: handleOpenNewOrder,
          }}
        />
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-variant/40 text-xs uppercase font-semibold text-outline border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3">Order &amp; Date</th>
                  <th className="px-4 py-3">Customer &amp; Site</th>
                  <th className="px-4 py-3">Ordered Items &amp; Qty</th>
                  <th className="px-4 py-3 text-right">Order Value</th>
                  <th className="px-4 py-3 text-right">Advance / Balance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {filteredOrders.map(order => {
                  const firstLine = order.lines[0]
                  const hasMultiple = order.lines.length > 1

                  return (
                    <tr key={order.id} className="hover:bg-surface-variant/20 transition-colors">
                      {/* Order & Date */}
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-primary font-mono text-xs sm:text-sm">
                          {order.order_number}
                        </div>
                        <div className="text-xs text-outline flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(order.date)}
                        </div>
                        {order.quote_ref && (
                          <div className="text-[11px] text-outline font-mono mt-1">
                            Ref: {order.quote_ref}
                          </div>
                        )}
                        {order.customer_po_ref && (
                          <div className="text-[11px] text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 mt-1 inline-block">
                            PO: {order.customer_po_ref}
                          </div>
                        )}
                      </td>

                      {/* Customer & Site */}
                      <td className="px-4 py-3 align-top max-w-xs">
                        <div className="font-medium text-on-surface">
                          {order.customer_name}
                        </div>
                        {order.customer_phone && (
                          <div className="text-xs text-outline font-mono">
                            {order.customer_phone}
                          </div>
                        )}
                        <div className="text-xs text-outline line-clamp-2 mt-1 flex items-start gap-1">
                          <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                          <span>{order.site_address}</span>
                        </div>
                        <div className="text-[11px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-block">
                          Delivery by: {formatDate(order.promised_delivery_date)}
                        </div>
                      </td>

                      {/* Line Items */}
                      <td className="px-4 py-3 align-top">
                        {firstLine && (
                          <div>
                            <div className="font-medium text-on-surface text-xs">
                              {firstLine.item_name}
                            </div>
                            <div className="text-xs text-outline">
                              Ordered: <span className="font-mono font-medium text-on-surface">{firstLine.ordered_qty} {firstLine.item_unit}</span>
                              {firstLine.dispatched_qty > 0 && (
                                <span className="text-emerald-700 font-mono ml-2">
                                  (Dispatched: {firstLine.dispatched_qty})
                                </span>
                              )}
                            </div>
                            {/* Production Status Badge for line */}
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-[10px] text-outline">Production:</span>
                              <select
                                value={firstLine.production_status}
                                onChange={(e) => handleUpdateLineProdStatus(order.id, firstLine.id, e.target.value as any)}
                                className={`text-[11px] font-medium rounded px-1.5 py-0.5 border cursor-pointer ${
                                  firstLine.production_status === 'ready'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : firstLine.production_status === 'in_production'
                                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                                    : 'bg-slate-50 text-slate-600 border-slate-300'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="in_production">In Production</option>
                                <option value="ready">Ready (Cured)</option>
                              </select>
                            </div>
                          </div>
                        )}
                        {hasMultiple && (
                          <div className="text-[11px] text-primary font-medium mt-1">
                            +{order.lines.length - 1} more finished goods item(s)
                          </div>
                        )}
                        <div className="text-xs text-outline font-medium mt-1">
                          Total Qty: <span className="font-mono">{order.total_qty}</span> units
                        </div>
                      </td>

                      {/* Order Value */}
                      <td className="px-4 py-3 align-top text-right font-mono">
                        <div className="font-bold text-on-surface text-sm">
                          ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-outline">
                          Taxable: ₹{order.taxable_amount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-outline">
                          GST 18%: ₹{(order.cgst_amount + order.sgst_amount).toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Advance / Balance */}
                      <td className="px-4 py-3 align-top text-right font-mono">
                        <div className="flex items-center justify-end gap-1 text-emerald-700 font-semibold text-xs">
                          <span>Adv: ₹{order.advance_received.toLocaleString('en-IN')}</span>
                          <button
                            onClick={() => handleOpenAdvanceModal(order)}
                            title="Edit Advance Received"
                            className="p-1 hover:bg-emerald-100 rounded text-emerald-800 transition-colors"
                          >
                            <CreditCard className="h-3 w-3" />
                          </button>
                        </div>
                        <div className={`text-xs font-semibold mt-1 ${
                          order.balance_receivable > 0 ? 'text-amber-800' : 'text-emerald-700'
                        }`}>
                          Bal: ₹{order.balance_receivable.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-outline mt-0.5">
                          {order.balance_receivable === 0 ? 'Fully Paid' : 'Pending Payment'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 align-top text-center">
                        <div className="flex flex-col items-center gap-1">
                          {renderStatusBadge(order.status)}
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value as any)}
                            className="text-[10px] text-outline bg-surface border border-outline-variant rounded px-1 py-0.5 mt-1 cursor-pointer focus:outline-hidden"
                          >
                            <option value="draft">Draft</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="in_production">In Production</option>
                            <option value="ready_for_dispatch">Ready Dispatch</option>
                            <option value="partially_dispatched">Part. Dispatched</option>
                            <option value="fulfilled">Fulfilled</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Print / Preview */}
                          <button
                            onClick={() => setActivePrintOrder(order)}
                            title="Print / View Sales Order"
                            className="p-1.5 text-outline hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          {/* Create Delivery Challan */}
                          <button
                            onClick={() => handleCreateDeliveryChallan(order)}
                            title="Dispatch via Delivery Challan"
                            className="p-1.5 text-outline hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <Truck className="h-4 w-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleEditOrder(order)}
                            title="Edit Order"
                            className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-variant rounded-md transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteOrder(order.id, order.order_number)}
                            title="Delete Order"
                            className="p-1.5 text-outline hover:text-error hover:bg-error/10 rounded-md transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Advance Payment Modal */}
      {advanceModalOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl border border-outline-variant shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-on-surface">Record Booking Advance</h3>
              </div>
              <button
                onClick={() => setAdvanceModalOrder(null)}
                className="text-outline hover:text-on-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-outline">Order Reference</p>
              <p className="text-sm font-semibold font-mono text-primary">{advanceModalOrder.order_number}</p>
              <p className="text-xs text-on-surface mt-1">{advanceModalOrder.customer_name}</p>
              <p className="text-xs text-outline mt-1 font-mono">
                Total Order Value: ₹{advanceModalOrder.total_amount.toLocaleString('en-IN')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface mb-1">
                Advance Amount Received (₹)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={advanceInputVal}
                onChange={e => setAdvanceInputVal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface font-mono font-bold text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="p-3 bg-surface-variant/40 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-outline">Remaining Balance:</span>
                <span className="font-mono font-semibold text-on-surface">
                  ₹{Math.max(0, advanceModalOrder.total_amount - (parseFloat(advanceInputVal) || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdvanceModalOrder(null)}
                className="px-3 py-1.5 text-xs font-medium text-outline hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAdvance}
                className="px-4 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90"
              >
                Update Advance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Drawer Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-surface w-full max-w-4xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-outline-variant animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-variant/30">
              <div>
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  {editingOrder ? `Edit Sales Order: ${editingOrder.order_number}` : 'New Confirmed Sales Order'}
                </h2>
                <p className="text-xs text-outline mt-0.5">
                  Register customer purchase orders, production commitments, and payment advances
                </p>
              </div>
              <button
                onClick={() => {
                  setIsFormOpen(false)
                  setEditingOrder(null)
                }}
                className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Order Info & Reference */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Order Date *
                  </label>
                  <input
                    type="date"
                    value={formOrderDate}
                    onChange={e => setFormOrderDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Promised Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={formPromisedDate}
                    onChange={e => setFormPromisedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-medium text-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Initial Order Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
                  >
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_production">In Production</option>
                    <option value="ready_for_dispatch">Ready for Dispatch</option>
                    <option value="partially_dispatched">Partially Dispatched</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Customer Details */}
              <div className="p-4 bg-surface-variant/30 rounded-xl border border-outline-variant/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-outline">
                    Client &amp; Consignee Details
                  </h3>
                  <span className="text-[11px] text-primary">Select from list or type custom</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">
                      Choose Customer
                    </label>
                    <select
                      value={formCustomerId}
                      onChange={e => handleSelectCustomer(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Choose Existing Client --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.gstin ? `(${c.gstin})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">
                      Customer / Firm Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Metro Highway Infrastructure Ltd"
                      value={formCustomerName}
                      onChange={e => setFormCustomerName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">
                      Customer Contact Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9830011223"
                      value={formCustomerPhone}
                      onChange={e => setFormCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">
                      Customer GSTIN
                    </label>
                    <input
                      type="text"
                      placeholder="19AAAAA0000A1Z5"
                      value={formCustomerGstin}
                      onChange={e => setFormCustomerGstin(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Unloading Site / Delivery Address *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter project site delivery location, contact person on site..."
                    value={formSiteAddress}
                    onChange={e => setFormSiteAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Commercial Terms & Advance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-variant/30 rounded-xl border border-outline-variant/60">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Customer PO Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MHI/PO/2024-25/089"
                    value={formCustomerPoRef}
                    onChange={e => setFormCustomerPoRef(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Quotation Ref # (If any)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. QT-2425-0001"
                    value={formQuoteRef}
                    onChange={e => setFormQuoteRef(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Dispatch &amp; Freight Mode
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Road / Lorry Freight (Multiple Trips)"
                    value={formDispatchMode}
                    onChange={e => setFormDispatchMode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50% Advance booking, 50% prior to dispatch"
                    value={formPaymentTerms}
                    onChange={e => setFormPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Booking Advance Received (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="0"
                    value={formAdvanceReceived}
                    onChange={e => setFormAdvanceReceived(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface font-mono font-bold text-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <div className="text-xs text-outline mb-1">Balance Receivable After Advance</div>
                  <div className="text-lg font-bold font-mono text-on-surface">
                    ₹{formTotals.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-outline">
                    Finished Goods Line Items ({formLines.length})
                  </h3>
                  <span className="text-xs text-outline font-medium">Standard GST 18% Applicable</span>
                </div>

                {/* Line Item Adder Bar */}
                <div className="p-3 bg-surface-variant/40 rounded-xl border border-outline-variant grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-medium text-outline mb-1">
                      Product / Item
                    </label>
                    <select
                      value={selectedItemId}
                      onChange={e => handleSelectItem(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Choose Finished Goods --</option>
                      {fgItems.map(it => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.unit?.symbol || 'Sq.Ft'}) - ₹{it.selling_rate}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-medium text-outline mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={lineQty}
                      onChange={e => setLineQty(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs border border-outline-variant rounded-lg bg-surface font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-medium text-outline mb-1">
                      Rate (₹/Unit)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={lineRate}
                      onChange={e => setLineRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs border border-outline-variant rounded-lg bg-surface font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-medium text-outline mb-1">
                      Prod. Status
                    </label>
                    <select
                      value={lineProdStatus}
                      onChange={e => setLineProdStatus(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_production">In Production</option>
                      <option value="ready">Ready (Cured)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Line
                    </button>
                  </div>
                </div>

                {/* Added Line Items Table */}
                {formLines.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-outline-variant rounded-xl text-outline text-xs">
                    No products added yet. Select a finished goods item above to add to the order.
                  </div>
                ) : (
                  <div className="border border-outline-variant rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-surface-variant/50 uppercase text-[11px] font-semibold text-outline border-b border-outline-variant">
                        <tr>
                          <th className="px-3 py-2">Item Description</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Rate</th>
                          <th className="px-3 py-2 text-right">Taxable</th>
                          <th className="px-3 py-2 text-right">GST (18%)</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 text-center">Status</th>
                          <th className="px-3 py-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60">
                        {formLines.map(line => (
                          <tr key={line.id} className="hover:bg-surface-variant/20">
                            <td className="px-3 py-2">
                              <span className="font-semibold text-on-surface">{line.item_name}</span>
                              <span className="text-[10px] text-outline ml-2 font-mono">({line.item_sku})</span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium">
                              {line.ordered_qty} {line.item_unit}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              ₹{line.rate}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              ₹{line.taxable_amount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-outline">
                              ₹{(line.cgst_amount + line.sgst_amount).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-on-surface">
                              ₹{line.total_amount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                line.production_status === 'ready'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : line.production_status === 'in_production'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-50 text-slate-600'
                              }`}>
                                {line.production_status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(line.id)}
                                className="text-outline hover:text-error transition-colors p-1"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Order Totals Summary Card */}
              <div className="bg-surface-variant/40 rounded-xl p-4 border border-outline-variant space-y-2">
                <div className="flex justify-between text-xs text-outline">
                  <span>Total Ordered Quantity:</span>
                  <span className="font-mono font-semibold text-on-surface">{formTotals.totalQty} Units</span>
                </div>
                <div className="flex justify-between text-xs text-outline">
                  <span>Taxable Base Value:</span>
                  <span className="font-mono text-on-surface">₹{formTotals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-outline">
                  <span>CGST (9%) + SGST (9%):</span>
                  <span className="font-mono text-on-surface">₹{(formTotals.cgst + formTotals.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-outline-variant pt-2 flex justify-between text-sm font-bold text-on-surface">
                  <span>Total Order Value (Gross):</span>
                  <span className="font-mono text-primary text-base">₹{formTotals.grand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 font-medium">
                  <span>Booking Advance Received:</span>
                  <span className="font-mono">(-) ₹{(formAdvanceReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-outline-variant/60 pt-2 flex justify-between text-sm font-bold text-amber-800">
                  <span>Balance Receivable Prior to Dispatch:</span>
                  <span className="font-mono text-base">₹{formTotals.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Production / Delivery Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Schedule grey pavers first, 1,500 sq.ft daily lots. Curing minimum 14 days before loading."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between bg-surface-variant/30">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false)
                  setEditingOrder(null)
                }}
                className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium text-outline hover:text-on-surface transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveOrder}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                {editingOrder ? 'Update Sales Order' : 'Confirm & Save Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Order Print / PDF Modal */}
      {activePrintOrder && (
        <SalesOrderPrintModal
          order={activePrintOrder}
          onClose={() => setActivePrintOrder(null)}
        />
      )}
    </div>
  )
}
