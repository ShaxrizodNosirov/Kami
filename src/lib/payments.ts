import type { PaymentStatus } from './types'
const DAY = 86_400_000
/** Parse 'YYYY-MM-DD' as a UTC date so DST never shifts the day. */
export const parseDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }
export const fmtDate = (d: Date) => d.toISOString().slice(0, 10)
/** start + n months, clamped to month end (Jan 31 + 1 → Feb 28/29). Always computed from the ORIGINAL anchor so there is no drift. */
export function addMonthsClamped(start: string, n: number): string {
  const s = parseDate(start)
  const total = s.getUTCMonth() + n
  const y = s.getUTCFullYear() + Math.floor(total / 12)
  const m = ((total % 12) + 12) % 12
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return fmtDate(new Date(Date.UTC(y, m, Math.min(s.getUTCDate(), last))))
}
export const daysBetween = (from: string, to: string) => Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY)
export function paymentStatus(paidThrough: string | null, today: string, soonDays = 7): PaymentStatus {
  if (!paidThrough) return 'unpaid'
  const d = daysBetween(today, paidThrough)
  if (d < 0) return 'overdue'
  if (d === 0) return 'due_today'
  return d <= soonDays ? 'due_soon' : 'paid'
}
export function remainingLabel(paidThrough: string | null, today: string): string {
  if (!paidThrough) return 'No payment yet'
  const d = daysBetween(today, paidThrough)
  if (d === 0) return 'Expires today'
  if (d < 0) return `Overdue by ${-d} day${-d === 1 ? '' : 's'}`
  return `${d} day${d === 1 ? '' : 's'} remaining`
}
export const todayStr = () => { const n = new Date(); return fmtDate(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()))) }
