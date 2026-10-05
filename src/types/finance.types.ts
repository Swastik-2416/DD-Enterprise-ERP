export type ExpenseCategory =
  | 'Electricity & Power'
  | 'Diesel & DG Fuel'
  | 'Factory Rent & Land Lease'
  | 'Plant & Machinery Maintenance'
  | 'Mould Repairs & Hardfacing'
  | 'Wooden Pallets & Racks'
  | 'Testing & Lab Certifications'
  | 'Labour Welfare & Safety Gear'
  | 'Admin, Printing & Stationery'
  | 'Bank Charges & Interest'
  | 'Miscellaneous Expenses'

export interface ExpenseRecord {
  id: string
  voucher_number: string
  date: string
  category: ExpenseCategory
  payee_name: string
  payee_phone?: string
  payment_mode: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque'
  account_ref: string
  amount: number
  gst_paid: number
  is_tax_deductible: boolean
  invoice_ref?: string
  status: 'paid' | 'approved' | 'pending'
  notes?: string
  created_at: string
}

export type OtherIncomeCategory =
  | 'Empty Cement Bags Re-sale'
  | 'Broken Paver Scrap & Rubble'
  | 'Pallet Deposits & Retentions'
  | 'Old Machinery / Metal Scrap'
  | 'Bank Interest & Fixed Deposits'
  | 'Fly Ash / Logistics Brokerage'
  | 'Miscellaneous Sundry Receipts'

export interface OtherIncomeRecord {
  id: string
  receipt_number: string
  date: string
  category: OtherIncomeCategory
  received_from: string
  received_from_phone?: string
  payment_mode: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque'
  deposit_account: string
  amount: number
  gst_applicable: boolean
  gst_amount: number
  reference_no?: string
  status: 'received' | 'accrued'
  notes?: string
  created_at: string
}

export const SEED_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-1',
    voucher_number: 'EXP-2425-0001',
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    category: 'Electricity & Power',
    payee_name: 'WBSEDCL (Kalyani Division)',
    payment_mode: 'Bank Transfer',
    account_ref: 'HDFC Bank (Current A/c 502000...)',
    amount: 48500,
    gst_paid: 0,
    is_tax_deductible: true,
    invoice_ref: 'WBSEDCL/HT/SEP24/9912',
    status: 'paid',
    notes: 'Monthly 63 kVA high tension industrial power consumption for block making vibro-press & batching plant.',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'exp-2',
    voucher_number: 'EXP-2425-0002',
    date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    category: 'Diesel & DG Fuel',
    payee_name: 'Maa Tara Filling Station (Indian Oil)',
    payee_phone: '9830022441',
    payment_mode: 'UPI',
    account_ref: 'Petty Cash / HDFC UPI',
    amount: 32375,
    gst_paid: 0,
    is_tax_deductible: true,
    invoice_ref: 'IOCL-B-99812',
    status: 'paid',
    notes: '350 Litres high speed diesel @ Rs. 92.50/L for 125 kVA Kirloskar silent standby generator & JCB tractor.',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'exp-3',
    voucher_number: 'EXP-2425-0003',
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    category: 'Plant & Machinery Maintenance',
    payee_name: 'Eastern Lubes & Hydraulic Spares',
    payment_mode: 'Bank Transfer',
    account_ref: 'HDFC Bank (Current A/c 502000...)',
    amount: 14200,
    gst_paid: 2166,
    is_tax_deductible: true,
    invoice_ref: 'EL/2425/0412',
    status: 'paid',
    notes: 'Hydraulic Oil (Servo 68 - 1 barrel) and oil filter element replacement for automatic vibro block press.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'exp-4',
    voucher_number: 'EXP-2425-0004',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    category: 'Mould Repairs & Hardfacing',
    payee_name: 'Ghosh Engineering Works (Kalyani)',
    payment_mode: 'Cash',
    account_ref: 'Factory Petty Cash',
    amount: 8600,
    gst_paid: 0,
    is_tax_deductible: true,
    invoice_ref: 'CASH-MEMO-119',
    status: 'paid',
    notes: 'Hard-facing welding and replacement vibrator coil mounting bolts for 60mm Zig-Zag mould set.',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'exp-5',
    voucher_number: 'EXP-2425-0005',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    category: 'Testing & Lab Certifications',
    payee_name: 'National Civil Quality & Testing Labs Kolkata',
    payment_mode: 'UPI',
    account_ref: 'HDFC UPI',
    amount: 6500,
    gst_paid: 991,
    is_tax_deductible: true,
    invoice_ref: 'NCTL/INV/8871',
    status: 'paid',
    notes: 'Compressive strength cube test (28 days curing) and water absorption test certificate as per IS 15658:2021 for NHAI project.',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'exp-6',
    voucher_number: 'EXP-2425-0006',
    date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    category: 'Factory Rent & Land Lease',
    payee_name: 'Nadia Industrial Estate Holdings',
    payment_mode: 'Cheque',
    account_ref: 'HDFC Bank (Chq #000142)',
    amount: 25000,
    gst_paid: 0,
    is_tax_deductible: true,
    invoice_ref: 'NIE/RENT/SEP24',
    status: 'paid',
    notes: 'Monthly yard lease and factory premises plot rent for block stacking and curing sheds.',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'exp-7',
    voucher_number: 'EXP-2425-0007',
    date: new Date(Date.now()).toISOString().split('T')[0],
    category: 'Labour Welfare & Safety Gear',
    payee_name: 'Metro Industrial Safety & PPE',
    payment_mode: 'Cash',
    account_ref: 'Factory Petty Cash',
    amount: 4800,
    gst_paid: 0,
    is_tax_deductible: true,
    invoice_ref: 'INV-4412',
    status: 'paid',
    notes: '12 Pairs rubber handling gloves, safety rubber boots, and 30 dust filtration masks for mixing floor operators.',
    created_at: new Date().toISOString()
  }
]

export const SEED_OTHER_INCOME: OtherIncomeRecord[] = [
  {
    id: 'inc-1',
    receipt_number: 'INC-2425-0001',
    date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    category: 'Empty Cement Bags Re-sale',
    received_from: 'Maa Sarada Recyclers (Kalyani)',
    received_from_phone: '9831122334',
    payment_mode: 'Cash',
    deposit_account: 'Factory Petty Cash',
    amount: 6600,
    gst_applicable: false,
    gst_amount: 0,
    reference_no: 'SCRAP-GP-0021',
    status: 'received',
    notes: 'Sold 1,200 pcs clean empty HDPE woven cement bags @ Rs. 5.50 each.',
    created_at: new Date(Date.now() - 6 * 86400000).toISOString()
  },
  {
    id: 'inc-2',
    receipt_number: 'INC-2425-0002',
    date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    category: 'Broken Paver Scrap & Rubble',
    received_from: 'Paul Construction & Earthmovers',
    received_from_phone: '9433100200',
    payment_mode: 'UPI',
    deposit_account: 'HDFC Bank (Current A/c)',
    amount: 10500,
    gst_applicable: false,
    gst_amount: 0,
    reference_no: 'UPI-2849182390',
    status: 'received',
    notes: 'Sold 3 dumper truck loads of cured reject/edge cracked concrete rubble for road sub-grade filling @ Rs. 3,500/load.',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'inc-3',
    receipt_number: 'INC-2425-0003',
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    category: 'Pallet Deposits & Retentions',
    received_from: 'Metro Highway Infrastructure Ltd',
    payment_mode: 'Bank Transfer',
    deposit_account: 'HDFC Bank (Current A/c)',
    amount: 7500,
    gst_applicable: false,
    gst_amount: 0,
    reference_no: 'ADJ-MHI-SO01',
    status: 'received',
    notes: 'Security forfeiture for 50 unreturned wooden transport pallets retained at site.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'inc-4',
    receipt_number: 'INC-2425-0004',
    date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    category: 'Old Machinery / Metal Scrap',
    received_from: 'Kalyani Metal Scrap Mart',
    received_from_phone: '9830554433',
    payment_mode: 'Cash',
    deposit_account: 'Factory Petty Cash',
    amount: 12400,
    gst_applicable: false,
    gst_amount: 0,
    reference_no: 'SCRAP-MEMO-78',
    status: 'received',
    notes: 'Sold 310 kg of worn-out pan mixer MS bottom liner plates and discarded mould frames @ Rs. 40/kg.',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'inc-5',
    receipt_number: 'INC-2425-0005',
    date: new Date(Date.now()).toISOString().split('T')[0],
    category: 'Bank Interest & Fixed Deposits',
    received_from: 'HDFC Bank Limited',
    payment_mode: 'Bank Transfer',
    deposit_account: 'HDFC Bank (Current A/c)',
    amount: 3840,
    gst_applicable: false,
    gst_amount: 0,
    reference_no: 'HDFC-INT-SEP24',
    status: 'received',
    notes: 'Auto-sweep flexi fixed deposit interest credited for the month.',
    created_at: new Date().toISOString()
  }
]
