import { useState } from 'react'
import {
  Building2, Plus, Search, MapPin, Phone, User,
  CheckCircle2, Layers, AlertCircle, X, Save, Edit3
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatNumber } from '@/lib/formatters'
import {
  type Warehouse,
  SEED_WAREHOUSES
} from '@/types/warehouse.types'

const WAREHOUSE_STORAGE_KEY = 'dd_warehouses_list'

export function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    try {
      const stored = localStorage.getItem(WAREHOUSE_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return SEED_WAREHOUSES
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null)

  const [formData, setFormData] = useState<{
    code: string
    name: string
    type: Warehouse['type']
    address: string
    in_charge: string
    phone: string
    capacity_sqft: number
  }>({
    code: '',
    name: '',
    type: 'transit_depot',
    address: '',
    in_charge: '',
    phone: '',
    capacity_sqft: 50000
  })

  const saveWarehouses = (updated: Warehouse[]) => {
    setWarehouses(updated)
    try {
      localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(updated))
    } catch {}
  }

  const filteredWarehouses = warehouses.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.in_charge.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenAdd = () => {
    setEditingWh(null)
    setFormData({
      code: `WH-DEPOT-0${warehouses.length + 1}`,
      name: '',
      type: 'transit_depot',
      address: '',
      in_charge: '',
      phone: '',
      capacity_sqft: 50000
    })
    setIsDrawerOpen(true)
  }

  const handleOpenEdit = (w: Warehouse) => {
    setEditingWh(w)
    setFormData({
      code: w.code,
      name: w.name,
      type: w.type,
      address: w.address,
      in_charge: w.in_charge,
      phone: w.phone,
      capacity_sqft: w.capacity_sqft
    })
    setIsDrawerOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Yard Name and Code are required')
      return
    }

    if (editingWh) {
      const updated = warehouses.map(w =>
        w.id === editingWh.id ? { ...w, ...formData } : w
      )
      saveWarehouses(updated)
      toast.success('Warehouse updated successfully!')
    } else {
      const newWh: Warehouse = {
        id: `wh-${Date.now()}`,
        ...formData,
        is_active: true,
        is_default: false,
        created_at: new Date().toISOString()
      }
      saveWarehouses([...warehouses, newWh])
      toast.success('New warehouse registered!')
    }
    setIsDrawerOpen(false)
  }

  const getTypeBadge = (type: Warehouse['type']) => {
    switch (type) {
      case 'factory_yard':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'curing_shed':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200'
      case 'transit_depot':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200'
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-on-surface">Warehouses & Storage Yards</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {warehouses.length} Active Yards
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Manage physical stock locations, curing sheds, raw material stores, and highway transit depots
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-hover transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Storage Yard</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="h-3.5 w-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search yard by name, code, in-charge or address..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
          />
        </div>
        <span className="text-xs text-on-surface-variant font-mono">
          Showing {filteredWarehouses.length} of {warehouses.length} locations
        </span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWarehouses.map(w => (
          <div
            key={w.id}
            className="bg-surface rounded-2xl border border-outline-variant p-5 shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-on-surface">{w.name}</h3>
                    {w.is_default && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Primary Plant
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-primary mt-0.5 block">
                    {w.code}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${getTypeBadge(w.type)}`}>
                  {w.type.replace('_', ' ')}
                </span>
              </div>

              {/* Location details */}
              <div className="space-y-2 mt-4 text-xs">
                <div className="flex items-start gap-2 text-on-surface-variant">
                  <MapPin className="h-4 w-4 text-outline shrink-0 mt-0.5" />
                  <span className="leading-tight">{w.address}</span>
                </div>
                <div className="flex items-center justify-between text-on-surface pt-2 border-t border-outline-variant">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-outline" />
                    <span>In-Charge: <strong>{w.in_charge}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-outline" />
                    <span>{w.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-outline-variant flex items-center justify-between text-xs">
              <span className="font-mono text-on-surface-variant">
                Capacity: <strong>{formatNumber(w.capacity_sqft, 0)} Sq.Ft</strong>
              </span>
              <button
                onClick={() => handleOpenEdit(w)}
                className="flex items-center gap-1 text-primary hover:underline font-semibold text-xs"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Details</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl max-w-lg w-full my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">
                    {editingWh ? 'Edit Storage Yard' : 'Add Storage Location'}
                  </h2>
                  <p className="text-xs text-on-surface-variant">Configure physical warehouse and yard capacity</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Yard Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none uppercase font-mono"
                    placeholder="e.g. WH-DEPOT-02"
                  />
                </div>
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Yard Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(p => ({ ...p, type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                  >
                    <option value="factory_yard">Finished Goods Yard</option>
                    <option value="curing_shed">Curing & Fog Shed</option>
                    <option value="transit_depot">Transit Dispatch Depot</option>
                    <option value="raw_material_store">Raw Material Store</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Yard / Warehouse Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                  placeholder="e.g. Burdwan Link Road Distribution Depot"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Physical Address & Location Details
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                  placeholder="e.g. Plot 18, NH-19 Bypass Link"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Supervisor / In-Charge Name
                  </label>
                  <input
                    type="text"
                    value={formData.in_charge}
                    onChange={e => setFormData(p => ({ ...p, in_charge: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
                    placeholder="e.g. Tapan Ghosh"
                  />
                </div>
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none font-mono"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Estimated Storage Capacity (Sq.Ft)
                </label>
                <input
                  type="number"
                  value={formData.capacity_sqft}
                  onChange={e => setFormData(p => ({ ...p, capacity_sqft: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none font-mono"
                  placeholder="50000"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-xs"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingWh ? 'Update Yard' : 'Save Warehouse'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
