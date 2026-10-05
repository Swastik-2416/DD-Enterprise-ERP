import type { Supplier, Item, DocumentStatus } from '@/types/database.types'

export type ReturnReason =
  | 'damaged_in_transit'
  | 'quality_rejection'
  | 'excess_quantity'
  | 'rate_discrepancy'
  | 'specification_mismatch'
  | 'other'

export interface PurchaseReturnLine {
  id: string
  return_id: string
  item_id: string
  item_name: string
  item_sku: string
  return_qty: number
  unit: string
  rate: number
  taxable_amount: number
  gst_rate: number
  cgst_amount: number
  sgst_amount: number
  line_total: number
  rejection_notes?: string
}

export interface PurchaseReturn {
  id: string
  company_id: string
  return_number: string // e.g. DN-2425-0001
  purchase_invoice_id: string
  purchase_invoice_number: string
  supplier_id: string
  supplier_name: string
  supplier?: Partial<Supplier>
  date: string
  warehouse_id: string
  warehouse_name: string
  reason: ReturnReason
  status: DocumentStatus
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  notes: string | null
  items: PurchaseReturnLine[]
  created_by: string
  approved_by: string | null
  created_at: string
  updated_at: string
}

export const RETURN_REASONS: Record<ReturnReason, string> = {
  damaged_in_transit: 'Damaged in Transit / Moisture Leakage',
  quality_rejection: 'Failed Quality Check (Sieve / Compressive Test)',
  excess_quantity: 'Excess Material Supplied Beyond PO',
  rate_discrepancy: 'Billed Rate Discrepancy Against Purchase Order',
  specification_mismatch: 'Grade / Specification Mismatch',
  other: 'Other Discrepancy'
}

export const SEED_PURCHASE_RETURNS: PurchaseReturn[] = [
  {
    id: 'pr-001',
    company_id: 'c1',
    return_number: 'DN-2425-0004',
    purchase_invoice_id: 'pinv-001',
    purchase_invoice_number: 'PINV-2425-0012',
    supplier_id: 'sup-1',
    supplier_name: 'UltraTech Cement Eastern Depot',
    supplier: {
      id: 'sup-1',
      name: 'UltraTech Cement Eastern Depot',
      gstin: '19AABCU1234F1Z8',
      city: 'Durgapur, WB',
      phone: '+91 98320 11980'
    },
    date: '2026-10-04',
    warehouse_id: '00000000-0000-0000-0000-000000000001',
    warehouse_name: 'Covered Cement Store (Panagarh Plant)',
    reason: 'damaged_in_transit',
    status: 'posted',
    taxable_amount: 14750,
    cgst_amount: 2065,
    sgst_amount: 2065,
    total_amount: 18880,
    notes: '50 cement bags damaged due to torn packaging during rain in monsoon transit. Driver acknowledged on unloading slip.',
    items: [
      {
        id: 'prl-1',
        return_id: 'pr-001',
        item_id: 'item-raw-opc53',
        item_name: 'UltraTech OPC 53 Grade Cement',
        item_sku: 'RM-CEM-OPC53',
        return_qty: 50,
        unit: 'bags',
        rate: 295.00,
        taxable_amount: 14750,
        gst_rate: 28,
        cgst_amount: 2065,
        sgst_amount: 2065,
        line_total: 18880,
        rejection_notes: 'Lump formation due to rain water ingress in lorry.'
      }
    ],
    created_by: 'Mithun Karmakar (Storekeeper)',
    approved_by: 'Swastik Mandal (Manager)',
    created_at: '2026-10-04T11:00:00Z',
    updated_at: '2026-10-04T12:30:00Z'
  },
  {
    id: 'pr-002',
    company_id: 'c1',
    return_number: 'DN-2425-0005',
    purchase_invoice_id: 'pinv-002',
    purchase_invoice_number: 'PINV-2425-0015',
    supplier_id: 'sup-2',
    supplier_name: 'Maa Tara Stone Quarries & Crushing',
    supplier: {
      id: 'sup-2',
      name: 'Maa Tara Stone Quarries & Crushing',
      gstin: '19AABCM5678G1Z2',
      city: 'Rampurhat, WB',
      phone: '+91 94340 77120'
    },
    date: '2026-10-05',
    warehouse_id: '00000000-0000-0000-0000-000000000001',
    warehouse_name: 'Aggregate Stock Pits',
    reason: 'quality_rejection',
    status: 'posted',
    taxable_amount: 12500,
    cgst_amount: 312.5,
    sgst_amount: 312.5,
    total_amount: 13125,
    notes: 'Stone chips contained >25% oversized 20mm boulders unsuited for 60mm paver vibro press mould compaction. Rejected at weighbridge.',
    items: [
      {
        id: 'prl-2',
        return_id: 'pr-002',
        item_id: 'item-raw-chips10',
        item_name: '10mm Black Stone Chips (Basalt)',
        item_sku: 'RM-AGG-10MM',
        return_qty: 250,
        unit: 'cft',
        rate: 50.00,
        taxable_amount: 12500,
        gst_rate: 5,
        cgst_amount: 312.5,
        sgst_amount: 312.5,
        line_total: 13125,
        rejection_notes: 'Oversized flakes clogging feed hopper.'
      }
    ],
    created_by: 'Bikramjit Sen (Supervisor)',
    approved_by: 'Swastik Mandal (Manager)',
    created_at: '2026-10-05T14:15:00Z',
    updated_at: '2026-10-05T15:00:00Z'
  },
  {
    id: 'pr-003',
    company_id: 'c1',
    return_number: 'DN-2425-0006',
    purchase_invoice_id: 'pinv-003',
    purchase_invoice_number: 'PINV-2425-0018',
    supplier_id: 'sup-3',
    supplier_name: 'BASF Construction Chemicals',
    supplier: {
      id: 'sup-3',
      name: 'BASF Construction Chemicals',
      gstin: '19AABCB9012H1Z4',
      city: 'Kolkata, WB',
      phone: '+91 98310 99450'
    },
    date: '2026-10-06',
    warehouse_id: '00000000-0000-0000-0000-000000000001',
    warehouse_name: 'Chemical Store',
    reason: 'specification_mismatch',
    status: 'draft',
    taxable_amount: 8500,
    cgst_amount: 765,
    sgst_amount: 765,
    total_amount: 10030,
    notes: 'Supplied MasterGlenium standard retarder instead of fast early-strength paver accelerator. Awaiting vendor replacement barrel.',
    items: [
      {
        id: 'prl-3',
        return_id: 'pr-003',
        item_id: 'item-raw-chem-01',
        item_name: 'MasterGlenium Hardener Admixture',
        item_sku: 'RM-ADM-GLEN',
        return_qty: 100,
        unit: 'litres',
        rate: 85.00,
        taxable_amount: 8500,
        gst_rate: 18,
        cgst_amount: 765,
        sgst_amount: 765,
        line_total: 10030,
        rejection_notes: 'Retarder formula delivered in error.'
      }
    ],
    created_by: 'Mithun Karmakar (Storekeeper)',
    approved_by: null,
    created_at: '2026-10-06T08:30:00Z',
    updated_at: '2026-10-06T08:30:00Z'
  }
]
