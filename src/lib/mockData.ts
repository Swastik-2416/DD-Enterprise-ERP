// Mock data for prototype demonstration
// Replace with real Supabase queries in production

import type {
  Item, ItemCategory, Unit, Supplier, Customer,
  PurchaseInvoice, Invoice, Payment, StockBalance,
  ProductionOrder, BOM, BOMLine, StockMovement,
} from '@/types/database.types'

// ─── Categories ───────────────────────────────────────────────────────────────
export const mockCategories: ItemCategory[] = [
  { id: 'cat-1', company_id: 'co-1', name: 'Raw Materials', type: 'raw_material', created_at: '2025-04-01' },
  { id: 'cat-2', company_id: 'co-1', name: 'Finished Goods', type: 'finished_good', created_at: '2025-04-01' },
  { id: 'cat-3', company_id: 'co-1', name: 'Moulds', type: 'mould', created_at: '2025-04-01' },
  { id: 'cat-4', company_id: 'co-1', name: 'Machinery', type: 'machinery', created_at: '2025-04-01' },
  { id: 'cat-5', company_id: 'co-1', name: 'Consumables', type: 'consumable', created_at: '2025-04-01' },
]

// ─── Units ────────────────────────────────────────────────────────────────────
export const mockUnits: Unit[] = [
  { id: 'u-1', company_id: 'co-1', name: 'Kilogram', symbol: 'kg', created_at: '2025-04-01' },
  { id: 'u-2', company_id: 'co-1', name: 'Tonne', symbol: 'MT', created_at: '2025-04-01' },
  { id: 'u-3', company_id: 'co-1', name: 'Piece', symbol: 'pcs', created_at: '2025-04-01' },
  { id: 'u-4', company_id: 'co-1', name: 'Bag', symbol: 'bag', created_at: '2025-04-01' },
  { id: 'u-5', company_id: 'co-1', name: 'Litre', symbol: 'ltr', created_at: '2025-04-01' },
  { id: 'u-6', company_id: 'co-1', name: 'Square Metre', symbol: 'sqm', created_at: '2025-04-01' },
]

// ─── Items ────────────────────────────────────────────────────────────────────
export const mockItems: Item[] = [
  {
    id: 'item-1', company_id: 'co-1', sku: 'RM-001', name: 'Portland Cement (OPC 53)',
    description: 'Ordinary Portland Cement 53 Grade', category_id: 'cat-1',
    unit_id: 'u-4', type: 'raw_material', hsn_code: '2523', gst_rate: 28,
    purchase_rate: 380, selling_rate: 0, min_stock_level: 500,
    is_active: true, created_at: '2025-04-01', updated_at: '2025-04-01',
  },
  {
    id: 'item-2', company_id: 'co-1', sku: 'RM-002', name: 'Coarse Aggregate (20mm)',
    description: 'Stone chips / crushed aggregate 20mm', category_id: 'cat-1',
    unit_id: 'u-2', type: 'raw_material', hsn_code: '2517', gst_rate: 5,
    purchase_rate: 1200, selling_rate: 0, min_stock_level: 50,
    is_active: true, created_at: '2025-04-01', updated_at: '2025-04-01',
  },
  {
    id: 'item-3', company_id: 'co-1', sku: 'RM-003', name: 'River Sand (M-sand)',
    description: 'Manufactured / River Sand', category_id: 'cat-1',
    unit_id: 'u-2', type: 'raw_material', hsn_code: '2505', gst_rate: 5,
    purchase_rate: 900, selling_rate: 0, min_stock_level: 30,
    is_active: true, created_at: '2025-04-01', updated_at: '2025-04-01',
  },
  {
    id: 'item-4', company_id: 'co-1', sku: 'RM-004', name: 'Fly Ash',
    description: 'Class C / Class F Fly Ash', category_id: 'cat-1',
    unit_id: 'u-1', type: 'raw_material', hsn_code: '2621', gst_rate: 5,
    purchase_rate: 4, selling_rate: 0, min_stock_level: 2000,
    is_active: true, created_at: '2025-04-01', updated_at: '2025-04-01',
  },
  {
    id: 'item-5', company_id: 'co-1', sku: 'FG-001', name: 'Paver Block 60mm (Grey)',
    description: 'Standard grey paver block 60mm thickness', category_id: 'cat-2',
    unit_id: 'u-3', type: 'finished_good', hsn_code: '6810', gst_rate: 18,
    purchase_rate: 0, selling_rate: 28, min_stock_level: 5000,
    is_active: true, created_at: '2025-04-01', updated_at: '2025-04-01',
  },
  {
    id: 'item-6', company_id: 'co-1', sku: 'FG-002', name: 'Paver Block 80mm (Grey)',
    description: 'Heavy-duty grey paver block 80mm', category_id: 'cat-2',
    unit_id: 'u-3', type: 'finished_good', hsn_code: '6810', gst_rate: 18,
    purchase_rate: 0, selling_rate: 38, min_stock_level: 3000,
    is_active: true, created_at: '2025-04-01', updated_at: '2025-04-01',
  },
  {
    id: 'item-7', company_id: 'co-1', sku: 'FG-003', name: 'Paver Block 60mm (Red)',
    description: 'Coloured red paver block 60mm', category_id: 'cat-2',
    unit_id: 'u-3', type: 'finished_good', hsn_code: '6810', gst_rate: 18,
    purchase_rate: 0, selling_rate: 32, min_stock_level: 2000,
    is_active: true, created_at: '2025-04-01', updated_at: '2025-04-01',
  },
  {
    id: 'item-8', company_id: 'co-1', sku: 'FG-004', name: 'Kerb Stone 300x150x250mm',
    description: 'Road kerb / curb stone', category_id: 'cat-2',
    unit_id: 'u-3', type: 'finished_good', hsn_code: '6810', gst_rate: 18,
    purchase_rate: 0, selling_rate: 85, min_stock_level: 500,
    is_active: true, created_at: '2025-04-01', updated_at: '2025-04-01',
  },
  {
    id: 'item-9', company_id: 'co-1', sku: 'CONS-001', name: 'Pigment (Red Iron Oxide)',
    description: 'Red pigment for coloured blocks', category_id: 'cat-5',
    unit_id: 'u-1', type: 'consumable', hsn_code: '3206', gst_rate: 18,
    purchase_rate: 85, selling_rate: 0, min_stock_level: 50,
    is_active: true, created_at: '2025-04-01', updated_at: '2025-04-01',
  },
  {
    id: 'item-10', company_id: 'co-1', sku: 'CONS-002', name: 'Mould Release Oil',
    description: 'Form release agent for moulds', category_id: 'cat-5',
    unit_id: 'u-5', type: 'consumable', hsn_code: '2710', gst_rate: 18,
    purchase_rate: 120, selling_rate: 0, min_stock_level: 100,
    is_active: true, created_at: '2025-04-01', updated_at: '2025-04-01',
  },
]

// ─── Stock Balances ──────────────────────────────────────────────────────────
export const mockStockBalances: StockBalance[] = [
  { item_id: 'item-1', warehouse_id: 'wh-1', qty_on_hand: 320, updated_at: '2026-09-05' },  // LOW - min 500
  { item_id: 'item-2', warehouse_id: 'wh-1', qty_on_hand: 28, updated_at: '2026-09-05' },   // LOW - min 50
  { item_id: 'item-3', warehouse_id: 'wh-1', qty_on_hand: 45, updated_at: '2026-09-05' },
  { item_id: 'item-4', warehouse_id: 'wh-1', qty_on_hand: 3200, updated_at: '2026-09-05' },
  { item_id: 'item-5', warehouse_id: 'wh-1', qty_on_hand: 18500, updated_at: '2026-09-05' },
  { item_id: 'item-6', warehouse_id: 'wh-1', qty_on_hand: 6200, updated_at: '2026-09-05' },
  { item_id: 'item-7', warehouse_id: 'wh-1', qty_on_hand: 4100, updated_at: '2026-09-05' },
  { item_id: 'item-8', warehouse_id: 'wh-1', qty_on_hand: 820, updated_at: '2026-09-05' },
  { item_id: 'item-9', warehouse_id: 'wh-1', qty_on_hand: 38, updated_at: '2026-09-05' },   // LOW - min 50
  { item_id: 'item-10', warehouse_id: 'wh-1', qty_on_hand: 145, updated_at: '2026-09-05' },
]

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const mockSuppliers: Supplier[] = [
  {
    id: 'sup-1', company_id: 'co-1', name: 'Ultratech Cement Distributors',
    gstin: '27AABCU9603R1ZK', address: 'Plot 12, MIDC Industrial Area', city: 'Nagpur',
    state: 'Maharashtra', phone: '9876543210', email: 'orders@ultratech-nagpur.com',
    contact_person: 'Rajesh Mehta', bank_name: 'HDFC Bank',
    bank_account: '50200012345678', bank_ifsc: 'HDFC0001234', is_active: true, created_at: '2025-04-01',
  },
  {
    id: 'sup-2', company_id: 'co-1', name: 'Shree Aggregates & Sand',
    gstin: '27AACFS8421M1Z3', address: 'Survey No. 45, Kamptee Road', city: 'Nagpur',
    state: 'Maharashtra', phone: '9823456789', email: null,
    contact_person: 'Suresh Patel', bank_name: 'State Bank of India',
    bank_account: '32145678901', bank_ifsc: 'SBIN0004567', is_active: true, created_at: '2025-04-01',
  },
  {
    id: 'sup-3', company_id: 'co-1', name: 'National Fly Ash Supply Co.',
    gstin: '27AAACN1234A1Z5', address: 'Khaparkheda Thermal Plant Road', city: 'Khaparkheda',
    state: 'Maharashtra', phone: '9765432109', email: 'flyash@national.co.in',
    contact_person: 'Amol Deshmukh', bank_name: 'Bank of Maharashtra',
    bank_account: '60017234567', bank_ifsc: 'MAHB0000789', is_active: true, created_at: '2025-04-01',
  },
  {
    id: 'sup-4', company_id: 'co-1', name: 'Pigment & Chemical Suppliers',
    gstin: null, address: 'Gandhibagh Market, Shop 22', city: 'Nagpur',
    state: 'Maharashtra', phone: '9900112233', email: null,
    contact_person: 'Vikram Shah', bank_name: null,
    bank_account: null, bank_ifsc: null, is_active: true, created_at: '2025-04-01',
  },
]

// ─── Customers ────────────────────────────────────────────────────────────────
export const mockCustomers: Customer[] = [
  {
    id: 'cust-1', company_id: 'co-1', name: 'Nagpur Municipal Corporation',
    gstin: '27AAALG3014K1ZD', address: 'Mahapalika Marg, Civil Lines', city: 'Nagpur',
    state: 'Maharashtra', phone: '0712-2567890', email: 'procurement@nmc.gov.in',
    contact_person: 'Mr. A.K. Sinha', credit_limit: 2000000, is_active: true, created_at: '2025-04-01',
  },
  {
    id: 'cust-2', company_id: 'co-1', name: 'Shri Constructions Pvt. Ltd.',
    gstin: '27AADCS1234B1Z8', address: '14, Dharampeth Extension', city: 'Nagpur',
    state: 'Maharashtra', phone: '9823100200', email: 'accounts@shriconstructions.com',
    contact_person: 'Nitin Bhide', credit_limit: 500000, is_active: true, created_at: '2025-04-01',
  },
  {
    id: 'cust-3', company_id: 'co-1', name: 'Ramji Builders & Contractors',
    gstin: null, address: 'Hingna Road, Plot 7', city: 'Nagpur',
    state: 'Maharashtra', phone: '9876001122', email: null,
    contact_person: 'Ramji Gupta', credit_limit: 100000, is_active: true, created_at: '2025-04-01',
  },
  {
    id: 'cust-4', company_id: 'co-1', name: 'MSRDC Road Works',
    gstin: '27AAAGM2784G1ZB', address: 'Vasari Bhavan, Bandra', city: 'Mumbai',
    state: 'Maharashtra', phone: '022-26591234', email: 'procurement@msrdc.org',
    contact_person: 'P.K. Sharma', credit_limit: 5000000, is_active: true, created_at: '2025-04-01',
  },
  {
    id: 'cust-5', company_id: 'co-1', name: 'Sunrise Infra Projects',
    gstin: '27AABCS4321C1Z9', address: 'Wardha Road, Plot 22', city: 'Nagpur',
    state: 'Maharashtra', phone: '9988776655', email: 'sunrise@infra.com',
    contact_person: 'Arun Kakde', credit_limit: 300000, is_active: true, created_at: '2025-04-01',
  },
]

// ─── Purchase Invoices ────────────────────────────────────────────────────────
export const mockPurchaseInvoices: PurchaseInvoice[] = [
  {
    id: 'pinv-1', company_id: 'co-1', invoice_number: 'PINV-2526-0001',
    supplier_invoice_number: 'UC/2526/4521', supplier_id: 'sup-1',
    date: '2026-04-05', due_date: '2026-05-05',
    taxable_amount: 114000, cgst_amount: 15960, sgst_amount: 15960, total_amount: 145920,
    status: 'posted', notes: '300 bags OPC 53 cement', created_by: 'user-1', approved_by: 'user-1',
    created_at: '2026-04-05', updated_at: '2026-04-05',
  },
  {
    id: 'pinv-2', company_id: 'co-1', invoice_number: 'PINV-2526-0002',
    supplier_invoice_number: 'SA/261', supplier_id: 'sup-2',
    date: '2026-04-12', due_date: '2026-04-27',
    taxable_amount: 60000, cgst_amount: 1500, sgst_amount: 1500, total_amount: 63000,
    status: 'posted', notes: '50 MT aggregate + 10 MT sand', created_by: 'user-1', approved_by: 'user-1',
    created_at: '2026-04-12', updated_at: '2026-04-12',
  },
  {
    id: 'pinv-3', company_id: 'co-1', invoice_number: 'PINV-2526-0003',
    supplier_invoice_number: 'NF/9981', supplier_id: 'sup-3',
    date: '2026-05-02', due_date: '2026-05-17',
    taxable_amount: 48000, cgst_amount: 1200, sgst_amount: 1200, total_amount: 50400,
    status: 'posted', notes: '12000 kg fly ash', created_by: 'user-1', approved_by: 'user-1',
    created_at: '2026-05-02', updated_at: '2026-05-02',
  },
  {
    id: 'pinv-4', company_id: 'co-1', invoice_number: 'PINV-2526-0004',
    supplier_invoice_number: 'UC/2526/5102', supplier_id: 'sup-1',
    date: '2026-06-01', due_date: '2026-07-01',
    taxable_amount: 152000, cgst_amount: 21280, sgst_amount: 21280, total_amount: 194560,
    status: 'approved', notes: '400 bags cement', created_by: 'user-1', approved_by: 'user-1',
    created_at: '2026-06-01', updated_at: '2026-06-01',
  },
  {
    id: 'pinv-5', company_id: 'co-1', invoice_number: 'PINV-2526-0005',
    supplier_invoice_number: null, supplier_id: 'sup-2',
    date: '2026-07-15', due_date: '2026-07-30',
    taxable_amount: 36000, cgst_amount: 900, sgst_amount: 900, total_amount: 37800,
    status: 'draft', notes: null, created_by: 'user-1', approved_by: null,
    created_at: '2026-07-15', updated_at: '2026-07-15',
  },
]

// ─── Sales Invoices ───────────────────────────────────────────────────────────
export const mockInvoices: Invoice[] = [
  {
    id: 'inv-1', company_id: 'co-1', invoice_number: 'INV-2526-0001',
    type: 'gst', customer_id: 'cust-1',
    date: '2026-04-10', due_date: '2026-05-10',
    taxable_amount: 518000, cgst_amount: 46620, sgst_amount: 46620, total_amount: 611240,
    paid_amount: 611240, status: 'posted',
    notes: 'NMC Road Widening Project Phase 1 - 18500 pcs 60mm grey pavers',
    created_by: 'user-1', approved_by: 'user-1', created_at: '2026-04-10', updated_at: '2026-04-10',
  },
  {
    id: 'inv-2', company_id: 'co-1', invoice_number: 'INV-2526-0002',
    type: 'gst', customer_id: 'cust-2',
    date: '2026-04-22', due_date: '2026-05-22',
    taxable_amount: 135200, cgst_amount: 12168, sgst_amount: 12168, total_amount: 159536,
    paid_amount: 100000, status: 'posted',
    notes: '4000 pcs 80mm grey + 200 kerb stones',
    created_by: 'user-1', approved_by: 'user-1', created_at: '2026-04-22', updated_at: '2026-04-22',
  },
  {
    id: 'inv-3', company_id: 'co-1', invoice_number: 'INV-2526-0003',
    type: 'non_gst', customer_id: 'cust-3',
    date: '2026-05-05', due_date: '2026-05-20',
    taxable_amount: 44800, cgst_amount: 0, sgst_amount: 0, total_amount: 44800,
    paid_amount: 44800, status: 'posted',
    notes: '1400 pcs 60mm red pavers',
    created_by: 'user-1', approved_by: 'user-1', created_at: '2026-05-05', updated_at: '2026-05-05',
  },
  {
    id: 'inv-4', company_id: 'co-1', invoice_number: 'INV-2526-0004',
    type: 'gst', customer_id: 'cust-4',
    date: '2026-06-15', due_date: '2026-07-15',
    taxable_amount: 760000, cgst_amount: 68400, sgst_amount: 68400, total_amount: 896800,
    paid_amount: 400000, status: 'posted',
    notes: 'MSRDC Highway Project - 20000 pcs 80mm grey pavers',
    created_by: 'user-1', approved_by: 'user-1', created_at: '2026-06-15', updated_at: '2026-06-15',
  },
  {
    id: 'inv-5', company_id: 'co-1', invoice_number: 'INV-2526-0005',
    type: 'gst', customer_id: 'cust-5',
    date: '2026-07-20', due_date: '2026-08-20',
    taxable_amount: 89600, cgst_amount: 8064, sgst_amount: 8064, total_amount: 105728,
    paid_amount: 0, status: 'posted',
    notes: '2800 pcs 60mm grey + 500 pcs 60mm red',
    created_by: 'user-1', approved_by: 'user-1', created_at: '2026-07-20', updated_at: '2026-07-20',
  },
  {
    id: 'inv-6', company_id: 'co-1', invoice_number: 'INV-2526-0006',
    type: 'gst', customer_id: 'cust-1',
    date: '2026-08-10', due_date: '2026-09-10',
    taxable_amount: 280000, cgst_amount: 25200, sgst_amount: 25200, total_amount: 330400,
    paid_amount: 0, status: 'approved',
    notes: 'NMC Phase 2 - 10000 pcs 60mm grey pavers',
    created_by: 'user-1', approved_by: 'user-1', created_at: '2026-08-10', updated_at: '2026-08-10',
  },
]

// ─── Payments ─────────────────────────────────────────────────────────────────
export const mockPayments: Payment[] = [
  {
    id: 'pay-1', company_id: 'co-1', payment_number: 'PAY-2526-0001',
    type: 'inward', party_type: 'customer', customer_id: 'cust-1', supplier_id: null,
    date: '2026-04-15', mode: 'Bank Transfer (NEFT/RTGS)', reference: 'NEFT20260415001234',
    amount: 611240, allocated_amount: 611240, unallocated_amount: 0,
    status: 'posted', notes: null, created_by: 'user-1', created_at: '2026-04-15',
  },
  {
    id: 'pay-2', company_id: 'co-1', payment_number: 'PAY-2526-0002',
    type: 'outward', party_type: 'supplier', customer_id: null, supplier_id: 'sup-1',
    date: '2026-04-20', mode: 'Bank Transfer (NEFT/RTGS)', reference: 'NEFT20260420005678',
    amount: 145920, allocated_amount: 145920, unallocated_amount: 0,
    status: 'posted', notes: null, created_by: 'user-1', created_at: '2026-04-20',
  },
  {
    id: 'pay-3', company_id: 'co-1', payment_number: 'PAY-2526-0003',
    type: 'inward', party_type: 'customer', customer_id: 'cust-2', supplier_id: null,
    date: '2026-05-10', mode: 'Cheque', reference: 'CHQ-004512',
    amount: 100000, allocated_amount: 100000, unallocated_amount: 0,
    status: 'posted', notes: null, created_by: 'user-1', created_at: '2026-05-10',
  },
  {
    id: 'pay-4', company_id: 'co-1', payment_number: 'PAY-2526-0004',
    type: 'outward', party_type: 'supplier', customer_id: null, supplier_id: 'sup-2',
    date: '2026-05-20', mode: 'UPI', reference: 'UPI-20260520-7891',
    amount: 63000, allocated_amount: 63000, unallocated_amount: 0,
    status: 'posted', notes: null, created_by: 'user-1', created_at: '2026-05-20',
  },
  {
    id: 'pay-5', company_id: 'co-1', payment_number: 'PAY-2526-0005',
    type: 'inward', party_type: 'customer', customer_id: 'cust-4', supplier_id: null,
    date: '2026-07-01', mode: 'Bank Transfer (NEFT/RTGS)', reference: 'RTGS20260701009012',
    amount: 400000, allocated_amount: 400000, unallocated_amount: 0,
    status: 'posted', notes: null, created_by: 'user-1', created_at: '2026-07-01',
  },
]

// ─── Production Orders ────────────────────────────────────────────────────────
export const mockProductionOrders: ProductionOrder[] = [
  {
    id: 'prod-1', company_id: 'co-1', order_number: 'PRD-2526-0001',
    bom_id: 'bom-1', planned_date: '2026-04-08', shift: 'Morning',
    planned_qty: 5000, actual_qty: 4980, status: 'posted',
    machine_used: 'Paver Block Machine #1', mould_used: 'Mould Set A (60mm)',
    notes: null, created_by: 'user-1', approved_by: 'user-1',
    created_at: '2026-04-08', updated_at: '2026-04-08',
  },
  {
    id: 'prod-2', company_id: 'co-1', order_number: 'PRD-2526-0002',
    bom_id: 'bom-2', planned_date: '2026-04-10', shift: 'Morning',
    planned_qty: 3000, actual_qty: 2980, status: 'posted',
    machine_used: 'Paver Block Machine #2', mould_used: 'Mould Set B (80mm)',
    notes: null, created_by: 'user-1', approved_by: 'user-1',
    created_at: '2026-04-10', updated_at: '2026-04-10',
  },
  {
    id: 'prod-3', company_id: 'co-1', order_number: 'PRD-2526-0003',
    bom_id: 'bom-1', planned_date: '2026-09-06', shift: 'Morning',
    planned_qty: 6000, actual_qty: null, status: 'approved',
    machine_used: 'Paver Block Machine #1', mould_used: 'Mould Set A (60mm)',
    notes: 'NMC order priority', created_by: 'user-1', approved_by: 'user-1',
    created_at: '2026-09-05', updated_at: '2026-09-05',
  },
]

// ─── Bills of Materials ───────────────────────────────────────────────────────
export const mockBOMs: (BOM & { finished_good?: Item; lines?: (BOMLine & { raw_material?: Item; unit?: Unit })[] })[] = [
  {
    id: 'bom-1', company_id: 'co-1', finished_good_id: 'item-5',
    version: 1, is_active: true, notes: 'Standard 60mm Grey Paver Block mix per pc',
    created_at: '2025-04-01',
  },
  {
    id: 'bom-2', company_id: 'co-1', finished_good_id: 'item-6',
    version: 1, is_active: true, notes: 'Heavy Duty 80mm Grey Paver Block mix per pc',
    created_at: '2025-04-01',
  },
  {
    id: 'bom-3', company_id: 'co-1', finished_good_id: 'item-7',
    version: 1, is_active: true, notes: '60mm Red Coloured Paver Block mix per pc',
    created_at: '2025-04-01',
  },
]

export const mockBOMLines: (BOMLine & { raw_material?: Item; unit?: Unit })[] = [
  { id: 'bline-1', bom_id: 'bom-1', raw_material_id: 'item-1', qty_per_unit: 0.08, unit_id: 'u-4', wastage_pct: 2 },
  { id: 'bline-2', bom_id: 'bom-1', raw_material_id: 'item-2', qty_per_unit: 0.0035, unit_id: 'u-2', wastage_pct: 3 },
  { id: 'bline-3', bom_id: 'bom-1', raw_material_id: 'item-3', qty_per_unit: 0.0028, unit_id: 'u-2', wastage_pct: 3 },
  { id: 'bline-4', bom_id: 'bom-1', raw_material_id: 'item-4', qty_per_unit: 0.8, unit_id: 'u-1', wastage_pct: 1 },

  { id: 'bline-5', bom_id: 'bom-2', raw_material_id: 'item-1', qty_per_unit: 0.11, unit_id: 'u-4', wastage_pct: 2 },
  { id: 'bline-6', bom_id: 'bom-2', raw_material_id: 'item-2', qty_per_unit: 0.0048, unit_id: 'u-2', wastage_pct: 3 },
  { id: 'bline-7', bom_id: 'bom-2', raw_material_id: 'item-3', qty_per_unit: 0.0038, unit_id: 'u-2', wastage_pct: 3 },
  { id: 'bline-8', bom_id: 'bom-2', raw_material_id: 'item-4', qty_per_unit: 1.1, unit_id: 'u-1', wastage_pct: 1 },

  { id: 'bline-9', bom_id: 'bom-3', raw_material_id: 'item-1', qty_per_unit: 0.08, unit_id: 'u-4', wastage_pct: 2 },
  { id: 'bline-10', bom_id: 'bom-3', raw_material_id: 'item-2', qty_per_unit: 0.0035, unit_id: 'u-2', wastage_pct: 3 },
  { id: 'bline-11', bom_id: 'bom-3', raw_material_id: 'item-3', qty_per_unit: 0.0028, unit_id: 'u-2', wastage_pct: 3 },
  { id: 'bline-12', bom_id: 'bom-3', raw_material_id: 'item-4', qty_per_unit: 0.7, unit_id: 'u-1', wastage_pct: 1 },
  { id: 'bline-13', bom_id: 'bom-3', raw_material_id: 'item-9', qty_per_unit: 0.05, unit_id: 'u-1', wastage_pct: 1 },
]


// ─── Monthly chart data ───────────────────────────────────────────────────────
export const monthlySalesData = [
  { month: 'Apr', revenue: 611240, purchases: 208920 },
  { month: 'May', revenue: 44800, purchases: 50400 },
  { month: 'Jun', revenue: 896800, purchases: 194560 },
  { month: 'Jul', revenue: 105728, purchases: 37800 },
  { month: 'Aug', revenue: 330400, purchases: 0 },
  { month: 'Sep', revenue: 0, purchases: 0 },
]

// ─── Derived / computed helpers ───────────────────────────────────────────────
export function getItemById(id: string): Item | undefined {
  return mockItems.find(i => i.id === id)
}

export function getSupplierById(id: string): Supplier | undefined {
  return mockSuppliers.find(s => s.id === id)
}

export function getCustomerById(id: string): Customer | undefined {
  return mockCustomers.find(c => c.id === id)
}

export function getStockBalance(itemId: string): number {
  return mockStockBalances.find(s => s.item_id === itemId)?.qty_on_hand ?? 0
}

export function getLowStockItems(): Array<Item & { qty_on_hand: number }> {
  return mockItems
    .filter(item => {
      const stock = getStockBalance(item.id)
      return stock < item.min_stock_level
    })
    .map(item => ({ ...item, qty_on_hand: getStockBalance(item.id) }))
}

export function getCustomerOutstanding(): Array<{ customer: Customer; outstanding: number }> {
  return mockCustomers.map(customer => {
    const invoiceTotal = mockInvoices
      .filter(i => i.customer_id === customer.id && i.status === 'posted')
      .reduce((sum, i) => sum + i.total_amount, 0)
    const paid = mockInvoices
      .filter(i => i.customer_id === customer.id && i.status === 'posted')
      .reduce((sum, i) => sum + i.paid_amount, 0)
    return { customer, outstanding: invoiceTotal - paid }
  }).filter(o => o.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
}

export function getSupplierOutstanding(): Array<{ supplier: Supplier; outstanding: number }> {
  return mockSuppliers.map(supplier => {
    const total = mockPurchaseInvoices
      .filter(i => i.supplier_id === supplier.id && i.status === 'posted')
      .reduce((sum, i) => sum + i.total_amount, 0)
    const paid = mockPayments
      .filter(p => p.supplier_id === supplier.id && p.status === 'posted')
      .reduce((sum, p) => sum + p.amount, 0)
    return { supplier, outstanding: total - paid }
  }).filter(o => o.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
}

export function getTotalRevenue(): number {
  return mockInvoices
    .filter(i => i.status === 'posted')
    .reduce((sum, i) => sum + i.total_amount, 0)
}

export function getTotalPurchases(): number {
  return mockPurchaseInvoices
    .filter(i => i.status === 'posted')
    .reduce((sum, i) => sum + i.total_amount, 0)
}

export function getTotalReceivables(): number {
  return mockInvoices
    .filter(i => i.status === 'posted')
    .reduce((sum, i) => sum + (i.total_amount - i.paid_amount), 0)
}

export function getTotalPayables(): number {
  return mockPurchaseInvoices
    .filter(i => i.status === 'posted')
    .reduce((sum, inv) => {
      const paid = mockPayments
        .filter(p => p.supplier_id === inv.supplier_id && p.status === 'posted')
        .reduce((s, p) => s + p.amount, 0)
      return sum + Math.max(0, inv.total_amount - paid)
    }, 0)
}
