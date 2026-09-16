import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Plus, Search, Eye, X, Upload, Camera,
  Loader2, CheckCircle2, Trash2, Image as ImageIcon,
  FileText, Truck, Calendar, Hash,
  Building2, ClipboardList, ZoomIn, Package
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatNumber, toInputDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Supplier, Item, DocumentStatus } from '@/types/database.types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GRNLine {
  id: string
  item_id: string
  item_name: string
  item_sku: string
  item_unit: string
  ordered_qty: number
  received_qty: number
  rate: number
  batch_no: string
  remarks: string
}

interface GoodsReceipt {
  id: string
  grn_number: string
  supplier_id: string
  supplier_name: string
  date: string
  vehicle_number: string
  driver_name: string
  purchase_order_ref: string
  challan_number: string
  notes: string
  status: DocumentStatus
  image_urls: string[]
  lines: GRNLine[]
  created_at: string
}

// ─── localStorage helpers (no DB migration needed) ────────────────────────────

const LS_KEY = 'dd_grn_records'

function loadGRNs(): GoodsReceipt[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveGRNs(grns: GoodsReceipt[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(grns))
}
function generateGRNNumber(): string {
  const seq = loadGRNs().length + 1
  const now = new Date()
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyStr = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`
  return `GRN-${fyStr}-${String(seq).padStart(4, '0')}`
}

function emptyLine(): GRNLine {
  return { id: crypto.randomUUID(), item_id: '', item_name: '', item_sku: '', item_unit: '', ordered_qty: 0, received_qty: 0, rate: 0, batch_no: '', remarks: '' }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

function useSuppliers(companyId: string) {
  return useQuery({
    queryKey: ['suppliers_grn', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('id, name, city').eq('company_id', companyId).eq('is_active', true).order('name')
      if (error) throw error
      return (data || []) as Pick<Supplier, 'id' | 'name' | 'city'>[]
    },
    enabled: !!companyId,
  })
}

type ItemRow = Pick<Item, 'id' | 'name' | 'sku' | 'purchase_rate'> & { unit?: { symbol: string } }

function useItems(companyId: string) {
  return useQuery({
    queryKey: ['items_grn', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items').select('id, name, sku, purchase_rate, unit:units(id, symbol)')
        .eq('company_id', companyId).eq('is_active', true)
        .in('type', ['raw_material', 'consumable']).order('name')
      if (error) throw error
      return (data || []) as ItemRow[]
    },
    enabled: !!companyId,
  })
}

// ─── GRN Form ─────────────────────────────────────────────────────────────────

interface GRNFormProps {
  suppliers: Pick<Supplier, 'id' | 'name' | 'city'>[]
  items: ItemRow[]
  onSave: (grn: GoodsReceipt) => void
  onCancel: () => void
}

function GRNForm({ suppliers, items, onSave, onCancel }: GRNFormProps) {
  const [supplierId, setSupplierId] = useState('')
  const [date, setDate] = useState(toInputDate(new Date()))
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [driverName, setDriverName] = useState('')
  const [poRef, setPoRef] = useState('')
  const [challanNumber, setChallanNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<GRNLine[]>([emptyLine()])
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [itemSearch, setItemSearch] = useState<Record<string, string>>({})
  const [itemDropdownOpen, setItemDropdownOpen] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedSupplier = suppliers.find(s => s.id === supplierId)

  const handleFileChange = useCallback((files: FileList | null) => {
    if (!files) return
    const newImgs = Array.from(files).filter(f => f.type.startsWith('image/')).map(file => ({ file, preview: URL.createObjectURL(file) }))
    setImages(prev => [...prev, ...newImgs])
  }, [])

  const removeImage = (idx: number) => {
    setImages(prev => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx) })
  }

  const updateLine = (id: string, field: keyof GRNLine, value: string | number) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const selectItem = (lineId: string, item: ItemRow) => {
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, item_id: item.id, item_name: item.name, item_sku: item.sku, item_unit: item.unit?.symbol || 'pcs', rate: item.purchase_rate } : l))
    setItemDropdownOpen(null)
    setItemSearch(prev => ({ ...prev, [lineId]: '' }))
  }

  const filteredItems = (lineId: string) => {
    const q = (itemSearch[lineId] || '').toLowerCase()
    return (!q ? items : items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))).slice(0, 40)
  }

  const handleSave = async (status: DocumentStatus) => {
    if (!supplierId) { toast.error('Please select a Vendor'); return }
    if (!date) { toast.error('Please select a date'); return }
    const validLines = lines.filter(l => l.item_id && l.received_qty > 0)
    if (validLines.length === 0) { toast.error('Add at least one item with received qty'); return }
    setSaving(true)
    const grnId = crypto.randomUUID()
    const grn: GoodsReceipt = {
      id: grnId,
      grn_number: generateGRNNumber(),
      supplier_id: supplierId,
      supplier_name: selectedSupplier?.name || '',
      date, vehicle_number: vehicleNumber, driver_name: driverName,
      purchase_order_ref: poRef, challan_number: challanNumber, notes, status,
      image_urls: images.map(i => i.preview),
      lines: validLines,
      created_at: new Date().toISOString(),
    }
    onSave(grn)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">New Goods Receipt (MRN)</h2>
              <p className="text-xs text-outline">Gate entry & inward material inspection</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Header Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-outline uppercase tracking-wide mb-1.5">Vendor *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline pointer-events-none" />
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-outline-variant bg-background text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">Select vendor...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}{s.city ? ` — ${s.city}` : ''}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wide mb-1.5">Receipt Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline pointer-events-none" />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-outline-variant bg-background text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wide mb-1.5">Vehicle No.</label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline pointer-events-none" />
                <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())} placeholder="e.g. MH12AB1234" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-outline-variant bg-background text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wide mb-1.5">Driver Name</label>
              <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Driver / transport person" className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-background text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wide mb-1.5">PO Reference</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline pointer-events-none" />
                <input type="text" value={poRef} onChange={e => setPoRef(e.target.value)} placeholder="Purchase Order No." className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-outline-variant bg-background text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wide mb-1.5">Vendor Challan No.</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline pointer-events-none" />
                <input type="text" value={challanNumber} onChange={e => setChallanNumber(e.target.value)} placeholder="Supplier challan number" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-outline-variant bg-background text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-outline uppercase tracking-wide mb-1.5">Remarks / Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Inspection remarks, quality notes, weighbridge details…" className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-background text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-outline uppercase tracking-wide">Attachments / Photos</label>
              <span className="text-xs text-outline">{images.length} image{images.length !== 1 ? 's' : ''} added</span>
            </div>
            <div
              className="border-2 border-dashed border-outline-variant rounded-xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault() }}
              onDrop={e => { e.preventDefault(); handleFileChange(e.dataTransfer.files) }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-surface-container group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Upload className="h-5 w-5 text-outline group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm font-medium text-on-surface">Drop images here or <span className="text-primary">browse</span></p>
                <p className="text-xs text-outline">Weighbridge slips, delivery challans, damaged goods, quality inspection photos</p>
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors">
                    <Upload className="h-3.5 w-3.5" /> Upload Files
                  </button>
                  <button type="button" onClick={e => {
                    e.stopPropagation()
                    const inp = document.createElement('input')
                    inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment'
                    inp.onchange = ev => handleFileChange((ev.target as HTMLInputElement).files)
                    inp.click()
                  }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors">
                    <Camera className="h-3.5 w-3.5" /> Take Photo
                  </button>
                </div>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileChange(e.target.files)} />
            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img.preview} alt={`Attachment ${idx + 1}`} className="h-20 w-20 object-cover rounded-xl border border-outline-variant cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setLightboxSrc(img.preview)} />
                    <button onClick={() => removeImage(idx)} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl bg-black/20" onClick={() => setLightboxSrc(img.preview)}>
                      <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-outline uppercase tracking-wide">Items Received</h3>
              <button type="button" onClick={() => setLines(prev => [...prev, emptyLine()])} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add Row
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant text-xs uppercase text-outline">
                    <th className="text-left px-3 py-2.5 min-w-[200px]">Item *</th>
                    <th className="text-right px-3 py-2.5 w-24">Ord. Qty</th>
                    <th className="text-right px-3 py-2.5 w-28">Recd. Qty *</th>
                    <th className="text-right px-3 py-2.5 w-28">Rate (₹)</th>
                    <th className="text-left px-3 py-2.5 w-28">Batch/Lot</th>
                    <th className="text-left px-3 py-2.5 min-w-[140px]">Remarks</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {lines.map((line, idx) => {
                    const fi = filteredItems(line.id)
                    return (
                      <tr key={line.id} className="hover:bg-background/60">
                        <td className="px-3 py-2">
                          <div className="relative">
                            <input
                              type="text"
                              value={itemDropdownOpen === line.id ? (itemSearch[line.id] || '') : (line.item_name || '')}
                              placeholder={`Item ${idx + 1}...`}
                              onFocus={() => { setItemDropdownOpen(line.id); setItemSearch(prev => ({ ...prev, [line.id]: '' })) }}
                              onChange={e => { setItemSearch(prev => ({ ...prev, [line.id]: e.target.value })); setItemDropdownOpen(line.id) }}
                              onBlur={() => setTimeout(() => setItemDropdownOpen(null), 150)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            {itemDropdownOpen === line.id && fi.length > 0 && (
                              <div className="absolute top-full left-0 z-50 mt-1 w-72 bg-surface rounded-xl border border-outline-variant shadow-xl max-h-56 overflow-y-auto">
                                {fi.map(item => (
                                  <button key={item.id} type="button" onMouseDown={() => selectItem(line.id, item)} className="w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors">
                                    <p className="text-sm font-medium text-on-surface">{item.name}</p>
                                    <p className="text-xs text-outline">{item.sku} · {item.unit?.symbol || 'pcs'}</p>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {line.item_sku && <p className="text-xs text-outline mt-0.5 pl-1">{line.item_sku} · {line.item_unit}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min={0} value={line.ordered_qty || ''} onChange={e => updateLine(line.id, 'ordered_qty', parseFloat(e.target.value) || 0)} className="w-full text-right px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min={0} value={line.received_qty || ''} onChange={e => updateLine(line.id, 'received_qty', parseFloat(e.target.value) || 0)} className="w-full text-right px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min={0} step={0.01} value={line.rate || ''} onChange={e => updateLine(line.id, 'rate', parseFloat(e.target.value) || 0)} className="w-full text-right px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={line.batch_no} onChange={e => updateLine(line.id, 'batch_no', e.target.value)} placeholder="Batch no." className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={line.remarks} onChange={e => updateLine(line.id, 'remarks', e.target.value)} placeholder="Quality / damage note" className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </td>
                        <td className="px-2 py-2">
                          {lines.length > 1 && (
                            <button type="button" onClick={() => setLines(prev => prev.filter(l => l.id !== line.id))} className="p-1.5 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="mt-3 flex justify-end">
              <div className="bg-surface-container rounded-xl p-3 text-sm space-y-1 min-w-[220px]">
                {lines.filter(l => l.item_id && l.received_qty > 0).map(l => (
                  <div key={l.id} className="flex justify-between gap-6 text-xs text-outline">
                    <span className="truncate max-w-[120px]">{l.item_name}</span>
                    <span className="font-mono">{formatNumber(l.received_qty, 0)} {l.item_unit}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-6 text-xs font-semibold text-on-surface border-t border-outline-variant/60 pt-1 mt-1">
                  <span>Total Value</span>
                  <span className="font-mono text-primary">₹{lines.reduce((s, l) => s + l.received_qty * l.rate, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
            <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors">Cancel</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleSave('draft')} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container hover:bg-outline-variant/30 text-on-surface text-sm font-medium rounded-lg border border-outline-variant transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Save as Draft
              </button>
              <button type="button" onClick={() => handleSave('approved')} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve & Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxSrc(null)}>
          <div className="relative">
            <img src={lightboxSrc} alt="Attachment" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <button className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center text-white" onClick={() => setLightboxSrc(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function GRNDetailModal({ grn, onClose }: { grn: GoodsReceipt; onClose: () => void }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const totalValue = grn.lines.reduce((s, l) => s + l.received_qty * l.rate, 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-3xl">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <div>
            <h2 className="text-base font-bold text-on-surface">{grn.grn_number}</h2>
            <p className="text-xs text-outline">Goods Receipt Note · {formatDate(grn.date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={grn.status} />
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container text-outline"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Vendor', val: grn.supplier_name },
              grn.vehicle_number ? { label: 'Vehicle', val: grn.vehicle_number } : null,
              grn.driver_name ? { label: 'Driver', val: grn.driver_name } : null,
              grn.challan_number ? { label: 'Vendor Challan', val: grn.challan_number } : null,
              grn.purchase_order_ref ? { label: 'PO Ref', val: grn.purchase_order_ref } : null,
            ].filter(Boolean).map(f => f && (
              <div key={f.label}>
                <p className="text-xs text-outline uppercase font-medium mb-0.5">{f.label}</p>
                <p className="font-semibold text-on-surface">{f.val}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-outline-variant">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant text-xs uppercase text-outline">
                  <th className="text-left px-3 py-2.5">Item</th>
                  <th className="text-right px-3 py-2.5">Ordered</th>
                  <th className="text-right px-3 py-2.5">Received</th>
                  <th className="text-right px-3 py-2.5">Rate</th>
                  <th className="text-right px-3 py-2.5">Amount</th>
                  <th className="text-left px-3 py-2.5">Batch</th>
                  <th className="text-left px-3 py-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {grn.lines.map(line => (
                  <tr key={line.id} className="hover:bg-background/60">
                    <td className="px-3 py-2.5"><p className="font-medium text-on-surface">{line.item_name}</p><p className="text-xs text-outline">{line.item_sku}</p></td>
                    <td className="px-3 py-2.5 text-right text-outline">{formatNumber(line.ordered_qty, 0)} {line.item_unit}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-on-surface">{formatNumber(line.received_qty, 0)} {line.item_unit}</td>
                    <td className="px-3 py-2.5 text-right text-outline">₹{formatNumber(line.rate)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-primary">₹{formatNumber(line.received_qty * line.rate)}</td>
                    <td className="px-3 py-2.5 text-outline text-xs">{line.batch_no || '—'}</td>
                    <td className="px-3 py-2.5 text-outline text-xs">{line.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-container border-t border-outline-variant font-semibold text-sm">
                  <td className="px-3 py-2.5 text-on-surface" colSpan={4}>Total</td>
                  <td className="px-3 py-2.5 text-right text-primary">₹{formatNumber(totalValue)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {grn.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              <span className="font-semibold">Notes: </span>{grn.notes}
            </div>
          )}

          {grn.image_urls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-outline uppercase tracking-wide mb-2">Attachments ({grn.image_urls.length})</p>
              <div className="flex flex-wrap gap-3">
                {grn.image_urls.map((url, idx) => (
                  <img key={idx} src={url} alt={`Attachment ${idx + 1}`} onClick={() => setLightboxSrc(url)} className="h-24 w-24 object-cover rounded-xl border border-outline-variant cursor-pointer hover:opacity-90 transition-opacity shadow-xs" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {lightboxSrc && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="Attachment" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function GoodsReceiptsPage() {
  const { user } = useAuth()
  const companyId = user?.company_id || ''
  const { data: suppliers = [] } = useSuppliers(companyId)
  const { data: items = [] } = useItems(companyId)

  const [grns, setGrns] = useState<GoodsReceipt[]>(() => loadGRNs())
  const [showForm, setShowForm] = useState(false)
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceipt | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const handleSave = (grn: GoodsReceipt) => {
    const updated = [grn, ...grns]
    setGrns(updated)
    saveGRNs(updated)
    setShowForm(false)
    toast.success(`${grn.grn_number} saved successfully`)
  }

  const filtered = grns.filter(g => {
    const q = search.toLowerCase()
    const matchSearch = !q || g.grn_number.toLowerCase().includes(q) || g.supplier_name.toLowerCase().includes(q) || g.vehicle_number.toLowerCase().includes(q) || g.challan_number.toLowerCase().includes(q)
    return matchSearch && (statusFilter === 'all' || g.status === statusFilter)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipts (MRN)"
        subtitle="Gate entry, inward inspection & material receipt notes"
        icon={ClipboardList}
        action={{ label: 'New Receipt', icon: Plus, onClick: () => setShowForm(true) }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total GRNs', value: grns.length, icon: ClipboardList, color: 'bg-primary/10 text-primary' },
          { label: 'Pending Approval', value: grns.filter(g => g.status === 'draft').length, icon: FileText, color: 'bg-amber-100 text-amber-600' },
          { label: 'Approved', value: grns.filter(g => g.status === 'approved').length, icon: CheckCircle2, color: 'bg-green-100 text-green-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface rounded-xl border border-outline-variant p-4 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-outline font-medium">{label}</p>
              <p className="text-2xl font-bold text-on-surface">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-outline-variant p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search GRN no., vendor, vehicle, challan..." className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-outline-variant bg-background text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-outline-variant bg-background text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Package} title="No Goods Receipts yet" description="Record inward material receipts with photos of weighbridge slips, delivery challans and inspection notes." action={{ label: '+ New Receipt', onClick: () => setShowForm(true) }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container text-xs uppercase text-outline">
                  <th className="text-left px-4 py-3">GRN No.</th>
                  <th className="text-left px-4 py-3">Vendor</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Vehicle</th>
                  <th className="text-left px-4 py-3">Challan</th>
                  <th className="text-center px-4 py-3">Items</th>
                  <th className="text-right px-4 py-3">Total Value</th>
                  <th className="text-center px-4 py-3">Photos</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {filtered.map(grn => {
                  const totalValue = grn.lines.reduce((s, l) => s + l.received_qty * l.rate, 0)
                  return (
                    <tr key={grn.id} className="hover:bg-background/60 cursor-pointer transition-colors" onClick={() => setSelectedGRN(grn)}>
                      <td className="px-4 py-3"><p className="font-semibold text-on-surface font-mono text-xs">{grn.grn_number}</p></td>
                      <td className="px-4 py-3 font-medium text-on-surface">{grn.supplier_name}</td>
                      <td className="px-4 py-3 text-outline">{formatDate(grn.date)}</td>
                      <td className="px-4 py-3 text-outline font-mono text-xs">{grn.vehicle_number || '—'}</td>
                      <td className="px-4 py-3 text-outline text-xs">{grn.challan_number || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{grn.lines.length}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-on-surface">{totalValue > 0 ? `₹${formatNumber(totalValue, 0)}` : '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {grn.image_urls.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-primary font-medium"><ImageIcon className="h-3.5 w-3.5" />{grn.image_urls.length}</span>
                        ) : <span className="text-outline text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={grn.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={e => { e.stopPropagation(); setSelectedGRN(grn) }} className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-primary/10 transition-colors">
                          <Eye className="h-4 w-4" />
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

      {showForm && <GRNForm suppliers={suppliers} items={items} onSave={handleSave} onCancel={() => setShowForm(false)} />}
      {selectedGRN && <GRNDetailModal grn={selectedGRN} onClose={() => setSelectedGRN(null)} />}
    </div>
  )
}
