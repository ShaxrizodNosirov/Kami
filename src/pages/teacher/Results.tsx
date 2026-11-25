import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Empty, Badge } from '../../components/ui'

export default function Results() {
  const [tab, setTab] = useState<'attempts' | 'events'>('attempts')
  const { data, loading, error, reload } = useAsync(async () => {
    const [a, e] = await Promise.all([
      supabase.from('exercise_attempts').select('id, is_correct, points_awarded, needs_review, invalidated_at, invalid_reason, created_at, answer, profiles(full_name), exercises(prompt)').order('created_at', { ascending: false }).limit(200),
      supabase.from('assessment_events').select('id, event_type, warning_no, detail, created_at, attempt_no, profiles(full_name), assignment_submissions(assignments(title))').in('event_type', ['exit', 'reset']).order('created_at', { ascending: false }).limit(200)])
    if (a.error) throw a.error; return { a: a.data as any[], e: (e.data ?? []) as any[] }
  }, [])
  return (<div><PageHeader title="Exercise Results" />
    <div className="mb-4 flex gap-2"><button className={tab === 'attempts' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('attempts')}>Attempts</button><button className={tab === 'events' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('events')}>Focus-mode exits & resets</button></div>
    {loading ? <Skeletons /> : error ? <ErrorBox error={error} retry={reload} /> : tab === 'attempts' ? (!data!.a.length ? <Empty title="No attempts yet" /> :
      <Card className="overflow-x-auto !p-2"><table className="w-full min-w-[700px]"><thead><tr>{['When', 'Student', 'Exercise', 'Answer', 'Result', 'Pts'].map(h => <th key={h} className="th">{h}</th>)}</tr></thead><tbody>{data!.a.map(r => <tr key={r.id} className="border-t border-white/10 text-xs">
        <td className="td">{new Date(r.created_at).toLocaleString()}</td><td className="td">{r.profiles?.full_name}</td><td className="td max-w-xs truncate">{r.exercises?.prompt}</td><td className="td max-w-[180px] truncate">{r.answer ? JSON.stringify(r.answer) : '—'}</td>
        <td className="td">{r.invalidated_at ? <Badge kind="overdue">invalidated</Badge> : r.needs_review ? <Badge>review</Badge> : r.is_correct ? <Badge kind="paid">correct</Badge> : <Badge kind="absent">wrong</Badge>}</td><td className="td">{r.points_awarded}</td></tr>)}</tbody></table></Card>) :
      (!data!.e.length ? <Empty title="No exits recorded" /> : <Card className="!p-2"><p className="p-3 text-xs text-slate-400">Focus-loss events are a deterrent signal, not proof of cheating. Consider context (notifications, connectivity, accidental clicks) before drawing conclusions.</p>{data!.e.map(e => <div key={e.id} className="flex flex-wrap justify-between gap-2 border-t border-white/10 p-3 text-sm"><span>{e.profiles?.full_name} · {e.assignment_submissions?.assignments?.title} · attempt {e.attempt_no}</span><span className="text-slate-400">{e.event_type === 'reset' ? <Badge kind="overdue">reset</Badge> : `exit ${e.warning_no}/3 (${e.detail ?? ''})`} · {new Date(e.created_at).toLocaleString()}</span></div>)}</Card>)}
  </div>)
}
