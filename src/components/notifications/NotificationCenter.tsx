import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, Check, Trash2, Settings, ExternalLink,
  AlertTriangle, CheckCircle2, Clock, Factory,
  Package, DollarSign, X, ShieldAlert, Sparkles
} from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { NotificationPreferencesModal } from '@/components/notifications/NotificationPreferencesModal'
import type { AppNotification } from '@/types/notification.types'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll
  } = useNotifications()

  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'approvals'>('all')
  const [isPrefsOpen, setIsPrefsOpen] = useState(false)

  if (!isOpen) return null

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'critical') return n.severity === 'critical'
    if (filter === 'approvals') return n.category === 'approval_required'
    return true
  })

  const getNotificationIcon = (n: AppNotification) => {
    if (n.category === 'stock_alert') return <Package className="h-4 w-4" />
    if (n.category === 'approval_required') return <Factory className="h-4 w-4" />
    if (n.category === 'payment_due') return <DollarSign className="h-4 w-4" />
    if (n.category === 'maintenance') return <AlertTriangle className="h-4 w-4" />
    return <CheckCircle2 className="h-4 w-4" />
  }

  const getSeverityBadgeClass = (severity: AppNotification['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200'
      case 'warning':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200'
      case 'success':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200'
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200'
    }
  }

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs" onClick={onClose} />

      {/* Popover / Panel */}
      <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-surface rounded-2xl shadow-2xl border border-outline-variant z-50 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Panel Header */}
        <div className="px-4 py-3.5 border-b border-outline-variant bg-surface-container/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Bell className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-on-surface">Factory Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[10px] text-on-surface-variant">Live operations, approvals & stock threshold alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPrefsOpen(true)}
              className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
              title="Alert Preferences"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b border-outline-variant bg-surface-container/20 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          {[
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'critical', label: 'Critical' },
            { id: 'approvals', label: 'Approvals' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setFilter(p.id as any)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                filter === p.id
                  ? 'bg-primary text-white font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant text-xs">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-on-surface text-xs">All Clear!</p>
              <p className="text-[11px] text-outline mt-0.5">No notifications matching the selected filter.</p>
            </div>
          ) : (
            filteredNotifications.map(n => (
              <div
                key={n.id}
                className={`p-3.5 transition-colors relative flex items-start gap-3 ${
                  n.read
                    ? 'hover:bg-surface-container/30 opacity-80'
                    : 'bg-primary/5 hover:bg-primary/10'
                }`}
              >
                {/* Icon */}
                <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${getSeverityBadgeClass(n.severity)}`}>
                  {getNotificationIcon(n)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <h4 className={`text-xs ${n.read ? 'font-medium text-on-surface' : 'font-bold text-on-surface'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-outline whitespace-nowrap shrink-0">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    {n.message}
                  </p>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-3 mt-2 text-[11px]">
                    {n.link && (
                      <Link
                        to={n.link}
                        onClick={() => {
                          markAsRead(n.id)
                          onClose()
                        }}
                        className="font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <span>Open & Action</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-on-surface-variant hover:text-on-surface flex items-center gap-1"
                      >
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Mark read</span>
                      </button>
                    )}
                    <button
                      onClick={() => clearNotification(n.id)}
                      className="text-outline hover:text-rose-600 ml-auto"
                      title="Dismiss"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-outline-variant bg-surface-container/30 flex items-center justify-between text-xs">
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="text-primary hover:underline font-medium text-[11px] disabled:opacity-40 disabled:no-underline"
          >
            Mark all read
          </button>
          <button
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="text-outline hover:text-rose-600 text-[11px] disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPrefsOpen}
        onClose={() => setIsPrefsOpen(false)}
      />
    </>
  )
}
