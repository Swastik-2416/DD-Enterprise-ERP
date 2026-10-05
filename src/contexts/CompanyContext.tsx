import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export interface CompanySettings {
  id: string
  name: string
  trade_name?: string
  tagline?: string
  gstin: string
  pan?: string
  udyam_reg?: string
  bis_license?: string
  address: string
  city: string
  state: string
  state_code: string
  pincode: string
  contact_person?: string
  phone: string
  alt_phone?: string
  email: string
  website?: string
  logo_url: string | null

  // Bank details
  bank_name?: string
  bank_account_holder?: string
  bank_account_no?: string
  bank_ifsc?: string
  bank_branch?: string
  upi_id?: string

  // Invoice & Financial Year defaults
  active_fy: string
  invoice_prefix?: string
  purchase_prefix?: string
  terms_conditions?: string
  jurisdiction?: string
  created_at?: string
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'D. D. ENTERPRISE',
  trade_name: 'DD Enterprise Paver Blocks',
  tagline: 'STRONGER BASE, BETTER SPACE',
  gstin: '19AFDPD4677G1ZD',
  pan: 'AFDPD4677G',
  udyam_reg: 'UDYAM-WB-14-0057640',
  bis_license: 'CM/L-5100295395',
  address: 'Khelia, Arkhali, Amdanga, Beside NH-34 (12)',
  city: 'North 24 Parganas',
  state: 'West Bengal',
  state_code: '19',
  pincode: '743221',
  contact_person: 'Tapan Dey',
  phone: '9433393977',
  alt_phone: '9830000000',
  email: 'info@ddenterprisepaverblock.co.in',
  website: 'https://www.ddenterprisepaverblock.co.in',
  logo_url: '/logo.png',

  // Banking
  bank_name: 'State Bank of India',
  bank_account_holder: 'D. D. ENTERPRISE',
  bank_account_no: '39485729103',
  bank_ifsc: 'SBIN0001234',
  bank_branch: 'Amdanga Branch',
  upi_id: '9433393977@sbi',

  // FY & Defaults
  active_fy: '2024-2025',
  invoice_prefix: 'DDE/',
  purchase_prefix: 'PB/',
  terms_conditions: `1. Subject to our home Jurisdiction.
2. Our Responsibility Ceases as soon as goods leave our Factory.
3. Goods once sold will not be taken back.
4. Delivery Ex-Premises.`,
  jurisdiction: 'Subject to Barasat / Kolkata Jurisdiction',
}

const STORAGE_KEY = 'dd_company_settings'

interface CompanyContextValue {
  company: CompanySettings
  loading: boolean
  updateCompany: (updates: Partial<CompanySettings>) => Promise<boolean>
  uploadLogo: (file: File) => Promise<string | null>
  removeLogo: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [company, setCompany] = useState<CompanySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(stored) }
      }
    } catch {}
    return DEFAULT_COMPANY_SETTINGS
  })
  const [loading, setLoading] = useState(false)

  // Load from Supabase on mount / when auth user changes
  useEffect(() => {
    let mounted = true

    async function fetchCompany() {
      try {
        setLoading(true)
        const targetCompanyId = user?.company_id

        let query = supabase.from('companies').select('*')
        if (targetCompanyId && targetCompanyId !== 'co-1') {
          query = query.eq('id', targetCompanyId)
        }
        const { data, error } = await query.limit(1).maybeSingle()
        const comp = data as unknown as Partial<CompanySettings> | null

        if (!error && comp && mounted) {
          setCompany(prev => {
            const merged: CompanySettings = {
              ...prev,
              id: comp.id || prev.id,
              name: comp.name || prev.name,
              gstin: comp.gstin || prev.gstin,
              address: comp.address || prev.address,
              city: comp.city || prev.city,
              state: comp.state || prev.state,
              state_code: comp.state_code || prev.state_code,
              pincode: comp.pincode || prev.pincode,
              phone: comp.phone || prev.phone,
              email: comp.email || prev.email,
              logo_url: comp.logo_url ?? prev.logo_url,
              created_at: comp.created_at || prev.created_at,
            }
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
            } catch {}
            return merged
          })
        }
      } catch (err) {
        console.warn('Could not load company from Supabase, using cached settings', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchCompany()

    return () => {
      mounted = false
    }
  }, [user?.company_id])

  const updateCompany = useCallback(
    async (updates: Partial<CompanySettings>): Promise<boolean> => {
      try {
        const nextSettings: CompanySettings = { ...company, ...updates }
        setCompany(nextSettings)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings))
        } catch {}

        // Attempt Supabase update for standard columns
        if (user?.company_id && user.company_id !== 'co-1') {
          const dbPayload = {
            name: nextSettings.name,
            gstin: nextSettings.gstin,
            address: nextSettings.address,
            city: nextSettings.city,
            state: nextSettings.state,
            state_code: nextSettings.state_code,
            pincode: nextSettings.pincode,
            phone: nextSettings.phone,
            email: nextSettings.email,
            logo_url: nextSettings.logo_url,
          }
          await (supabase.from('companies') as any)
            .update(dbPayload)
            .eq('id', user.company_id)
        }

        toast.success('Company settings saved successfully')
        return true
      } catch (err: unknown) {
        console.error('Failed to update company:', err)
        toast.error('Failed to save settings to cloud, saved locally.')
        return false
      }
    },
    [company, user?.company_id]
  )

  const uploadLogo = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        // First try Supabase Storage
        const fileExt = file.name.split('.').pop() || 'png'
        const fileName = `company-logo-${Date.now()}.${fileExt}`
        const filePath = `logos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('company-assets')
          .upload(filePath, file, { upsert: true })

        if (!uploadError) {
          const { data: publicData } = supabase.storage
            .from('company-assets')
            .getPublicUrl(filePath)

          if (publicData?.publicUrl) {
            await updateCompany({ logo_url: publicData.publicUrl })
            return publicData.publicUrl
          }
        }
      } catch {
        // Fallback below
      }

      // Fallback: Read as Base64 Data URL for zero-dependency reliability
      return new Promise<string | null>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64Url = reader.result as string
          await updateCompany({ logo_url: base64Url })
          resolve(base64Url)
        }
        reader.onerror = () => {
          toast.error('Failed to read image file')
          resolve(null)
        }
        reader.readAsDataURL(file)
      })
    },
    [updateCompany]
  )

  const removeLogo = useCallback(async () => {
    await updateCompany({ logo_url: null })
  }, [updateCompany])

  return (
    <CompanyContext.Provider
      value={{
        company,
        loading,
        updateCompany,
        uploadLogo,
        removeLogo,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext)
  if (!ctx) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return ctx
}
