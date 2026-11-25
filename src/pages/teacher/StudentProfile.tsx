import { FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Badge, Field } from '../../components/ui'
import { LEVELS } from '../../lib/types'

export default function StudentProfile() {
  const { id } = useParams()
  const { data, loading, error, reload } = useAsync(async () => {
    const q = <T,>(p: PromiseLike<{ data: T | null; error: any }>) => p.then(r => { if (r.error) throw r.error; return r.data })
    const [s, notes, grades, att, pay, events, sched] = await Promise.all([
      q(supabase.from('student_profiles').select('*, profiles(full_name, display_name)').eq('user_id', id!).single()),
      q(supabase.from('teacher_notes').select('*').eq('student_id', id!).order('created_at', { ascending: false })),
      q(supabase.from('teacher_grades').select('*').eq('student_id', id!).order('graded_at', { ascending: false })),
      q(supabase.from('attendance_records').select('*').eq('student_id', id!).order('lesson_date', { ascending: false }).limit(30)),
      q(supabase.from('payment_records').select('*').eq('student_id', id!).order('paid_on', { ascending: false })),
      q(supabase.from('assessment_events').select('*').eq('user_id', id!).order('created_at', { ascending: false }).limit(30)),
      q(supabase.from('payment_schedules').select('*').eq('student_id', id!).maybeSingle())
    ])
    return { s: s as any, notes: notes as any[], grades: grades as any[], att: att as any[], pay: pay as any[], events: events as any[], sched: sched as any }
  }, [id])
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    const r1 = await supabase.from('student_profiles').update({ level: String(f.get('level')), phone: String(f.get('phone')) || null, active: f.get('active') === 'on', public_ranking: f.get('pub') === 'on' }).eq('user_id', id!)
    const r2 = await supabase.from('payment_schedules').upsert({ student_id: id!, monthly_amount: Number(f.get('fee') || 0), start_date: data!.sched?.start_date ?? new Date().toISOString().slice(0, 10) })
    const err = r1.error ?? r2.error; err ? toast.error(err.message) : (toast.success('Saved'), reload())
  }
  const delNote = async (nid: string) => { const { error } = await supabase.from('teacher_notes').delete().eq('id', nid); error ? toast.error(error.message) : reload() }
  if (loading) return <Skeletons />; if (error) return <ErrorBox error={error} retry={reload} />
  const d = data!
  return (
    <div className="space-y-5"><Link to="/teacher/students" className="text-xs text-slate-400 underline">← Student register</Link>
      <PageHeader title={d.s.profiles?.full_name} subtitle={`${d.s.student_code} · enrolled ${d.s.enrolled_on}`} />
      <Card><form onSubmit={save} className="grid gap-3 sm:grid-cols-4">
        <Field label="Level"><select name="level" className="input" defaultValue={d.s.level}>{LEVELS.map(l => <option key={l.code}>{l.code}</option>)}</select></Field>
        <Field label="Phone"><input name="phone" className="input" defaultValue={d.s.phone ?? ''} /></Field>
        <Field label="Monthly fee"><input name="fee" type="number" min="0" step="0.01" className="input" defaultValue={d.sched?.monthly_amount ?? 0} /></Field>
        <div className="flex flex-col justify-end gap-1 text-sm"><label><input type="checkbox" name="active" defaultChecked={d.s.active} /> Active</label><label><input type="checkbox" name="pub" defaultChecked={d.s.public_ranking} /> Show on public ranking</label></div>
        <button className="btn-primary sm:col-span-4 sm:w-40">Save changes</button></form></Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><h2 className="mb-2 font-semibold">Private notes (never visible to the student)</h2>{!d.notes.length && <p className="text-sm text-slate-400">No notes.</p>}{d.notes.map(n => <div key={n.id} className="mb-2 rounded-xl bg-white/5 p-3 text-sm"><div className="flex justify-between text-xs text-slate-400"><span>{n.category ?? 'Note'} · {new Date(n.created_at).toLocaleDateString()}</span><button className="underline" onClick={() => delNote(n.id)}>delete</button></div>{n.body}</div>)}</Card>
        <Card><h2 className="mb-2 font-semibold">Teacher grades</h2>{!d.grades.length && <p className="text-sm text-slate-400">No grades yet.</p>}{d.grades.map(g => <div key={g.id} className="mb-2 text-sm"><b>{g.grade}/5</b> <span className="text-slate-400">{new Date(g.graded_at).toLocaleDateString()}</span> {g.comments}</div>)}</Card>
        <Card><h2 className="mb-2 font-semibold">Attendance (last 30)</h2><div className="flex flex-wrap gap-1.5">{d.att.map(a => <span key={a.id} title={a.lesson_date}><Badge kind={a.status}>{a.lesson_date.slice(5)} {a.status}</Badge></span>)}</div></Card>
        <Card><h2 className="mb-2 font-semibold">Payment history</h2>{!d.pay.length && <p className="text-sm text-slate-400">No payments recorded.</p>}{d.pay.map(p => <div key={p.id} className="text-sm">{p.paid_on} · {p.amount} · covers until {p.period_end}</div>)}</Card>
        <Card className="lg:col-span-2"><h2 className="mb-2 font-semibold">Assessment events</h2>{!d.events.length && <p className="text-sm text-slate-400">None.</p>}{d.events.map(e => <div key={e.id} className="text-sm"><span className="text-slate-400">{new Date(e.created_at).toLocaleString()}</span> · {e.event_type}{e.warning_no ? ` (warning ${e.warning_no})` : ''}{e.detail ? ` — ${e.detail}` : ''}</div>)}</Card>
      </div></div>)
}
