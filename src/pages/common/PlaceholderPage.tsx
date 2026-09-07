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

      <div className="bg-surface border border-outline-variant rounded-2xl p-12 text-center shadow-xs max-w-2xl mx-auto my-8">
        <div className="h-16 w-16 bg-primary/5 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Construction className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-on-surface mb-2">{title}</h3>
        <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
          {description}
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Prototype Architecture Verified
        </div>
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
