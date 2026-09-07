import { useState } from 'react'
import { Package, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { mockCategories } from '@/lib/mockData'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'

export function CategoriesPage() {
  const { isManager } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Item Categories"
        subtitle="Classification groups for inventory, procurement, and valuation"
        action={
          isManager
            ? {
                label: 'Add Category',
                icon: Plus,
                onClick: () => alert('Demo: Add category modal'),
              }
            : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockCategories.map(cat => (
          <div key={cat.id} className="bg-surface border border-outline-variant rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-on-surface">{cat.name}</span>
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                cat.type === 'finished_good' ? 'bg-green-100 text-green-700' :
                cat.type === 'raw_material' ? 'bg-primary/10 text-primary' :
                cat.type === 'mould' ? 'bg-purple-100 text-purple-700' :
                'bg-surface-container text-on-surface-variant'
              )}>
                {cat.type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-outline mt-2">
              System classification type for ledger posting and GST HSN mapping.
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
