import { useState, useRef, type ChangeEvent } from 'react'
import {
  Building2,
  FileText,
  MapPin,
  CreditCard,
  Calendar,
  Eye,
  Save,
  Upload,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  ShieldCheck,
  Briefcase
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useCompany, DEFAULT_COMPANY_SETTINGS, type CompanySettings } from '@/contexts/CompanyContext'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import toast from 'react-hot-toast'

type SettingsTab = 'profile' | 'tax' | 'contact' | 'bank' | 'invoicing' | 'preview'

export function SettingsPage() {
  const { company, updateCompany, uploadLogo, removeLogo } = useCompany()
  const { isManager } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [formData, setFormData] = useState<CompanySettings>({ ...company })
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync formData whenever company updates externally
  const handleInputChange = (field: keyof CompanySettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handle GSTIN change with auto-derivation of state code & PAN
  const handleGstinChange = (gstinVal: string) => {
    const clean = gstinVal.toUpperCase().trim()
    const stateCode = clean.length >= 2 ? clean.slice(0, 2) : formData.state_code
    const pan = clean.length >= 12 ? clean.slice(2, 12) : formData.pan
    setFormData(prev => ({
      ...prev,
      gstin: clean,
      state_code: stateCode,
      pan: pan || prev.pan,
    }))
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Company Name is required')
      return
    }
    if (!formData.gstin.trim()) {
      toast.error('GSTIN is required')
      return
    }

    setIsSaving(true)
    const success = await updateCompany(formData)
    setIsSaving(false)
    if (success) {
      toast.success('Company and invoice settings updated!')
    }
  }

  const handleResetDefaults = () => {
    if (window.confirm('Reset company details back to official DD Enterprise defaults?')) {
      setFormData({ ...DEFAULT_COMPANY_SETTINGS })
      updateCompany(DEFAULT_COMPANY_SETTINGS)
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be under 2MB')
      return
    }

    setIsUploadingLogo(true)
    const uploadedUrl = await uploadLogo(file)
    setIsUploadingLogo(false)
    if (uploadedUrl) {
      setFormData(prev => ({ ...prev, logo_url: uploadedUrl }))
      toast.success('Company logo uploaded successfully')
    }
  }

  const handleRemoveLogo = async () => {
    if (window.confirm('Remove company logo?')) {
      await removeLogo()
      setFormData(prev => ({ ...prev, logo_url: null }))
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Company Profile', icon: Building2 },
    { id: 'tax', label: 'GST & Legal', icon: FileText },
    { id: 'contact', label: 'Factory & Contact', icon: MapPin },
    { id: 'bank', label: 'Bank & Payments', icon: CreditCard },
    { id: 'invoicing', label: 'FY & Invoicing', icon: Calendar },
    { id: 'preview', label: 'Invoice Preview', icon: Eye },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Business Settings"
        subtitle="Manage company profile, GST registrations, invoice letterheads, bank accounts and active financial year"
        icon={Building2}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors"
              title="Reset to DD Enterprise defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        }
      />

      {/* Role Notice */}
      {!isManager && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <Briefcase className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            You are logged in with an <strong>Accountant</strong> role. Settings are visible for audit and reporting reference. Contact a Manager to make changes.
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-outline-variant pb-px">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors rounded-t-lg',
                isActive
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: Company Profile */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo Card */}
            <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-xs flex flex-col items-center justify-between text-center space-y-4">
              <div className="w-full">
                <h3 className="text-sm font-semibold text-on-surface">Company Logo</h3>
                <p className="text-xs text-outline mt-0.5">
                  Displayed on invoices, quotations & delivery challans
                </p>
              </div>

              <div className="relative group w-44 h-44 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container/50 flex flex-col items-center justify-center p-4 overflow-hidden">
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt="Company Logo"
                    className="max-h-full max-w-full object-contain drop-shadow-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center text-outline">
                    <Building2 className="h-12 w-12 stroke-[1.25] text-outline mb-2" />
                    <span className="text-xs font-medium">No Logo Uploaded</span>
                    <span className="text-[10px] text-outline/80 mt-1">PNG, JPG, SVG max 2MB</span>
                  </div>
                )}

                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-surface/80 flex items-center justify-center text-xs font-medium text-primary">
                    Uploading...
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isManager || isUploadingLogo}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {formData.logo_url ? 'Change Logo' : 'Upload Logo'}
                </button>
                {formData.logo_url && isManager && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="p-2 text-error hover:bg-error-container/20 rounded-lg transition-colors"
                    title="Remove logo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Profile Fields */}
            <div className="lg:col-span-2 bg-surface rounded-xl p-6 border border-outline-variant shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-3">
                <Building2 className="h-4 w-4 text-primary" />
                Legal & Brand Identity
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Legal Company Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isManager}
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    placeholder="e.g. D. D. ENTERPRISE"
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-semibold"
                  />
                  <p className="text-[11px] text-outline mt-1">Official registered name on GST portal and bank records</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Trade / Brand Name
                  </label>
                  <input
                    type="text"
                    disabled={!isManager}
                    value={formData.trade_name || ''}
                    onChange={e => handleInputChange('trade_name', e.target.value)}
                    placeholder="e.g. DD Enterprise Paver Blocks"
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Brand Slogan / Tagline
                  </label>
                  <input
                    type="text"
                    disabled={!isManager}
                    value={formData.tagline || ''}
                    onChange={e => handleInputChange('tagline', e.target.value)}
                    placeholder="e.g. STRONGER BASE, BETTER SPACE"
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Official Website URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                    <input
                      type="url"
                      disabled={!isManager}
                      value={formData.website || ''}
                      onChange={e => handleInputChange('website', e.target.value)}
                      placeholder="https://www.ddenterprisepaverblock.co.in"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GST & Legal */}
        {activeTab === 'tax' && (
          <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                GST, Tax & Government Certifications
              </h3>
              <span className="text-xs text-outline">Used for GST compliance & e-invoicing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  GSTIN (15 Digits) <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  required
                  disabled={!isManager}
                  value={formData.gstin}
                  onChange={e => handleGstinChange(e.target.value)}
                  placeholder="19AFDPD4677G1ZD"
                  className="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-outline mt-1">State: {formData.state_code || '19'} (West Bengal)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  PAN (Permanent Account Number)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  disabled={!isManager}
                  value={formData.pan || ''}
                  onChange={e => handleInputChange('pan', e.target.value.toUpperCase())}
                  placeholder="AFDPD4677G"
                  className="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-outline mt-1">Auto-extracted from GSTIN digits 3 to 12</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  State & GST State Code
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    disabled={!isManager}
                    value={formData.state_code}
                    onChange={e => handleInputChange('state_code', e.target.value)}
                    placeholder="19"
                    className="w-full px-3 py-2 text-sm font-mono text-center border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    disabled={!isManager}
                    value={formData.state}
                    onChange={e => handleInputChange('state', e.target.value)}
                    placeholder="West Bengal"
                    className="col-span-2 w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  UDYAM MSME Registration No.
                </label>
                <input
                  type="text"
                  disabled={!isManager}
                  value={formData.udyam_reg || ''}
                  onChange={e => handleInputChange('udyam_reg', e.target.value)}
                  placeholder="UDYAM-WB-14-0057640"
                  className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-outline mt-1">Printed on footer of sales invoices</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  BIS Certification License No.
                </label>
                <input
                  type="text"
                  disabled={!isManager}
                  value={formData.bis_license || ''}
                  onChange={e => handleInputChange('bis_license', e.target.value)}
                  placeholder="CM/L-5100295395"
                  className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-outline mt-1">Bureau of Indian Standards concrete paver license</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Factory & Contact */}
        {activeTab === 'contact' && (
          <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-xs space-y-6">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-3">
              <MapPin className="h-4 w-4 text-primary" />
              Plant Location & Communication Contacts
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Factory & Dispatch Site Address <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isManager}
                  value={formData.address}
                  onChange={e => handleInputChange('address', e.target.value)}
                  placeholder="Khelia, Arkhali, Amdanga, Beside NH-34 (12)"
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  District / City <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isManager}
                  value={formData.city}
                  onChange={e => handleInputChange('city', e.target.value)}
                  placeholder="North 24 Parganas"
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  State <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isManager}
                  value={formData.state}
                  onChange={e => handleInputChange('state', e.target.value)}
                  placeholder="West Bengal"
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  PIN Code <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  disabled={!isManager}
                  value={formData.pincode}
                  onChange={e => handleInputChange('pincode', e.target.value)}
                  placeholder="743221"
                  className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Primary Contact Person
                </label>
                <input
                  type="text"
                  disabled={!isManager}
                  value={formData.contact_person || ''}
                  onChange={e => handleInputChange('contact_person', e.target.value)}
                  placeholder="Tapan Dey"
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Primary Mobile / Phone <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                  <input
                    type="tel"
                    required
                    disabled={!isManager}
                    value={formData.phone}
                    onChange={e => handleInputChange('phone', e.target.value)}
                    placeholder="9433393977"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Alternate Mobile (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                  <input
                    type="tel"
                    disabled={!isManager}
                    value={formData.alt_phone || ''}
                    onChange={e => handleInputChange('alt_phone', e.target.value)}
                    placeholder="9830000000"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Official Email Address <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
                  <input
                    type="email"
                    required
                    disabled={!isManager}
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    placeholder="info@ddenterprisepaverblock.co.in"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Bank & Payments */}
        {activeTab === 'bank' && (
          <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Bank Account & Settlement Details
              </h3>
              <span className="text-xs text-outline">Included on sales invoices for customer remittances</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  disabled={!isManager}
                  value={formData.bank_name || ''}
                  onChange={e => handleInputChange('bank_name', e.target.value)}
                  placeholder="State Bank of India"
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Beneficiary / Account Holder Name
                </label>
                <input
                  type="text"
                  disabled={!isManager}
                  value={formData.bank_account_holder || ''}
                  onChange={e => handleInputChange('bank_account_holder', e.target.value)}
                  placeholder="D. D. ENTERPRISE"
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  disabled={!isManager}
                  value={formData.bank_account_no || ''}
                  onChange={e => handleInputChange('bank_account_no', e.target.value)}
                  placeholder="39485729103"
                  className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  maxLength={11}
                  disabled={!isManager}
                  value={formData.bank_ifsc || ''}
                  onChange={e => handleInputChange('bank_ifsc', e.target.value.toUpperCase())}
                  placeholder="SBIN0001234"
                  className="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Bank Branch Name
                </label>
                <input
                  type="text"
                  disabled={!isManager}
                  value={formData.bank_branch || ''}
                  onChange={e => handleInputChange('bank_branch', e.target.value)}
                  placeholder="Amdanga Branch"
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  UPI ID (VPA) for Direct Receipts
                </label>
                <input
                  type="text"
                  disabled={!isManager}
                  value={formData.upi_id || ''}
                  onChange={e => handleInputChange('upi_id', e.target.value)}
                  placeholder="9433393977@sbi"
                  className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FY & Invoicing Defaults */}
        {activeTab === 'invoicing' && (
          <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Financial Year & Invoicing Preferences
              </h3>
              <span className="text-xs text-outline">Indian Financial Year (April 1 – March 31)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Active Financial Year <span className="text-error">*</span>
                </label>
                <select
                  disabled={!isManager}
                  value={formData.active_fy}
                  onChange={e => handleInputChange('active_fy', e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  <option value="2023-2024">FY 2023 - 2024</option>
                  <option value="2024-2025">FY 2024 - 2025</option>
                  <option value="2025-2026">FY 2025 - 2026</option>
                  <option value="2026-2027">FY 2026 - 2027</option>
                </select>
                <p className="text-[11px] text-outline mt-1">Default filter for Profit & Loss, GST & Registers</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Sales Invoice Series Prefix
                </label>
                <input
                  type="text"
                  disabled={!isManager}
                  value={formData.invoice_prefix || ''}
                  onChange={e => handleInputChange('invoice_prefix', e.target.value.toUpperCase())}
                  placeholder="DDE/"
                  className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-outline mt-1">Example: {formData.invoice_prefix || 'DDE/'}2425-001</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Purchase Invoice Prefix
                </label>
                <input
                  type="text"
                  disabled={!isManager}
                  value={formData.purchase_prefix || ''}
                  onChange={e => handleInputChange('purchase_prefix', e.target.value.toUpperCase())}
                  placeholder="PB/"
                  className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Legal Jurisdiction Note
                </label>
                <input
                  type="text"
                  disabled={!isManager}
                  value={formData.jurisdiction || ''}
                  onChange={e => handleInputChange('jurisdiction', e.target.value)}
                  placeholder="Subject to Barasat / Kolkata Jurisdiction"
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Standard Invoice Terms & Conditions (One per line)
                </label>
                <textarea
                  rows={4}
                  disabled={!isManager}
                  value={formData.terms_conditions || ''}
                  onChange={e => handleInputChange('terms_conditions', e.target.value)}
                  placeholder="1. Subject to our home Jurisdiction..."
                  className="w-full px-3 py-2 text-sm font-mono border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary leading-relaxed"
                />
                <p className="text-[11px] text-outline mt-1">
                  These terms will appear automatically at the bottom of all generated sales invoice prints.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Invoice Preview */}
        {activeTab === 'preview' && (
          <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  Live Letterhead & Invoice Header Simulation
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  Real-time preview of how your company branding looks on official GST tax invoices
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-700 text-xs font-semibold rounded-md border border-green-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Live Sync Active
              </span>
            </div>

            {/* Letterhead Preview Card */}
            <div className="bg-white text-black p-6 rounded-lg border-2 border-black max-w-3xl mx-auto shadow-md">
              <div className="flex items-start justify-between border-b border-black pb-4 mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded border border-slate-300 flex items-center justify-center p-1 bg-slate-50 shrink-0">
                    {formData.logo_url ? (
                      <img
                        src={formData.logo_url}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-wider uppercase leading-none">
                      {formData.name || 'D. D. ENTERPRISE'}
                    </h2>
                    {formData.tagline && (
                      <p className="text-[10px] font-bold text-blue-900 tracking-wider uppercase mt-1">
                        {formData.tagline}
                      </p>
                    )}
                    <p className="text-xs text-slate-700 mt-1">
                      {formData.address}, {formData.city}, {formData.state} - {formData.pincode}
                    </p>
                    <p className="text-xs font-bold text-black mt-1">
                      GSTIN : <span className="font-mono">{formData.gstin}</span> · State Code: {formData.state_code}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-600 mt-1">
                      {formData.udyam_reg && <span>UDYAM: {formData.udyam_reg}</span>}
                      {formData.bis_license && <span>BIS: {formData.bis_license}</span>}
                      <span>Phone: {formData.phone}</span>
                      <span>Email: {formData.email}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    TAX INVOICE
                  </div>
                  <div className="text-sm font-mono font-bold mt-1">
                    {formData.invoice_prefix || 'DDE/'}2425-0042
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    FY: {formData.active_fy}
                  </div>
                </div>
              </div>

              {/* Sample Terms & Bank Box */}
              <div className="grid grid-cols-2 gap-4 border-t border-black pt-3 text-[10px]">
                <div>
                  <strong className="block text-[11px] uppercase mb-1">Bank Payment Details:</strong>
                  <p>Bank: {formData.bank_name || 'State Bank of India'}</p>
                  <p>A/C Name: {formData.bank_account_holder || formData.name}</p>
                  <p>A/C No: <span className="font-mono font-bold">{formData.bank_account_no || '39485729103'}</span></p>
                  <p>IFSC: <span className="font-mono">{formData.bank_ifsc || 'SBIN0001234'}</span> ({formData.bank_branch})</p>
                  {formData.upi_id && <p>UPI: <span className="font-mono font-semibold">{formData.upi_id}</span></p>}
                </div>
                <div className="text-right flex flex-col justify-between">
                  <div>
                    <strong className="block text-[11px] uppercase mb-1">Jurisdiction & Note:</strong>
                    <p className="text-slate-700 italic">{formData.jurisdiction || 'Subject to home jurisdiction'}</p>
                  </div>
                  <div className="border-t border-black pt-1 mt-4">
                    <span className="text-[9px] uppercase font-bold tracking-wider">For {formData.name}</span>
                    <p className="text-[8px] text-slate-500">Authorised Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
          <p className="text-xs text-outline">
            Changes saved here are shared instantly across all invoice generators, registers, and reports.
          </p>
          <button
            type="submit"
            disabled={isSaving || !isManager}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
