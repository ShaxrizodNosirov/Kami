import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Empty, Badge } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'

export default function Assignments() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsync(async () => {
    const [a, s, g] = await Promise.all([
      supabase.from('assignments').select('*').eq('published', true).order('deadline', { nullsFirst: false }),
      supabase.from('assignment_submissions').select('assignment_id, status').eq('student_id', user!.id),
      supabase.from('teacher_grades').select('submission_id, grade, comments, recommendations').eq('student_id', user!.id)
    ])
    if (a.error) throw a.error
    return { a: a.data ?? [], s: s.data ?? [], g: g.data ?? [] }
  }, [user?.id])
  if (loading) return <Skeletons />
  if (error) return <ErrorBox error={error} retry={reload} />
  if (!data!.a.length) return <Empty title="No assignments yet" />
  return (
    <div><PageHeader title="Assignments" />
      <div className="space-y-3">{data!.a.map((a: any) => {
        const sub: any = data!.s.find((x: any) => x.assignment_id === a.id)
        const overdue = a.deadline && new Date(a.deadline) < new Date() && (!sub || sub.status === 'in_progress')
        const status = overdue ? 'overdue' : sub?.status ?? 'not_started'
        return (
          <Card key={a.id} hover className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="font-semibold">{a.title}</div><div className="text-xs text-slate-400">{a.deadline ? `Due ${new Date(a.deadline).toLocaleString()}` : 'No deadline'} · up to {a.max_points} pts{a.focus_mode ? ' · Focus mode' : ''}</div>{a.instructions && <p className="mt-1 text-sm text-slate-300">{a.instructions}</p>}</div>
            <div className="flex items-center gap-3"><Badge kind={status === 'overdue' ? 'overdue' : 'default'}>{status.replace('_', ' ')}</Badge>
              {(!sub || sub.status === 'in_progress' || sub.status === 'returned') && <Link className="btn-primary" to={`/app/assignment/${a.id}`}>{sub ? 'Continue' : 'Start'}</Link>}</div>
          </Card>)})}</div></div>)
}
