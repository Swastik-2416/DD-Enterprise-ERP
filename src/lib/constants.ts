export const APP_NAME = 'DD Enterprise ERP'

export const ROLES = {
  MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const ITEM_TYPES = {
  RAW_MATERIAL: 'raw_material',
  FINISHED_GOOD: 'finished_good',
  MOULD: 'mould',
  MACHINERY: 'machinery',
  CONSUMABLE: 'consumable',
  SERVICE: 'service',
} as const

export const DOCUMENT_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  POSTED: 'posted',
  CANCELLED: 'cancelled',
} as const

export const MOVEMENT_TYPES = {
  PURCHASE: 'purchase',
  PURCHASE_RETURN: 'purchase_return',
  PRODUCTION_CONSUMPTION: 'production_consumption',
  PRODUCTION_OUTPUT: 'production_output',
  SALE: 'sale',
  SALE_RETURN: 'sale_return',
  ADJUSTMENT: 'adjustment',
} as const

export const PAYMENT_MODES = [
  'Cash',
  'Bank Transfer (NEFT/RTGS)',
  'UPI',
  'Cheque',
  'DD',
  'Other',
] as const

export const GST_RATES = [0, 5, 12, 18, 28] as const

export const PAGE_SIZES = [25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 25

// Indian financial year starts April 1
export const FY_START_MONTH = 3 // 0-indexed → April
