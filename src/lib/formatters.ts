/**
 * Format a number as Indian Rupees (₹)
 * e.g. 1234567.50 → "₹12,34,567.50"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a number with Indian grouping (no currency symbol)
 * e.g. 1234567.5 → "12,34,567.50"
 */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '0'
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format a date in Indian format: DD/MM/YYYY
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format a date + time in Indian format: DD/MM/YYYY HH:mm
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Convert a Date to YYYY-MM-DD string for form inputs
 */
export function toInputDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Round to 2 decimal places (for GST/tax calculations)
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Calculate CGST and SGST amounts from taxable value and GST rate
 */
export function calculateGst(taxable: number, gstRate: number) {
  const halfRate = gstRate / 2
  const cgst = round2(taxable * halfRate / 100)
  const sgst = round2(taxable * halfRate / 100)
  return { cgst, sgst, total: round2(taxable + cgst + sgst) }
}

/**
 * Convert number to words (Indian system) for invoice amount-in-words
 */
export function amountInWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convertHundreds(n: number): string {
    if (n === 0) return ''
    if (n < 20) return ones[n] + ' '
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' '
    return ones[Math.floor(n / 100)] + ' Hundred ' + convertHundreds(n % 100)
  }

  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only'

  let result = ''
  if (rupees >= 10000000) {
    result += convertHundreds(Math.floor(rupees / 10000000)) + 'Crore '
    result += convertHundreds(Math.floor((rupees % 10000000) / 100000))
  } else if (rupees >= 100000) {
    result += convertHundreds(Math.floor(rupees / 100000)) + 'Lakh '
    result += convertHundreds(Math.floor((rupees % 100000) / 1000))
  } else if (rupees >= 1000) {
    result += convertHundreds(Math.floor(rupees / 1000)) + 'Thousand '
    result += convertHundreds(rupees % 1000)
  } else {
    result += convertHundreds(rupees)
  }

  result = result.trim() + ' Rupees'
  if (paise > 0) result += ' and ' + convertHundreds(paise).trim() + ' Paise'
  return result + ' Only'
}

/**
 * Generate document number based on prefix, financial year, and sequence
 * e.g. generateDocNumber('INV', 2025, 42) → 'INV-2526-0042'
 */
export function generateDocNumber(prefix: string, year: number, seq: number): string {
  const fy = `${String(year).slice(-2)}${String(year + 1).slice(-2)}`
  return `${prefix}-${fy}-${String(seq).padStart(4, '0')}`
}

/**
 * Current financial year start year (April 1)
 */
export function currentFYYear(): number {
  const now = new Date()
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
}
