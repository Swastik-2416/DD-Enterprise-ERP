import { useState, useEffect } from 'react'
import { type LucideIcon, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
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
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-xs ring-1 ring-primary/20">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-on-surface font-heading">{title}</h1>
          {subtitle && <p className="text-xs text-outline mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95"
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

export interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: LucideIcon
  trend?: { value: string; positive: boolean }
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'cyan' | 'indigo'
  category?: string
  badge?: string
  numericValue?: number
  prefix?: string
  suffix?: string
  decimals?: number
  actionLink?: { label: string; href: string }
  children?: React.ReactNode
}

const COLOR_STYLES = {
  blue: {
    accent: 'from-blue-600 via-indigo-600 to-sky-400',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/25',
    pill: 'bg-blue-50 text-blue-700 border-blue-200/60',
    dot: 'bg-blue-500',
    hoverBorder: 'group-hover:border-blue-300/80',
    link: 'text-blue-600 hover:text-blue-700',
  },
  green: {
    accent: 'from-emerald-500 via-teal-500 to-emerald-400',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/25',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    dot: 'bg-emerald-500',
    hoverBorder: 'group-hover:border-emerald-300/80',
    link: 'text-emerald-600 hover:text-emerald-700',
  },
  red: {
    accent: 'from-rose-500 via-red-500 to-orange-500',
    iconBg: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/25',
    pill: 'bg-rose-50 text-rose-700 border-rose-200/60',
    dot: 'bg-rose-500',
    hoverBorder: 'group-hover:border-rose-300/80',
    link: 'text-rose-600 hover:text-rose-700',
  },
  amber: {
    accent: 'from-amber-500 via-orange-500 to-yellow-400',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/25',
    pill: 'bg-amber-50 text-amber-800 border-amber-200/60',
    dot: 'bg-amber-500',
    hoverBorder: 'group-hover:border-amber-300/80',
    link: 'text-amber-700 hover:text-amber-800',
  },
  purple: {
    accent: 'from-purple-500 via-violet-500 to-fuchsia-400',
    iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-purple-500/25',
    pill: 'bg-purple-50 text-purple-700 border-purple-200/60',
    dot: 'bg-purple-500',
    hoverBorder: 'group-hover:border-purple-300/80',
    link: 'text-purple-600 hover:text-purple-700',
  },
  cyan: {
    accent: 'from-cyan-500 via-blue-500 to-teal-400',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/25',
    pill: 'bg-cyan-50 text-cyan-800 border-cyan-200/60',
    dot: 'bg-cyan-500',
    hoverBorder: 'group-hover:border-cyan-300/80',
    link: 'text-cyan-700 hover:text-cyan-800',
  },
  indigo: {
    accent: 'from-indigo-600 via-blue-600 to-violet-500',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-indigo-500/25',
    pill: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    dot: 'bg-indigo-500',
    hoverBorder: 'group-hover:border-indigo-300/80',
    link: 'text-indigo-600 hover:text-indigo-700',
  },
}

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTimestamp: number | null = null
    const duration = 900
    const startVal = 0

    let animationFrameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const current = startVal + (value - startVal) * easeProgress
      setDisplayValue(current)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      }
    }

    animationFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameId)
  }, [value])

  const formatted =
    decimals > 0
      ? displayValue.toLocaleString('en-IN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : Math.round(displayValue).toLocaleString('en-IN')

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  category,
  badge,
  numericValue,
  prefix,
  suffix,
  decimals,
  actionLink,
  children,
}: KpiCardProps) {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.blue

  return (
    <div
      className={cn(
        'group relative overflow-hidden bg-white/95 rounded-2xl border border-slate-200/90',
        'shadow-[0_2px_12px_rgba(0,53,106,0.04)] hover:shadow-[0_14px_28px_-6px_rgba(0,53,106,0.12)]',
        'hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between select-none',
        styles.hoverBorder
      )}
    >
      {/* 3px Top Perimeter Gradient Hairline */}
      <div className={cn('h-1 w-full bg-gradient-to-r shrink-0', styles.accent)} />

      {/* Ghost Icon Watermark */}
      {Icon && (
        <div className="absolute -right-4 -bottom-4 opacity-[0.035] group-hover:opacity-[0.08] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 pointer-events-none">
          <Icon className="h-32 w-32" />
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between relative z-10">
        <div>
          {/* Header Row: Category Pill & 3D Raised Icon Gem */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-1.5 min-w-0">
              {category && (
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border',
                  styles.pill
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', styles.dot)} />
                  <span className="truncate">{category}</span>
                </span>
              )}
              {badge && (
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60 truncate">
                  {badge}
                </span>
              )}
            </div>

            {Icon && (
              <div className={cn(
                'h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/80 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3',
                styles.iconBg
              )}>
                <Icon className="h-5 w-5 drop-shadow-xs" />
              </div>
            )}
          </div>

          {/* Metric Value */}
          <div className="mt-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 tracking-tight leading-tight">
              {typeof numericValue === 'number' ? (
                <AnimatedNumber
                  value={numericValue}
                  prefix={prefix}
                  suffix={suffix}
                  decimals={decimals ?? (prefix === '₹' ? 2 : 0)}
                />
              ) : (
                value
              )}
            </div>

            <p className="text-xs font-semibold text-slate-500 tracking-wide mt-1">
              {title}
            </p>
          </div>
        </div>

        {/* Subtitle / Trend / Custom children micro-visuals */}
        <div className="mt-3 space-y-2">
          {children}

          {subtitle && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              {subtitle}
            </p>
          )}

          {trend && (
            <div className={cn(
              'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md mt-1',
              trend.positive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
            )}>
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer Bar */}
      {actionLink && (
        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 group-hover:bg-slate-50 transition-colors flex items-center justify-between text-xs relative z-10">
          <Link
            to={actionLink.href}
            className={cn('font-semibold flex items-center gap-1.5 transition-colors w-full justify-between', styles.link)}
          >
            <span>{actionLink.label}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      )}
    </div>
  )
}
