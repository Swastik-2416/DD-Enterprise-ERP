-- Supabase Schema for DD Enterprise ERP
-- Run this in the Supabase SQL Editor

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('manager', 'accountant');
CREATE TYPE item_type AS ENUM ('raw_material', 'finished_good', 'mould', 'machinery', 'consumable', 'service');
CREATE TYPE document_status AS ENUM ('draft', 'submitted', 'approved', 'posted', 'cancelled');
CREATE TYPE movement_type AS ENUM ('purchase', 'purchase_return', 'production_consumption', 'production_output', 'sale', 'sale_return', 'adjustment');
CREATE TYPE payment_type AS ENUM ('inward', 'outward');
CREATE TYPE invoice_type AS ENUM ('gst', 'non_gst', 'proforma');
CREATE TYPE party_type AS ENUM ('customer', 'supplier');

-- 2. Create Tables
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    gstin TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    state_code TEXT NOT NULL,
    pincode TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'manager',
    company_id UUID REFERENCES companies(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE item_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    type item_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES item_categories(id),
    unit_id UUID REFERENCES units(id),
    type item_type NOT NULL,
    hsn_code TEXT,
    gst_rate NUMERIC NOT NULL DEFAULT 0,
    purchase_rate NUMERIC NOT NULL DEFAULT 0,
    selling_rate NUMERIC NOT NULL DEFAULT 0,
    min_stock_level NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stock_balances (
    item_id UUID REFERENCES items(id),
    warehouse_id UUID NOT NULL, -- You can create a warehouses table later, using UUID for now
    qty_on_hand NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (item_id, warehouse_id)
);

CREATE TABLE boms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    finished_good_id UUID REFERENCES items(id),
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE bom_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id UUID REFERENCES boms(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES items(id),
    qty_per_unit NUMERIC NOT NULL,
    unit_id UUID REFERENCES units(id),
    wastage_pct NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    gstin TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    contact_person TEXT,
    bank_name TEXT,
    bank_account TEXT,
    bank_ifsc TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    gstin TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    contact_person TEXT,
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE purchase_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    invoice_number TEXT NOT NULL,
    supplier_invoice_number TEXT,
    supplier_id UUID REFERENCES suppliers(id),
    date DATE NOT NULL,
    due_date DATE,
    taxable_amount NUMERIC NOT NULL DEFAULT 0,
    cgst_amount NUMERIC NOT NULL DEFAULT 0,
    sgst_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status document_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE purchase_invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    qty NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    taxable_amount NUMERIC NOT NULL,
    gst_rate NUMERIC NOT NULL,
    cgst_amount NUMERIC NOT NULL,
    sgst_amount NUMERIC NOT NULL,
    line_total NUMERIC NOT NULL
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    invoice_number TEXT NOT NULL,
    type invoice_type NOT NULL,
    customer_id UUID REFERENCES customers(id),
    date DATE NOT NULL,
    due_date DATE,
    taxable_amount NUMERIC NOT NULL DEFAULT 0,
    cgst_amount NUMERIC NOT NULL DEFAULT 0,
    sgst_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    status document_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    description TEXT,
    qty NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    taxable_amount NUMERIC NOT NULL,
    gst_rate NUMERIC NOT NULL,
    cgst_amount NUMERIC NOT NULL,
    sgst_amount NUMERIC NOT NULL,
    line_total NUMERIC NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    payment_number TEXT NOT NULL,
    type payment_type NOT NULL,
    party_type party_type NOT NULL,
    customer_id UUID REFERENCES customers(id),
    supplier_id UUID REFERENCES suppliers(id),
    date DATE NOT NULL,
    mode TEXT NOT NULL,
    reference TEXT,
    amount NUMERIC NOT NULL,
    allocated_amount NUMERIC NOT NULL DEFAULT 0,
    unallocated_amount NUMERIC NOT NULL,
    status document_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    item_id UUID REFERENCES items(id),
    warehouse_id UUID NOT NULL,
    movement_type movement_type NOT NULL,
    qty NUMERIC NOT NULL,
    ref_doc_type TEXT NOT NULL,
    ref_doc_id UUID NOT NULL,
    ref_doc_number TEXT NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    order_number TEXT NOT NULL,
    bom_id UUID REFERENCES boms(id),
    planned_date DATE NOT NULL,
    shift TEXT,
    planned_qty NUMERIC NOT NULL,
    actual_qty NUMERIC,
    status document_status NOT NULL DEFAULT 'draft',
    machine_used TEXT,
    mould_used TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    table_name TEXT NOT NULL,
    row_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID REFERENCES profiles(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
