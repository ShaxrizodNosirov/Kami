import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { Exercise, CheckResult } from '../lib/types'

/** Renders one exercise and collects the answer. Grading is ALWAYS server-side (check_answer / submit_answer). */
export function ExerciseView({ ex, onSubmit, onNext, isLast, disabled }: {
  ex: Exercise; onSubmit: (answer: any) => Promise<CheckResult>; onNext: () => void; isLast: boolean; disabled?: boolean
}) {
  const [choice, setChoice] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [pairs, setPairs] = useState<Record<string, string>>({})
  const [res, setRes] = useState<CheckResult | null>(null)
  const [busy, setBusy] = useState(false)

  const words: string[] = ex.data?.words ?? []
  const left: string[] = ex.data?.left ?? []
  const right: string[] = ex.data?.right ?? []

  const answer = () => {
    if (ex.type === 'mcq' || ex.type === 'reading') return choice === null ? null : { choice: String(choice) }
    if (ex.type === 'order') return picked.length === words.length ? { value: picked } : null
    if (ex.type === 'match') return left.every(l => pairs[l]) ? { value: pairs } : null
    return text.trim() ? { text } : null
  }
  const a = answer()
  const submit = async () => { if (!a || busy || res) return; setBusy(true); try { setRes(await onSubmit(a)) } finally { setBusy(false) } }
  const locked = !!res || disabled

  return (
    <div>
      {ex.type === 'reading' && ex.data?.passage && <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-slate-200">{ex.data.passage}</div>}
      <h2 className="mb-5 text-xl font-semibold">{ex.prompt}</h2>

      {(ex.type === 'mcq' || ex.type === 'reading') && (
        <div className="grid gap-2" role="radiogroup">
          {(ex.data?.options ?? []).map((o: string, i: number) => (
            <button key={i} role="radio" aria-checked={choice === i} disabled={locked} onClick={() => setChoice(i)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${choice === i ? 'border-violet-400 bg-violet-500/20' : 'border-white/15 hover:bg-white/5'}`}>{o}</button>
          ))}
        </div>
      )}
      {(ex.type === 'fill' || ex.type === 'translation') && <input className="input" value={text} disabled={locked} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Type your answer" autoFocus />}
      {ex.type === 'short' && <textarea className="input min-h-28" value={text} disabled={locked} onChange={e => setText(e.target.value)} placeholder="Write your answer" />}
      {ex.type === 'order' && (
        <div>
          <div className="mb-3 min-h-12 rounded-xl border border-dashed border-white/20 p-2">{picked.map((w, i) => <button key={i} disabled={locked} onClick={() => setPicked(picked.filter((_, j) => j !== i))} className="m-1 rounded-lg bg-violet-500/30 px-3 py-1.5 text-sm">{w}</button>)}</div>
          <div>{words.map((w, i) => { const used = picked.filter(p => p === w).length >= words.filter(x => x === w).length
            return <button key={i} disabled={locked || used} onClick={() => setPicked([...picked, w])} className="m-1 rounded-lg border border-white/15 px-3 py-1.5 text-sm disabled:opacity-30">{w}</button> })}</div>
        </div>
      )}
      {ex.type === 'match' && (
        <div className="space-y-2">{left.map(l => (
          <div key={l} className="flex items-center gap-3"><span className="w-32 text-sm">{l}</span>
            <select className="input" disabled={locked} value={pairs[l] ?? ''} onChange={e => setPairs({ ...pairs, [l]: e.target.value })}><option value="">Choose…</option>{right.map(r => <option key={r}>{r}</option>)}</select></div>))}</div>
      )}

      {res && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`mt-5 rounded-xl border p-4 text-sm ${res.pending ? 'border-sky-400/30 bg-sky-500/10' : res.correct ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-red-400/30 bg-red-500/10'}`} role="status">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            {res.pending ? <><Clock className="h-4 w-4" /> Sent to your teacher for review</> : res.correct ? <><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Correct! {res.points > 0 ? `+${res.points} points` : res.already_scored ? '(already scored before)' : ''}</> : <><XCircle className="h-4 w-4 text-red-300" /> Not quite</>}
          </div>
          {res.explanation && <p className="text-slate-300">{res.explanation}</p>}
        </motion.div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        {!res ? <button className="btn-primary" disabled={!a || busy || disabled} onClick={submit}>{busy ? 'Checking…' : 'Submit Answer'}</button>
              : <button className="btn-primary" onClick={onNext}>{isLast ? 'Finish' : 'Next Exercise'}</button>}
      </div>
    </div>
  )
}
