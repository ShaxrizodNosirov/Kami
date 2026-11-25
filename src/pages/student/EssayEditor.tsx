import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { Card, useAsync, Skeletons, ErrorBox, Confirm, Badge } from '../../components/ui'
import { countWords, countChars } from '../../lib/text'
import { GRADE_LABELS } from '../../lib/types'

export default function EssayEditor() {
  const { topicId } = useParams(); const { user } = useAuth()
  const [body, setBody] = useState(''); const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false)
  const { data, loading, error, reload } = useAsync(async () => {
    const { data: t, error: e } = await supabase.from('essay_topics').select('*').eq('id', topicId!).single(); if (e) throw e
    const { data: es } = await supabase.from('essays').select('id, status, draft_body').eq('student_id', user!.id).eq('topic_id', topicId!).maybeSingle()
    let versions: any[] = [], ai: any[] = [], grades: any[] = []
    if (es) {
      const v = await supabase.from('essay_versions').select('id, version, word_count, submitted_at').eq('essay_id', es.id).order('version', { ascending: false }); versions = v.data ?? []
      const ids = versions.map(x => x.id)
      if (ids.length) {
        ai = (await supabase.from('ai_evaluations').select('*').in('essay_version_id', ids)).data ?? []
        grades = (await supabase.from('teacher_grades').select('*').in('essay_version_id', ids)).data ?? []
      }
    }
    setBody(es?.draft_body ?? ''); return { t, es, versions, ai, grades }
  }, [topicId])
  const status = data?.es?.status ?? 'draft'; const readOnly = status === 'submitted'
  const timer = useRef<any>(null)

  // Autosave 1.5 s after typing stops (server RPC; ignores edits to an already-submitted essay).
  useEffect(() => {
    if (!data || readOnly) return
    if (body === (data.es?.draft_body ?? '')) return
    setSaved('saving'); clearTimeout(timer.current)
    timer.current = setTimeout(async () => { const { error } = await supabase.rpc('save_draft', { p_topic: topicId, p_body: body }); setSaved(error ? 'error' : 'saved') }, 1500)
    return () => clearTimeout(timer.current)
  }, [body]) // eslint-disable-line

  const submit = async () => {
    setBusy(true); setConfirm(false)
    try {
      const { data: eid, error: e1 } = await supabase.rpc('save_draft', { p_topic: topicId, p_body: body }); if (e1) throw e1
      const { data: vid, error: e2 } = await supabase.rpc('submit_essay', { p_essay: eid }); if (e2) throw e2
      toast.success('Essay submitted. AI feedback is being prepared and your teacher has been notified.')
      supabase.functions.invoke('evaluate-essay', { body: { essay_version_id: vid } }).then(({ error }) => { if (error) toast.error('AI feedback could not be generated right now. Your teacher can still review your essay.'); reload() })
      reload()
    } catch (e: any) { toast.error(e.message ?? 'Submission failed') } finally { setBusy(false) }
  }
  if (loading) return <Skeletons />
  if (error) return <ErrorBox error={error} retry={reload} />
  const t = data!.t; const wc = countWords(body)
  const short = wc < t.min_words
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card><Link to="/app/essays" className="text-xs text-slate-400 underline">← All topics</Link>
          <h1 className="mt-2 font-display text-2xl font-bold">{t.title}</h1><p className="mt-2 text-sm text-slate-300">{t.instructions}</p>
          {t.vocabulary?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{t.vocabulary.map((v: string) => <Badge key={v}>{v}</Badge>)}</div>}</Card>
        <Card>
          <textarea className="input min-h-72 font-sans leading-relaxed" value={body} disabled={readOnly} onChange={e => setBody(e.target.value)} placeholder="Start writing here…" aria-label="Essay text" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span><b className={short ? 'text-amber-300' : 'text-emerald-300'}>{wc}</b> words (recommended {t.min_words}{t.max_words ? `–${t.max_words}` : '+'}) · {countChars(body)} characters</span>
            <span>{readOnly ? 'Submitted — awaiting review' : saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Draft saved' : saved === 'error' ? 'Autosave failed — your text is still on screen' : `Status: ${status}`}</span>
            {!readOnly && <button className="btn-gold" disabled={busy || wc === 0} onClick={() => setConfirm(true)}>{status === 'reviewed' ? 'Submit revision' : 'Submit essay'}</button>}
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        {data!.versions.map((v: any) => {
          const ai = data!.ai.find((a: any) => a.essay_version_id === v.id); const g = data!.grades.find((x: any) => x.essay_version_id === v.id)
          return (
            <Card key={v.id}><div className="mb-2 flex justify-between text-sm"><b>Version {v.version}</b><span className="text-xs text-slate-400">{new Date(v.submitted_at).toLocaleString()} · {v.word_count} words</span></div>
              {g ? <div className="mb-3 rounded-xl bg-emerald-500/10 p-3 text-sm"><div className="font-semibold">Teacher grade: {g.grade}/5 — {GRADE_LABELS[g.grade]}</div>{g.comments && <p className="mt-1 text-slate-300">{g.comments}</p>}{g.recommendations && <p className="mt-1 text-slate-400">{g.recommendations}</p>}</div> : <p className="mb-3 text-xs text-slate-400">Waiting for your teacher's review.</p>}
              {!ai || ai.status === 'pending' ? <p className="text-xs text-slate-400">AI feedback is being generated…</p> : ai.status === 'failed' ? <p className="text-xs text-amber-300">AI feedback unavailable for this version.</p> : (
                <div className="text-sm"><div className="mb-1 text-xs uppercase tracking-wide text-violet-300">AI feedback (an estimate, not an official result)</div>
                  {ai.ielts_bands && <div className="mb-2 rounded-lg bg-violet-500/10 p-2 text-xs">Estimated IELTS bands — TR {ai.ielts_bands.task_response} · CC {ai.ielts_bands.coherence} · LR {ai.ielts_bands.lexical} · GRA {ai.ielts_bands.grammar} · Overall ≈ {ai.ielts_bands.overall}<br />Not an official IELTS result.</div>}
                  <p className="text-slate-300">{ai.feedback}</p>
                  {(ai.corrections ?? []).slice(0, 6).map((c: any, i: number) => <div key={i} className="mt-2 rounded-lg bg-white/5 p-2 text-xs"><span className="text-red-300 line-through">{c.original}</span> → <span className="text-emerald-300">{c.corrected}</span><div className="text-slate-400">{c.explanation}</div></div>)}</div>)}
            </Card>)})}
      </div>
      <Confirm open={confirm} title="Submit this essay?" body={short ? `Your essay has ${wc} words, below the recommended ${t.min_words}. You can still submit it. Once submitted it is saved as a timestamped version and sent to your teacher.` : 'Once submitted it is saved as a timestamped version and sent to your teacher for review.'} onYes={submit} onNo={() => setConfirm(false)} />
    </div>
  )
}
