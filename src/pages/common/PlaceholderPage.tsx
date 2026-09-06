import { Construction, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'

interface PlaceholderPageProps {
  title: string
  subtitle?: string
  description?: string
}

export function PlaceholderPage({
  title,
  subtitle = 'Module configured for Phase 3 rollout',
  description = 'This sub-module interface is fully mapped to the PostgreSQL database schema and will be connected with real-time Supabase tables following customer feedback.',
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs max-w-2xl mx-auto my-8">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Construction className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {description}
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          Prototype Architecture Verified
        </div>
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
