import { useState } from 'react'
import { Settings, Plus, Trash2, Edit2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { mockUnits } from '@/lib/mockData'
import { useAuth } from '@/contexts/AuthContext'

export function UnitsPage() {
  const { isManager } = useAuth()
  const [units, setUnits] = useState(mockUnits)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Units of Measurement (UoM)"
        subtitle="Standard units for raw material consumption, manufacturing output, and GST invoicing"
        action={
          isManager
            ? {
                label: 'Add Unit',
                icon: Plus,
                onClick: () => alert('Demo: Add new Unit of Measure'),
              }
            : undefined
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs max-w-3xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-600">
            <tr>
              <th className="py-3 px-4">Unit Name</th>
              <th className="py-3 px-4">Symbol / UQC</th>
              <th className="py-3 px-4">Usage in Factory</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {units.map(unit => (
              <tr key={unit.id} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-semibold text-slate-800">{unit.name}</td>
                <td className="py-3 px-4 font-mono font-bold text-blue-600">{unit.symbol}</td>
                <td className="py-3 px-4 text-xs text-slate-500">
                  {unit.symbol === 'pcs' && 'Finished Paver Blocks & Kerb Stones'}
                  {unit.symbol === 'MT' && 'Coarse Aggregates & River/M-sand'}
                  {unit.symbol === 'bag' && 'Cement (50 kg bags)'}
                  {unit.symbol === 'kg' && 'Fly Ash & Colour Pigments'}
                  {unit.symbol === 'ltr' && 'Mould Release Oil & Admixtures'}
                  {unit.symbol === 'sqm' && 'Total Paving Area Area Billing'}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
