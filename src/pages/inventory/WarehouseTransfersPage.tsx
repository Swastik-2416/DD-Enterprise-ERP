import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Truck, Plus, Search, Filter, Calendar, Download, Printer,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Building2,
  Package, ShieldCheck, X, Trash2, Eye, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, formatNumber } from '@/lib/formatters'
import { TransferGatePassModal } from '@/components/inventory/TransferGatePassModal'
import { logAuditEvent } from '@/lib/auditLogger'
import type { Item } from '@/types/database.types'
import {
  type Warehouse,
  type WarehouseTransfer,
  type WarehouseTransferItem,
  type TransferStatus,
  SEED_WAREHOUSES,
  SEED_TRANSFERS
} from '@/types/warehouse.types'

const STORAGE_KEY = 'dd_warehouse_transfers_list'
const WAREHOUSE_STORAGE_KEY = 'dd_warehouses_list'

export function WarehouseTransfersPage() {
  const { user } = useAuth()
  const companyId = user?.company_id || ''

  // 1. Warehouses List (local cache + seeds)
  const [warehouses] = useState<Warehouse[]>(() => {
    try {
      const stored = localStorage.getItem(WAREHOUSE_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return SEED_WAREHOUSES
  })

  // 2. Transfers List
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return SEED_TRANSFERS
  })

  // Persist transfers
  const saveTransfers = (updated: WarehouseTransfer[]) => {
    setTransfers(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}
  }

  // 3. Fetch Master Items for Transfer Line Selector
  const { data: masterItems = [] } = useQuery({
    queryKey: ['transfer_master_items', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name')
      return (data || []) as Item[]
    },
    enabled: !!companyId,
  })

  // Filter & Search States
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_transit' | 'completed' | 'draft'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTransfer, setSelectedTransfer] = useState<WarehouseTransfer | null>(null)
  const [isGatePassOpen, setIsGatePassOpen] = useState(false)
  const [isNewDrawerOpen, setIsNewDrawerOpen] = useState(false)

  // New Transfer Form State
  const [formData, setFormData] = useState<{
    source_warehouse_id: string
    destination_warehouse_id: string
    date: string
    vehicle_number: string
    driver_name: string
    driver_phone: string
    notes: string
    items: Array<{
      item_id: string
      item_name: string
      item_sku: string
      qty: number
      unit: string
      batch_number: string
    }>
  }>({
    source_warehouse_id: warehouses[0]?.id || '',
    destination_warehouse_id: warehouses[1]?.id || '',
    date: new Date().toISOString().split('T')[0],
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    notes: '',
    items: [
      {
        item_id: masterItems[0]?.id || 'fg-1',
        item_name: masterItems[0]?.name || 'Zig-Zag Concrete Paver Block 80mm (Grey)',
        item_sku: masterItems[0]?.sku || 'ZZ-80-GRY',
        qty: 1000,
        unit: 'pcs',
        batch_number: `BATCH-${new Date().toISOString().slice(0, 10)}`
      }
    ]
  })

  // Filtered List
  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNum = t.transfer_number.toLowerCase().includes(q)
        const matchVeh = t.vehicle_number.toLowerCase().includes(q)
        const matchDriver = t.driver_name.toLowerCase().includes(q)
        const matchNotes = t.notes?.toLowerCase().includes(q)
        const matchItem = t.items.some(i => i.item_name.toLowerCase().includes(q) || i.item_sku.toLowerCase().includes(q))
        return matchNum || matchVeh || matchDriver || matchNotes || matchItem
      }
      return true
    })
  }, [transfers, statusFilter, searchQuery])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = transfers.length
    const inTransit = transfers.filter(t => t.status === 'in_transit').length
    const completed = transfers.filter(t => t.status === 'completed').length
    const totalUnits = transfers.reduce((sum, t) => {
      return sum + t.items.reduce((s, i) => s + (Number(i.qty) || 0), 0)
    }, 0)
    return { total, inTransit, completed, totalUnits }
  }, [transfers])

  // Helper to get warehouse name
  const getWhName = (whId: string) => {
    return warehouses.find(w => w.id === whId)?.name || 'Storage Yard'
  }

  // Handle Mark Received / Completed
  const handleMarkReceived = async (transfer: WarehouseTransfer) => {
    const updated = transfers.map(t => {
      if (t.id === transfer.id) {
        return {
          ...t,
          status: 'completed' as const,
          received_by: `${user?.full_name || 'Yard Master'} (${user?.role || 'manager'})`,
          received_at: new Date().toISOString()
        }
      }
      return t
    })
    saveTransfers(updated)

    // Audit Log
    await logAuditEvent({
      companyId: companyId || 'c1',
      tableName: 'stock_transfers',
      rowId: transfer.transfer_number,
      action: 'UPDATE',
      oldData: { status: 'in_transit' },
      newData: { status: 'completed', received_by: user?.full_name },
      performedBy: user?.full_name || 'Yard Master'
    })

    toast.success(`Transfer ${transfer.transfer_number} marked as Received & Completed!`)
  }

  // Handle Dispatch Draft
  const handleDispatch = async (transfer: WarehouseTransfer) => {
    const updated = transfers.map(t => {
      if (t.id === transfer.id) {
        return {
          ...t,
          status: 'in_transit' as const,
          dispatched_at: new Date().toISOString()
        }
      }
      return t
    })
    saveTransfers(updated)

    await logAuditEvent({
      companyId: companyId || 'c1',
      tableName: 'stock_transfers',
      rowId: transfer.transfer_number,
      action: 'UPDATE',
      oldData: { status: 'draft' },
      newData: { status: 'in_transit' },
      performedBy: user?.full_name || 'Plant Supervisor'
    })

    toast.success(`Transfer ${transfer.transfer_number} dispatched! Material is now In Transit.`)
  }

  // Handle Item Row changes in Drawer
  const handleAddItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_id: masterItems[0]?.id || 'fg-1',
          item_name: masterItems[0]?.name || 'Zig-Zag Concrete Paver Block 80mm (Grey)',
          item_sku: masterItems[0]?.sku || 'ZZ-80-GRY',
          qty: 500,
          unit: 'pcs',
          batch_number: `BATCH-${new Date().toISOString().slice(0, 10)}`
        }
      ]
    }))
  }

  const handleRemoveItemRow = (index: number) => {
    if (formData.items.length <= 1) {
      toast.error('Transfer must have at least 1 item')
      return
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleItemSelect = (index: number, itemId: string) => {
    const sel = masterItems.find(i => i.id === itemId)
    if (!sel) return
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            item_id: sel.id,
            item_name: sel.name,
            item_sku: sel.sku,
            unit: sel.unit?.symbol || 'pcs'
          }
        }
        return item
      })
    }))
  }

  const handleCreateTransfer = async (status: 'draft' | 'in_transit') => {
    if (formData.source_warehouse_id === formData.destination_warehouse_id) {
      toast.error('Source Yard and Destination Yard must be different')
      return
    }
    if (formData.items.some(i => i.qty <= 0)) {
      toast.error('All items must have a quantity greater than zero')
      return
    }

    const nextNumber = `TRF-2425-${String(transfers.length + 15).padStart(4, '0')}`

    const newTransfer: WarehouseTransfer = {
      id: `trf-${Date.now()}`,
      transfer_number: nextNumber,
      source_warehouse_id: formData.source_warehouse_id,
      destination_warehouse_id: formData.destination_warehouse_id,
      date: formData.date,
      vehicle_number: formData.vehicle_number.trim() || 'Internal Shifter',
      driver_name: formData.driver_name.trim() || 'Plant Driver',
      driver_phone: formData.driver_phone.trim(),
      status,
      notes: formData.notes.trim(),
      items: formData.items.map((item, idx) => ({
        id: `ti-${Date.now()}-${idx}`,
        ...item
      })),
      created_by: `${user?.full_name || 'Plant Supervisor'} (${user?.role || 'manager'})`,
      created_at: new Date().toISOString(),
      dispatched_at: status === 'in_transit' ? new Date().toISOString() : undefined
    }

    const updated = [newTransfer, ...transfers]
    saveTransfers(updated)

    // Audit Log
    await logAuditEvent({
      companyId: companyId || 'c1',
      tableName: 'stock_transfers',
      rowId: nextNumber,
      action: 'INSERT',
      newData: {
        transfer_number: nextNumber,
        source: getWhName(formData.source_warehouse_id),
        destination: getWhName(formData.destination_warehouse_id),
        items_count: formData.items.length,
        status
      },
      performedBy: user?.full_name || 'Plant Supervisor'
    })

    toast.success(`Transfer ${nextNumber} created successfully!`)
    setIsNewDrawerOpen(false)
  }

  // Export CSV
  const handleExportCSV = () => {
    const csvRows: string[] = [
      `"DD ENTERPRISE ERP - WAREHOUSE STOCK TRANSFERS REGISTER"`,
      `"Export Date:","${new Date().toLocaleString('en-IN')}"`,
      `"Total Records:","${filteredTransfers.length}"`,
      ``,
      `"Transfer No","Date","Source Yard","Destination Yard","Vehicle No","Driver","Status","Items Count","Total Qty","Notes"`,
      ...filteredTransfers.map(t => {
        const qtySum = t.items.reduce((s, i) => s + (Number(i.qty) || 0), 0)
        return `"${t.transfer_number}","${t.date}","${getWhName(t.source_warehouse_id)}","${getWhName(t.destination_warehouse_id)}","${t.vehicle_number}","${t.driver_name}","${t.status}","${t.items.length}","${qtySum}","${t.notes?.replace(/"/g, '""') || ''}"`
      })
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `DD_Warehouse_Transfers_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Warehouse transfers exported to CSV!')
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Truck className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-on-surface">Warehouse Stock Transfers</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Inter-Yard Logistics
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Move paver blocks and raw materials between Panagarh plant yards, curing sheds, and highway dispatch depots
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-outline-variant text-on-surface rounded-lg text-xs font-medium hover:bg-surface-container transition-colors shadow-xs"
            title="Export CSV Register"
          >
            <Download className="h-3.5 w-3.5 text-outline" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => setIsNewDrawerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-hover transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Stock Transfer</span>
          </button>
        </div>
      </div>

      {/* KPI Deck */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">Total Transfers</span>
          <span className="text-2xl font-bold font-mono text-on-surface mt-1 block">
            {metrics.total}
          </span>
          <span className="text-[11px] text-on-surface-variant">Inter-yard dispatches</span>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">In Transit Now</span>
          <span className="text-2xl font-bold font-mono text-amber-600 mt-1 block">
            {metrics.inTransit}
          </span>
          <span className="text-[11px] text-amber-600/90 font-medium">Awaiting yard receipt</span>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">Completed</span>
          <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
            {metrics.completed}
          </span>
          <span className="text-[11px] text-emerald-600/90 font-medium">Safely received & stocked</span>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">Total Units Shifted</span>
          <span className="text-2xl font-bold font-mono text-primary mt-1 block">
            {formatNumber(metrics.totalUnits, 0)}
          </span>
          <span className="text-[11px] text-on-surface-variant">Paver blocks & materials</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1 border border-outline-variant text-xs">
          {[
            { id: 'all', label: `All (${transfers.length})` },
            { id: 'in_transit', label: `In Transit (${metrics.inTransit})` },
            { id: 'completed', label: `Completed (${metrics.completed})` },
            { id: 'draft', label: 'Draft' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-surface text-primary shadow-xs font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="h-3.5 w-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transfer #, vehicle, driver..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
          />
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-surface-container text-on-surface-variant font-semibold text-[11px] border-b border-outline-variant">
              <tr>
                <th className="p-3 w-36 font-mono">Transfer No</th>
                <th className="p-3 w-28">Date</th>
                <th className="p-3">Route (Source → Destination)</th>
                <th className="p-3 w-44">Vehicle & Driver</th>
                <th className="p-3">Material Summary</th>
                <th className="p-3 w-24 text-right">Total Qty</th>
                <th className="p-3 w-28 text-center">Status</th>
                <th className="p-3 w-36 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-on-surface-variant">
                    No stock transfer records found.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(t => {
                  const qtySum = t.items.reduce((s, i) => s + (Number(i.qty) || 0), 0)
                  return (
                    <tr key={t.id} className="hover:bg-surface-container/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary whitespace-nowrap">
                        {t.transfer_number}
                      </td>
                      <td className="p-3 text-on-surface-variant font-mono whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-medium text-on-surface">
                          <span className="truncate max-w-[140px] text-slate-700 dark:text-slate-300">
                            {getWhName(t.source_warehouse_id)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-outline shrink-0" />
                          <span className="truncate max-w-[140px] text-primary font-semibold">
                            {getWhName(t.destination_warehouse_id)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-on-surface font-mono">
                        <span className="block font-semibold text-[11px]">{t.vehicle_number}</span>
                        <span className="text-[10px] text-outline font-sans">{t.driver_name}</span>
                      </td>
                      <td className="p-3 text-on-surface-variant">
                        <span className="line-clamp-1">
                          {t.items.map(i => `${formatNumber(i.qty, 0)} ${i.unit} ${i.item_name}`).join(', ')}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-on-surface text-sm">
                        {formatNumber(qtySum, 0)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : t.status === 'in_transit'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                            : 'bg-slate-200 text-slate-800 border border-slate-300'
                        }`}>
                          {t.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                          {t.status === 'in_transit' && <Truck className="h-3 w-3" />}
                          {t.status === 'draft' && <Clock className="h-3 w-3" />}
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print Gate Pass */}
                          <button
                            onClick={() => {
                              setSelectedTransfer(t)
                              setIsGatePassOpen(true)
                            }}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Print Material Transfer Gate Pass"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          {/* Quick Receive */}
                          {t.status === 'in_transit' && (
                            <button
                              onClick={() => handleMarkReceived(t)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors shadow-xs"
                              title="Acknowledge Receipt at Destination Yard"
                            >
                              Receive
                            </button>
                          )}

                          {/* Quick Dispatch */}
                          {t.status === 'draft' && (
                            <button
                              onClick={() => handleDispatch(t)}
                              className="px-2 py-1 bg-primary hover:bg-primary-hover text-white rounded text-[10px] font-bold transition-colors shadow-xs"
                              title="Dispatch Material"
                            >
                              Dispatch
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Drawer / Modal */}
      {isNewDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl max-w-3xl w-full my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">New Inter-Yard Stock Transfer</h2>
                  <p className="text-xs text-on-surface-variant">Dispatch materials with inter-yard transfer gate pass</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewDrawerOpen(false)}
                className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Route Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-surface-container/30 border border-outline-variant rounded-xl">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Source Yard (Dispatched From) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.source_warehouse_id}
                    onChange={e => setFormData(p => ({ ...p, source_warehouse_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Destination Yard (Consigned To) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.destination_warehouse_id}
                    onChange={e => setFormData(p => ({ ...p, destination_warehouse_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date, Vehicle, Driver */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Transfer Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Vehicle Number / Plant Shifter
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WB-39-B-8491"
                    value={formData.vehicle_number}
                    onChange={e => setFormData(p => ({ ...p, vehicle_number: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Driver Name & Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Manoj Yadav (97330...)"
                    value={formData.driver_name}
                    onChange={e => setFormData(p => ({ ...p, driver_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              {/* Line Items Picker */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-on-surface">Material Items to Transfer</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-outline-variant rounded-xl overflow-hidden divide-y divide-outline-variant">
                  {formData.items.map((row, idx) => (
                    <div key={idx} className="p-3 bg-surface flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <select
                          value={row.item_id}
                          onChange={e => handleItemSelect(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                        >
                          {masterItems.length > 0 ? (
                            masterItems.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.sku})
                              </option>
                            ))
                          ) : (
                            <option value="fg-1">Zig-Zag Concrete Paver Block 80mm (Grey)</option>
                          )}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={row.qty}
                          onChange={e => {
                            const val = Number(e.target.value) || 0
                            setFormData(p => ({
                              ...p,
                              items: p.items.map((it, i) => i === idx ? { ...it, qty: val } : it)
                            }))
                          }}
                          className="w-full px-2.5 py-1.5 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none font-mono"
                        />
                      </div>

                      <div className="w-16">
                        <span className="px-2 py-1.5 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface-variant block text-center uppercase font-mono">
                          {row.unit}
                        </span>
                      </div>

                      <div className="w-36">
                        <input
                          type="text"
                          placeholder="Batch No."
                          value={row.batch_number}
                          onChange={e => {
                            const val = e.target.value
                            setFormData(p => ({
                              ...p,
                              items: p.items.map((it, i) => i === idx ? { ...it, batch_number: val } : it)
                            }))
                          }}
                          className="w-full px-2.5 py-1.5 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1.5 text-outline hover:text-rose-600 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Purpose Notes */}
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Purpose / Notes for Gate Pass
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Curing complete, moving to highway dispatch yard for tomorrow morning loading."
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container/30">
              <button
                type="button"
                onClick={() => setIsNewDrawerOpen(false)}
                className="px-4 py-2 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateTransfer('draft')}
                  className="px-4 py-2 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg font-medium transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateTransfer('in_transit')}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-xs"
                >
                  Dispatch & Print Gate Pass
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gate Pass Modal */}
      <TransferGatePassModal
        transfer={selectedTransfer}
        warehouses={warehouses}
        onClose={() => {
          setIsGatePassOpen(false)
          setSelectedTransfer(null)
        }}
      />
    </div>
  )
}
