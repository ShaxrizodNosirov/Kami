import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Empty, Badge, Modal, Field } from '../../components/ui'
import { LEVELS, GRADE_LABELS } from '../../lib/types'

export default function Assignments() {
  const [create, setCreate] = useState(false); const [open, setOpen] = useState<any>(null)
  const { data, loading, error, reload } = useAsync(async () => {
    const [a, l, s] = await Promise.all([supabase.from('assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('lessons').select('id, title, position, units(level, position, title)').order('position'),
      supabase.from('student_profiles').select('user_id, level, profiles(full_name)').eq('active', true)])
    if (a.error) throw a.error; return { a: a.data as any[], l: (l.data ?? []) as any[], s: (s.data ?? []) as any[] }
  }, [])
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const uid = (await supabase.auth.getUser()).data.user!.id
    const lessonIds = f.getAll('lessons').map(String); const targets = f.getAll('targets').map(String)
    const { data: a, error } = await supabase.from('assignments').insert({ title: String(f.get('title')), instructions: String(f.get('instr')), level: String(f.get('level')), deadline: f.get('deadline') ? new Date(String(f.get('deadline'))).toISOString() : null, max_points: Number(f.get('max') || 100), published: f.get('pub') === 'on', focus_mode: f.get('focus') === 'on', reset_on_third_exit: f.get('reset') === 'on', created_by: uid }).select().single()
    if (error) return toast.error(error.message)
    if (lessonIds.length) { const { data: ex } = await supabase.from('exercises').select('id').in('lesson_id', lessonIds); if (ex?.length) await supabase.from('assignment_exercises').insert(ex.map(x => ({ assignment_id: a.id, exercise_id: x.id }))) }
    if (targets.length) await supabase.from('assignment_targets').insert(targets.map(t => ({ assignment_id: a.id, student_id: t })))
    if (a.published) { const ids = targets.length ? targets : data!.s.filter(s => s.level === a.level).map(s => s.user_id); await Promise.all(ids.map(id => supabase.rpc('notify_assignment', { p_user: id, p_title: a.title }).then(() => 0, () => 0))) }
    toast.success('Assignment created'); setCreate(false); reload()
  }
  const toggle = async (a: any) => { const { error } = await supabase.from('assignments').update({ published: !a.published }).eq('id', a.id); error ? toast.error(error.message) : reload() }
  if (loading) return <Skeletons />; if (error) return <ErrorBox error={error} retry={reload} />
  return (<div><PageHeader title="Assignments" actions={<button className="btn-primary" onClick={() => setCreate(true)}>New assignment</button>} />
    {!data!.a.length ? <Empty title="No assignments yet" /> : <div className="space-y-3">{data!.a.map(a => <Card key={a.id} hover className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="font-semibold">{a.title} <Badge>{a.level}</Badge> {a.focus_mode && <Badge kind="due_soon">focus</Badge>}</div><div className="text-xs text-slate-400">{a.deadline ? `Due ${new Date(a.deadline).toLocaleString()}` : 'No deadline'} · {a.max_points} pts · {a.published ? 'published' : 'draft'}</div></div>
      <div className="flex gap-2"><button className="btn-ghost" onClick={() => toggle(a)}>{a.published ? 'Unpublish' : 'Publish'}</button><button className="btn-primary" onClick={() => setOpen(a)}>Submissions</button></div></Card>)}</div>}
    <Modal open={create} onClose={() => setCreate(false)} title="New assignment"><form onSubmit={submit} className="space-y-3">
      <Field label="Title"><input className="input" name="title" required /></Field><Field label="Instructions"><textarea className="input" name="instr" /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Level"><select className="input" name="level">{LEVELS.map(l => <option key={l.code}>{l.code}</option>)}</select></Field><Field label="Max points"><input className="input" name="max" type="number" defaultValue={100} min={1} /></Field></div>
      <Field label="Deadline"><input className="input" name="deadline" type="datetime-local" /></Field>
      <Field label="Include all exercises from lessons (hold Ctrl/Cmd for several)"><select className="input h-28" name="lessons" multiple>{data!.l.map(l => <option key={l.id} value={l.id}>{l.units?.level} U{l.units?.position} · {l.title}</option>)}</select></Field>
      <Field label="Specific students (leave empty = whole level)"><select className="input h-28" name="targets" multiple>{data!.s.map(s => <option key={s.user_id} value={s.user_id}>{s.profiles?.full_name} ({s.level})</option>)}</select></Field>
      <label className="block text-sm"><input type="checkbox" name="pub" /> Publish now</label>
      <label className="block text-sm"><input type="checkbox" name="focus" /> Require focus mode</label>
      <label className="block text-sm"><input type="checkbox" name="reset" defaultChecked /> Reset attempt after 3rd exit</label>
      <button className="btn-primary">Create</button></form></Modal>
    {open && <Submissions a={open} students={data!.s} onClose={() => setOpen(null)} />}
  </div>)
}

function Submissions({ a, students, onClose }: { a: any; students: any[]; onClose: () => void }) {
  const [sel, setSel] = useState<any>(null)
  const { data, loading, error, reload } = useAsync(async () => {
    const [sub, tg] = await Promise.all([supabase.from('assignment_submissions').select('*').eq('assignment_id', a.id), supabase.from('assignment_targets').select('student_id').eq('assignment_id', a.id)])
    const ids = (tg.data ?? []).map((t: any) => t.student_id)
    return { sub: sub.data ?? [], roster: students.filter(s => ids.length ? ids.includes(s.user_id) : s.level === a.level) }
  }, [a.id])
  const status = (sid: string) => { const s: any = data!.sub.find((x: any) => x.student_id === sid); if (!s) return a.deadline && new Date(a.deadline) < new Date() ? 'overdue' : 'not_started'; if (s.status === 'in_progress' && a.deadline && new Date(a.deadline) < new Date()) return 'overdue'; return s.status }
  const done = data ? data.roster.filter(r => ['submitted', 'reviewed'].includes(status(r.user_id))).length : 0
  return (<Modal open onClose={onClose} title={`Submissions — ${a.title}`}>
    {loading ? <Skeletons n={2} /> : error ? <ErrorBox error={error} /> : <>
      <p className="mb-3 text-sm text-slate-400">{done} of {data!.roster.length} completed ({data!.roster.length ? Math.round(100 * done / data!.roster.length) : 0}%)</p>
      {data!.roster.map(r => { const st = status(r.user_id); const sub: any = data!.sub.find((x: any) => x.student_id === r.user_id)
        return <div key={r.user_id} className="flex items-center justify-between border-b border-white/10 py-2 text-sm"><span>{r.profiles?.full_name}</span><span className="flex items-center gap-2"><Badge kind={st === 'overdue' ? 'overdue' : 'default'}>{st.replace('_', ' ')}</Badge>{sub && ['submitted', 'reviewed'].includes(sub.status) && <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setSel({ sub, name: r.profiles?.full_name })}>Review</button>}</span></div> })}
      {sel && <Grade sel={sel} onDone={() => { setSel(null); reload() }} />}</>}
  </Modal>)
}

function Grade({ sel, onDone }: { sel: any; onDone: () => void }) {
  const { data } = useAsync(async () => { const { data } = await supabase.from('exercise_attempts').select('id, answer, is_correct, points_awarded, created_at, exercises(prompt, max_points)').eq('submission_id', sel.sub.id).eq('attempt_no', sel.sub.attempt_no).is('invalidated_at', null).order('created_at'); return data as any[] }, [sel.sub.id])
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const uid = (await supabase.auth.getUser()).data.user!.id
    const { error } = await supabase.from('teacher_grades').insert({ student_id: sel.sub.student_id, submission_id: sel.sub.id, grade: Number(f.get('grade')), comments: String(f.get('c')) || null, recommendations: String(f.get('r')) || null, graded_by: uid })
    error ? toast.error(error.message) : (toast.success('Grade saved'), onDone())
  }
  const returnIt = async () => { const { error } = await supabase.from('assignment_submissions').update({ status: 'returned' }).eq('id', sel.sub.id); error ? toast.error(error.message) : (toast.success('Returned for revision'), onDone()) }
  return (<div className="mt-4 rounded-xl border border-white/10 p-3"><h3 className="mb-2 font-semibold">{sel.name}</h3>
    <div className="mb-3 max-h-48 overflow-y-auto text-xs">{(data ?? []).map(x => <div key={x.id} className="mb-1.5"><div className="text-slate-300">{x.exercises?.prompt}</div><div className="text-slate-400">Answer: {JSON.stringify(x.answer)} · {x.is_correct === null ? 'needs review' : x.is_correct ? 'correct' : 'wrong'} · {x.points_awarded}/{x.exercises?.max_points} pts</div></div>)}</div>
    <form onSubmit={submit} className="space-y-2"><Field label="Teacher grade (separate from auto points)"><select name="grade" className="input" defaultValue="3">{[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g} — {GRADE_LABELS[g]}</option>)}</select></Field>
      <Field label="Comments"><textarea name="c" className="input" /></Field><Field label="Improvement recommendations"><textarea name="r" className="input" /></Field>
      <div className="flex gap-2"><button className="btn-primary">Save grade</button><button type="button" className="btn-ghost" onClick={returnIt}>Return for revision</button></div></form></div>)
}
