import { useRef } from 'react'
import { Printer, X, Truck, ShieldCheck, Download, Copy, Check } from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/formatters'
import { useCompany } from '@/contexts/CompanyContext'
import type { WarehouseTransfer, Warehouse } from '@/types/warehouse.types'

interface TransferGatePassModalProps {
  transfer: WarehouseTransfer | null
  warehouses: Warehouse[]
  onClose: () => void
}

export function TransferGatePassModal({ transfer, warehouses, onClose }: TransferGatePassModalProps) {
  const { company } = useCompany()
  const printRef = useRef<HTMLDivElement>(null)

  if (!transfer) return null

  const sourceWh = warehouses.find(w => w.id === transfer.source_warehouse_id)
  const destWh = warehouses.find(w => w.id === transfer.destination_warehouse_id)

  const totalQty = transfer.items.reduce((s, i) => s + (Number(i.qty) || 0), 0)

  const handlePrint = () => {
    const orig = document.title
    document.title = `GatePass_${transfer.transfer_number}`
    window.print()
    setTimeout(() => { document.title = orig }, 500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl max-w-3xl w-full my-8 overflow-hidden print:border-none print:shadow-none print:my-0 print:max-w-none">
        {/* Controls - Hidden in print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container/50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface text-base">Material Transfer Gate Pass</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
              transfer.status === 'completed'
                ? 'bg-emerald-100 text-emerald-800'
                : transfer.status === 'in_transit'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-200 text-slate-800'
            }`}>
              {transfer.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Print Gate Pass</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div ref={printRef} className="p-8 print:p-6 bg-white text-slate-900 font-sans space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {company?.name || 'DD ENTERPRISE'}
              </h1>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                Concrete Pavers, Kerb Stones & Interlocking Block Plant
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {company?.address || 'Near Panagarh Industrial Corridor, NH-19, Burdwan - 713148'}
              </p>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-600 mt-1">
                <span>GSTIN: <strong>{company?.gstin || '19AABCD1234E1Z5'}</strong></span>
                <span>STATE: <strong>19 (West Bengal)</strong></span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                Material Transfer Gate Pass
              </span>
              <p className="text-xs font-semibold text-slate-700 mt-2 font-mono">
                Pass No: <strong className="text-slate-900 text-sm">{transfer.transfer_number}</strong>
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Date: {formatDate(transfer.date)}
              </p>
            </div>
          </div>

          {/* Logistics Strip */}
          <div className="grid grid-cols-2 gap-4 p-4 border border-slate-300 rounded-lg bg-slate-50/50 text-xs">
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                Dispatched From (Source Yard)
              </span>
              <p className="font-bold text-slate-900 text-sm">{sourceWh?.name || 'Main Plant Yard'}</p>
              <p className="text-slate-600 text-[11px]">{sourceWh?.address}</p>
              <p className="text-slate-500 text-[11px]">
                In-Charge: <strong>{sourceWh?.in_charge}</strong> ({sourceWh?.phone})
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                Consigned To (Destination Yard)
              </span>
              <p className="font-bold text-slate-900 text-sm">{destWh?.name || 'Dispatch Depot'}</p>
              <p className="text-slate-600 text-[11px]">{destWh?.address}</p>
              <p className="text-slate-500 text-[11px]">
                In-Charge: <strong>{destWh?.in_charge}</strong> ({destWh?.phone})
              </p>
            </div>
          </div>

          {/* Vehicle & Driver Details */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-100 rounded-lg text-xs font-mono text-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Vehicle Reg. No.</span>
              <span className="font-bold text-slate-900">{transfer.vehicle_number || 'Plant Internal Shifter'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Driver Name</span>
              <span className="font-bold text-slate-900">{transfer.driver_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Driver Mobile</span>
              <span className="font-bold text-slate-900">{transfer.driver_phone || 'N/A'}</span>
            </div>
          </div>

          {/* Item Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Transferred Concrete Stock / Raw Material Items
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {transfer.items.length} line items
              </span>
            </div>
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead className="bg-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 border border-slate-300 text-center w-10">#</th>
                  <th className="p-2.5 border border-slate-300">Item Name & Specification</th>
                  <th className="p-2.5 border border-slate-300 w-32 font-mono">SKU Code</th>
                  <th className="p-2.5 border border-slate-300 w-44 font-mono">Batch / Reference</th>
                  <th className="p-2.5 border border-slate-300 text-right w-24">Qty</th>
                  <th className="p-2.5 border border-slate-300 text-center w-16">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transfer.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-2.5 border border-slate-300 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-2.5 border border-slate-300 font-medium text-slate-900">
                      {item.item_name}
                      {item.notes && <span className="block text-[10px] text-slate-500 italic mt-0.5">{item.notes}</span>}
                    </td>
                    <td className="p-2.5 border border-slate-300 font-mono text-slate-600">{item.item_sku}</td>
                    <td className="p-2.5 border border-slate-300 font-mono text-slate-600">{item.batch_number || 'STANDARD YIELD'}</td>
                    <td className="p-2.5 border border-slate-300 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatNumber(item.qty, 0)}
                    </td>
                    <td className="p-2.5 border border-slate-300 text-center uppercase font-mono text-slate-600">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <td colSpan={4} className="p-2.5 border border-slate-300 text-right uppercase text-[11px]">
                    Total Material Transferred:
                  </td>
                  <td className="p-2.5 border border-slate-300 text-right font-mono text-sm">
                    {formatNumber(totalQty, 0)}
                  </td>
                  <td className="p-2.5 border border-slate-300 text-center font-mono">units</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Transfer Remarks */}
          {transfer.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
              <span className="font-bold text-slate-700 block mb-0.5">Purpose & Instructions:</span>
              <p className="text-slate-600 italic">{transfer.notes}</p>
            </div>
          )}

          {/* Signatures & Security Stamp */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-4 gap-4 text-center text-xs">
            <div className="space-y-12">
              <p className="text-slate-500 text-[10px] uppercase font-bold">1. Dispatch In-Charge</p>
              <div>
                <div className="border-t border-slate-400 w-32 mx-auto mb-1"></div>
                <p className="font-bold text-slate-800 text-[11px]">{transfer.created_by}</p>
                <p className="text-[10px] text-slate-400">Panagarh Plant</p>
              </div>
            </div>

            <div className="space-y-12">
              <p className="text-slate-500 text-[10px] uppercase font-bold">2. Driver Signature</p>
              <div>
                <div className="border-t border-slate-400 w-32 mx-auto mb-1"></div>
                <p className="font-bold text-slate-800 text-[11px]">{transfer.driver_name || 'Driver'}</p>
                <p className="text-[10px] text-slate-400">Material In Transit</p>
              </div>
            </div>

            <div className="space-y-12">
              <p className="text-slate-500 text-[10px] uppercase font-bold">3. Gate Security (Out)</p>
              <div>
                <div className="border-t border-slate-400 w-32 mx-auto mb-1"></div>
                <p className="font-bold text-slate-800 text-[11px]">Verified & Logged</p>
                <p className="text-[10px] text-slate-400">Time: ______ Date: ______</p>
              </div>
            </div>

            <div className="space-y-12">
              <p className="text-slate-500 text-[10px] uppercase font-bold">4. Destination Receiver</p>
              <div>
                <div className="border-t border-slate-400 w-32 mx-auto mb-1"></div>
                <p className="font-bold text-slate-800 text-[11px]">{transfer.received_by || 'Destination Yard'}</p>
                <p className="text-[10px] text-slate-400">Received Condition OK</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
