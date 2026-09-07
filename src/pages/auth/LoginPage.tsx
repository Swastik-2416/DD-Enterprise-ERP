import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) { setError(error); return }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-surface rounded-2xl p-8 shadow-ambient border border-outline-variant/30">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-primary items-center justify-center mb-4 shadow-ambient">
              <Factory className="h-8 w-8 text-on-primary" />
            </div>
            <h1 className="text-2xl font-bold text-on-surface">DD Enterprise ERP</h1>
            <p className="text-on-surface-variant text-sm mt-1">Paver Block Manufacturing System</p>
          </div>

          {/* Demo credentials banner */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-3 mb-6">
            <p className="text-xs font-semibold text-on-surface mb-1">Demo Credentials</p>
            <p className="text-xs text-on-surface-variant">Manager: <span className="font-mono text-primary font-medium">manager@ddblocks.com</span> / <span className="font-mono font-medium">manager123</span></p>
            <p className="text-xs text-on-surface-variant">Accountant: <span className="font-mono text-primary font-medium">accountant@ddblocks.com</span> / <span className="font-mono font-medium">accountant123</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1.5 label-font">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@ddblocks.com"
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1.5 label-font">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 bg-surface border border-outline-variant rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-error-container border border-error/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 text-error shrink-0" />
                <p className="text-sm text-on-error-container">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-semibold rounded-lg transition-all shadow-ambient mt-2 border-t border-white/20"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-outline mt-6">
          DD Enterprise ERP v1.0 — Prototype
        </p>
      </div>
    </div>
  )
}
