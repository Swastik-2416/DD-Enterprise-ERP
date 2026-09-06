import { cn } from '@/lib/cn'
import type { DocumentStatus } from '@/types/database.types'

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', className: 'bg-yellow-100 text-yellow-700' },
  approved:  { label: 'Approved',  className: 'bg-blue-100 text-blue-700' },
  posted:    { label: 'Posted',    className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}

export function StockBadge({ qty, min }: { qty: number; min: number }) {
  const pct = min > 0 ? qty / min : 1
  const cls = pct < 0.5
    ? 'bg-red-100 text-red-700'
    : pct < 1
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700'
  const label = pct < 0.5 ? 'Critical' : pct < 1 ? 'Low' : 'OK'
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', cls)}>
      {label}
    </span>
  )
}
