export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success'
export type NotificationCategory = 'stock_alert' | 'approval_required' | 'payment_due' | 'maintenance' | 'system'

export interface AppNotification {
  id: string
  title: string
  message: string
  category: NotificationCategory
  severity: NotificationSeverity
  link?: string
  read: boolean
  createdAt: string
  metadata?: Record<string, any>
}

export interface NotificationPreferences {
  emailAlertsEnabled: boolean
  managerEmail: string
  morningDigestEnabled: boolean
  morningDigestTime: string
  whatsappSharingEnabled: boolean
  defaultWhatsappNumber: string
  criticalThresholdPct: number
  soundEnabled: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailAlertsEnabled: true,
  managerEmail: 'swastik.mandal@ddenterprise.com',
  morningDigestEnabled: true,
  morningDigestTime: '08:00',
  whatsappSharingEnabled: true,
  defaultWhatsappNumber: '+919876543210',
  criticalThresholdPct: 20,
  soundEnabled: true
}

export const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Low Stock Alert: OPC 53 Grade Cement',
    message: 'Current stock is 420 bags, below minimum safety re-order threshold of 500 bags. Recommended replenishment: 300 bags.',
    category: 'stock_alert',
    severity: 'critical',
    link: '/reports/stock',
    read: false,
    createdAt: new Date(Date.now() - 35 * 60000).toISOString()
  },
  {
    id: 'notif-2',
    title: 'Production Order Awaiting Approval',
    message: 'Order PRD-2425-0019 (3,000 pcs Zig-Zag 80mm M-40) submitted by Floor Supervisor and awaits manager approval.',
    category: 'approval_required',
    severity: 'warning',
    link: '/manufacturing/production-orders',
    read: false,
    createdAt: new Date(Date.now() - 75 * 60000).toISOString()
  },
  {
    id: 'notif-3',
    title: 'Overdue Receivables: Bengal Logistics',
    message: 'Payment of ₹85,000 is overdue by 45 days against invoice INV-2425-0038. Follow-up advised before next dispatch.',
    category: 'payment_due',
    severity: 'warning',
    link: '/finance/aging',
    read: false,
    createdAt: new Date(Date.now() - 180 * 60000).toISOString()
  },
  {
    id: 'notif-4',
    title: 'Mould Wear Inspection Due: Press #1',
    message: 'Zig-zag 60mm mould set completed 25,000 cycles on Automatic Vibro Press #1. Hardfacing and dimensional check scheduled.',
    category: 'maintenance',
    severity: 'info',
    link: '/manufacturing/production-orders',
    read: true,
    createdAt: new Date(Date.now() - 720 * 60000).toISOString()
  },
  {
    id: 'notif-5',
    title: 'Daily Labour Muster Completed',
    message: 'Morning shift attendance verified for 8 factory workers (total wage commitment: ₹5,975 with 4.5 OT hrs).',
    category: 'system',
    severity: 'success',
    link: '/hr/attendance',
    read: true,
    createdAt: new Date(Date.now() - 1440 * 60000).toISOString()
  }
]
