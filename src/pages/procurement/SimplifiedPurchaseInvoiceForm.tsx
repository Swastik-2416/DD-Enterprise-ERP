import { useState, useMemo, useEffect, useRef } from 'react'
import {
  ArrowLeft, Plus, Trash2, Printer, Save,
  Building2, Receipt, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { formatCurrency, amountInWords, round2 } from '@/lib/formatters'
import { GST_RATES } from '@/lib/constants'
import type { Supplier, Item, PurchaseInvoice, PurchaseInvoiceLine } from '@/types/database.types'

export interface AdditionalCharge {
  id: string
  name: string
  amount: number | ''
  gst_rate: number
}

export interface InvoiceFormItemLine {
  id: string
  item_id: string
  name: string
  note: string
  barcode: string
  qty: number | ''
  uom: string
  price: number | ''
  discount: number | ''
  gst_rate: number
}

const INDIAN_STATES = [
  'West Bengal', 'Uttar Pradesh', 'Maharashtra', 'Delhi', 'Bihar',
  'Jharkhand', 'Odisha', 'Gujarat', 'Karnataka', 'Tamil Nadu',
  'Rajasthan', 'Madhya Pradesh', 'Punjab', 'Haryana', 'Assam',
  'Andhra Pradesh', 'Telangana', 'Kerala', 'Chhattisgarh', 'Uttarakhand'
]

const COMMON_UOMS = ['PCS', 'BAGS', 'KGS', 'TON', 'MTR', 'NOS', 'CFT', 'SQFT', 'PKT', 'LTR']

interface SimplifiedPurchaseInvoiceFormProps {
  companyId: string
  userId: string
  existingInvoiceCount: number
  suppliers: Supplier[]
  items: (Item & { unit?: { symbol: string } })[]
  editingInvoice?: (PurchaseInvoice & { supplier?: Supplier }) | null
  existingLines?: (PurchaseInvoiceLine & { item?: Item & { unit?: { symbol: string } } })[]
  onBack: () => void
  onSuccess: (savedInvoice: PurchaseInvoice, lines: PurchaseInvoiceLine[], autoPrint?: boolean) => void
}

export function SimplifiedPurchaseInvoiceForm({
  companyId,
  userId,
  existingInvoiceCount,
  suppliers,
  items,
  editingInvoice,
  existingLines,
  onBack,
  onSuccess,
}: SimplifiedPurchaseInvoiceFormProps) {
  // Sequence calculation
  const defaultInvoiceNumber = useMemo(() => {
    if (editingInvoice?.invoice_number) return editingInvoice.invoice_number
    const now = new Date()
    const year = now.getFullYear() % 100
    const nextYear = year + 1
    const fy = `${year}${nextYear}`
    return `PUR-${fy}-${String(existingInvoiceCount + 1).padStart(4, '0')}`
  }, [editingInvoice, existingInvoiceCount])

  // Parse any existing notes
  const initialMeta = useMemo(() => {
    if (editingInvoice?.notes) {
      try {
        if (editingInvoice.notes.startsWith('{') && editingInvoice.notes.endsWith('}')) {
          return JSON.parse(editingInvoice.notes)
        }
      } catch {
        // regular string
      }
    }
    return null
  }, [editingInvoice])

  // ─── Vendor State ──────────────────────────────────────────────────────────
  const [vendorName, setVendorName] = useState(editingInvoice?.supplier?.name || '')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(editingInvoice?.supplier_id || null)
  const [address, setAddress] = useState(editingInvoice?.supplier?.address || '')
  const [contactPerson, setContactPerson] = useState(editingInvoice?.supplier?.contact_person || '')
  const [phone, setPhone] = useState(editingInvoice?.supplier?.phone || '')
  const [gstin, setGstin] = useState(editingInvoice?.supplier?.gstin || '')
  const [shipTo, setShipTo] = useState(initialMeta?.ship_to || 'Factory Site - Beside NH-34, Amdanga')
  const [placeOfSupply, setPlaceOfSupply] = useState(initialMeta?.place_of_supply || editingInvoice?.supplier?.state || 'West Bengal')

  // Vendor suggestions dropdown
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false)
  const vendorInputRef = useRef<HTMLInputElement>(null)

  // ─── Invoice Details State ────────────────────────────────────────────────
  const [invoiceType, setInvoiceType] = useState(initialMeta?.invoice_type || 'Regular')
  const [invoiceNumber, setInvoiceNumber] = useState(defaultInvoiceNumber)
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState(editingInvoice?.supplier_invoice_number || '')
  const [date, setDate] = useState(editingInvoice?.date || new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    if (editingInvoice?.due_date) return editingInvoice.due_date
    const d = new Date()
    d.setDate(d.getDate() + 15)
    return d.toISOString().split('T')[0]
  })
  const [deliveryMode, setDeliveryMode] = useState(initialMeta?.delivery_mode || 'Road / Lorry')
  const [vehicleNo, setVehicleNo] = useState(initialMeta?.vehicle_no || '')

  // ─── Discount Mode & Product Lines State ──────────────────────────────────
  const [discountMode, setDiscountMode] = useState<'rs' | 'percent'>('percent')
  const [lines, setLines] = useState<InvoiceFormItemLine[]>(() => {
    if (existingLines && existingLines.length > 0) {
      return existingLines.map((l, i) => ({
        id: l.id || `line-${i}`,
        item_id: l.item_id,
        name: l.item?.name || '',
        note: '',
        barcode: l.item?.sku || '',
        qty: Number(l.qty) || 1,
        uom: l.item?.unit?.symbol || 'PCS',
        price: Number(l.rate) || 0,
        discount: 0,
        gst_rate: Number(l.gst_rate) || 18,
      }))
    }
    const first = items[0]
    return [
      {
        id: `line-${Date.now()}-1`,
        item_id: first?.id || '',
        name: first?.name || '',
        note: '',
        barcode: first?.sku || '',
        qty: 1,
        uom: first?.unit?.symbol || 'BAGS',
        price: first?.purchase_rate || '',
        discount: '',
        gst_rate: first?.gst_rate ?? 18,
      },
    ]
  })

  // ─── Additional Charges State ─────────────────────────────────────────────
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>(
    initialMeta?.additional_charges || []
  )

  // ─── Notes & Terms State ──────────────────────────────────────────────────
  const [termsTitle, setTermsTitle] = useState(initialMeta?.terms_title || 'Terms & Conditions')
  const [termsDetail, setTermsDetail] = useState(
    initialMeta?.terms_detail ||
      '1. Goods received subject to weighbridge and quality check.\n2. Payment terms: 30 days credit from invoice date.'
  )
  const [remarks, setRemarks] = useState(
    initialMeta?.remarks || (editingInvoice?.notes && !initialMeta ? editingInvoice.notes : '')
  )

  // ─── Payment Type & Settings ──────────────────────────────────────────────
  const [paymentType, setPaymentType] = useState<'CREDIT' | 'CASH' | 'CHEQUE' | 'ONLINE'>(
    initialMeta?.payment_type || 'CREDIT'
  )
  const [updateMasterPrice, setUpdateMasterPrice] = useState(true)
  const [roundOffEnabled, setRoundOffEnabled] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle supplier selection from suggestions
  const handleSelectSupplier = (s: Supplier) => {
    setSelectedSupplierId(s.id)
    setVendorName(s.name)
    setAddress(s.address || '')
    setPhone(s.phone || '')
    setGstin(s.gstin || '')
    setContactPerson(s.contact_person || '')
    if (s.state) setPlaceOfSupply(s.state)
    setShowVendorSuggestions(false)
  }

  // Filtered vendor suggestions
  const filteredSuppliers = useMemo(() => {
    if (!vendorName.trim()) return suppliers
    const q = vendorName.toLowerCase()
    return suppliers.filter(
      s => s.name.toLowerCase().includes(q) || (s.gstin && s.gstin.toLowerCase().includes(q))
    )
  }, [suppliers, vendorName])

  // Add new product line
  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random()}`,
        item_id: '',
        name: '',
        note: '',
        barcode: '',
        qty: 1,
        uom: 'BAGS',
        price: '',
        discount: '',
        gst_rate: 18,
      },
    ])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) {
      toast.error('At least one item row is required')
      return
    }
    setLines(prev => prev.filter((_, i) => i !== index))
  }

  const handleLineChange = (index: number, field: keyof InvoiceFormItemLine, val: any) => {
    setLines(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }

      // If user typed or picked an item name, check if matches catalog
      if (field === 'name') {
        const match = items.find(it => it.name.toLowerCase() === String(val).trim().toLowerCase())
        if (match) {
          copy[index].item_id = match.id
          if (match.purchase_rate) copy[index].price = match.purchase_rate
          if (match.gst_rate != null) copy[index].gst_rate = match.gst_rate
          if (match.unit?.symbol) copy[index].uom = match.unit.symbol
          if (match.sku) copy[index].barcode = match.sku
        }
      }
      return copy
    })
  }

  // Add / remove additional charge
  const handleAddAdditionalCharge = () => {
    setAdditionalCharges(prev => [
      ...prev,
      {
        id: `charge-${Date.now()}`,
        name: 'Freight / Transportation',
        amount: '',
        gst_rate: 18,
      },
    ])
  }

  const handleRemoveAdditionalCharge = (id: string) => {
    setAdditionalCharges(prev => prev.filter(c => c.id !== id))
  }

  const handleChargeChange = (id: string, field: keyof AdditionalCharge, val: any) => {
    setAdditionalCharges(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: val } : c))
    )
  }

  // ─── Calculations ─────────────────────────────────────────────────────────
  const calculations = useMemo(() => {
    let totalQty = 0
    let subtotalPrice = 0
    let totalDiscount = 0
    let totalTaxable = 0
    let totalTax = 0

    const isInterstate =
      placeOfSupply.trim().toLowerCase() !== 'west bengal'

    lines.forEach(line => {
      const q = Number(line.qty) || 0
      const p = Number(line.price) || 0
      const d = Number(line.discount) || 0

      totalQty += q
      subtotalPrice += p

      const baseVal = q * p
      let lineDiscountAmt = 0
      if (discountMode === 'percent') {
        lineDiscountAmt = baseVal * (d / 100)
      } else {
        lineDiscountAmt = d
      }
      totalDiscount += lineDiscountAmt

      const lineTaxable = Math.max(0, baseVal - lineDiscountAmt)
      const lineTax = lineTaxable * ((Number(line.gst_rate) || 0) / 100)

      totalTaxable += lineTaxable
      totalTax += lineTax
    })

    // Additional charges calculation
    let additionalTaxable = 0
    let additionalTax = 0
    additionalCharges.forEach(charge => {
      const amt = Number(charge.amount) || 0
      const tax = amt * ((Number(charge.gst_rate) || 0) / 100)
      additionalTaxable += amt
      additionalTax += tax
    })

    const combinedTaxable = totalTaxable + additionalTaxable
    const combinedTax = totalTax + additionalTax
    const rawGrandTotal = combinedTaxable + combinedTax

    let finalGrandTotal = rawGrandTotal
    let roundOffDiff = 0
    if (roundOffEnabled) {
      finalGrandTotal = Math.round(rawGrandTotal)
      roundOffDiff = round2(finalGrandTotal - rawGrandTotal)
    }

    const cgst = isInterstate ? 0 : round2(combinedTax / 2)
    const sgst = isInterstate ? 0 : round2(combinedTax / 2)
    const igst = isInterstate ? round2(combinedTax) : 0

    return {
      totalQty,
      subtotalPrice,
      totalDiscount,
      totalTaxable: round2(combinedTaxable),
      totalTax: round2(combinedTax),
      cgst,
      sgst,
      igst,
      rawGrandTotal: round2(rawGrandTotal),
      finalGrandTotal: round2(finalGrandTotal),
      roundOffDiff,
      isInterstate,
    }
  }, [lines, additionalCharges, discountMode, roundOffEnabled, placeOfSupply])

  // ─── Save Logic ───────────────────────────────────────────────────────────
  const handleSave = async (andPrint = false) => {
    if (isSubmitting) return

    if (!vendorName.trim()) {
      toast.error('Please enter the Vendor name (M/S)')
      vendorInputRef.current?.focus()
      return
    }

    if (!invoiceNumber.trim()) {
      toast.error('Please specify an Invoice Number')
      return
    }

    if (lines.length === 0) {
      toast.error('Please add at least one product item')
      return
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (!l.name.trim()) {
        toast.error(`Please enter an item name on line ${i + 1}`)
        return
      }
      if (l.qty === '' || Number(l.qty) <= 0) {
        toast.error(`Please enter a valid quantity on line ${i + 1}`)
        return
      }
      if (l.price === '' || Number(l.price) < 0) {
        toast.error(`Please enter a valid price on line ${i + 1}`)
        return
      }
    }

    setIsSubmitting(true)
    const toastId = toast.loading(
      editingInvoice ? 'Updating purchase invoice...' : 'Recording purchase invoice...'
    )

    try {
      // 1. Resolve or Create Supplier
      let finalSupplierId = selectedSupplierId
      if (!finalSupplierId) {
        // Search if supplier exists with exact name
        const match = suppliers.find(
          s => s.name.toLowerCase() === vendorName.trim().toLowerCase()
        )
        if (match) {
          finalSupplierId = match.id
        } else {
          // Create new supplier on the fly
          const { data: newSupp, error: suppErr } = await (supabase
            .from('suppliers') as any)
            .insert({
              company_id: companyId,
              name: vendorName.trim(),
              address: address.trim() || 'Factory Consignment Local',
              city: 'Amdanga',
              state: placeOfSupply.trim() || 'West Bengal',
              phone: phone.trim() || 'N/A',
              gstin: gstin.trim().toUpperCase() || null,
              contact_person: contactPerson.trim() || null,
              is_active: true,
            })
            .select()
            .single()

          if (suppErr) throw suppErr
          finalSupplierId = newSupp.id
        }
      }

      // 2. Resolve or Create Items for each line
      const resolvedLines: {
        item_id: string
        qty: number
        rate: number
        taxable_amount: number
        gst_rate: number
        cgst_amount: number
        sgst_amount: number
        line_total: number
        unitSymbol: string
      }[] = []

      // Fetch units to link if creating new items
      const { data: rawUnits } = await (supabase.from('units') as any)
        .select('id, symbol')
        .eq('company_id', companyId)

      const unitList = (rawUnits || []) as { id: string; symbol: string }[]
      const defaultUnitId = unitList[0]?.id || null

      for (const line of lines) {
        const q = Number(line.qty) || 0
        const p = Number(line.price) || 0
        const d = Number(line.discount) || 0
        const baseVal = q * p
        const lineDiscount =
          discountMode === 'percent' ? baseVal * (d / 100) : d
        const lineTaxable = round2(Math.max(0, baseVal - lineDiscount))
        const lineTax = round2(lineTaxable * ((Number(line.gst_rate) || 0) / 100))
        const lineTotal = round2(lineTaxable + lineTax)

        let itemId = line.item_id
        if (!itemId) {
          // Check if item exists by name
          const existingItem = items.find(
            it => it.name.toLowerCase() === line.name.trim().toLowerCase()
          )
          if (existingItem) {
            itemId = existingItem.id
          } else {
            // Find unit id matching uom
            const matchedUnit = unitList?.find(
              u => u.symbol.toLowerCase() === (line.uom || '').toLowerCase()
            )
            // Create item in items table
            const { data: newItem, error: itemErr } = await (supabase
              .from('items') as any)
              .insert({
                company_id: companyId,
                name: line.name.trim(),
                type: 'raw_material',
                unit_id: matchedUnit?.id || defaultUnitId,
                sku: line.barcode.trim() || null,
                gst_rate: line.gst_rate,
                purchase_rate: p,
                selling_rate: p,
                is_active: true,
              })
              .select()
              .single()

            if (itemErr) throw itemErr
            itemId = newItem.id
          }
        }

        // If requested to update master rate
        if (updateMasterPrice && itemId) {
          await (supabase.from('items') as any)
            .update({
              purchase_rate: p,
              updated_at: new Date().toISOString(),
            })
            .eq('id', itemId)
        }

        resolvedLines.push({
          item_id: itemId,
          qty: q,
          rate: p,
          taxable_amount: lineTaxable,
          gst_rate: line.gst_rate,
          cgst_amount: calculations.isInterstate ? 0 : round2(lineTax / 2),
          sgst_amount: calculations.isInterstate ? 0 : round2(lineTax / 2),
          line_total: lineTotal,
          unitSymbol: line.uom || 'PCS',
        })
      }

      // 3. Serialize metadata notes
      const notesPayload = JSON.stringify({
        payment_type: paymentType,
        delivery_mode: deliveryMode,
        vehicle_no: vehicleNo,
        ship_to: shipTo,
        place_of_supply: placeOfSupply,
        invoice_type: invoiceType,
        terms_title: termsTitle,
        terms_detail: termsDetail,
        remarks: remarks,
        additional_charges: additionalCharges,
        round_off: calculations.roundOffDiff,
        discount_mode: discountMode,
      })

      // 4. Insert or Update purchase_invoices header
      let savedInvoice: PurchaseInvoice

      if (editingInvoice) {
        const { data: updatedInv, error: upErr } = await (supabase
          .from('purchase_invoices') as any)
          .update({
            invoice_number: invoiceNumber.trim(),
            supplier_invoice_number: supplierInvoiceNumber.trim() || null,
            supplier_id: finalSupplierId,
            date: date,
            due_date: dueDate || null,
            taxable_amount: calculations.totalTaxable,
            cgst_amount: calculations.cgst,
            sgst_amount: calculations.sgst,
            total_amount: calculations.finalGrandTotal,
            notes: notesPayload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingInvoice.id)
          .select(`*, supplier:suppliers(*)`)
          .single()

        if (upErr) throw upErr
        savedInvoice = updatedInv

        // Delete previous lines and recreate
        await supabase
          .from('purchase_invoice_lines')
          .delete()
          .eq('invoice_id', editingInvoice.id)
      } else {
        const { data: newInv, error: invErr } = await (supabase
          .from('purchase_invoices') as any)
          .insert({
            company_id: companyId,
            invoice_number: invoiceNumber.trim(),
            supplier_invoice_number: supplierInvoiceNumber.trim() || null,
            supplier_id: finalSupplierId,
            date: date,
            due_date: dueDate || null,
            taxable_amount: calculations.totalTaxable,
            cgst_amount: calculations.cgst,
            sgst_amount: calculations.sgst,
            total_amount: calculations.finalGrandTotal,
            status: 'draft',
            notes: notesPayload,
            created_by: userId,
          })
          .select(`*, supplier:suppliers(*)`)
          .single()

        if (invErr) throw invErr
        savedInvoice = newInv
      }

      // 5. Insert line items
      const linesToInsert = resolvedLines.map(l => ({
        invoice_id: savedInvoice.id,
        item_id: l.item_id,
        qty: l.qty,
        rate: l.rate,
        taxable_amount: l.taxable_amount,
        gst_rate: l.gst_rate,
        cgst_amount: l.cgst_amount,
        sgst_amount: l.sgst_amount,
        line_total: l.line_total,
      }))

      const { data: insertedLines, error: linesErr } = await (supabase
        .from('purchase_invoice_lines') as any)
        .insert(linesToInsert)
        .select(`*, item:items(*, unit:units(id, symbol))`)

      if (linesErr) throw linesErr

      toast.success(
        editingInvoice
          ? 'Purchase invoice updated successfully'
          : 'Purchase invoice saved successfully',
        { id: toastId }
      )

      onSuccess(savedInvoice, insertedLines || [], andPrint)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to save purchase invoice', { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Keyboard shortcut listener (Alt+S, Alt+P, Esc)
  const handleSaveRef = useRef(handleSave)

  useEffect(() => {
    handleSaveRef.current = handleSave
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSaveRef.current(false)
      } else if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        handleSaveRef.current(true)
      } else if (e.key === 'Escape') {
        onBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack])

  return (
    <div className="space-y-5 pb-16">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-2xl border border-outline-variant shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-outline-variant hover:bg-background text-on-surface-variant transition-colors"
            title="Back to Purchase Invoices (Esc)"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-on-surface">
              {editingInvoice ? 'Edit Purchase Invoice' : 'Create Purchase Invoice'}
            </h1>
            <p className="text-xs text-outline mt-0.5">
              Simplified manual purchase entry — update vendor details, custom items, taxes & discounts freely
            </p>
          </div>
        </div>

        {/* Header Action */}
        <div>
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-outline-variant hover:bg-background text-on-surface-variant transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Top 2 Cards: Vendor Information & Purchase Invoice Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Vendor Information */}
        <div className="bg-surface rounded-2xl border border-outline-variant p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="font-heading font-semibold text-sm text-on-surface">
                Vendor Information
              </h2>
            </div>
            <span className="text-[11px] text-outline">Type or pick any vendor</span>
          </div>

          <div className="space-y-3">
            {/* Vendor Name Combobox */}
            <div className="relative">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                M/S. (Vendor Name) <span className="text-red-500">*</span>
              </label>
              <input
                ref={vendorInputRef}
                type="text"
                placeholder="Enter or select vendor name..."
                value={vendorName}
                onChange={e => {
                  setVendorName(e.target.value)
                  setSelectedSupplierId(null)
                  setShowVendorSuggestions(true)
                }}
                onFocus={() => setShowVendorSuggestions(true)}
                className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              />

              {/* Suggestions Dropdown */}
              {showVendorSuggestions && filteredSuppliers.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowVendorSuggestions(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-outline-variant rounded-xl shadow-xl max-h-56 overflow-y-auto z-20 divide-y divide-outline-variant/40">
                    <div className="p-2 text-[11px] font-semibold text-outline uppercase tracking-wider bg-background/50">
                      Existing Registered Vendors ({filteredSuppliers.length})
                    </div>
                    {filteredSuppliers.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSupplier(s)}
                        className="w-full text-left p-2.5 hover:bg-surface-container/50 text-xs transition-colors flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold text-on-surface">{s.name}</div>
                          <div className="text-outline text-[11px]">
                            {s.city} {s.state ? `• ${s.state}` : ''} {s.phone ? `• Ph: ${s.phone}` : ''}
                          </div>
                        </div>
                        {s.gstin && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-primary font-medium">
                            {s.gstin}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Address
              </label>
              <textarea
                rows={2}
                placeholder="Enter vendor factory / office address..."
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            {/* Contact Person & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Sharma"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Phone No
                </label>
                <input
                  type="text"
                  placeholder="e.g. 98310XXXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* GSTIN / PAN & Place of Supply */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  GSTIN / PAN
                </label>
                <input
                  type="text"
                  placeholder="e.g. 19AAACC1206D1ZH"
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Place of Supply <span className="text-red-500">*</span>
                </label>
                <select
                  value={placeOfSupply}
                  onChange={e => setPlaceOfSupply(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {INDIAN_STATES.map(st => (
                    <option key={st} value={st}>
                      {st} {st === 'West Bengal' ? '(Intra-State: CGST+SGST)' : '(Inter-State: IGST)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ship To */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Ship To / Delivery Destination
              </label>
              <input
                type="text"
                value={shipTo}
                onChange={e => setShipTo(e.target.value)}
                placeholder="Factory site location..."
                className="w-full px-3 py-2 text-xs bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Purchase Invoice Detail */}
        <div className="bg-surface rounded-2xl border border-outline-variant p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              <h2 className="font-heading font-semibold text-sm text-on-surface">
                Purchase Invoice Detail
              </h2>
            </div>
            <span className="text-[11px] text-outline">Bill & inward dispatch info</span>
          </div>

          <div className="space-y-3">
            {/* Invoice Type & Invoice Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Invoice Type
                </label>
                <select
                  value={invoiceType}
                  onChange={e => setInvoiceType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="Regular">Regular Tax Invoice</option>
                  <option value="Bill of Supply">Bill of Supply (Composition/Exempt)</option>
                  <option value="SEZ">SEZ Supply</option>
                  <option value="Import">Import / Inward Out-of-Country</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Internal Invoice # <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. PUR-2526-0001"
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Vendor Bill No & Invoice Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Vendor's Bill / Ref #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UT/25-26/8942"
                  value={supplierInvoiceNumber}
                  onChange={e => setSupplierInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Bill Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Due Date & Delivery Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Delivery Mode
                </label>
                <select
                  value={deliveryMode}
                  onChange={e => setDeliveryMode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="Road / Lorry">Road / Lorry Transport</option>
                  <option value="Hand Delivery">Hand Delivery / Local Pickup</option>
                  <option value="Rail Freight">Rail Freight</option>
                  <option value="Courier">Courier / Express Cargo</option>
                  <option value="Transporter Direct">Transporter Dedicated Vehicle</option>
                </select>
              </div>
            </div>

            {/* Vehicle No / LR No */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Vehicle / Truck / Lorry No.
              </label>
              <input
                type="text"
                placeholder="e.g. WB-25-A-1234, Weighbridge slip #412"
                value={vehicleNo}
                onChange={e => setVehicleNo(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Product Items Dynamic Table */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        {/* Table Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-outline-variant bg-background/50">
          <div className="flex items-center gap-3">
            <h2 className="font-heading font-bold text-sm text-on-surface flex items-center gap-2">
              Product Items
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-primary/10 text-primary font-semibold">
                {lines.length} {lines.length === 1 ? 'item' : 'items'}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Discount Mode Switch */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-on-surface-variant">Discount:</span>
              <div className="inline-flex rounded-lg border border-outline-variant p-0.5 bg-surface">
                <button
                  type="button"
                  onClick={() => setDiscountMode('rs')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                    discountMode === 'rs'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  ₹ (Rs)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountMode('percent')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                    discountMode === 'percent'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  %
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddLine}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Row
            </button>
          </div>
        </div>

        {/* Table Wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background border-b border-outline-variant font-bold text-on-surface-variant uppercase text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">SR.</th>
                <th className="py-3 px-3 min-w-[220px]">PRODUCT / OTHER CHARGES</th>
                <th className="py-3 px-2 w-28">BARCODE / SKU</th>
                <th className="py-3 px-2 w-20 text-right">QTY.</th>
                <th className="py-3 px-2 w-20 text-center">UOM</th>
                <th className="py-3 px-2 w-24 text-right">PRICE (₹)</th>
                <th className="py-3 px-2 w-20 text-right">
                  DISCOUNT ({discountMode === 'rs' ? '₹' : '%'})
                </th>
                <th className="py-3 px-2 w-28 text-right">
                  {calculations.isInterstate ? 'IGST %' : 'GST %'}
                </th>
                <th className="py-3 px-3 w-28 text-right">TOTAL (₹)</th>
                <th className="py-3 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 bg-surface">
              {lines.map((line, idx) => {
                const q = Number(line.qty) || 0
                const p = Number(line.price) || 0
                const d = Number(line.discount) || 0
                const baseVal = q * p
                const discountAmt = discountMode === 'percent' ? baseVal * (d / 100) : d
                const taxable = Math.max(0, baseVal - discountAmt)
                const tax = taxable * ((Number(line.gst_rate) || 0) / 100)
                const lineTotal = taxable + tax

                return (
                  <tr key={line.id} className="hover:bg-surface-container/20 group transition-colors">
                    {/* SR. */}
                    <td className="py-2.5 px-3 text-center font-mono text-outline font-semibold">
                      {idx + 1}
                    </td>

                    {/* Product / Other Charges + Sub-note */}
                    <td className="py-2 px-3">
                      <div className="space-y-1">
                        <input
                          type="text"
                          list={`items-list-${idx}`}
                          placeholder="Enter product or charge name..."
                          value={line.name}
                          onChange={e => handleLineChange(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-semibold bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                        <datalist id={`items-list-${idx}`}>
                          {items.map(it => (
                            <option key={it.id} value={it.name}>
                              {it.sku ? `[${it.sku}] ` : ''}Rate: ₹{it.purchase_rate}
                            </option>
                          ))}
                        </datalist>
                        <input
                          type="text"
                          placeholder="Item Note / Batch / Grade..."
                          value={line.note}
                          onChange={e => handleLineChange(idx, 'note', e.target.value)}
                          className="w-full px-2 py-0.5 text-[11px] bg-background/50 border border-outline-variant/50 rounded text-outline focus:text-on-surface"
                        />
                      </div>
                    </td>

                    {/* Barcode / SKU */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="Barcode / SKU"
                        value={line.barcode}
                        onChange={e => handleLineChange(idx, 'barcode', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs font-mono bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        placeholder="Qty"
                        value={line.qty}
                        onChange={e =>
                          handleLineChange(
                            idx,
                            'qty',
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        className="w-full px-2 py-1.5 text-xs text-right font-mono font-semibold bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* UOM */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="text"
                        list={`uom-list-${idx}`}
                        placeholder="UOM"
                        value={line.uom}
                        onChange={e => handleLineChange(idx, 'uom', e.target.value.toUpperCase())}
                        className="w-full px-1.5 py-1.5 text-xs text-center font-mono uppercase bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary"
                      />
                      <datalist id={`uom-list-${idx}`}>
                        {COMMON_UOMS.map(u => (
                          <option key={u} value={u} />
                        ))}
                      </datalist>
                    </td>

                    {/* Price */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={line.price}
                        onChange={e =>
                          handleLineChange(
                            idx,
                            'price',
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        className="w-full px-2 py-1.5 text-xs text-right font-mono font-semibold bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* Discount */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={line.discount}
                        onChange={e =>
                          handleLineChange(
                            idx,
                            'discount',
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        className="w-full px-2 py-1.5 text-xs text-right font-mono bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary"
                      />
                    </td>

                    {/* GST Rate */}
                    <td className="py-2 px-2 text-right">
                      <select
                        value={line.gst_rate}
                        onChange={e => handleLineChange(idx, 'gst_rate', Number(e.target.value))}
                        className="w-full px-1.5 py-1.5 text-xs text-right font-mono bg-surface border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary"
                      >
                        {GST_RATES.map(rate => (
                          <option key={rate} value={rate}>
                            {rate}%
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px] text-outline font-mono mt-0.5">
                        +{formatCurrency(tax)}
                      </div>
                    </td>

                    {/* Line Total */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-on-surface text-sm">
                      {formatCurrency(lineTotal)}
                    </td>

                    {/* Remove Action */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length === 1}
                        className="p-1.5 text-outline hover:text-red-600 disabled:opacity-30 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Table Summary Footer (Yellow Accent Row as in reference) */}
            <tfoot className="bg-amber-100/60 dark:bg-amber-950/40 border-t-2 border-amber-300/80 font-bold text-on-surface">
              <tr>
                <td colSpan={2} className="py-3 px-4 uppercase text-xs tracking-wider text-amber-900 dark:text-amber-200">
                  Total Inv. Val
                </td>
                <td></td>
                <td className="py-3 px-2 text-right font-mono text-xs">
                  {calculations.totalQty}
                </td>
                <td></td>
                <td className="py-3 px-2 text-right font-mono text-xs">
                  {formatCurrency(calculations.subtotalPrice).replace('₹', '')}
                </td>
                <td className="py-3 px-2 text-right font-mono text-xs">
                  {formatCurrency(calculations.totalDiscount).replace('₹', '')}
                </td>
                <td className="py-3 px-2 text-right font-mono text-xs">
                  {formatCurrency(calculations.totalTax).replace('₹', '')}
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm text-primary">
                  {formatCurrency(calculations.rawGrandTotal)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Lower Section: Left (Terms & Notes) + Right (Totals & Payment) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Terms, Notes & Remarks (5 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Terms & Conditions Card */}
          <div className="bg-surface rounded-2xl border border-outline-variant p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Terms & Condition / Additional Note
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setTermsDetail(
                      (prev: string) =>
                        (prev ? prev + '\n' : '') +
                        '• Material subject to inspection at factory gate.'
                    )
                  }
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  + Inspection Note
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Title
              </label>
              <input
                type="text"
                value={termsTitle}
                onChange={e => setTermsTitle(e.target.value)}
                placeholder="e.g. Terms & Conditions"
                className="w-full px-3 py-2 text-xs bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Detail
              </label>
              <textarea
                rows={3}
                value={termsDetail}
                onChange={e => setTermsDetail(e.target.value)}
                placeholder="Enter terms, payment period, warranty..."
                className="w-full px-3 py-2 text-xs bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Internal Remarks Card (Not visible on print) */}
          <div className="bg-surface rounded-2xl border border-outline-variant p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Document Note / Remarks
              </label>
              <span className="text-[11px] text-outline italic">Not Visible on Print</span>
            </div>
            <textarea
              rows={2}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Internal office notes, unloading supervisor name, weighbridge ticket ref..."
              className="w-full px-3 py-2 text-xs bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>

        {/* Right Column: Charges, Summary Totals, Payment & Final Banner (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-surface rounded-2xl border border-outline-variant p-5 shadow-xs space-y-3.5">
            {/* Taxable Subtotal */}
            <div className="flex justify-between items-center text-xs text-on-surface-variant">
              <span>Taxable Subtotal:</span>
              <span className="font-mono font-semibold text-sm text-on-surface">
                {formatCurrency(calculations.totalTaxable)}
              </span>
            </div>

            {/* Additional Charges Section */}
            <div className="space-y-2 pt-1 border-t border-outline-variant/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface-variant">
                  Additional Charges (Freight, Labour, etc.):
                </span>
                <button
                  type="button"
                  onClick={handleAddAdditionalCharge}
                  className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Additional Charge
                </button>
              </div>

              {additionalCharges.map(charge => (
                <div key={charge.id} className="flex items-center gap-2 bg-background p-2 rounded-xl">
                  <input
                    type="text"
                    placeholder="Charge Name (e.g. Freight)"
                    value={charge.name}
                    onChange={e => handleChargeChange(charge.id, 'name', e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-surface border border-outline-variant rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount (₹)"
                    value={charge.amount}
                    onChange={e =>
                      handleChargeChange(
                        charge.id,
                        'amount',
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    className="w-24 px-2 py-1 text-xs text-right font-mono bg-surface border border-outline-variant rounded-lg"
                  />
                  <select
                    value={charge.gst_rate}
                    onChange={e => handleChargeChange(charge.id, 'gst_rate', Number(e.target.value))}
                    className="w-20 px-1.5 py-1 text-xs text-right font-mono bg-surface border border-outline-variant rounded-lg"
                  >
                    {GST_RATES.map(r => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveAdditionalCharge(charge.id)}
                    className="p-1 text-outline hover:text-red-500 rounded"
                    title="Remove charge"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total Tax Details */}
            <div className="space-y-1.5 pt-2 border-t border-outline-variant/60 text-xs">
              {!calculations.isInterstate ? (
                <>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>CGST (50%):</span>
                    <span className="font-mono text-on-surface">
                      {formatCurrency(calculations.cgst)}
                    </span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>SGST (50%):</span>
                    <span className="font-mono text-on-surface">
                      {formatCurrency(calculations.sgst)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-on-surface-variant">
                  <span>IGST (Inter-state 100%):</span>
                  <span className="font-mono text-on-surface">
                    {formatCurrency(calculations.igst)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-on-surface-variant font-semibold">
                <span>Total Tax Amount:</span>
                <span className="font-mono text-on-surface">
                  {formatCurrency(calculations.totalTax)}
                </span>
              </div>
            </div>

            {/* Round Off Switch */}
            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/60 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={roundOffEnabled}
                  onChange={e => setRoundOffEnabled(e.target.checked)}
                  className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-semibold text-on-surface">Round Off to Nearest Rupee</span>
              </label>
              <span className="font-mono text-outline">
                {calculations.roundOffDiff !== 0 &&
                  `${calculations.roundOffDiff > 0 ? '+' : ''}${calculations.roundOffDiff}`}
              </span>
            </div>

            {/* Grand Total Banner (Prominent Bright Highlight as in reference) */}
            <div className="bg-amber-200 dark:bg-amber-900/50 border-2 border-amber-300 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-950 dark:text-amber-200">
                  Grand Total
                </span>
                <div className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
                  Total Payable Amount
                </div>
              </div>
              <div className="font-mono font-extrabold text-2xl text-primary dark:text-amber-200">
                {formatCurrency(calculations.finalGrandTotal)}
              </div>
            </div>

            {/* Amount in Words */}
            <div className="bg-background rounded-xl p-2.5 border border-outline-variant text-xs">
              <div className="text-[10px] uppercase font-bold text-outline">Total in Words</div>
              <div className="font-mono font-semibold text-on-surface uppercase mt-0.5">
                {amountInWords(calculations.finalGrandTotal)}
              </div>
            </div>

            {/* Payment Type Selection */}
            <div className="space-y-1.5 pt-2 border-t border-outline-variant/60">
              <label className="block text-xs font-bold text-on-surface-variant">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['CREDIT', 'CASH', 'CHEQUE', 'ONLINE'] as const).map(mode => {
                  const isActive = paymentType === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentType(mode)}
                      className={`py-2 text-xs font-bold rounded-xl uppercase tracking-wider transition-all border ${
                        isActive
                          ? 'bg-amber-400 border-amber-500 text-black shadow-xs'
                          : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-background'
                      }`}
                    >
                      {mode}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Master Catalog Update Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={updateMasterPrice}
                  onChange={e => setUpdateMasterPrice(e.target.checked)}
                  className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 mt-0.5"
                />
                <span className="text-on-surface-variant">
                  Update purchase price in the product master as per this purchase rate.
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-0 bg-surface/95 backdrop-blur-md p-4 rounded-2xl border border-outline-variant shadow-lg flex items-center justify-between gap-4 z-30">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-4 py-2 text-xs font-semibold rounded-xl border border-outline-variant hover:bg-background text-on-surface-variant flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-xs transition-colors"
          >
            <Printer className="h-4 w-4" />
            Save & Print
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">P</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-white flex items-center gap-2 shadow-xs transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Invoice
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">S</span>
          </button>
        </div>
      </div>
    </div>
  )
}
