import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, Download, Printer,
  FileText, ArrowUpRight, ArrowDownRight, Layers, Package, Factory
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Invoice, PurchaseInvoice, ProductionOrder, Company } from '@/types/database.types'

function getFYDefaults() {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  const startYear = currentMonth >= 4 ? currentYear : currentYear - 1
  return {
    startYear,
    fromDate: `${startYear}-04-01`,
    toDate: today.toISOString().split('T')[0]
  }
}

export function ProfitLossPage() {
  const { user } = useAuth()
  const companyId = user?.company_id || ''

  const fy = getFYDefaults()
  const [fromDate, setFromDate] = useState(fy.fromDate)
  const [toDate, setToDate] = useState(fy.toDate)
  const [preset, setPreset] = useState<string>('fy')

  const handlePresetChange = (val: string) => {
    setPreset(val)
    const y = fy.startYear
    if (val === 'fy') {
      setFromDate(`${y}-04-01`)
      setToDate(new Date().toISOString().split('T')[0])
    } else if (val === 'q1') {
      setFromDate(`${y}-04-01`)
      setToDate(`${y}-06-30`)
    } else if (val === 'q2') {
      setFromDate(`${y}-07-01`)
      setToDate(`${y}-09-30`)
    } else if (val === 'q3') {
      setFromDate(`${y}-10-01`)
      setToDate(`${y}-12-31`)
    } else if (val === 'q4') {
      setFromDate(`${y + 1}-01-01`)
      setToDate(`${y + 1}-03-31`)
    }
  }

  // 1. Fetch Company Info
  const { data: company } = useQuery({
    queryKey: ['company_info', companyId],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('*').eq('id', companyId).single()
      return (data || null) as Company | null
    },
    enabled: !!companyId,
  })

  // 2. Fetch Posted Sales Invoices (Revenue)
  const { data: salesInvoices = [] } = useQuery({
    queryKey: ['pl_sales', companyId, fromDate, toDate],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'posted')
      if (fromDate) query = query.gte('date', fromDate)
      if (toDate) query = query.lte('date', toDate)
      const { data, error } = await query
      if (error) throw error
      return (data || []) as Invoice[]
    },
    enabled: !!companyId,
  })

  // 3. Fetch Posted Purchase Invoices (Direct Material Cost)
  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ['pl_purchases', companyId, fromDate, toDate],
    queryFn: async () => {
      let query = supabase
        .from('purchase_invoices')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'posted')
      if (fromDate) query = query.gte('date', fromDate)
      if (toDate) query = query.lte('date', toDate)
      const { data, error } = await query
      if (error) throw error
      return (data || []) as PurchaseInvoice[]
    },
    enabled: !!companyId,
  })

  // 4. Fetch Completed Production Orders
  const { data: productionOrders = [] } = useQuery({
    queryKey: ['pl_production', companyId, fromDate, toDate],
    queryFn: async () => {
      let query = supabase
        .from('production_orders')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'posted')
      if (fromDate) query = query.gte('planned_date', fromDate)
      if (toDate) query = query.lte('planned_date', toDate)
      const { data, error } = await query
      if (error) throw error
      return (data || []) as ProductionOrder[]
    },
    enabled: !!companyId,
  })

  // 5. Calculations
  const metrics = useMemo(() => {
    // Net Revenue (Taxable amount of sales invoices - GST is a pass-through liability)
    const netSalesTurnover = salesInvoices.reduce((sum, inv) => sum + (Number(inv.taxable_amount) || 0), 0)
    const grossSalesWithTax = salesInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0)
    const outputGst = grossSalesWithTax - netSalesTurnover

    // Cost of Goods Sold: Direct Raw Materials (Taxable amount of purchases - Input GST is recoverable)
    const directMaterialPurchases = purchaseInvoices.reduce((sum, p) => sum + (Number(p.taxable_amount) || 0), 0)
    const grossPurchasesWithTax = purchaseInvoices.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0)
    const inputGst = grossPurchasesWithTax - directMaterialPurchases

    // Production volume produced during period
    const totalPaversProduced = productionOrders.reduce((sum, po) => sum + (Number(po.actual_qty || po.planned_qty) || 0), 0)

    // Gross Profit & Margin
    const grossProfit = netSalesTurnover - directMaterialPurchases
    const grossMarginPct = netSalesTurnover > 0 ? (grossProfit / netSalesTurnover) * 100 : 0

    return {
      netSalesTurnover,
      grossSalesWithTax,
      outputGst,
      salesCount: salesInvoices.length,
      directMaterialPurchases,
      grossPurchasesWithTax,
      inputGst,
      purchasesCount: purchaseInvoices.length,
      totalPaversProduced,
      productionCount: productionOrders.length,
      grossProfit,
      grossMarginPct,
    }
  }, [salesInvoices, purchaseInvoices, productionOrders])

  // CSV Export
  const handleExportCSV = () => {
    const rows = [
      ['PROFIT & LOSS STATEMENT', 'DD Enterprise'],
      ['Period', `${fromDate} to ${toDate}`],
      [''],
      ['PARTICULARS', 'AMOUNT (INR)'],
      ['INCOME / OPERATING REVENUE', ''],
      ['  Gross Sales Invoices (Incl. GST)', metrics.grossSalesWithTax.toFixed(2)],
      ['  Less: Output GST Collected', `-${metrics.outputGst.toFixed(2)}`],
      ['  Net Sales Turnover (Operating Revenue)', metrics.netSalesTurnover.toFixed(2)],
      [''],
      ['COST OF GOODS SOLD (COGS)', ''],
      ['  Direct Raw Material Purchases (Taxable)', metrics.directMaterialPurchases.toFixed(2)],
      ['  Total Direct Material Cost', metrics.directMaterialPurchases.toFixed(2)],
      [''],
      ['TRADING PROFIT / GROSS SURPLUS', ''],
      ['  Gross Profit', metrics.grossProfit.toFixed(2)],
      ['  Gross Margin %', `${metrics.grossMarginPct.toFixed(2)}%`],
      [''],
      ['PLANT OPERATIONAL METRICS', ''],
      ['  Sales Invoices Posted', metrics.salesCount.toString()],
      ['  Purchase Consignments Posted', metrics.purchasesCount.toString()],
      ['  Finished Paver Blocks Produced (pcs)', metrics.totalPaversProduced.toString()],
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `profit_loss_${fromDate}_to_${toDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Profit & Loss Statement
          </h1>
          <p className="text-sm text-outline mt-0.5">
            Operational trading account: Net Sales Turnover, Direct Material Costs (COGS), and Gross Margin
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-surface border border-outline-variant rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors shadow-xs"
          >
            <Download className="h-4 w-4 text-outline" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print P&L
          </button>
        </div>
      </div>

      {/* Filter Presets Bar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/60 pb-3">
          <span className="text-xs font-semibold text-outline uppercase tracking-wider mr-2">Preset Period:</span>
          {[
            { id: 'fy', label: `FY ${fy.startYear}-${(fy.startYear + 1).toString().slice(2)}` },
            { id: 'q1', label: 'Q1 (Apr–Jun)' },
            { id: 'q2', label: 'Q2 (Jul–Sep)' },
            { id: 'q3', label: 'Q3 (Oct–Dec)' },
            { id: 'q4', label: 'Q4 (Jan–Mar)' },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => handlePresetChange(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                preset === btn.id
                  ? 'bg-primary text-white'
                  : 'bg-surface-container/60 text-outline hover:text-on-surface'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => {
                setFromDate(e.target.value)
                setPreset('custom')
              }}
              className="w-full px-3 py-2 bg-surface-container/40 border border-outline-variant rounded-xl text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => {
                setToDate(e.target.value)
                setPreset('custom')
              }}
              className="w-full px-3 py-2 bg-surface-container/40 border border-outline-variant rounded-xl text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Top Executive KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-outline">Net Sales Turnover</span>
          <p className="text-xl font-bold text-blue-700 mt-1">
            {formatCurrency(metrics.netSalesTurnover)}
          </p>
          <span className="text-xs text-outline">{metrics.salesCount} Invoices Dispatched</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-outline">Direct Raw Materials</span>
          <p className="text-xl font-bold text-amber-700 mt-1">
            {formatCurrency(metrics.directMaterialPurchases)}
          </p>
          <span className="text-xs text-outline">{metrics.purchasesCount} Material Bills</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-outline">Gross Trading Profit</span>
          <p className={`text-xl font-bold mt-1 ${metrics.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(metrics.grossProfit)}
          </p>
          <span className="text-xs text-outline">Turnover minus Material Cost</span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-outline">Gross Margin %</span>
          <p className={`text-xl font-bold mt-1 ${metrics.grossMarginPct >= 0 ? 'text-primary' : 'text-red-600'}`}>
            {metrics.grossMarginPct.toFixed(1)}%
          </p>
          <span className="text-xs text-outline">
            {metrics.totalPaversProduced.toLocaleString('en-IN')} pcs produced
          </span>
        </div>
      </div>

      {/* Formal Trading Account / P&L Document */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs space-y-6">
        {/* Document Header */}
        <div className="border-b border-outline-variant/60 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Financial Statement</span>
            <h2 className="text-xl font-bold text-on-surface mt-0.5">Trading and Operating Profit & Loss Account</h2>
            <p className="text-xs text-outline">{company?.name || 'DD Enterprise'} · Paver Block Plant</p>
          </div>
          <div className="text-left sm:text-right text-xs text-outline space-y-0.5">
            <p className="font-semibold text-on-surface">For the Period: {formatDate(fromDate)} to {formatDate(toDate)}</p>
            <p>Accounting Basis: Mercantile / Accrual</p>
          </div>
        </div>

        {/* Breakdown Sections */}
        <div className="space-y-6">
          {/* Section 1: Revenue from Operations */}
          <div className="border border-outline-variant/80 rounded-xl overflow-hidden">
            <div className="bg-blue-50/50 dark:bg-blue-950/20 px-4 py-2.5 border-b border-outline-variant/80 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                1. Revenue From Operations (Trading Income)
              </span>
              <span className="text-xs text-blue-700 font-semibold">{metrics.salesCount} Invoices</span>
            </div>
            <div className="divide-y divide-outline-variant/40 text-sm">
              <div className="flex items-center justify-between py-2.5 px-4">
                <span className="text-on-surface">Gross Sales Invoices Generated (Incl. GST)</span>
                <span className="font-mono text-outline">{formatCurrency(metrics.grossSalesWithTax)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 px-4 bg-background/40">
                <span className="text-outline text-xs">Less: Output GST (CGST + SGST collected for government)</span>
                <span className="font-mono text-xs text-red-600">-{formatCurrency(metrics.outputGst)}</span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 font-bold bg-surface-container/20">
                <span className="text-on-surface">Net Operating Turnover (A)</span>
                <span className="font-mono text-blue-700 text-base">{formatCurrency(metrics.netSalesTurnover)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Cost of Goods Sold */}
          <div className="border border-outline-variant/80 rounded-xl overflow-hidden">
            <div className="bg-amber-50/50 dark:bg-amber-950/20 px-4 py-2.5 border-b border-outline-variant/80 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                2. Direct Costs / Raw Materials Consumed (COGS)
              </span>
              <span className="text-xs text-amber-700 font-semibold">{metrics.purchasesCount} Consignments</span>
            </div>
            <div className="divide-y divide-outline-variant/40 text-sm">
              <div className="flex items-center justify-between py-2.5 px-4">
                <span className="text-on-surface">Raw Material Inward Purchases (Cement, Fly Ash, Sand, Aggregates)</span>
                <span className="font-mono text-outline">{formatCurrency(metrics.grossPurchasesWithTax)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 px-4 bg-background/40">
                <span className="text-outline text-xs">Less: Input Tax Credit (ITC Recoverable from Government)</span>
                <span className="font-mono text-xs text-emerald-600">-{formatCurrency(metrics.inputGst)}</span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 font-bold bg-surface-container/20">
                <span className="text-on-surface">Total Direct Material Cost (B)</span>
                <span className="font-mono text-amber-700 text-base">{formatCurrency(metrics.directMaterialPurchases)}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Gross Trading Profit */}
          <div className={`border rounded-xl p-5 ${
            metrics.grossProfit >= 0
              ? 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20'
              : 'border-red-200 bg-red-50/40 dark:bg-red-950/20'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  3. Gross Trading Margin / Operating Surplus (A - B)
                </span>
                <p className="text-xs text-outline mt-0.5">
                  Operating revenue remaining after raw material costs to cover plant labor, electricity & administrative overheads
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className={`text-2xl font-bold font-mono ${metrics.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatCurrency(metrics.grossProfit)}
                </p>
                <p className="text-xs font-semibold text-outline">
                  Margin: <span className="text-on-surface">{metrics.grossMarginPct.toFixed(1)}%</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Plant Operational Footprint */}
        <div className="border-t border-outline-variant/60 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-outline">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-primary" />
            <span>Production Runs: <strong className="text-on-surface">{metrics.productionCount} batches</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span>Paver Blocks Made: <strong className="text-on-surface">{metrics.totalPaversProduced.toLocaleString('en-IN')} pcs</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span>Sales Orders Fulfilled: <strong className="text-on-surface">{metrics.salesCount} invoices</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
