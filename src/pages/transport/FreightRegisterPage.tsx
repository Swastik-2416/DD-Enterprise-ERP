import { useState, useMemo } from 'react'
import {
  Truck, Plus, Search, Filter,
  Calendar, CheckCircle2, Clock, MapPin,
  CreditCard, Trash2, Edit3, ArrowRight,
  TrendingDown, DollarSign, X, Building2, Fuel
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, toInputDate } from '@/lib/formatters'
import {
  type FreightTrip,
  type Transporter,
  SEED_TRANSPORTERS
} from '@/types/transport.types'

const LS_KEY = 'dd_freight_register_trips'

function generateTripNumber(existing: FreightTrip[]): string {
  const seq = existing.length + 1
  const now = new Date()
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyStr = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`
  return `TRIP-${fyStr}-${String(seq).padStart(4, '0')}`
}

const SEED_TRIPS: FreightTrip[] = [
  {
    id: 'trip-seed-1',
    trip_number: 'TRIP-2425-0001',
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    transporter_id: 'trans-1',
    transporter_name: 'Maa Tara Roadways',
    vehicle_number: 'WB-25-D-4521',
    driver_name: 'Bapi Mondal',
    driver_phone: '9831998877',
    trip_type: 'sales_dispatch',
    challan_ref: 'DC-2425-0001',
    lr_number: 'LR-8921',
    origin: 'Factory Site, Beside NH-34, Amdanga',
    destination: 'Kalyani Expressway Flyover Site, Nadia',
    material_description: 'Zig-Zag 60mm Paver Blocks (2,000 Sq.Ft)',
    quantity: 2000,
    unit: 'Sq.Ft',
    rate_type: 'per_trip',
    freight_rate: 6500,
    base_freight: 6500,
    toll_charges: 350,
    loading_unloading: 0,
    other_charges: 0,
    total_freight: 6850,
    advance_paid: 2000,
    balance_payable: 4850,
    status: 'delivered',
    notes: 'Advance paid in cash for fuel at factory gate.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'trip-seed-2',
    trip_number: 'TRIP-2425-0002',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    transporter_id: 'trans-2',
    transporter_name: 'National Lorry Transport',
    vehicle_number: 'WB-23-C-1122',
    driver_name: 'Jaswant Singh',
    driver_phone: '9830554433',
    trip_type: 'sales_dispatch',
    challan_ref: 'DC-2425-0002',
    lr_number: 'LR-9014',
    origin: 'Factory Site, Beside NH-34, Amdanga',
    destination: 'Sunrise Greens Project, Rajarhat Kolkata',
    material_description: 'I-Shape 80mm Paver Blocks (1,200 Sq.Ft)',
    quantity: 1200,
    unit: 'Sq.Ft',
    rate_type: 'per_trip',
    freight_rate: 7200,
    base_freight: 7200,
    toll_charges: 400,
    loading_unloading: 0,
    other_charges: 0,
    total_freight: 7600,
    advance_paid: 2500,
    balance_payable: 5100,
    status: 'in_transit',
    notes: 'Toll plaza receipt to be submitted with bill.',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'trip-seed-3',
    trip_number: 'TRIP-2425-0003',
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    transporter_id: 'trans-3',
    transporter_name: 'Bengal Dumper Syndicate',
    vehicle_number: 'WB-25-G-7788',
    driver_name: 'Gopal Roy',
    driver_phone: '9831447788',
    trip_type: 'raw_material_inward',
    challan_ref: 'GRN-2425-0001',
    lr_number: 'LR-7712',
    origin: 'Pakur Stone Quarry, Jharkhand',
    destination: 'Factory Site, Beside NH-34, Amdanga',
    material_description: '10mm Black Stone Chips (40 MT)',
    quantity: 40,
    unit: 'MT',
    rate_type: 'per_ton',
    freight_rate: 850,
    base_freight: 34000,
    toll_charges: 1200,
    loading_unloading: 500,
    other_charges: 0,
    total_freight: 35700,
    advance_paid: 15000,
    balance_payable: 0,
    status: 'settled',
    notes: 'Direct dumper freight from quarry. Fully settled.',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  }
]

function loadStoredTrips(): FreightTrip[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED_TRIPS))
      return SEED_TRIPS
    }
    return JSON.parse(raw)
  } catch {
    return SEED_TRIPS
  }
}

function saveStoredTrips(trips: FreightTrip[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(trips))
  } catch {}
}

export function FreightRegisterPage() {
  const [trips, setTrips] = useState<FreightTrip[]>(loadStoredTrips)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState<FreightTrip | null>(null)

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchSearch =
        t.trip_number.toLowerCase().includes(search.toLowerCase()) ||
        t.transporter_name.toLowerCase().includes(search.toLowerCase()) ||
        t.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
        t.destination.toLowerCase().includes(search.toLowerCase()) ||
        (t.challan_ref && t.challan_ref.toLowerCase().includes(search.toLowerCase()))

      const matchType = typeFilter === 'all' || t.trip_type === typeFilter
      const matchStatus = statusFilter === 'all' || t.status === statusFilter
      return matchSearch && matchType && matchStatus
    })
  }, [trips, search, typeFilter, statusFilter])

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalTrips = trips.length
    const totalFreight = trips.reduce((s, t) => s + (t.status !== 'cancelled' ? t.total_freight : 0), 0)
    const totalAdvance = trips.reduce((s, t) => s + (t.status !== 'cancelled' ? t.advance_paid : 0), 0)
    const totalPayable = trips.reduce((s, t) => s + (t.status !== 'cancelled' ? t.balance_payable : 0), 0)
    return { totalTrips, totalFreight, totalAdvance, totalPayable }
  }, [trips])

  const handleUpdateStatus = (id: string, newStatus: FreightTrip['status']) => {
    setTrips(prev => {
      const next = prev.map(t => {
        if (t.id !== id) return t
        const balance = newStatus === 'settled' ? 0 : t.balance_payable
        return { ...t, status: newStatus, balance_payable: balance }
      })
      saveStoredTrips(next)
      return next
    })
    toast.success(`Trip status updated to ${newStatus.toUpperCase()}`)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this freight trip log?')) {
      setTrips(prev => {
        const next = prev.filter(t => t.id !== id)
        saveStoredTrips(next)
        return next
      })
      toast.success('Freight trip deleted')
    }
  }

  const handleSaveTrip = (record: FreightTrip) => {
    setTrips(prev => {
      const exists = prev.some(t => t.id === record.id)
      const next = exists ? prev.map(t => (t.id === record.id ? record : t)) : [record, ...prev]
      saveStoredTrips(next)
      return next
    })
    setIsFormOpen(false)
    setEditingTrip(null)
    toast.success(editingTrip ? 'Freight trip updated' : 'Freight trip recorded successfully')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Freight Register"
        subtitle="Log lorry trips, transit challans, per-ton & per-trip transport freight, fuel advances & pending settlements"
        icon={Truck}
        action={{
          label: 'Log Freight Trip',
          icon: Plus,
          onClick: () => {
            setEditingTrip(null)
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
            <p className="text-xs text-outline">Total Lorry Trips</p>
            <p className="text-xl font-bold text-on-surface">{metrics.totalTrips}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Total Freight Billed</p>
            <p className="text-lg font-bold text-on-surface font-mono">
              ₹{metrics.totalFreight.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Driver / Fuel Advances</p>
            <p className="text-lg font-bold text-on-surface font-mono">
              ₹{metrics.totalAdvance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-outline">Balance Freight Payable</p>
            <p className="text-lg font-bold text-amber-600 font-mono">
              ₹{metrics.totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
            placeholder="Search trip#, vehicle, transporter, site..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {/* Trip Type Filter */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs">
            <span className="text-outline">Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-outline-variant rounded-lg bg-surface font-medium"
            >
              <option value="all">All Types</option>
              <option value="sales_dispatch">Sales Dispatch</option>
              <option value="raw_material_inward">Raw Material Inward</option>
              <option value="plant_transfer">Plant Transfer</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 shrink-0">
            {['all', 'in_transit', 'delivered', 'settled'].map(st => (
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
      </div>

      {/* Trips Table */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden">
        {filteredTrips.length === 0 ? (
          <EmptyState
            title="No Freight Trips found"
            description="Log your first lorry transit trip to track freight rates, fuel advances, and settlements."
            icon={Truck}
            action={{
              label: 'Log Freight Trip',
              onClick: () => {
                setEditingTrip(null)
                setIsFormOpen(true)
              },
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container/50 text-xs font-semibold text-outline uppercase tracking-wider">
                  <th className="py-3 px-4">Trip No & Date</th>
                  <th className="py-3 px-4">Transporter & Vehicle</th>
                  <th className="py-3 px-4">Route & Material</th>
                  <th className="py-3 px-4">Challan / LR Ref</th>
                  <th className="py-3 px-4 text-right">Freight Amount</th>
                  <th className="py-3 px-4 text-right">Advance / Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredTrips.map(trip => (
                  <tr key={trip.id} className="hover:bg-surface-container/30 transition-colors">
                    {/* Trip No */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary font-mono">{trip.trip_number}</div>
                      <div className="text-xs text-outline flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(trip.date)}
                      </div>
                    </td>

                    {/* Transporter */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-on-surface">{trip.transporter_name}</div>
                      <div className="text-xs font-mono font-bold text-on-surface-variant mt-0.5">
                        {trip.vehicle_number}
                      </div>
                      {trip.driver_name && (
                        <div className="text-[11px] text-outline">Driver: {trip.driver_name}</div>
                      )}
                    </td>

                    {/* Route */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-xs font-medium text-on-surface truncate">
                        {trip.origin} → {trip.destination}
                      </div>
                      <div className="text-[11px] text-outline mt-0.5 truncate">
                        {trip.material_description}
                      </div>
                    </td>

                    {/* Ref */}
                    <td className="py-3 px-4">
                      {trip.challan_ref ? (
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-surface-container rounded">
                          {trip.challan_ref}
                        </span>
                      ) : (
                        <span className="text-xs text-outline font-mono">LR: {trip.lr_number || '—'}</span>
                      )}
                      <div className="text-[10px] text-outline uppercase mt-0.5">
                        {trip.trip_type.replace('_', ' ')}
                      </div>
                    </td>

                    {/* Freight */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-on-surface font-mono">
                        {formatCurrency(trip.total_freight)}
                      </div>
                      <div className="text-[11px] text-outline">
                        {trip.rate_type === 'per_ton'
                          ? `@₹${trip.freight_rate}/MT`
                          : trip.rate_type === 'per_sqft'
                          ? `@₹${trip.freight_rate}/Sq.Ft`
                          : 'Per Trip Rate'}
                      </div>
                    </td>

                    {/* Advance / Balance */}
                    <td className="py-3 px-4 text-right">
                      <div className="text-xs text-green-600 font-mono font-semibold">
                        Adv: {formatCurrency(trip.advance_paid)}
                      </div>
                      <div
                        className={`text-xs font-mono font-bold mt-0.5 ${
                          trip.balance_payable > 0 ? 'text-amber-600' : 'text-outline'
                        }`}
                      >
                        Bal: {formatCurrency(trip.balance_payable)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <StatusBadge
                        status={trip.status === 'settled' ? 'posted' : trip.status === 'delivered' ? 'approved' : 'submitted'}
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {trip.status === 'in_transit' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(trip.id, 'delivered')}
                            className="px-2 py-1 text-xs font-semibold bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 rounded-md transition-colors"
                            title="Mark Delivered at Destination"
                          >
                            Delivered
                          </button>
                        )}

                        {trip.status === 'delivered' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(trip.id, 'settled')}
                            className="px-2 py-1 text-xs font-semibold bg-green-500/10 text-green-700 hover:bg-green-500/20 rounded-md transition-colors"
                            title="Settle Outstanding Balance"
                          >
                            Settle
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setEditingTrip(trip)
                            setIsFormOpen(true)
                          }}
                          className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container rounded-md transition-colors"
                          title="Edit Trip"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(trip.id)}
                          className="p-1.5 text-error hover:bg-error-container/20 rounded-md transition-colors"
                          title="Delete Log"
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
        )}
      </div>

      {/* Trip Modal */}
      {isFormOpen && (
        <FreightTripFormModal
          existingTrip={editingTrip}
          existingTrips={trips}
          onSave={handleSaveTrip}
          onClose={() => {
            setIsFormOpen(false)
            setEditingTrip(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Trip Form Modal ─────────────────────────────────────────────────────────────

interface TripFormModalProps {
  existingTrip: FreightTrip | null
  existingTrips: FreightTrip[]
  onSave: (record: FreightTrip) => void
  onClose: () => void
}

function FreightTripFormModal({ existingTrip, existingTrips, onSave, onClose }: TripFormModalProps) {
  const [date, setDate] = useState(existingTrip?.date || toInputDate(new Date()))
  const [transporterName, setTransporterName] = useState(
    existingTrip?.transporter_name || 'Maa Tara Roadways'
  )
  const [vehicleNumber, setVehicleNumber] = useState(existingTrip?.vehicle_number || '')
  const [driverName, setDriverName] = useState(existingTrip?.driver_name || '')
  const [driverPhone, setDriverPhone] = useState(existingTrip?.driver_phone || '')
  const [tripType, setTripType] = useState<FreightTrip['trip_type']>(
    existingTrip?.trip_type || 'sales_dispatch'
  )
  const [challanRef, setChallanRef] = useState(existingTrip?.challan_ref || '')
  const [lrNumber, setLrNumber] = useState(existingTrip?.lr_number || '')
  const [origin, setOrigin] = useState(
    existingTrip?.origin || 'Factory Site, Beside NH-34, Amdanga'
  )
  const [destination, setDestination] = useState(existingTrip?.destination || '')
  const [materialDescription, setMaterialDescription] = useState(
    existingTrip?.material_description || 'Concrete Paver Blocks'
  )
  const [quantity, setQuantity] = useState<number>(existingTrip?.quantity || 1000)
  const [unit, setUnit] = useState(existingTrip?.unit || 'Sq.Ft')
  const [rateType, setRateType] = useState<FreightTrip['rate_type']>(
    existingTrip?.rate_type || 'per_trip'
  )
  const [freightRate, setFreightRate] = useState<number>(existingTrip?.freight_rate || 6000)
  const [tollCharges, setTollCharges] = useState<number>(existingTrip?.toll_charges || 0)
  const [loadingUnloading, setLoadingUnloading] = useState<number>(
    existingTrip?.loading_unloading || 0
  )
  const [otherCharges, setOtherCharges] = useState<number>(existingTrip?.other_charges || 0)
  const [advancePaid, setAdvancePaid] = useState<number>(existingTrip?.advance_paid || 0)
  const [status, setStatus] = useState<FreightTrip['status']>(
    existingTrip?.status || 'in_transit'
  )
  const [notes, setNotes] = useState(existingTrip?.notes || '')

  // Calculate Base and Total
  const baseFreight = useMemo(() => {
    if (rateType === 'per_trip' || rateType === 'fixed') {
      return freightRate
    }
    return Math.round(quantity * freightRate * 100) / 100
  }, [rateType, freightRate, quantity])

  const totalFreight = useMemo(() => {
    return baseFreight + Number(tollCharges || 0) + Number(loadingUnloading || 0) + Number(otherCharges || 0)
  }, [baseFreight, tollCharges, loadingUnloading, otherCharges])

  const balancePayable = useMemo(() => {
    const bal = totalFreight - Number(advancePaid || 0)
    return bal < 0 ? 0 : bal
  }, [totalFreight, advancePaid])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!transporterName.trim()) {
      toast.error('Transporter Name is required')
      return
    }
    if (!vehicleNumber.trim()) {
      toast.error('Vehicle Number is required')
      return
    }
    if (!destination.trim()) {
      toast.error('Destination / Delivery site is required')
      return
    }

    const tripNumber = existingTrip?.trip_number || generateTripNumber(existingTrips)

    const finalRecord: FreightTrip = {
      id: existingTrip?.id || crypto.randomUUID(),
      trip_number: tripNumber,
      date,
      transporter_id: existingTrip?.transporter_id || 'trans-1',
      transporter_name: transporterName,
      vehicle_number: vehicleNumber.toUpperCase().trim(),
      driver_name: driverName || undefined,
      driver_phone: driverPhone || undefined,
      trip_type: tripType,
      challan_ref: challanRef || undefined,
      lr_number: lrNumber || undefined,
      origin,
      destination,
      material_description: materialDescription,
      quantity,
      unit,
      rate_type: rateType,
      freight_rate: freightRate,
      base_freight: baseFreight,
      toll_charges: Number(tollCharges) || 0,
      loading_unloading: Number(loadingUnloading) || 0,
      other_charges: Number(otherCharges) || 0,
      total_freight: totalFreight,
      advance_paid: Number(advancePaid) || 0,
      balance_payable: balancePayable,
      status,
      notes: notes || undefined,
      created_at: existingTrip?.created_at || new Date().toISOString(),
    }

    onSave(finalRecord)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface shrink-0">
          <div>
            <h3 className="text-base font-bold text-on-surface">
              {existingTrip ? `Edit Freight Trip (${existingTrip.trip_number})` : 'Log New Lorry Freight Trip'}
            </h3>
            <p className="text-xs text-outline mt-0.5">
              Record transit trip, vehicle freight calculation &amp; driver advances
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Row 1: Transporter & Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Trip Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Transporter Name <span className="text-error">*</span>
              </label>
              <select
                value={transporterName}
                onChange={e => setTransporterName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-semibold"
              >
                {SEED_TRANSPORTERS.map(t => (
                  <option key={t.id} value={t.name}>
                    {t.name} ({t.city})
                  </option>
                ))}
                <option value="Direct / Self Vehicle">Direct / Factory Vehicle</option>
                <option value="Other Transporter">Other Transporter</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Vehicle No. (Truck / Lorry) <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="WB-25-D-4521"
                className="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-bold"
              />
            </div>
          </div>

          {/* Row 2: Driver, Type & Challan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Driver Name &amp; Phone
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  placeholder="Driver Name"
                  className="w-full px-2.5 py-2 text-xs border border-outline-variant rounded-lg bg-surface"
                />
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={e => setDriverPhone(e.target.value)}
                  placeholder="Mobile No"
                  className="w-full px-2.5 py-2 text-xs border border-outline-variant rounded-lg bg-surface"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Trip Category
              </label>
              <select
                value={tripType}
                onChange={e => setTripType(e.target.value as FreightTrip['trip_type'])}
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface"
              >
                <option value="sales_dispatch">Sales Dispatch (To Customer)</option>
                <option value="raw_material_inward">Raw Material Inward (Sand/Stone/Cement)</option>
                <option value="plant_transfer">Factory / Stock Transfer</option>
                <option value="other">Other Transit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Challan / LR Reference
              </label>
              <input
                type="text"
                value={challanRef}
                onChange={e => setChallanRef(e.target.value)}
                placeholder="e.g. DC-2425-0001 or LR-8921"
                className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface"
              />
            </div>
          </div>

          {/* Row 3: Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Origin (From Location) <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder="Factory Site, Amdanga"
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Destination (To Site / Delivery Point) <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Customer site or unloading point"
                className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface"
              />
            </div>
          </div>

          {/* Row 4: Material & Rate calculation */}
          <div className="bg-surface-container/30 p-4 rounded-xl border border-outline-variant space-y-4">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Material &amp; Freight Rate Calculation
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-on-surface mb-1">
                  Material Description
                </label>
                <input
                  type="text"
                  value={materialDescription}
                  onChange={e => setMaterialDescription(e.target.value)}
                  placeholder="e.g. Zig-Zag 60mm Paver Blocks"
                  className="w-full px-3 py-1.5 text-xs border border-outline-variant rounded-lg bg-surface"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-on-surface mb-1">
                  Quantity &amp; Unit
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="number"
                    min="1"
                    value={quantity || ''}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs font-mono text-right border border-outline-variant rounded-lg bg-surface"
                  />
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-1 py-1.5 text-xs border border-outline-variant rounded-lg bg-surface"
                  >
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="MT">MT</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Bags">Bags</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-on-surface mb-1">
                  Rate Basis
                </label>
                <select
                  value={rateType}
                  onChange={e => setRateType(e.target.value as FreightTrip['rate_type'])}
                  className="w-full px-2 py-1.5 text-xs border border-outline-variant rounded-lg bg-surface font-medium"
                >
                  <option value="per_trip">Per Trip Rate</option>
                  <option value="per_ton">Per Metric Ton (MT)</option>
                  <option value="per_sqft">Per Sq.Ft</option>
                </select>
              </div>
            </div>

            {/* Financial Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-outline-variant/60">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface mb-1">
                  Base Rate (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={freightRate || ''}
                  onChange={e => setFreightRate(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-right border border-outline-variant rounded-lg bg-surface"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-on-surface mb-1">
                  Toll Charges (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={tollCharges || ''}
                  onChange={e => setTollCharges(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 text-xs font-mono text-right border border-outline-variant rounded-lg bg-surface"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-on-surface mb-1">
                  Loading/Extra (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={loadingUnloading || ''}
                  onChange={e => setLoadingUnloading(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 text-xs font-mono text-right border border-outline-variant rounded-lg bg-surface"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-green-700 dark:text-green-400 mb-1">
                  Fuel Advance Paid (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={advancePaid || ''}
                  onChange={e => setAdvancePaid(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 text-xs font-mono text-right border border-green-300 rounded-lg bg-green-50/50 dark:bg-green-950/20 font-bold"
                />
              </div>
            </div>

            {/* Total / Balance summary ribbon */}
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant text-xs">
              <div>
                <span className="text-outline">Total Freight Billed: </span>
                <span className="font-mono font-bold text-on-surface text-sm">
                  ₹{totalFreight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-outline">Net Balance Payable: </span>
                <span className="font-mono font-black text-amber-600 text-sm ml-1">
                  ₹{balancePayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Trip Notes / Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Toll receipt attached, balance payable upon return of signed challan"
              className="w-full px-3 py-2 text-xs border border-outline-variant rounded-lg bg-surface"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-outline-variant flex items-center justify-between shrink-0">
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
              Save Freight Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
