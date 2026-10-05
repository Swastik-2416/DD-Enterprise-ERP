export interface ExecutiveMetrics {
  grossRevenue: number
  revenueGrowthMoM: number
  directMaterialCost: number
  indirectOverheads: number
  otherIncome: number
  netOperatingProfit: number
  netMarginPct: number
  totalPaversProducedSqft: number
  plantYieldPct: number
  totalReceivablesDue: number
  dsoDays: number
  activeCustomersCount: number
}

export interface MonthlyFinancialTrend {
  month: string
  monthKey: string
  revenue: number
  purchases: number
  expenses: number
  netProfit: number
  volumeSqft: number
}

export interface CategoryBreakdown {
  name: string
  value: number
  volumeSqft: number
  percentage: number
  color: string
}

export interface MachineUtilization {
  id: string
  machineName: string
  model: string
  plannedOutputSqft: number
  actualOutputSqft: number
  yieldPct: number
  runHours: number
  downtimeHours: number
  status: 'optimal' | 'attention' | 'maintenance'
}

export interface CustomerRanking {
  id: string
  name: string
  city: string
  segment: 'Govt PWD Contractor' | 'Infrastructure Developer' | 'Industrial Park' | 'Commercial Builder' | 'Retail Depot'
  totalRevenue: number
  totalVolumeSqft: number
  ordersCount: number
  outstandingAmount: number
  paymentDiscipline: 'prompt' | 'standard' | 'watch'
  marketSharePct: number
}

export interface ProductRanking {
  id: string
  name: string
  sku: string
  category: string
  grade: string
  thicknessMm: number
  totalVolumeSqft: number
  grossRevenue: number
  avgSellingRate: number
  currentStockSqft: number
  demandTrend: 'up' | 'stable' | 'down'
}

export interface ExecutiveInsight {
  id: string
  type: 'growth' | 'cost' | 'production' | 'risk'
  title: string
  description: string
  metricBadge: string
  badgeColor: 'emerald' | 'amber' | 'blue' | 'purple'
}

// ─── Domain-Accurate Seeds for Paver Block Plant BI ──────────────────────────

export const SEED_MONTHLY_TRENDS: MonthlyFinancialTrend[] = [
  { month: 'Apr', monthKey: '04', revenue: 980000, purchases: 520000, expenses: 145000, netProfit: 315000, volumeSqft: 28500 },
  { month: 'May', monthKey: '05', revenue: 1120000, purchases: 610000, expenses: 152000, netProfit: 358000, volumeSqft: 32400 },
  { month: 'Jun', monthKey: '06', revenue: 1250000, purchases: 670000, expenses: 160000, netProfit: 420000, volumeSqft: 36800 },
  { month: 'Jul', monthKey: '07', revenue: 1040000, purchases: 590000, expenses: 150000, netProfit: 300000, volumeSqft: 30200 },
  { month: 'Aug', monthKey: '08', revenue: 1180000, purchases: 630000, expenses: 158000, netProfit: 392000, volumeSqft: 34500 },
  { month: 'Sep', monthKey: '09', revenue: 1340000, purchases: 710000, expenses: 165000, netProfit: 465000, volumeSqft: 39100 },
  { month: 'Oct', monthKey: '10', revenue: 1482000, purchases: 785000, expenses: 172000, netProfit: 525000, volumeSqft: 42850 },
]

export const SEED_CATEGORY_BREAKDOWN: CategoryBreakdown[] = [
  { name: 'Zig-Zag 80mm Heavy Duty (M-40/50)', value: 585000, volumeSqft: 15800, percentage: 39.5, color: '#3b82f6' },
  { name: 'Zig-Zag 60mm Commercial (M-35)', value: 392000, volumeSqft: 11900, percentage: 26.5, color: '#10b981' },
  { name: 'I-Shape / Dumbbell 60mm (M-35)', value: 245000, volumeSqft: 7650, percentage: 16.5, color: '#f59e0b' },
  { name: 'Hexagonal Pavers 60mm (M-35)', value: 142000, volumeSqft: 4300, percentage: 9.6, color: '#8b5cf6' },
  { name: 'Grass Pavers & Kerb Stones', value: 118000, volumeSqft: 3200, percentage: 7.9, color: '#06b6d4' },
]

export const SEED_MACHINE_UTILIZATION: MachineUtilization[] = [
  {
    id: 'm-1',
    machineName: 'Automatic Vibro Press #1',
    model: 'Columbia SPM-20 High-Output Hydraulic',
    plannedOutputSqft: 22000,
    actualOutputSqft: 21850,
    yieldPct: 99.3,
    runHours: 198,
    downtimeHours: 4.5,
    status: 'optimal'
  },
  {
    id: 'm-2',
    machineName: 'Semi-Auto Vibro Press #2',
    model: 'Reva Multiform Press 60mm',
    plannedOutputSqft: 15000,
    actualOutputSqft: 14450,
    yieldPct: 96.3,
    runHours: 176,
    downtimeHours: 9.0,
    status: 'optimal'
  },
  {
    id: 'm-3',
    machineName: 'Hydraulic Kerb & Paver Press #3',
    model: 'Apollo 100T Static Compact',
    plannedOutputSqft: 7000,
    actualOutputSqft: 6550,
    yieldPct: 93.6,
    runHours: 112,
    downtimeHours: 14.5,
    status: 'attention'
  }
]

export const SEED_TOP_CUSTOMERS: CustomerRanking[] = [
  {
    id: 'c-1',
    name: 'Eastern Infra Projects Pvt Ltd',
    city: 'Durgapur, WB',
    segment: 'Govt PWD Contractor',
    totalRevenue: 485000,
    totalVolumeSqft: 13850,
    ordersCount: 6,
    outstandingAmount: 42000,
    paymentDiscipline: 'prompt',
    marketSharePct: 32.7
  },
  {
    id: 'c-2',
    name: 'Bengal Logistics Parks & Warehousing',
    city: 'Panagarh Industrial Corridor',
    segment: 'Industrial Park',
    totalRevenue: 342000,
    totalVolumeSqft: 9780,
    ordersCount: 4,
    outstandingAmount: 85000,
    paymentDiscipline: 'standard',
    marketSharePct: 23.1
  },
  {
    id: 'c-3',
    name: 'L&T Transportation Infrastructure',
    city: 'Asansol By-pass NH-19',
    segment: 'Infrastructure Developer',
    totalRevenue: 285000,
    totalVolumeSqft: 7900,
    ordersCount: 3,
    outstandingAmount: 0,
    paymentDiscipline: 'prompt',
    marketSharePct: 19.2
  },
  {
    id: 'c-4',
    name: 'Shree Krishna Realcon Builders',
    city: 'Bardhaman Town',
    segment: 'Commercial Builder',
    totalRevenue: 215000,
    totalVolumeSqft: 6720,
    ordersCount: 5,
    outstandingAmount: 58000,
    paymentDiscipline: 'standard',
    marketSharePct: 14.5
  },
  {
    id: 'c-5',
    name: 'Burdwan District Paving Depot',
    city: 'Katwa Road, Bardhaman',
    segment: 'Retail Depot',
    totalRevenue: 155000,
    totalVolumeSqft: 4600,
    ordersCount: 7,
    outstandingAmount: 18500,
    paymentDiscipline: 'prompt',
    marketSharePct: 10.5
  }
]

export const SEED_TOP_PRODUCTS: ProductRanking[] = [
  {
    id: 'p-1',
    name: 'Zig-Zag Paver Block 80mm (Grey)',
    sku: 'ZZ-80-GRY',
    category: 'Heavy Duty Pavers',
    grade: 'M-40',
    thicknessMm: 80,
    totalVolumeSqft: 14200,
    grossRevenue: 525400,
    avgSellingRate: 37.00,
    currentStockSqft: 8500,
    demandTrend: 'up'
  },
  {
    id: 'p-2',
    name: 'Zig-Zag Paver Block 60mm (Red Oxide Top)',
    sku: 'ZZ-60-RED',
    category: 'Commercial Pavers',
    grade: 'M-35',
    thicknessMm: 60,
    totalVolumeSqft: 9800,
    grossRevenue: 343000,
    avgSellingRate: 35.00,
    currentStockSqft: 4200,
    demandTrend: 'up'
  },
  {
    id: 'p-3',
    name: 'I-Shape Paver Block 60mm (Grey)',
    sku: 'IS-60-GRY',
    category: 'Commercial Pavers',
    grade: 'M-35',
    thicknessMm: 60,
    totalVolumeSqft: 7650,
    grossRevenue: 244800,
    avgSellingRate: 32.00,
    currentStockSqft: 6100,
    demandTrend: 'stable'
  },
  {
    id: 'p-4',
    name: 'Hexagonal Interlocking Paver 60mm (Yellow)',
    sku: 'HEX-60-YEL',
    category: 'Designer Pavers',
    grade: 'M-35',
    thicknessMm: 60,
    totalVolumeSqft: 4300,
    grossRevenue: 154800,
    avgSellingRate: 36.00,
    currentStockSqft: 1850,
    demandTrend: 'stable'
  },
  {
    id: 'p-5',
    name: 'Reinforced Concrete Kerb Stone 300x150x100mm',
    sku: 'KRB-300-GRY',
    category: 'Road Border / Kerb',
    grade: 'M-30',
    thicknessMm: 100,
    totalVolumeSqft: 3200,
    grossRevenue: 118400,
    avgSellingRate: 37.00,
    currentStockSqft: 950,
    demandTrend: 'up'
  }
]

export const SEED_EXECUTIVE_INSIGHTS: ExecutiveInsight[] = [
  {
    id: 'ins-1',
    type: 'growth',
    title: '80mm Heavy Duty Segment Driving Volume Growth',
    description: 'Demand for 80mm M-40 pavers across logistics hubs and NH projects accounts for 39.5% of total plant sales. Average realization is ₹37/sq.ft yielding healthy margin contribution.',
    metricBadge: '+14.2% MoM Volume',
    badgeColor: 'emerald'
  },
  {
    id: 'ins-2',
    type: 'production',
    title: 'Press #1 Yield Efficiency at All-Time High',
    description: 'Automatic Vibro Press #1 recorded 99.3% batch execution yield with under 5 hours monthly downtime. Zero batch rejection observed on M-35/M-40 standard recipes.',
    metricBadge: '99.3% Yield Rate',
    badgeColor: 'blue'
  },
  {
    id: 'ins-3',
    type: 'cost',
    title: 'Power & Fuel Load Optimization Opportunity',
    description: 'WBSEDCL HT power tariff during peak 5 PM - 10 PM is 1.4x standard rates. Shifting heavy pan mixers and hydraulic presses to 6 AM - 2 PM shift saves approx ₹18,000/month.',
    metricBadge: '₹18k/mo Potential Saving',
    badgeColor: 'amber'
  },
  {
    id: 'ins-4',
    type: 'risk',
    title: 'Customer Accounts Receivable Concentration',
    description: 'Top 3 infrastructure contractors hold 75% of active sales volume. Average DSO is 24 days with ₹85,000 pending past 30 days from Bengal Logistics; credit limits enforced.',
    metricBadge: '24 Days Avg DSO',
    badgeColor: 'purple'
  }
]
