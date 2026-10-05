export interface Transporter {
  id: string
  name: string
  contact_person?: string
  phone: string
  alt_phone?: string
  city?: string
  address?: string
  gstin?: string
  pan?: string
  vehicle_numbers?: string[]
  is_active: boolean
  created_at: string
}

export interface FreightTrip {
  id: string
  trip_number: string
  date: string
  transporter_id: string
  transporter_name: string
  vehicle_number: string
  driver_name?: string
  driver_phone?: string
  trip_type: 'sales_dispatch' | 'raw_material_inward' | 'plant_transfer' | 'other'
  challan_ref?: string
  lr_number?: string
  origin: string
  destination: string
  material_description: string
  quantity: number
  unit: string
  rate_type: 'per_trip' | 'per_ton' | 'per_sqft' | 'fixed'
  freight_rate: number
  base_freight: number
  toll_charges: number
  loading_unloading: number
  other_charges: number
  total_freight: number
  advance_paid: number
  balance_payable: number
  status: 'in_transit' | 'delivered' | 'settled' | 'cancelled'
  notes?: string
  created_at: string
}

export interface TransporterPaymentRecord {
  id: string
  payment_number: string
  date: string
  transporter_id: string
  transporter_name: string
  amount: number
  payment_mode: 'Cash' | 'Bank Transfer (NEFT/RTGS)' | 'UPI' | 'Cheque'
  reference_no?: string
  linked_trip_numbers?: string[]
  notes?: string
  created_at: string
}

export interface ChallanLine {
  id: string
  item_id: string
  item_name: string
  item_sku: string
  item_unit: string
  hsn_code?: string
  dispatch_qty: number
  packages?: string
  weight_mt?: number
  remarks?: string
}

export interface DeliveryChallanRecord {
  id: string
  challan_number: string
  date: string
  customer_id: string
  customer_name: string
  customer_phone?: string | null
  customer_gstin?: string | null
  site_address: string
  invoice_ref?: string
  order_ref?: string
  transporter_id?: string
  transporter_name?: string
  vehicle_number: string
  driver_name?: string
  driver_phone?: string
  lr_number?: string
  eway_bill_number?: string
  lines: ChallanLine[]
  total_qty: number
  total_weight_mt?: number
  status: 'draft' | 'dispatched' | 'delivered' | 'signed_pod' | 'cancelled'
  receiver_name?: string
  received_date?: string
  notes?: string
  created_at: string
}

export const SEED_TRANSPORTERS: Transporter[] = [
  {
    id: 'trans-1',
    name: 'Maa Tara Roadways',
    contact_person: 'Subrata Ghosh',
    phone: '9832104567',
    city: 'Barasat',
    address: 'NH-34 Truck Terminal, Barasat, North 24 Parganas',
    gstin: '19AABCM1234T1Z2',
    vehicle_numbers: ['WB-25-D-4521', 'WB-25-E-8902'],
    is_active: true,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'trans-2',
    name: 'National Lorry Transport',
    contact_person: 'Harpreet Singh',
    phone: '9433221100',
    city: 'Amdanga',
    address: 'Beside Toll Plaza, NH-34, Amdanga',
    gstin: '19AAECN9988H1Z8',
    vehicle_numbers: ['WB-23-C-1122', 'WB-25-F-3344'],
    is_active: true,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'trans-3',
    name: 'Bengal Dumper Syndicate',
    contact_person: 'Ramesh Mondal',
    phone: '9836655443',
    city: 'Madhyamgram',
    address: 'Jessore Road, Madhyamgram',
    vehicle_numbers: ['WB-25-G-7788', 'WB-25-H-9900'],
    is_active: true,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
]
