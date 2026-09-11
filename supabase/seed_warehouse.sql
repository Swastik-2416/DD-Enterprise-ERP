-- Run this once in your Supabase SQL Editor
-- This creates the single default warehouse for DD Enterprise (one factory location)

-- Step 1: Create a warehouses table (if not already in schema)
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Insert the default warehouse using the fixed UUID we reference in code
INSERT INTO warehouses (id, company_id, name, address)
SELECT 
    '00000000-0000-0000-0000-000000000001'::UUID,
    id,
    'Main Factory Warehouse',
    'DD Enterprise Factory, Paver Block Unit'
FROM companies
LIMIT 1
ON CONFLICT (id) DO NOTHING;
