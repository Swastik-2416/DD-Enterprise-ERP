import { useState } from 'react'
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Clock,
  Sparkles,
  Smartphone,
  Bell,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'
import { cn } from '@/lib/cn'

export function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth()

  // Profile fields state
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '+91 98301 24567')
  const [designation, setDesignation] = useState(user?.designation || (user?.role === 'manager' ? 'General Manager & Plant Head' : 'Senior Plant Accountant'))
  const [savingProfile, setSavingProfile] = useState(false)

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Preferences state
  const [soundAlerts, setSoundAlerts] = useState(true)
  const [emailDigest, setEmailDigest] = useState(true)
  const [whatsAppPrompt, setWhatsAppPrompt] = useState(true)

  const initials = fullName
    ? fullName
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      toast.error('Full Name cannot be empty')
      return
    }

    setSavingProfile(true)
    try {
      const res = await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('User profile updated successfully!')
      }
    } catch {
      toast.error('An unexpected error occurred while saving profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      toast.error('Please enter your current password')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      const res = await changePassword(currentPassword, newPassword)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Password changed successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      toast.error('An unexpected error occurred while changing password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        title="My Profile & Security"
        subtitle="Manage personal identification, contact details, authentication credentials and notification preferences"
        icon={User}
      />

      {/* Profile Overview Banner */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar Ring */}
          <div className="relative group">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-primary to-primary-hover flex items-center justify-center text-white text-3xl font-bold shadow-md ring-4 ring-primary/20">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 ring-2 ring-white text-white p-1 rounded-full shadow-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* User Meta */}
          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h2 className="text-xl font-bold text-on-surface">{user?.full_name}</h2>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border',
                  user?.role === 'manager'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                )}
              >
                <Shield className="h-3 w-3" />
                {user?.role === 'manager' ? 'Plant Manager (Full Access)' : 'Accountant (Read-only Auditing)'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Session
              </span>
            </div>

            <p className="text-sm text-outline font-medium flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-outline" />
                {designation}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-outline" />
                DD Enterprise Paver Block Plant
              </span>
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-outline">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> {user?.email}
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {phone}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last login: Today at 08:30 AM
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Information Form (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Profile Details */}
          <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-5 border-b border-outline-variant">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">Personal Information</h3>
                <p className="text-xs text-outline">Update your personal contact details and plant designation</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                      placeholder="e.g. Sayan Dey"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">
                    Designation / Title
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                    <input
                      type="text"
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      placeholder="e.g. General Manager"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="user@ddblocks.com"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">
                    Mobile / WhatsApp Contact
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98300 00000"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Plant Assignment & System Role */}
              <div className="p-4 rounded-xl bg-surface-container/50 border border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Assigned Unit: DD Enterprise (Gazole Yard & Plant 1)
                  </p>
                  <p className="text-[11px] text-outline">
                    User role is governed by system administrator and determines ledger approval permissions.
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="text-xs px-2.5 py-1 bg-background border border-outline-variant rounded-lg font-semibold text-on-surface capitalize">
                    Role: {user?.role}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Password & Security Card */}
          <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-5 border-b border-outline-variant">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">Security & Change Password</h3>
                <p className="text-xs text-outline">Keep your account secure with a strong password (minimum 6 characters)</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-background border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-outline hover:text-on-surface transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-10 py-2 text-sm bg-background border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-outline hover:text-on-surface transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-type new password"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface transition-all"
                    />
                  </div>
                </div>
              </div>

              {newPassword && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-outline">Strength:</span>
                  <div className="flex-1 h-1.5 bg-outline-variant/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        newPassword.length < 6
                          ? 'w-1/4 bg-rose-500'
                          : newPassword.length < 9
                          ? 'w-2/3 bg-amber-500'
                          : 'w-full bg-emerald-500'
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'font-semibold',
                      newPassword.length < 6
                        ? 'text-rose-600'
                        : newPassword.length < 9
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    )}
                  >
                    {newPassword.length < 6 ? 'Too short' : newPassword.length < 9 ? 'Moderate' : 'Strong'}
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4" />
                  {savingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Role Permissions & Operational Preferences */}
        <div className="space-y-6">
          {/* Role & Permissions Card */}
          <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              Role & Access Privileges
            </h3>
            <p className="text-xs text-outline mb-4">
              Your profile role is set to <strong className="text-on-surface capitalize">{user?.role}</strong> with the following permissions:
            </p>

            <ul className="space-y-2.5 text-xs text-on-surface">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Sales & Purchase invoice entry</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Customer & Vendor ledger views</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>GST registers & report exports</span>
              </li>
              <li className="flex items-start gap-2">
                {user?.role === 'manager' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-outline shrink-0 mt-0.5" />
                )}
                <span className={user?.role === 'manager' ? '' : 'text-outline line-through'}>
                  Approve and Post invoices (Stock adjustment)
                </span>
              </li>
              <li className="flex items-start gap-2">
                {user?.role === 'manager' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-outline shrink-0 mt-0.5" />
                )}
                <span className={user?.role === 'manager' ? '' : 'text-outline line-through'}>
                  Production batch release & dispatch
                </span>
              </li>
              <li className="flex items-start gap-2">
                {user?.role === 'manager' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-outline shrink-0 mt-0.5" />
                )}
                <span className={user?.role === 'manager' ? '' : 'text-outline line-through'}>
                  Bank accounts & financial year settings
                </span>
              </li>
            </ul>
          </div>

          {/* Operational Preferences Card */}
          <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Operational Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-outline-variant">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-outline" />
                    Audio Sound Chimes
                  </p>
                  <p className="text-[11px] text-outline">Play subtle audio when new approvals arrive</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={e => setSoundAlerts(e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-outline-variant focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pb-3 border-b border-outline-variant">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-outline" />
                    Low Stock Email Digest
                  </p>
                  <p className="text-[11px] text-outline">Daily 8:00 AM summary of cement & aggregate stocks</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailDigest}
                  onChange={e => setEmailDigest(e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-outline-variant focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-outline" />
                    WhatsApp Direct Sharing
                  </p>
                  <p className="text-[11px] text-outline">Prompt WhatsApp invoice share upon posting invoices</p>
                </div>
                <input
                  type="checkbox"
                  checked={whatsAppPrompt}
                  onChange={e => setWhatsAppPrompt(e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-outline-variant focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
