import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  action?: {
    label: string
    icon?: LucideIcon
    onClick: () => void
  }
}

export function PageHeader({ title, subtitle, icon: Icon, actions, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-on-surface">{title}</h1>
          {subtitle && <p className="text-sm text-outline">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg shadow-xs transition-colors"
          >
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </button>
        )}
        {actions}
      </div>
    </div>
  )
}

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: LucideIcon
  trend?: { value: string; positive: boolean }
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple'
}

const COLOR_MAP = {
  blue:   { bg: 'bg-primary/5',   icon: 'bg-primary/10 text-primary',   text: 'text-primary' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',  text: 'text-green-700' },
  red:    { bg: 'bg-error-container',    icon: 'bg-red-100 text-error',      text: 'text-on-error-container' },
  amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600',  text: 'text-amber-700' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700' },
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }: KpiCardProps) {
  const colors = COLOR_MAP[color]
  return (
    <div className="bg-surface rounded-xl border border-outline-variant p-5 hover:shadow-ambient transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-outline mb-1">{title}</p>
          <p className="text-2xl font-bold text-on-surface truncate">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs font-medium mt-2', trend.positive ? 'text-green-600' : 'text-error')}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', colors.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
}
