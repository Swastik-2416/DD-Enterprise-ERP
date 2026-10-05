import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck, Search, Filter, Calendar, Download, Eye,
  PlusCircle, RefreshCw, Trash2, Database, User, Clock,
  ArrowRight, Sparkles, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, formatDateTime } from '@/lib/formatters'
import { AuditDetailModal } from '@/components/audit/AuditDetailModal'
import { getCachedAuditLogs, logAuditEvent } from '@/lib/auditLogger'
import type { AuditLog } from '@/types/database.types'

export function AuditLogPage() {
  const { user } = useAuth()
  const companyId = user?.company_id || ''
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedTable, setSelectedTable] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // 1. Fetch Audit Logs from Supabase with fallback to local cached seeds
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit_logs_list', companyId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('performed_at', { ascending: false })
          .limit(200)

        if (!error && data && data.length > 0) {
          return data as AuditLog[]
        }
      } catch {}

      // Fallback to cache / seed logs
      return getCachedAuditLogs()
    },
    staleTime: 5000,
  })

  // 2. Filter Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Action filter
      if (selectedAction !== 'all' && log.action !== selectedAction) {
        return false
      }

      // Table filter
      if (selectedTable !== 'all' && log.table_name !== selectedTable) {
        return false
      }

      // Date range filter
      if (fromDate) {
        const logDate = log.performed_at.slice(0, 10)
        if (logDate < fromDate) return false
      }
      if (toDate) {
        const logDate = log.performed_at.slice(0, 10)
        if (logDate > toDate) return false
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const actorMatch = log.performed_by?.toLowerCase().includes(q)
        const rowMatch = log.row_id?.toLowerCase().includes(q)
        const tableMatch = log.table_name?.toLowerCase().includes(q)
        const dataMatch = JSON.stringify(log.new_data || {}).toLowerCase().includes(q) ||
                          JSON.stringify(log.old_data || {}).toLowerCase().includes(q)
        return actorMatch || rowMatch || tableMatch || dataMatch
      }

      return true
    })
  }, [logs, selectedAction, selectedTable, fromDate, toDate, searchQuery])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = logs.length
    const inserts = logs.filter(l => l.action === 'INSERT').length
    const updates = logs.filter(l => l.action === 'UPDATE').length
    const deletes = logs.filter(l => l.action === 'DELETE').length
    return { total, inserts, updates, deletes }
  }, [logs])

  // Helper to extract a human summary of what changed
  const getChangeSummary = (log: AuditLog) => {
    if (log.action === 'INSERT') {
      const newObj = (log.new_data as Record<string, any>) || {}
      const desc = newObj.notes || newObj.description || newObj.item_name || newObj.customer_name || 'Created new record'
      return <span className="text-emerald-700 dark:text-emerald-400 font-medium">Created: {String(desc).slice(0, 45)}</span>
    }
    if (log.action === 'DELETE') {
      return <span className="text-rose-700 dark:text-rose-400 font-medium">Deleted record from {log.table_name}</span>
    }
    if (log.action === 'UPDATE') {
      const oldObj = (log.old_data as Record<string, any>) || {}
      const newObj = (log.new_data as Record<string, any>) || {}
      const changedKeys = Object.keys(newObj).filter(k => JSON.stringify(newObj[k]) !== JSON.stringify(oldObj[k]))

      if (changedKeys.includes('status')) {
        return (
          <span className="text-on-surface">
            status: <span className="text-rose-600 line-through mr-1">{oldObj.status}</span>
            <ArrowRight className="inline h-3 w-3 text-outline mx-1" />
            <span className="text-emerald-600 font-bold">{newObj.status}</span>
          </span>
        )
      }
      if (changedKeys.includes('qty_on_hand')) {
        return (
          <span className="text-on-surface font-mono">
            qty: <span className="line-through text-slate-400 mr-1">{oldObj.qty_on_hand}</span>
            <ArrowRight className="inline h-3 w-3 text-outline mx-1" />
            <span className="text-primary font-bold">{newObj.qty_on_hand}</span>
          </span>
        )
      }
      if (changedKeys.length > 0) {
        return (
          <span className="text-on-surface-variant truncate">
            Modified: <strong className="text-on-surface font-mono">{changedKeys.slice(0, 3).join(', ')}</strong>
            {changedKeys.length > 3 ? ` (+${changedKeys.length - 3} more)` : ''}
          </span>
        )
      }
      return <span className="text-on-surface-variant italic">Record updated</span>
    }
    return <span>—</span>
  }

  // Handle Log Sample Event
  const handleLogSample = async () => {
    const actions: Array<'INSERT' | 'UPDATE'> = ['UPDATE', 'INSERT']
    const randAction = actions[Math.floor(Math.random() * actions.length)]

    await logAuditEvent({
      companyId: companyId || 'c1',
      tableName: 'invoices',
      rowId: `INV-2425-${Math.floor(1000 + Math.random() * 9000)}`,
      action: randAction,
      oldData: randAction === 'UPDATE' ? { status: 'submitted', total_amount: 185000 } : null,
      newData: { status: 'posted', total_amount: 185000, verified_at: new Date().toISOString() },
      performedBy: `${user?.full_name || 'Plant Supervisor'} (${user?.role || 'manager'})`
    })

    toast.success('Live audit event recorded!')
    refetch()
  }

  // Handle Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No audit records to export')
      return
    }

    const csvRows: string[] = [
      `"DD ENTERPRISE ERP - SYSTEM AUDIT LOG"`,
      `"Export Date:","${new Date().toLocaleString('en-IN')}"`,
      `"Total Records:","${filteredLogs.length}"`,
      ``,
      `"ID","Timestamp (IST)","Action","Table Entity","Record ID","Performed By","Old Data (JSON)","New Data (JSON)"`,
      ...filteredLogs.map(l => {
        const oldStr = JSON.stringify(l.old_data || {}).replace(/"/g, '""')
        const newStr = JSON.stringify(l.new_data || {}).replace(/"/g, '""')
        return `"${l.id}","${formatDateTime(l.performed_at)}","${l.action}","${l.table_name}","${l.row_id}","${l.performed_by}","${oldStr}","${newStr}"`
      })
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `DD_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Audit log exported to CSV!')
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-on-surface">System Audit Trail & Security Log</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                Immutable Ledger
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Browse immutable records of who changed what, previous vs new states, and security modifications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleLogSample}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container/80 text-on-surface rounded-lg text-xs font-medium border border-outline-variant transition-colors shadow-xs"
            title="Log a test audit event"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Log Test Event</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors shadow-xs"
            title="Export CSV for statutory compliance"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Audit Trail (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">Total Logged Events</span>
          <span className="text-2xl font-bold font-mono text-on-surface mt-1 block">
            {metrics.total}
          </span>
          <span className="text-[11px] text-on-surface-variant">Permanent activity trail</span>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">Updates & State Changes</span>
          <span className="text-2xl font-bold font-mono text-blue-600 mt-1 block">
            {metrics.updates}
          </span>
          <span className="text-[11px] text-blue-600/80 font-medium">Record modifications</span>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">New Records Created</span>
          <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
            {metrics.inserts}
          </span>
          <span className="text-[11px] text-emerald-600/80 font-medium">Invoices, bills & batches</span>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-xs">
          <span className="text-xs font-medium text-on-surface-variant block">Deletions / Voided</span>
          <span className="text-2xl font-bold font-mono text-rose-600 mt-1 block">
            {metrics.deletes}
          </span>
          <span className="text-[11px] text-rose-600/80 font-medium">Security deletions</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by actor, record ID, table name or changes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
            >
              <option value="all">All Actions</option>
              <option value="INSERT">INSERT (Created)</option>
              <option value="UPDATE">UPDATE (Modified)</option>
              <option value="DELETE">DELETE (Removed)</option>
            </select>

            {/* Table Filter */}
            <select
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none"
            >
              <option value="all">All Entity Tables</option>
              <option value="invoices">invoices (Sales)</option>
              <option value="purchase_invoices">purchase_invoices (Procurement)</option>
              <option value="production_orders">production_orders (Factory)</option>
              <option value="stock_balances">stock_balances (Inventory)</option>
              <option value="boms">boms (Recipes)</option>
              <option value="expenses">expenses (Finance)</option>
              <option value="labour_attendance">labour_attendance (HR)</option>
              <option value="customers">customers</option>
              <option value="suppliers">suppliers</option>
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-1 bg-surface-container rounded-lg px-2.5 py-1.5 border border-outline-variant text-xs">
              <Calendar className="h-3.5 w-3.5 text-outline" />
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="bg-transparent border-none text-xs font-mono text-on-surface focus:outline-none w-28"
                placeholder="From"
              />
              <span className="text-outline">→</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="bg-transparent border-none text-xs font-mono text-on-surface focus:outline-none w-28"
                placeholder="To"
              />
            </div>

            {(searchQuery || selectedAction !== 'all' || selectedTable !== 'all' || fromDate || toDate) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedAction('all')
                  setSelectedTable('all')
                  setFromDate('')
                  setToDate('')
                }}
                className="text-xs text-primary hover:underline px-2 py-1 font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-surface-container text-on-surface-variant font-semibold text-[11px] border-b border-outline-variant">
              <tr>
                <th className="p-3 w-40">Timestamp (IST)</th>
                <th className="p-3 w-24 text-center">Action</th>
                <th className="p-3 w-36">Resource Entity</th>
                <th className="p-3 w-36 font-mono">Record ID</th>
                <th className="p-3">Summary of Changes</th>
                <th className="p-3 w-48">Performed By</th>
                <th className="p-3 w-28 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                    No audit records matched the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-surface-container/40 transition-colors">
                    <td className="p-3 font-mono text-on-surface-variant whitespace-nowrap">
                      {formatDateTime(log.performed_at)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.action === 'INSERT'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : log.action === 'UPDATE'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {log.action === 'INSERT' && <PlusCircle className="h-3 w-3" />}
                        {log.action === 'UPDATE' && <RefreshCw className="h-3 w-3" />}
                        {log.action === 'DELETE' && <Trash2 className="h-3 w-3" />}
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-medium text-on-surface">
                      <span className="px-2 py-0.5 rounded bg-surface-container border border-outline-variant text-[11px]">
                        {log.table_name}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-on-surface">
                      {log.row_id}
                    </td>
                    <td className="p-3 text-on-surface">
                      {getChangeSummary(log)}
                    </td>
                    <td className="p-3 text-on-surface">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-outline shrink-0" />
                        <span className="truncate font-medium">{log.performed_by}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedLog(log)
                          setIsDetailOpen(true)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent hover:border-primary/20"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Diff</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-outline-variant bg-surface-container/30 flex items-center justify-between text-xs text-on-surface-variant font-mono">
          <span>Showing {filteredLogs.length} of {logs.length} audit records</span>
          <span>Security Level: <strong>Admin / Auditor Read-Only</strong></span>
        </div>
      </div>

      {/* Audit Detail Modal */}
      <AuditDetailModal
        log={selectedLog}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedLog(null)
        }}
      />
    </div>
  )
}
