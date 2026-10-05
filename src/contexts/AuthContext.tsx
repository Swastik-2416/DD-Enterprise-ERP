import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/lib/constants'

// ─── Mock auth for prototype (when Supabase isn't configured) ─────────────────
const USE_MOCK_AUTH = import.meta.env.VITE_SUPABASE_URL === 'https://your-project.supabase.co'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: Role
  company_id: string
  phone?: string
  designation?: string
  avatar_url?: string
}

interface AuthContextValue {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ error: string | null }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>
  isManager: boolean
  isAccountant: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Mock users for prototype demo
const MOCK_USERS: Record<string, { password: string; user: AuthUser }> = {
  'manager@ddblocks.com': {
    password: 'manager123',
    user: {
      id: 'user-1',
      email: 'manager@ddblocks.com',
      full_name: 'Sayan Dey',
      role: 'manager',
      company_id: 'co-1',
      phone: '+91 98301 24567',
      designation: 'General Manager & Plant Head',
    },
  },
  'accountant@ddblocks.com': {
    password: 'accountant123',
    user: {
      id: 'user-2',
      email: 'accountant@ddblocks.com',
      full_name: 'Priya Sharma',
      role: 'accountant',
      company_id: 'co-1',
      phone: '+91 98302 98765',
      designation: 'Senior Plant Accountant',
    },
  },
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (USE_MOCK_AUTH) {
      // Restore mock session from localStorage
      const stored = localStorage.getItem('dd_erp_mock_user')
      if (stored) {
        try { setUser(JSON.parse(stored)) } catch {}
      }
      setLoading(false)
      return
    }

    // Real Supabase auth
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        await loadProfile(session.user)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        await loadProfile(session.user)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(supaUser: User) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supaUser.id)
      .single()

    if (data) {
      const profile = data as unknown as { id: string; full_name: string; role: Role; company_id: string }
      setUser({
        id: profile.id,
        email: supaUser.email ?? '',
        full_name: profile.full_name,
        role: profile.role,
        company_id: profile.company_id,
      })
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    if (USE_MOCK_AUTH) {
      const mock = MOCK_USERS[email.toLowerCase()]
      if (!mock || mock.password !== password) {
        return { error: 'Invalid email or password' }
      }
      setUser(mock.user)
      localStorage.setItem('dd_erp_mock_user', JSON.stringify(mock.user))
      return { error: null }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    if (USE_MOCK_AUTH) {
      setUser(null)
      localStorage.removeItem('dd_erp_mock_user')
      return
    }
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  async function updateProfile(updates: Partial<AuthUser>): Promise<{ error: string | null }> {
    if (!user) return { error: 'No active user session' }

    const updatedUser: AuthUser = {
      ...user,
      ...updates,
    }

    if (USE_MOCK_AUTH) {
      setUser(updatedUser)
      localStorage.setItem('dd_erp_mock_user', JSON.stringify(updatedUser))
      // Update in mock table
      if (MOCK_USERS[user.email.toLowerCase()]) {
        MOCK_USERS[user.email.toLowerCase()].user = updatedUser
      }
      return { error: null }
    }

    try {
      const { error: profileErr } = await (supabase
        .from('profiles') as any)
        .update({
          full_name: updates.full_name ?? user.full_name,
        })
        .eq('id', user.id)

      if (profileErr) return { error: profileErr.message }

      if (updates.email && updates.email !== user.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: updates.email })
        if (emailErr) return { error: emailErr.message }
      }

      setUser(updatedUser)
      return { error: null }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to update profile' }
    }
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<{ error: string | null }> {
    if (!user) return { error: 'No active user session' }

    if (USE_MOCK_AUTH) {
      const savedPass = localStorage.getItem(`dd_erp_mock_pass_${user.email}`) ||
        MOCK_USERS[user.email.toLowerCase()]?.password ||
        'manager123'

      if (currentPassword !== savedPass) {
        return { error: 'Current password does not match' }
      }

      if (newPassword.length < 6) {
        return { error: 'New password must be at least 6 characters' }
      }

      localStorage.setItem(`dd_erp_mock_pass_${user.email}`, newPassword)
      if (MOCK_USERS[user.email.toLowerCase()]) {
        MOCK_USERS[user.email.toLowerCase()].password = newPassword
      }
      return { error: null }
    }

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInErr) {
        return { error: 'Current password is incorrect' }
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (updateErr) {
        return { error: updateErr.message }
      }

      return { error: null }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to update password' }
    }
  }

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    isManager: user?.role === 'manager',
    isAccountant: user?.role === 'accountant',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
