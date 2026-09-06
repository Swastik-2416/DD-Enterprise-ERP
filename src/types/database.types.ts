// Database types - generated from Supabase schema
// Run: npx supabase gen types typescript --local > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Role = 'manager' | 'accountant'
export type ItemType = 'raw_material' | 'finished_good' | 'mould' | 'machinery' | 'consumable' | 'service'
export type DocumentStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'cancelled'
export type MovementType = 'purchase' | 'purchase_return' | 'production_consumption' | 'production_output' | 'sale' | 'sale_return' | 'adjustment'
export type PaymentType = 'inward' | 'outward'
export type InvoiceType = 'gst' | 'non_gst' | 'proforma'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  company_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  gstin: string
  address: string
  city: string
  state: string
  state_code: string
  pincode: string
  phone: string
  email: string
  logo_url: string | null
  created_at: string
}

export interface ItemCategory {
  id: string
  company_id: string
  name: string
  type: ItemType
  created_at: string
}

export interface Unit {
  id: string
  company_id: string
  name: string
  symbol: string
  created_at: string
}

export interface Item {
  id: string
  company_id: string
  sku: string
  name: string
  description: string | null
  category_id: string
  category?: ItemCategory
  unit_id: string
  unit?: Unit
  type: ItemType
  hsn_code: string | null
  gst_rate: number
  purchase_rate: number
  selling_rate: number
  min_stock_level: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StockBalance {
  item_id: string
  item?: Item
  warehouse_id: string
  qty_on_hand: number
  updated_at: string
}

export interface BOM {
  id: string
  company_id: string
  finished_good_id: string
  finished_good?: Item
  version: number
  is_active: boolean
  notes: string | null
  created_at: string
}

export interface BOMLine {
  id: string
  bom_id: string
  raw_material_id: string
  raw_material?: Item
  qty_per_unit: number
  unit_id: string
  unit?: Unit
  wastage_pct: number
}

export interface Supplier {
  id: string
  company_id: string
  name: string
  gstin: string | null
  address: string
  city: string
  state: string
  phone: string
  email: string | null
  contact_person: string | null
  bank_name: string | null
  bank_account: string | null
  bank_ifsc: string | null
  is_active: boolean
  created_at: string
}

export interface Customer {
  id: string
  company_id: string
  name: string
  gstin: string | null
  address: string
  city: string
  state: string
  phone: string
  email: string | null
  contact_person: string | null
  credit_limit: number
  is_active: boolean
  created_at: string
}

export interface PurchaseInvoice {
  id: string
  company_id: string
  invoice_number: string
  supplier_invoice_number: string | null
  supplier_id: string
  supplier?: Supplier
  date: string
  due_date: string | null
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  status: DocumentStatus
  notes: string | null
  created_by: string
  approved_by: string | null
  created_at: string
  updated_at: string
}

export interface PurchaseInvoiceLine {
  id: string
  invoice_id: string
  item_id: string
  item?: Item
  qty: number
  rate: number
  taxable_amount: number
  gst_rate: number
  cgst_amount: number
  sgst_amount: number
  line_total: number
}

export interface Invoice {
  id: string
  company_id: string
  invoice_number: string
  type: InvoiceType
  customer_id: string
  customer?: Customer
  date: string
  due_date: string | null
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  paid_amount: number
  status: DocumentStatus
  notes: string | null
  created_by: string
  approved_by: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceLine {
  id: string
  invoice_id: string
  item_id: string
  item?: Item
  description: string | null
  qty: number
  rate: number
  taxable_amount: number
  gst_rate: number
  cgst_amount: number
  sgst_amount: number
  line_total: number
}

export interface Payment {
  id: string
  company_id: string
  payment_number: string
  type: PaymentType
  party_type: 'customer' | 'supplier'
  customer_id: string | null
  supplier_id: string | null
  customer?: Customer
  supplier?: Supplier
  date: string
  mode: string
  reference: string | null
  amount: number
  allocated_amount: number
  unallocated_amount: number
  status: DocumentStatus
  notes: string | null
  created_by: string
  created_at: string
}

export interface StockMovement {
  id: string
  company_id: string
  item_id: string
  item?: Item
  warehouse_id: string
  movement_type: MovementType
  qty: number
  ref_doc_type: string
  ref_doc_id: string
  ref_doc_number: string
  date: string
  notes: string | null
  created_by: string
  created_at: string
}

export interface ProductionOrder {
  id: string
  company_id: string
  order_number: string
  bom_id: string
  bom?: BOM
  planned_date: string
  shift: string | null
  planned_qty: number
  actual_qty: number | null
  status: DocumentStatus
  machine_used: string | null
  mould_used: string | null
  notes: string | null
  created_by: string
  approved_by: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  company_id: string
  table_name: string
  row_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: Json | null
  new_data: Json | null
  performed_by: string
  performed_at: string
}

// Generic Supabase Database type shape (partial — enough for typed client)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      companies: { Row: Company; Insert: Partial<Company>; Update: Partial<Company> }
      items: { Row: Item; Insert: Partial<Item>; Update: Partial<Item> }
      item_categories: { Row: ItemCategory; Insert: Partial<ItemCategory>; Update: Partial<ItemCategory> }
      units: { Row: Unit; Insert: Partial<Unit>; Update: Partial<Unit> }
      suppliers: { Row: Supplier; Insert: Partial<Supplier>; Update: Partial<Supplier> }
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer> }
      purchase_invoices: { Row: PurchaseInvoice; Insert: Partial<PurchaseInvoice>; Update: Partial<PurchaseInvoice> }
      invoices: { Row: Invoice; Insert: Partial<Invoice>; Update: Partial<Invoice> }
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> }
      stock_movements: { Row: StockMovement; Insert: Partial<StockMovement>; Update: Partial<StockMovement> }
      stock_balances: { Row: StockBalance; Insert: Partial<StockBalance>; Update: Partial<StockBalance> }
      production_orders: { Row: ProductionOrder; Insert: Partial<ProductionOrder>; Update: Partial<ProductionOrder> }
      boms: { Row: BOM; Insert: Partial<BOM>; Update: Partial<BOM> }
      bom_lines: { Row: BOMLine; Insert: Partial<BOMLine>; Update: Partial<BOMLine> }
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> }
    }
  }
}
