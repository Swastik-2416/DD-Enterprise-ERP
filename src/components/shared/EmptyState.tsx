import React, { isValidElement } from 'react'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode | { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="h-14 w-14 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
          <Icon className="h-7 w-7 text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-on-surface mb-1">{title}</h3>
      {description && <p className="text-sm text-outline mb-4 max-w-sm">{description}</p>}
      {action && (
        isValidElement(action) ? (
          action
        ) : typeof action === 'object' && 'label' in action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg shadow-xs transition-colors"
          >
            {action.label}
          </button>
        ) : null
      )}
    </div>
  )
}
