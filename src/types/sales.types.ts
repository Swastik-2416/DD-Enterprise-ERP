export interface QuoteLine {
  id: string
  item_id: string
  item_name: string
  item_sku: string
  item_unit: string
  hsn_code?: string
  qty: number
  rate: number
  taxable_amount: number
  gst_rate: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  remarks?: string
}

export interface QuotationRecord {
  id: string
  quote_number: string
  date: string
  valid_until: string
  customer_id?: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  customer_gstin?: string
  project_name?: string
  site_address?: string
  freight_terms: 'Extra at actuals' | 'Included in rate' | 'Ex-factory / Buyer scope'
  unloading_terms: 'At Customer scope' | 'Included by Supplier'
  laying_terms: 'Supply Only' | 'Supply & Laying with sand bed'
  payment_terms: string
  notes?: string
  status: 'draft' | 'sent' | 'accepted' | 'converted' | 'declined' | 'expired'
  lines: QuoteLine[]
  total_qty: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  created_at: string
}

export interface SalesOrderLine {
  id: string
  item_id: string
  item_name: string
  item_sku: string
  item_unit: string
  hsn_code?: string
  ordered_qty: number
  dispatched_qty: number
  pending_qty: number
  rate: number
  taxable_amount: number
  gst_rate: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  production_status: 'pending' | 'in_production' | 'ready'
  remarks?: string
}

export interface SalesOrderRecord {
  id: string
  order_number: string
  quote_ref?: string
  customer_po_ref?: string
  date: string
  promised_delivery_date: string
  customer_id: string
  customer_name: string
  customer_phone?: string
  customer_gstin?: string
  site_address: string
  payment_terms: string
  advance_received: number
  balance_receivable: number
  dispatch_mode: string
  status: 'draft' | 'confirmed' | 'in_production' | 'ready_for_dispatch' | 'partially_dispatched' | 'fulfilled' | 'cancelled'
  notes?: string
  lines: SalesOrderLine[]
  total_qty: number
  total_dispatched_qty: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  created_at: string
}

export const SEED_QUOTATIONS: QuotationRecord[] = [
  {
    id: 'qt-seed-1',
    quote_number: 'QT-2425-0001',
    date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    customer_id: 'cust-1',
    customer_name: 'Metro Highway Infrastructure Ltd',
    customer_phone: '9830011223',
    customer_email: 'procurement@metroinfra.in',
    customer_gstin: '19AAACM4512D1Z0',
    project_name: 'Kalyani Expressway Flyover Underpass Paving',
    site_address: 'Kalyani Expressway Flyover Site, Near Madanpur, Nadia',
    freight_terms: 'Extra at actuals',
    unloading_terms: 'At Customer scope',
    laying_terms: 'Supply Only',
    payment_terms: '50% Advance booking, 50% prior to dispatch',
    notes: 'Rates based on M-40 high strength paver blocks tested as per IS 15658:2021 standards.',
    status: 'accepted',
    lines: [
      {
        id: 'ql-1',
        item_id: 'fg-1',
        item_name: 'Zig-Zag Concrete Paver Block 60mm (Grey)',
        item_sku: 'ZZ-60-GRY',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        qty: 10000,
        rate: 34,
        taxable_amount: 340000,
        gst_rate: 18,
        cgst_amount: 30600,
        sgst_amount: 30600,
        total_amount: 401200,
        remarks: 'M-35 Grade Hydraulic Pressed',
      },
      {
        id: 'ql-2',
        item_id: 'fg-2',
        item_name: 'Zig-Zag Concrete Paver Block 60mm (Red)',
        item_sku: 'ZZ-60-RED',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        qty: 3000,
        rate: 38,
        taxable_amount: 114000,
        gst_rate: 18,
        cgst_amount: 10260,
        sgst_amount: 10260,
        total_amount: 134520,
        remarks: 'German Bayer Synthetic Pigment',
      }
    ],
    total_qty: 13000,
    taxable_amount: 454000,
    cgst_amount: 40860,
    sgst_amount: 40860,
    total_amount: 535720,
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'qt-seed-2',
    quote_number: 'QT-2425-0002',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
    customer_id: 'cust-2',
    customer_name: 'Sunrise Builders & Developers',
    customer_phone: '9836644221',
    customer_email: 'sunrisegroups@gmail.com',
    customer_gstin: '19AABCS8899K1Z3',
    project_name: 'Sunrise Greens Luxury Township - Parking Area',
    site_address: 'Rajarhat Action Area II, Kolkata - 700135',
    freight_terms: 'Included in rate',
    unloading_terms: 'At Customer scope',
    laying_terms: 'Supply Only',
    payment_terms: '100% advance on per-truckload dispatch',
    notes: 'Sample approved by Chief Project Architect.',
    status: 'sent',
    lines: [
      {
        id: 'ql-3',
        item_id: 'fg-3',
        item_name: 'I-Shape Paver Block 80mm (Grey)',
        item_sku: 'ISH-80-GRY',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        qty: 8500,
        rate: 44,
        taxable_amount: 374000,
        gst_rate: 18,
        cgst_amount: 33660,
        sgst_amount: 33660,
        total_amount: 441320,
        remarks: 'M-40 Heavy Vehicle Road Paver',
      }
    ],
    total_qty: 8500,
    taxable_amount: 374000,
    cgst_amount: 33660,
    sgst_amount: 33660,
    total_amount: 441320,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  }
]

export const SEED_SALES_ORDERS: SalesOrderRecord[] = [
  {
    id: 'so-seed-1',
    order_number: 'SO-2425-0001',
    quote_ref: 'QT-2425-0001',
    customer_po_ref: 'MHI/PO/24-118',
    date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    promised_delivery_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    customer_id: 'cust-1',
    customer_name: 'Metro Highway Infrastructure Ltd',
    customer_phone: '9830011223',
    customer_gstin: '19AAACM4512D1Z0',
    site_address: 'Kalyani Expressway Flyover Site, Near Madanpur, Nadia',
    payment_terms: '50% Advance booking, 50% prior to dispatch',
    advance_received: 200000,
    balance_receivable: 335720,
    dispatch_mode: 'Road / Lorry Freight (Multiple Trips)',
    status: 'in_production',
    notes: 'Deliveries to start with Grey pavers first in 1,500 sq.ft daily batches.',
    lines: [
      {
        id: 'sol-1',
        item_id: 'fg-1',
        item_name: 'Zig-Zag Concrete Paver Block 60mm (Grey)',
        item_sku: 'ZZ-60-GRY',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        ordered_qty: 10000,
        dispatched_qty: 1500,
        pending_qty: 8500,
        rate: 34,
        taxable_amount: 340000,
        gst_rate: 18,
        cgst_amount: 30600,
        sgst_amount: 30600,
        total_amount: 401200,
        production_status: 'in_production',
        remarks: 'M-35 Hydraulic Pressed',
      },
      {
        id: 'sol-2',
        item_id: 'fg-2',
        item_name: 'Zig-Zag Concrete Paver Block 60mm (Red)',
        item_sku: 'ZZ-60-RED',
        item_unit: 'Sq.Ft',
        hsn_code: '6810',
        ordered_qty: 3000,
        dispatched_qty: 500,
        pending_qty: 2500,
        rate: 38,
        taxable_amount: 114000,
        gst_rate: 18,
        cgst_amount: 10260,
        sgst_amount: 10260,
        total_amount: 134520,
        production_status: 'ready',
        remarks: 'Red Synthetic Pigment',
      }
    ],
    total_qty: 13000,
    total_dispatched_qty: 2000,
    taxable_amount: 454000,
    cgst_amount: 40860,
    sgst_amount: 40860,
    total_amount: 535720,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  }
]
