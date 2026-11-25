import { ReactNode, useEffect, useRef, useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export function FullPageSpinner() { return <div className="grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-violet-400" aria-label="Loading" /></div> }
export const Spinner = () => <Loader2 className="h-5 w-5 animate-spin text-violet-400" aria-label="Loading" />

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={`glass p-5 ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>
}
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}</div>
      {actions}
    </div>
  )
}
/** Animated count-up number (respects reduced motion). */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const reduce = useReducedMotion(); const [v, setV] = useState(reduce ? value : 0)
  useEffect(() => {
    if (reduce) { setV(value); return }
    let raf = 0; const t0 = performance.now(); const from = 0
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / 700); setV(from + (value - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [value, reduce])
  return <>{v.toFixed(decimals)}</>
}
export function Stat({ label, value, suffix = '', icon, decimals = 0, to }: { label: string; value: number | string | null | undefined; suffix?: string; icon?: ReactNode; decimals?: number; to?: string }) {
  return (
    <Card hover className="flex items-center gap-4">
      {icon && <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/20 text-violet-300">{icon}</div>}
      <div>
        <div className="text-2xl font-bold">{typeof value === 'number' ? <CountUp value={value} decimals={decimals} /> : (value ?? '—')}{suffix}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </Card>
  )
}
export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={`h-2.5 overflow-hidden rounded-full bg-white/10 ${className}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-violet-450 to-teal-400" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
    </div>
  )
}
const BADGE: Record<string, string> = {
  paid: 'bg-emerald-500/20 text-emerald-300', due_soon: 'bg-amber-500/20 text-amber-300', due_today: 'bg-orange-500/20 text-orange-300',
  overdue: 'bg-red-500/20 text-red-300', unpaid: 'bg-slate-500/30 text-slate-300', present: 'bg-emerald-500/20 text-emerald-300',
  absent: 'bg-red-500/20 text-red-300', late: 'bg-amber-500/20 text-amber-300', excused: 'bg-sky-500/20 text-sky-300',
  default: 'bg-violet-500/20 text-violet-200'
}
export const Badge = ({ kind = 'default', children }: { kind?: string; children: ReactNode }) =>
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[kind] ?? BADGE.default}`}>{children}</span>
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return <div className="grid place-items-center rounded-2xl border border-dashed border-white/15 p-10 text-center"><div className="font-semibold">{title}</div>{hint && <div className="mt-1 text-sm text-slate-400">{hint}</div>}</div>
}
export const ErrorBox = ({ error, retry }: { error: string; retry?: () => void }) =>
  <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">Something went wrong: {error} {retry && <button className="ml-2 underline" onClick={retry}>Retry</button>}</div>
export const Skeletons = ({ n = 3, h = 'h-24' }: { n?: number; h?: string }) => <div className="space-y-3">{Array.from({ length: n }).map((_, i) => <div key={i} className={`skeleton ${h}`} />)}</div>

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => { if (!open) return; const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f) }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto bg-navy-900 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>{children}
      </motion.div>
    </div>
  )
}
export function Confirm({ open, title, body, onYes, onNo, danger }: { open: boolean; title: string; body: string; onYes: () => void; onNo: () => void; danger?: boolean }) {
  return <Modal open={open} onClose={onNo} title={title}><p className="mb-5 text-sm text-slate-300">{body}</p>
    <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onNo}>Cancel</button><button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onYes}>Confirm</button></div></Modal>
}
/** Minimal data loader hook. */
export function useAsync<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  const alive = useRef(true); useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const run = useCallback(async () => {
    setLoading(true); setError(null)
    try { const d = await fn(); if (alive.current) setData(d) } catch (e: any) { if (alive.current) setError(e?.message ?? String(e)) } finally { if (alive.current) setLoading(false) }
  }, deps) // eslint-disable-line
  useEffect(() => { run() }, [run])
  return { data, loading, error, reload: run, setData }
}
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
