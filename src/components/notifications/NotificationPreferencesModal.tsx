import { useState } from 'react'
import {
  X, Mail, Bell, MessageSquare, ShieldAlert,
  Send, Check, Clock, Volume2, Save
} from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import toast from 'react-hot-toast'

interface NotificationPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationPreferencesModal({ isOpen, onClose }: NotificationPreferencesModalProps) {
  const { preferences, updatePreferences, sendEmailDigest } = useNotifications()
  const [formData, setFormData] = useState({ ...preferences })
  const [isSendingTest, setIsSendingTest] = useState(false)

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updatePreferences(formData)
    onClose()
  }

  const handleSendTestDigest = async () => {
    setIsSendingTest(true)
    await sendEmailDigest()
    setIsSendingTest(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl max-w-lg w-full my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-on-surface">Notification & Alert Settings</h2>
              <p className="text-xs text-on-surface-variant">Automated email alerts, morning digests & WhatsApp dispatches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 text-xs">
          {/* Email Alerts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-bold text-on-surface text-sm">Manager Email Alerts</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.emailAlertsEnabled}
                  onChange={e => setFormData(p => ({ ...p, emailAlertsEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div>
              <label className="block text-on-surface-variant font-medium mb-1">
                Recipient Manager / Director Email
              </label>
              <input
                type="email"
                value={formData.managerEmail}
                onChange={e => setFormData(p => ({ ...p, managerEmail: e.target.value }))}
                placeholder="manager@ddenterprise.com"
                className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-on-surface-variant mt-0.5 block">
                Receives instant notifications when purchase orders or production orders require approval
              </span>
            </div>
          </div>

          {/* Daily Morning Digest Section */}
          <div className="pt-3 border-t border-outline-variant space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="font-bold text-on-surface text-sm">Daily Low Stock Morning Digest</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.morningDigestEnabled}
                  onChange={e => setFormData(p => ({ ...p, morningDigestEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-on-surface-variant font-medium mb-1">
                  Scheduled Digest Delivery Time
                </label>
                <input
                  type="time"
                  value={formData.morningDigestTime}
                  onChange={e => setFormData(p => ({ ...p, morningDigestTime: e.target.value }))}
                  className="px-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleSendTestDigest}
                disabled={isSendingTest}
                className="self-end px-3 py-1.5 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Send className="h-3.5 w-3.5 text-primary" />
                <span>{isSendingTest ? 'Sending...' : 'Test Digest'}</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Sharing Section */}
          <div className="pt-3 border-t border-outline-variant space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-on-surface text-sm">Direct WhatsApp Invoice Sharing</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.whatsappSharingEnabled}
                  onChange={e => setFormData(p => ({ ...p, whatsappSharingEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-on-surface-variant font-medium mb-1">
                Factory Official WhatsApp Support Line
              </label>
              <input
                type="text"
                value={formData.defaultWhatsappNumber}
                onChange={e => setFormData(p => ({ ...p, defaultWhatsappNumber: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none font-mono"
              />
              <span className="text-[10px] text-on-surface-variant mt-0.5 block">
                Pre-configures 1-click WhatsApp PDF invoice dispatches to buyers
              </span>
            </div>
          </div>

          {/* Sound & In-App Alerts */}
          <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-outline" />
              <div>
                <span className="font-bold text-on-surface block">Audible Sound & Toast Banners</span>
                <span className="text-[10px] text-on-surface-variant">Play chime on high-priority manufacturing alerts</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.soundEnabled}
                onChange={e => setFormData(p => ({ ...p, soundEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>Save Preferences</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
