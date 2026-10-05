export type WorkerSkill = 'Skilled' | 'Semi-Skilled' | 'Unskilled'

export type FactoryDepartment =
  | 'Vibro Press Machine Line'
  | 'Batching Plant & Mixing'
  | 'Forklift & Yard Tractor'
  | 'Curing Sheds & Mist Spraying'
  | 'Stacking, Palletizing & Loading'
  | 'Plant Maintenance & Welding'
  | 'Factory Security & Gate'

export interface Worker {
  id: string
  worker_code: string
  name: string
  phone?: string
  department: FactoryDepartment
  skill_level: WorkerSkill
  daily_wage_rate: number
  hourly_ot_rate: number
  aadhaar_last4?: string
  is_active: boolean
  joined_date: string
}

export type AttendanceStatus = 'present' | 'half_day' | 'absent'

export interface DailyAttendanceRecord {
  id: string
  date: string
  shift: 'Morning Shift (6 AM - 2 PM)' | 'Evening Shift (2 PM - 10 PM)' | 'General Shift (8 AM - 5 PM)'
  worker_id: string
  worker_name: string
  department: FactoryDepartment
  status: AttendanceStatus
  ot_hours: number
  daily_wage: number
  ot_amount: number
  total_earned: number
  notes?: string
}

export const SEED_WORKERS: Worker[] = [
  {
    id: 'wkr-1',
    worker_code: 'WKR-001',
    name: 'Ramesh Mondal',
    phone: '9832104561',
    department: 'Vibro Press Machine Line',
    skill_level: 'Skilled',
    daily_wage_rate: 850,
    hourly_ot_rate: 110,
    aadhaar_last4: '4120',
    is_active: true,
    joined_date: '2023-04-10'
  },
  {
    id: 'wkr-2',
    worker_code: 'WKR-002',
    name: 'Subhasish Ghosh',
    phone: '9832104562',
    department: 'Vibro Press Machine Line',
    skill_level: 'Semi-Skilled',
    daily_wage_rate: 700,
    hourly_ot_rate: 90,
    aadhaar_last4: '8831',
    is_active: true,
    joined_date: '2023-05-15'
  },
  {
    id: 'wkr-3',
    worker_code: 'WKR-003',
    name: 'Bapi Roy',
    phone: '9832104563',
    department: 'Batching Plant & Mixing',
    skill_level: 'Skilled',
    daily_wage_rate: 800,
    hourly_ot_rate: 100,
    aadhaar_last4: '7192',
    is_active: true,
    joined_date: '2023-03-01'
  },
  {
    id: 'wkr-4',
    worker_code: 'WKR-004',
    name: 'Dulal Das',
    phone: '9832104564',
    department: 'Forklift & Yard Tractor',
    skill_level: 'Skilled',
    daily_wage_rate: 800,
    hourly_ot_rate: 100,
    aadhaar_last4: '6219',
    is_active: true,
    joined_date: '2023-06-20'
  },
  {
    id: 'wkr-5',
    worker_code: 'WKR-005',
    name: 'Prabir Sarkar',
    phone: '9832104565',
    department: 'Curing Sheds & Mist Spraying',
    skill_level: 'Unskilled',
    daily_wage_rate: 550,
    hourly_ot_rate: 70,
    aadhaar_last4: '9012',
    is_active: true,
    joined_date: '2023-08-01'
  },
  {
    id: 'wkr-6',
    worker_code: 'WKR-006',
    name: 'Tapan Biswas',
    phone: '9832104566',
    department: 'Stacking, Palletizing & Loading',
    skill_level: 'Unskilled',
    daily_wage_rate: 550,
    hourly_ot_rate: 70,
    aadhaar_last4: '5532',
    is_active: true,
    joined_date: '2023-08-15'
  },
  {
    id: 'wkr-7',
    worker_code: 'WKR-007',
    name: 'Gouranga Halder',
    phone: '9832104567',
    department: 'Stacking, Palletizing & Loading',
    skill_level: 'Unskilled',
    daily_wage_rate: 550,
    hourly_ot_rate: 70,
    aadhaar_last4: '3341',
    is_active: true,
    joined_date: '2023-09-01'
  },
  {
    id: 'wkr-8',
    worker_code: 'WKR-008',
    name: 'Anup Pramanik',
    phone: '9832104568',
    department: 'Plant Maintenance & Welding',
    skill_level: 'Skilled',
    daily_wage_rate: 900,
    hourly_ot_rate: 120,
    aadhaar_last4: '1928',
    is_active: true,
    joined_date: '2023-02-15'
  }
]
