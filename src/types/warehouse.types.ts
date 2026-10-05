export interface Warehouse {
  id: string
  code: string
  name: string
  type: 'factory_yard' | 'curing_shed' | 'transit_depot' | 'raw_material_store'
  address: string
  in_charge: string
  phone: string
  capacity_sqft: number
  is_active: boolean
  is_default: boolean
  created_at: string
}

export interface WarehouseTransferItem {
  id: string
  item_id: string
  item_name: string
  item_sku: string
  qty: number
  unit: string
  batch_number?: string
  notes?: string
}

export type TransferStatus = 'draft' | 'in_transit' | 'completed' | 'cancelled'

export interface WarehouseTransfer {
  id: string
  transfer_number: string
  source_warehouse_id: string
  destination_warehouse_id: string
  date: string
  vehicle_number: string
  driver_name: string
  driver_phone: string
  status: TransferStatus
  notes: string
  items: WarehouseTransferItem[]
  created_by: string
  created_at: string
  dispatched_at?: string
  received_by?: string
  received_at?: string
}

export const SEED_WAREHOUSES: Warehouse[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    code: 'WH-MAIN',
    name: 'Main Plant Finished Goods Yard',
    type: 'factory_yard',
    address: 'Near Panagarh Industrial Corridor, NH-19, Burdwan',
    in_charge: 'Swastik Mandal (Manager)',
    phone: '+91 98321 44550',
    capacity_sqft: 150000,
    is_active: true,
    is_default: true,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'wh-curing-02',
    code: 'WH-CURING',
    name: 'Demoulding & Water Curing Shed B',
    type: 'curing_shed',
    address: 'Rear Shed Zone 2, Panagarh Plant',
    in_charge: 'Bikramjit Sen (Shift Supervisor)',
    phone: '+91 94340 88210',
    capacity_sqft: 80000,
    is_active: true,
    is_default: false,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'wh-depot-03',
    code: 'WH-BYPASS',
    name: 'Durgapur NH-19 Highway Dispatch Depot',
    type: 'transit_depot',
    address: 'Plot 14, Muchipara Link Road, Durgapur By-Pass',
    in_charge: 'Tapan Ghosh (Yard Master)',
    phone: '+91 97320 11980',
    capacity_sqft: 60000,
    is_active: true,
    is_default: false,
    created_at: '2026-03-15T00:00:00Z'
  },
  {
    id: 'wh-raw-04',
    code: 'WH-RAW-STORE',
    name: 'Covered Cement & Chemical Admixture Store',
    type: 'raw_material_store',
    address: 'Bay 1, Panagarh Plant Internal Logistics',
    in_charge: 'Mithun Karmakar (Storekeeper)',
    phone: '+91 98324 55120',
    capacity_sqft: 35000,
    is_active: true,
    is_default: false,
    created_at: '2026-02-01T00:00:00Z'
  }
]

export const SEED_TRANSFERS: WarehouseTransfer[] = [
  {
    id: 'trf-001',
    transfer_number: 'TRF-2425-0014',
    source_warehouse_id: 'wh-curing-02',
    destination_warehouse_id: '00000000-0000-0000-0000-000000000001',
    date: '2026-10-05',
    vehicle_number: 'WB-39-B-8491 (Plant Tractor 01)',
    driver_name: 'Manoj Yadav',
    driver_phone: '+91 97330 45120',
    status: 'completed',
    notes: 'Shifted 21-day water cured M-40 Zig-Zag pavers from Curing Shed B to Main Dispatch Yard for PWD contractor dispatch.',
    items: [
      {
        id: 'ti-1',
        item_id: 'fg-1',
        item_name: 'Zig-Zag Concrete Paver Block 80mm (Grey)',
        item_sku: 'ZZ-80-GRY',
        qty: 3200,
        unit: 'pcs',
        batch_number: 'BATCH-2026-09-14-M40'
      }
    ],
    created_by: 'Bikramjit Sen (Supervisor)',
    created_at: '2026-10-05T09:30:00Z',
    dispatched_at: '2026-10-05T10:00:00Z',
    received_by: 'Swastik Mandal (Manager)',
    received_at: '2026-10-05T10:45:00Z'
  },
  {
    id: 'trf-002',
    transfer_number: 'TRF-2425-0015',
    source_warehouse_id: '00000000-0000-0000-0000-000000000001',
    destination_warehouse_id: 'wh-depot-03',
    date: '2026-10-06',
    vehicle_number: 'WB-40-C-1928 (10-Wheeler Tipper)',
    driver_name: 'Rajesh Das',
    driver_phone: '+91 94341 22910',
    status: 'in_transit',
    notes: 'Inter-yard stock replenishment to Durgapur By-Pass depot for immediate retail & highway builder pickups.',
    items: [
      {
        id: 'ti-2',
        item_id: 'fg-2',
        item_name: 'Zig-Zag Concrete Paver Block 60mm (Red Oxide Top)',
        item_sku: 'ZZ-60-RED',
        qty: 2400,
        unit: 'pcs',
        batch_number: 'BATCH-2026-09-22-RED'
      },
      {
        id: 'ti-3',
        item_id: 'fg-3',
        item_name: 'I-Shape Paver Block 60mm (Grey)',
        item_sku: 'IS-60-GRY',
        qty: 1800,
        unit: 'pcs',
        batch_number: 'BATCH-2026-09-25-IS'
      }
    ],
    created_by: 'Swastik Mandal (Manager)',
    created_at: '2026-10-06T07:15:00Z',
    dispatched_at: '2026-10-06T07:45:00Z'
  },
  {
    id: 'trf-003',
    transfer_number: 'TRF-2425-0016',
    source_warehouse_id: 'wh-curing-02',
    destination_warehouse_id: '00000000-0000-0000-0000-000000000001',
    date: '2026-10-06',
    vehicle_number: 'WB-39-B-8491 (Plant Tractor 01)',
    driver_name: 'Manoj Yadav',
    driver_phone: '+91 97330 45120',
    status: 'draft',
    notes: 'Scheduled afternoon transfer of 60mm yellow hexagonal pavers after compressive cube test clearance.',
    items: [
      {
        id: 'ti-4',
        item_id: 'fg-4',
        item_name: 'Hexagonal Interlocking Paver 60mm (Yellow)',
        item_sku: 'HEX-60-YEL',
        qty: 1500,
        unit: 'pcs',
        batch_number: 'BATCH-2026-09-28-HEX'
      }
    ],
    created_by: 'Bikramjit Sen (Supervisor)',
    created_at: '2026-10-06T08:00:00Z'
  }
]
