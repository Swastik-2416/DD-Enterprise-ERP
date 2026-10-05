import { useRef } from 'react'
import { Printer, X, Download } from 'lucide-react'
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters'
import type { Company } from '@/types/database.types'
import type {
  ExecutiveMetrics,
  MonthlyFinancialTrend,
  CustomerRanking,
  ProductRanking,
  MachineUtilization,
  ExecutiveInsight
} from '@/types/analytics.types'

interface ExecutiveBriefingModalProps {
  isOpen: boolean
  onClose: () => void
  company?: any
  periodLabel: string
  metrics: ExecutiveMetrics
  topCustomers: CustomerRanking[]
  topProducts: ProductRanking[]
  machines: MachineUtilization[]
  insights: ExecutiveInsight[]
}

export function ExecutiveBriefingModal({
  isOpen,
  onClose,
  company,
  periodLabel,
  metrics,
  topCustomers,
  topProducts,
  machines,
  insights
}: ExecutiveBriefingModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl max-w-4xl w-full my-8 overflow-hidden print:border-none print:shadow-none print:my-0 print:max-w-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container/50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface text-base">Executive BI Performance Briefing</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Confidential · Management Only
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Print A4 Briefing</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div ref={printRef} className="p-8 print:p-6 bg-white text-slate-900 font-sans space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {company?.name || 'DD ENTERPRISE'}
              </h1>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                Concrete Pavers, Kerb Stones & Interlocking Block Manufacturing Plant
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {company?.address || 'Near Panagarh Industrial Corridor, NH-19, Burdwan - 713148'}
              </p>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-600 mt-1">
                <span>GSTIN: <strong>{company?.gstin || '19AABCD1234E1Z5'}</strong></span>
                <span>STATE CODE: <strong>19 (West Bengal)</strong></span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                Executive BI Briefing
              </span>
              <p className="text-xs font-semibold text-slate-700 mt-2">
                Period: <span className="font-bold text-slate-900">{periodLabel}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Generated: {formatDate(new Date())}
              </p>
            </div>
          </div>

          {/* Key Executive KPI Grid */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              1. Executive Financial & Operations Scorecard
            </h2>
            <div className="grid grid-cols-4 gap-3">
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <span className="text-[11px] font-medium text-slate-500 block">Gross Sales Turnover</span>
                <span className="text-lg font-bold text-slate-900 block mt-0.5">
                  {formatCurrency(metrics.grossRevenue)}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {metrics.revenueGrowthMoM >= 0 ? `+${metrics.revenueGrowthMoM}%` : `${metrics.revenueGrowthMoM}%`} MoM trend
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <span className="text-[11px] font-medium text-slate-500 block">Raw Material COGS</span>
                <span className="text-lg font-bold text-slate-900 block mt-0.5">
                  {formatCurrency(metrics.directMaterialCost)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {metrics.grossRevenue > 0 ? `${((metrics.directMaterialCost / metrics.grossRevenue) * 100).toFixed(1)}% of Revenue` : '—'}
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 bg-emerald-50 border-emerald-200">
                <span className="text-[11px] font-medium text-emerald-800 block">Operating Net Profit</span>
                <span className="text-lg font-bold text-emerald-900 block mt-0.5">
                  {formatCurrency(metrics.netOperatingProfit)}
                </span>
                <span className="text-[10px] font-bold text-emerald-700">
                  {metrics.netMarginPct.toFixed(1)}% Operating Margin
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 bg-blue-50 border-blue-200">
                <span className="text-[11px] font-medium text-blue-800 block">Total Paver Output</span>
                <span className="text-lg font-bold text-blue-900 block mt-0.5">
                  {formatNumber(metrics.totalPaversProducedSqft, 0)} Sq.Ft
                </span>
                <span className="text-[10px] font-bold text-blue-700">
                  {metrics.plantYieldPct.toFixed(1)}% Target Yield
                </span>
              </div>
            </div>
          </div>

          {/* Top 5 Revenue Contributing Clients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Key Customer Concentration (Top 5 Accounts)
              </h2>
              <span className="text-[11px] text-slate-500">Sorted by Gross Turnover</span>
            </div>
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-2 border border-slate-200 text-center w-8">#</th>
                  <th className="p-2 border border-slate-200">Client / Contractor Name</th>
                  <th className="p-2 border border-slate-200">Segment</th>
                  <th className="p-2 border border-slate-200 text-right">Volume (Sq.Ft)</th>
                  <th className="p-2 border border-slate-200 text-right">Invoiced Value</th>
                  <th className="p-2 border border-slate-200 text-right">Pending Due</th>
                  <th className="p-2 border border-slate-200 text-right">Turnover Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topCustomers.slice(0, 5).map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-2 border border-slate-200 text-center font-bold">{idx + 1}</td>
                    <td className="p-2 border border-slate-200 font-medium">
                      {c.name}
                      <span className="block text-[10px] text-slate-500">{c.city}</span>
                    </td>
                    <td className="p-2 border border-slate-200 text-slate-600">{c.segment}</td>
                    <td className="p-2 border border-slate-200 text-right font-mono">{formatNumber(c.totalVolumeSqft, 0)}</td>
                    <td className="p-2 border border-slate-200 text-right font-mono font-semibold">{formatCurrency(c.totalRevenue)}</td>
                    <td className="p-2 border border-slate-200 text-right font-mono">
                      {c.outstandingAmount > 0 ? (
                        <span className="text-amber-700 font-medium">{formatCurrency(c.outstandingAmount)}</span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">Cleared (₹0)</span>
                      )}
                    </td>
                    <td className="p-2 border border-slate-200 text-right font-mono font-bold text-slate-800">
                      {c.marketSharePct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top 5 Best-Selling Paver Products */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Best-Selling Paver Products & Yield Analysis
              </h2>
              <span className="text-[11px] text-slate-500">Ranked by Volume & Realization</span>
            </div>
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-2 border border-slate-200 text-center w-8">#</th>
                  <th className="p-2 border border-slate-200">Product SKU & Spec</th>
                  <th className="p-2 border border-slate-200">Mix Grade</th>
                  <th className="p-2 border border-slate-200 text-right">Volume Sold</th>
                  <th className="p-2 border border-slate-200 text-right">Avg Rate / Sq.Ft</th>
                  <th className="p-2 border border-slate-200 text-right">Revenue (₹)</th>
                  <th className="p-2 border border-slate-200 text-right">Yard Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topProducts.slice(0, 5).map((p, idx) => (
                  <tr key={p.id}>
                    <td className="p-2 border border-slate-200 text-center font-bold">{idx + 1}</td>
                    <td className="p-2 border border-slate-200 font-medium">
                      {p.name}
                      <span className="block text-[10px] font-mono text-slate-500">{p.sku}</span>
                    </td>
                    <td className="p-2 border border-slate-200">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px] font-bold">
                        {p.grade} · {p.thicknessMm}mm
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 text-right font-mono">{formatNumber(p.totalVolumeSqft, 0)} Sq.Ft</td>
                    <td className="p-2 border border-slate-200 text-right font-mono font-semibold">₹{p.avgSellingRate.toFixed(2)}</td>
                    <td className="p-2 border border-slate-200 text-right font-mono font-bold text-slate-900">{formatCurrency(p.grossRevenue)}</td>
                    <td className="p-2 border border-slate-200 text-right font-mono text-slate-700">{formatNumber(p.currentStockSqft, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Plant Machine Utilization */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              4. Plant Machinery Utilization & Uptime
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {machines.map(m => (
                <div key={m.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{m.machineName}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      m.status === 'optimal' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {m.yieldPct}% Yield
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mb-2">{m.model}</p>
                  <div className="text-[11px] space-y-0.5 font-mono text-slate-700">
                    <div className="flex justify-between">
                      <span>Actual Output:</span>
                      <span className="font-bold">{formatNumber(m.actualOutputSqft, 0)} Sq.Ft</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Run Hours:</span>
                      <span>{m.runHours} hrs</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Downtime:</span>
                      <span>{m.downtimeHours} hrs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Executive Insights */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              5. Plant Observations & Management Action Items
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {insights.map(item => (
                <div key={item.id} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{item.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded">
                      {item.metricBadge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Signature Sign-Off Block */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-12 text-xs">
            <div className="space-y-12">
              <p className="text-slate-500">Prepared & Verified By:</p>
              <div>
                <div className="border-t border-slate-400 w-48 mb-1"></div>
                <p className="font-bold text-slate-800">Factory Accounts / ERP Lead</p>
                <p className="text-[10px] text-slate-500">DD Enterprise Plant Office</p>
              </div>
            </div>
            <div className="space-y-12 text-right">
              <p className="text-slate-500">Reviewed & Approved By:</p>
              <div className="flex flex-col items-end">
                <div className="border-t border-slate-400 w-48 mb-1"></div>
                <p className="font-bold text-slate-800">Managing Partner / Director</p>
                <p className="text-[10px] text-slate-500">DD Enterprise Concrete Products</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
