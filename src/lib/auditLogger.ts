import { supabase } from '@/lib/supabase'
import type { AuditLog, Json } from '@/types/database.types'

export interface LogAuditParams {
  companyId: string
  tableName: string
  rowId: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  oldData?: Record<string, any> | null
  newData?: Record<string, any> | null
  performedBy: string
}

const STORAGE_KEY = 'dd_audit_logs_cache'

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-101',
    company_id: 'c1',
    table_name: 'invoices',
    row_id: 'inv-2425-0042',
    action: 'UPDATE',
    old_data: {
      invoice_number: 'INV-2425-0042',
      customer_name: 'Eastern Infra Projects Pvt Ltd',
      status: 'submitted',
      total_amount: 485000,
      paid_amount: 0,
      notes: 'Awaiting site delivery confirmation'
    },
    new_data: {
      invoice_number: 'INV-2425-0042',
      customer_name: 'Eastern Infra Projects Pvt Ltd',
      status: 'posted',
      total_amount: 485000,
      paid_amount: 0,
      notes: 'Site delivery challan verified. Stock deducted and ledger updated.'
    },
    performed_by: 'Swastik Mandal (Manager)',
    performed_at: new Date(Date.now() - 25 * 60000).toISOString()
  },
  {
    id: 'log-102',
    company_id: 'c1',
    table_name: 'production_orders',
    row_id: 'prd-2425-0018',
    action: 'UPDATE',
    old_data: {
      order_number: 'PRD-2425-0018',
      item_name: 'Zig-Zag 80mm Grey Paver (M-40)',
      planned_qty: 3500,
      actual_qty: null,
      status: 'approved',
      shift: 'Morning Shift (6 AM - 2 PM)'
    },
    new_data: {
      order_number: 'PRD-2425-0018',
      item_name: 'Zig-Zag 80mm Grey Paver (M-40)',
      planned_qty: 3500,
      actual_qty: 3540,
      status: 'posted',
      shift: 'Morning Shift (6 AM - 2 PM)',
      machine_used: 'Automatic Vibro Press #1',
      yield_rate: '101.1%'
    },
    performed_by: 'Bikramjit Sen (Plant Supervisor)',
    performed_at: new Date(Date.now() - 95 * 60000).toISOString()
  },
  {
    id: 'log-103',
    company_id: 'c1',
    table_name: 'stock_balances',
    row_id: 'item-raw-opc53',
    action: 'UPDATE',
    old_data: {
      item_name: 'UltraTech OPC 53 Grade Cement',
      sku: 'RM-CEM-OPC53',
      qty_on_hand: 420,
      adjustment_reason: null
    },
    new_data: {
      item_name: 'UltraTech OPC 53 Grade Cement',
      sku: 'RM-CEM-OPC53',
      qty_on_hand: 550,
      adjustment_reason: 'Unloading of 130 bags from GRN-2425-0019 (Durgapur Cement Depot)'
    },
    performed_by: 'Warehouse In-charge',
    performed_at: new Date(Date.now() - 180 * 60000).toISOString()
  },
  {
    id: 'log-104',
    company_id: 'c1',
    table_name: 'expenses',
    row_id: 'exp-2425-0008',
    action: 'INSERT',
    old_data: null,
    new_data: {
      voucher_number: 'VCH-2425-0008',
      category: 'power_electricity',
      payee_name: 'WBSEDCL - Durgapur Industrial Supply',
      amount: 48500,
      payment_mode: 'neft_rtgs',
      description: 'Factory HT power tariff monthly bill for Vibro Press plant motors'
    },
    performed_by: 'Accounts Officer',
    performed_at: new Date(Date.now() - 320 * 60000).toISOString()
  },
  {
    id: 'log-105',
    company_id: 'c1',
    table_name: 'boms',
    row_id: 'bom-zigzag-80',
    action: 'UPDATE',
    old_data: {
      bom_name: 'M-40 Heavy Duty Paver Mix (v1)',
      cement_ratio_kg: 50,
      stone_chips_10mm_kg: 95,
      hardener_admixture_ml: 250,
      wastage_pct: 3.5
    },
    new_data: {
      bom_name: 'M-40 Heavy Duty Paver Mix (v2 - High Compressive)',
      cement_ratio_kg: 50,
      stone_chips_10mm_kg: 90,
      hardener_admixture_ml: 300,
      wastage_pct: 2.5
    },
    performed_by: 'Swastik Mandal (Manager)',
    performed_at: new Date(Date.now() - 840 * 60000).toISOString()
  },
  {
    id: 'log-106',
    company_id: 'c1',
    table_name: 'labour_attendance',
    row_id: 'att-2026-10-05-morning',
    action: 'INSERT',
    old_data: null,
    new_data: {
      shift: 'Morning Shift (6 AM - 2 PM)',
      date: '2026-10-05',
      total_workers: 8,
      present_count: 7,
      total_ot_hours: 4.5,
      muster_wage_payout: 5975
    },
    performed_by: 'Labour Supervisor',
    performed_at: new Date(Date.now() - 1440 * 60000).toISOString()
  },
  {
    id: 'log-107',
    company_id: 'c1',
    table_name: 'customers',
    row_id: 'cust-bengal-logistics',
    action: 'UPDATE',
    old_data: {
      customer_name: 'Bengal Logistics Parks & Warehousing',
      credit_limit: 200000,
      credit_days: 30
    },
    new_data: {
      customer_name: 'Bengal Logistics Parks & Warehousing',
      credit_limit: 350000,
      credit_days: 45
    },
    performed_by: 'Swastik Mandal (Manager)',
    performed_at: new Date(Date.now() - 2800 * 60000).toISOString()
  }
]

export function getCachedAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {}
  return SEED_AUDIT_LOGS
}

export function saveAuditLogToCache(log: AuditLog): void {
  try {
    const existing = getCachedAuditLogs()
    const updated = [log, ...existing].slice(0, 500) // keep last 500 logs
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}

export async function logAuditEvent(params: LogAuditParams): Promise<AuditLog> {
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    company_id: params.companyId,
    table_name: params.tableName,
    row_id: params.rowId,
    action: params.action,
    old_data: (params.oldData as Json) ?? null,
    new_data: (params.newData as Json) ?? null,
    performed_by: params.performedBy || 'System User',
    performed_at: new Date().toISOString()
  }

  // 1. Save to local cache immediately
  saveAuditLogToCache(newLog)

  // 2. Attempt Supabase insert in background
  try {
    await (supabase.from('audit_logs') as any).insert([
      {
        id: newLog.id,
        company_id: newLog.company_id,
        table_name: newLog.table_name,
        row_id: newLog.row_id,
        action: newLog.action,
        old_data: newLog.old_data,
        new_data: newLog.new_data,
        performed_by: newLog.performed_by,
        performed_at: newLog.performed_at
      }
    ])
  } catch {
    // If Supabase table isn't created or lacks write permission, cache is safe
  }

  return newLog
}
