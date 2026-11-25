import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Empty, Badge, Modal, Field } from '../../components/ui'
import { LEVELS } from '../../lib/types'
import { remainingLabel, todayStr } from '../../lib/payments'

export default function Students() {
  const today = todayStr()
  const [q, setQ] = useState(''); const [lvl, setLvl] = useState(''); const [pay, setPay] = useState(''); const [att, setAtt] = useState(''); const [sort, setSort] = useState('name')
  const [note, setNote] = useState<any>(null)
  const { data, loading, error, reload } = useAsync(async () => {
    const [s, p, a, g, sub] = await Promise.all([
      supabase.from('student_profiles').select('user_id, student_code, level, phone, enrolled_on, last_active_at, profiles(full_name)').eq('active', true),
      supabase.rpc('payment_overview'),
      supabase.from('attendance_records').select('student_id, status').eq('lesson_date', today),
      supabase.from('teacher_grades').select('student_id, grade'),
      supabase.from('assignment_submissions').select('student_id, status').in('status', ['submitted', 'reviewed'])
    ])
    if (s.error) throw s.error; if (p.error) throw p.error
    return (s.data as any[]).map(x => {
      const po = (p.data as any[]).find(y => y.student_id === x.user_id); const gr = (g.data ?? []).filter((y: any) => y.student_id === x.user_id)
      return { ...x, name: x.profiles?.full_name ?? '', pay: po, att: (a.data ?? []).find((y: any) => y.student_id === x.user_id)?.status ?? null,
        done: (sub.data ?? []).filter((y: any) => y.student_id === x.user_id).length, avg: gr.length ? gr.reduce((t: number, y: any) => t + y.grade, 0) / gr.length : null }
    })
  }, [])
  const mark = async (id: string, status: string) => {
    const { error } = await supabase.from('attendance_records').upsert({ student_id: id, lesson_date: today, session_label: 'Lesson', status, recorded_by: (await supabase.auth.getUser()).data.user!.id }, { onConflict: 'student_id,lesson_date,session_label' })
    error ? toast.error(error.message) : (toast.success('Attendance saved'), reload())
  }
  const saveNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    const { error } = await supabase.from('teacher_notes').insert({ student_id: note.user_id, category: String(f.get('cat')) || null, body: String(f.get('body')), created_by: (await supabase.auth.getUser()).data.user!.id })
    error ? toast.error(error.message) : (toast.success('Note added'), setNote(null))
  }
  if (loading) return <Skeletons />; if (error) return <ErrorBox error={error} retry={reload} />
  let rows = data!.filter(r => (!q || r.name.toLowerCase().includes(q.toLowerCase())) && (!lvl || r.level === lvl) && (!pay || (r.pay?.status ?? 'unpaid') === pay) && (!att || (r.att ?? 'none') === att))
  rows = [...rows].sort((a, b) => sort === 'expiry' ? (a.pay?.days_remaining ?? -1e9) - (b.pay?.days_remaining ?? -1e9) : a.name.localeCompare(b.name))
  return (
    <div><PageHeader title="Student Register" subtitle="Students create their own accounts; they appear here automatically." />
      <div className="mb-4 grid gap-2 sm:grid-cols-5">
        <input className="input sm:col-span-2" placeholder="Search by name" value={q} onChange={e => setQ(e.target.value)} aria-label="Search by name" />
        <select className="input" value={lvl} onChange={e => setLvl(e.target.value)}><option value="">All levels</option>{LEVELS.map(l => <option key={l.code}>{l.code}</option>)}</select>
        <select className="input" value={pay} onChange={e => setPay(e.target.value)}><option value="">Any payment</option>{['paid', 'due_soon', 'due_today', 'overdue', 'unpaid'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
        <select className="input" value={att} onChange={e => setAtt(e.target.value)}><option value="">Any attendance today</option>{['present', 'absent', 'late', 'excused', 'none'].map(s => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="mb-3 text-xs text-slate-400">Sort: <button className="underline" onClick={() => setSort('name')}>name</button> · <button className="underline" onClick={() => setSort('expiry')}>payment expiry</button></div>
      {!rows.length ? <Empty title="No students match" /> :
        <Card className="overflow-x-auto !p-2"><table className="w-full min-w-[1000px]"><thead><tr>{['Student', 'ID', 'Level', 'Contact', 'Enrolled', 'Last activity', 'Today', 'Payment', 'Done', 'Avg', ''].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{rows.map(r => (<tr key={r.user_id} className="border-t border-white/10">
            <td className="td font-medium"><Link className="hover:underline" to={`/teacher/students/${r.user_id}`}>{r.name}</Link></td><td className="td text-xs">{r.student_code}</td><td className="td">{r.level}</td><td className="td text-xs">{r.phone ?? '—'}</td>
            <td className="td text-xs">{r.enrolled_on}</td><td className="td text-xs">{r.last_active_at ? new Date(r.last_active_at).toLocaleDateString() : '—'}</td>
            <td className="td"><select className="input !py-1 !text-xs" value={r.att ?? ''} onChange={e => e.target.value && mark(r.user_id, e.target.value)}><option value="">—</option>{['present', 'absent', 'late', 'excused'].map(s => <option key={s}>{s}</option>)}</select></td>
            <td className="td"><Badge kind={r.pay?.status ?? 'unpaid'}>{r.pay?.status?.replace('_', ' ') ?? 'unpaid'}</Badge><div className="text-[11px] text-slate-400">{remainingLabel(r.pay?.paid_through ?? null, today)}</div></td>
            <td className="td">{r.done}</td><td className="td">{r.avg ? r.avg.toFixed(1) : '—'}</td>
            <td className="td"><button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setNote(r)}>+ Note</button></td></tr>))}</tbody></table></Card>}
      <Modal open={!!note} onClose={() => setNote(null)} title={`Private note — ${note?.name}`}><form onSubmit={saveNote} className="space-y-3">
        <Field label="Category (optional)"><input className="input" name="cat" placeholder="e.g. Grammar, Payment reminder" /></Field>
        <Field label="Note"><textarea className="input min-h-24" name="body" required /></Field><button className="btn-primary">Save note</button></form></Modal>
    </div>)
}
