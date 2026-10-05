import { useState } from 'react'
import {
  X, ShieldCheck, ArrowRight, Copy, Check, FileJson, Clock,
  User, Database, PlusCircle, RefreshCw, Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDateTime } from '@/lib/formatters'
import type { AuditLog } from '@/types/database.types'

interface AuditDetailModalProps {
  log: AuditLog | null
  onClose: () => void
}

export function AuditDetailModal({ log, onClose }: AuditDetailModalProps) {
  const [showRawJson, setShowRawJson] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!log) return null

  const oldObj = (log.old_data as Record<string, any>) || {}
  const newObj = (log.new_data as Record<string, any>) || {}

  // Collect all unique keys from both old and new
  const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))

  // Find changed fields
  const diffEntries = allKeys.map(key => {
    const oldVal = oldObj[key]
    const newVal = newObj[key]
    const isDifferent = JSON.stringify(oldVal) !== JSON.stringify(newVal)
    const isAdded = oldVal === undefined && newVal !== undefined
    const isRemoved = oldVal !== undefined && newVal === undefined
    return {
      key,
      oldVal,
      newVal,
      isDifferent,
      isAdded,
      isRemoved
    }
  })

  const changedEntries = diffEntries.filter(e => e.isDifferent)

  const handleCopyJson = () => {
    const payload = JSON.stringify(
      {
        id: log.id,
        table: log.table_name,
        row_id: log.row_id,
        action: log.action,
        performed_by: log.performed_by,
        performed_at: log.performed_at,
        old_data: log.old_data,
        new_data: log.new_data
      },
      null,
      2
    )
    navigator.clipboard.writeText(payload)
    setCopied(true)
    toast.success('Audit log JSON copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const formatValue = (val: any) => {
    if (val === null) return <span className="text-slate-400 italic">null</span>
    if (val === undefined) return <span className="text-slate-400 italic">—</span>
    if (typeof val === 'boolean') return <span>{val ? 'true' : 'false'}</span>
    if (typeof val === 'object') return <span>{JSON.stringify(val)}</span>
    return <span>{String(val)}</span>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl max-w-3xl w-full my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container/50">
          <div className="flex items-center gap-3">
            <span className={`p-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              log.action === 'INSERT'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : log.action === 'UPDATE'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}>
              {log.action === 'INSERT' && <PlusCircle className="h-3.5 w-3.5" />}
              {log.action === 'UPDATE' && <RefreshCw className="h-3.5 w-3.5" />}
              {log.action === 'DELETE' && <Trash2 className="h-3.5 w-3.5" />}
              {log.action}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-on-surface">Audit Record Inspector</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant">
                  {log.table_name}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                Target Record ID: <span className="text-on-surface font-semibold">{log.row_id}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface transition-colors"
              title="Copy JSON to clipboard"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-3 bg-surface-container/20 border-b border-outline-variant text-xs">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-outline shrink-0" />
            <div>
              <span className="text-on-surface-variant block text-[10px]">Actor / Performed By</span>
              <span className="font-semibold text-on-surface">{log.performed_by || 'System'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-outline shrink-0" />
            <div>
              <span className="text-on-surface-variant block text-[10px]">Timestamp (IST)</span>
              <span className="font-mono text-on-surface">{formatDateTime(log.performed_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-outline shrink-0" />
            <div>
              <span className="text-on-surface-variant block text-[10px]">Table Entity</span>
              <span className="font-mono text-on-surface font-medium">{log.table_name}</span>
            </div>
          </div>
        </div>

        {/* Body: Changes View */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Field Differences ({changedEntries.length} modifications)
              </span>
            </div>
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <FileJson className="h-3.5 w-3.5" />
              <span>{showRawJson ? 'Show Visual Diff Table' : 'View Raw JSON'}</span>
            </button>
          </div>

          {showRawJson ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1.5">
                <span className="font-bold text-on-surface block text-[11px]">Previous State (old_data)</span>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 overflow-x-auto text-[11px] max-h-80 border border-slate-800">
                  {JSON.stringify(log.old_data, null, 2) || '// null (new record)'}
                </pre>
              </div>
              <div className="space-y-1.5">
                <span className="font-bold text-on-surface block text-[11px]">New State (new_data)</span>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 overflow-x-auto text-[11px] max-h-80 border border-slate-800">
                  {JSON.stringify(log.new_data, null, 2) || '// null (deleted record)'}
                </pre>
              </div>
            </div>
          ) : (
            <div className="border border-outline-variant rounded-xl overflow-hidden">
              {changedEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-on-surface-variant">
                  No individual field values changed between old and new state.
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-surface-container text-on-surface-variant font-semibold text-[11px] border-b border-outline-variant">
                    <tr>
                      <th className="p-3 w-1/4">Field / Property</th>
                      <th className="p-3 w-3/8 text-rose-700 dark:text-rose-400">Previous Value</th>
                      <th className="p-3 w-3/8 text-emerald-700 dark:text-emerald-400">New Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant font-mono">
                    {changedEntries.map(e => (
                      <tr key={e.key} className="hover:bg-surface-container/40">
                        <td className="p-3 font-semibold text-on-surface font-sans">
                          {e.key}
                          {e.isAdded && (
                            <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase font-bold">
                              Added
                            </span>
                          )}
                          {e.isRemoved && (
                            <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 uppercase font-bold">
                              Removed
                            </span>
                          )}
                        </td>
                        <td className="p-3 bg-rose-50/40 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 break-all">
                          {e.oldVal !== undefined ? (
                            <span className="line-through opacity-80">{formatValue(e.oldVal)}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold break-all">
                          {formatValue(e.newVal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-outline-variant bg-surface-container/30 text-xs">
          <span className="text-on-surface-variant">
            Audit ID: <strong className="font-mono text-on-surface">{log.id}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg font-medium transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  )
}
