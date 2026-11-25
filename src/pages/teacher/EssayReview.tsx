import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Empty, Badge, Field } from '../../components/ui'
import { GRADE_LABELS } from '../../lib/types'

export default function EssayReview() {
  const [sel, setSel] = useState<any>(null); const [show, setShow] = useState<'submitted' | 'reviewed'>('submitted')
  const { data, loading, error, reload } = useAsync(async () => {
    const { data, error } = await supabase.from('essays').select('id, status, student_id, updated_at, essay_topics(title, level, kind, instructions), student_profiles(profiles(full_name))').eq('status', show).order('updated_at', { ascending: true })
    if (error) throw error; return data as any[]
  }, [show])
  const open = async (e: any) => {
    const { data: v } = await supabase.from('essay_versions').select('*').eq('essay_id', e.id).order('version', { ascending: false }).limit(1).single()
    const [{ data: ai }, { data: g }] = await Promise.all([supabase.from('ai_evaluations').select('*').eq('essay_version_id', v!.id).maybeSingle(), supabase.from('teacher_grades').select('*').eq('essay_version_id', v!.id).order('graded_at', { ascending: false })])
    setSel({ e, v, ai, g: g ?? [] })
  }
  const submit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault(); const f = new FormData(ev.currentTarget); const uid = (await supabase.auth.getUser()).data.user!.id
    const { error } = await supabase.from('teacher_grades').insert({ student_id: sel.e.student_id, essay_version_id: sel.v.id, grade: Number(f.get('grade')), comments: String(f.get('c')) || null, recommendations: String(f.get('r')) || null, graded_by: uid })
    error ? toast.error(error.message) : (toast.success('Feedback sent to the student'), setSel(null), reload())
  }
  return (<div><PageHeader title="Essay Review" />
    <div className="mb-4 flex gap-2"><button className={show === 'submitted' ? 'btn-primary' : 'btn-ghost'} onClick={() => setShow('submitted')}>Awaiting review</button><button className={show === 'reviewed' ? 'btn-primary' : 'btn-ghost'} onClick={() => setShow('reviewed')}>Reviewed</button></div>
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-2 lg:col-span-2">{loading ? <Skeletons /> : error ? <ErrorBox error={error} retry={reload} /> : !data!.length ? <Empty title="Nothing here" /> : data!.map(e => <Card key={e.id} hover className="cursor-pointer !p-4" ><button className="w-full text-left" onClick={() => open(e)}><div className="font-medium">{e.student_profiles?.profiles?.full_name}</div><div className="text-xs text-slate-400">{e.essay_topics?.title} · {e.essay_topics?.level}</div></button></Card>)}</div>
      <div className="lg:col-span-3">{!sel ? <Empty title="Select an essay" /> : <Card className="space-y-4">
        <div><h2 className="font-semibold">{sel.e.essay_topics?.title}</h2><p className="text-xs text-slate-400">Version {sel.v.version} · {sel.v.word_count} words · {new Date(sel.v.submitted_at).toLocaleString()}</p></div>
        <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-sm leading-relaxed">{sel.v.body}</div>
        <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-3 text-sm"><div className="mb-1 text-xs uppercase tracking-wide text-violet-300">AI estimate — not the teacher's grade</div>
          {!sel.ai || sel.ai.status === 'pending' ? 'Not generated yet.' : sel.ai.status === 'failed' ? `AI evaluation failed (${sel.ai.error ?? 'unknown'}). Review manually.` : <>{sel.ai.ielts_bands && <div className="mb-1">IELTS est. — TR {sel.ai.ielts_bands.task_response} · CC {sel.ai.ielts_bands.coherence} · LR {sel.ai.ielts_bands.lexical} · GRA {sel.ai.ielts_bands.grammar} · Overall ≈ {sel.ai.ielts_bands.overall}</div>}<p>{sel.ai.feedback}</p>
            {sel.ai.criteria && <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(sel.ai.criteria).map(([k, v]: any) => <Badge key={k}>{k.replace(/_/g, ' ')}: {v.score}/5</Badge>)}</div>}</>}
          {sel.ai?.email_status && <div className="mt-2 text-[11px] text-slate-500">Email notification: {sel.ai.email_status}</div>}</div>
        {sel.g.map((g: any) => <div key={g.id} className="text-sm text-emerald-300">Previous grade: {g.grade}/5 — {g.comments}</div>)}
        <form onSubmit={submit} className="space-y-2"><Field label="Teacher grade (1–5)"><select name="grade" className="input" defaultValue="3">{[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g} — {GRADE_LABELS[g]}</option>)}</select></Field>
          <Field label="Comments"><textarea name="c" className="input min-h-20" /></Field><Field label="Recommendations"><textarea name="r" className="input" /></Field><button className="btn-primary">Send feedback</button></form></Card>}</div></div></div>)
}
