import React, { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  type AppNotification,
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  SEED_NOTIFICATIONS
} from '@/types/notification.types'

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  preferences: NotificationPreferences
  updatePreferences: (newPrefs: Partial<NotificationPreferences>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAll: () => void
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void
  sendEmailDigest: () => Promise<boolean>
  sendApprovalEmailAlert: (docType: string, docNumber: string) => Promise<boolean>
  shareOnWhatsApp: (phone: string, text: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const STORAGE_KEY = 'dd_notifications_list'
const PREFS_KEY = 'dd_notification_preferences'

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return SEED_NOTIFICATIONS
  })

  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY)
      if (stored) return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) }
    } catch {}
    return DEFAULT_NOTIFICATION_PREFERENCES
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
    } catch {}
  }, [notifications])

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences))
    } catch {}
  }, [preferences])

  const unreadCount = notifications.filter(n => !n.read).length

  const updatePreferences = (newPrefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPrefs }))
    toast.success('Notification preferences updated')
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    toast.success('All notifications marked as read')
  }

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
    toast.success('Cleared all notifications')
  }

  const addNotification = (notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      read: false,
      createdAt: new Date().toISOString()
    }
    setNotifications(prev => [newNotif, ...prev])
    if (preferences.soundEnabled) {
      toast(newNotif.title, { icon: '🔔' })
    }
  }

  const sendEmailDigest = async (): Promise<boolean> => {
    // Simulated automated daily email digest to manager
    return new Promise(resolve => {
      setTimeout(() => {
        toast.success(`Low stock morning digest dispatched to ${preferences.managerEmail}!`)
        resolve(true)
      }, 700)
    })
  }

  const sendApprovalEmailAlert = async (docType: string, docNumber: string): Promise<boolean> => {
    return new Promise(resolve => {
      setTimeout(() => {
        toast.success(`Approval email alert sent to ${preferences.managerEmail} for ${docType} #${docNumber}!`)
        resolve(true)
      }, 600)
    })
  }

  const shareOnWhatsApp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        preferences,
        updatePreferences,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        addNotification,
        sendEmailDigest,
        sendApprovalEmailAlert,
        shareOnWhatsApp
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
