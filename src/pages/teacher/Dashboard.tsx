import { Link } from 'react-router-dom'
import { Users, Activity, AlertTriangle, Clock, CalendarCheck, ClipboardList, FileCheck2, Star, CheckCircle2, UserX } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, Stat, useAsync, Skeletons, ErrorBox } from '../../components/ui'
import { todayStr } from '../../lib/payments'

const head = (q: any) => q.then((r: any) => { if (r.error) throw r.error; return r.count ?? 0 })
export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(async () => {
    const week = new Date(Date.now() - 7 * 864e5).toISOString(); const now = new Date().toISOString(); const today = todayStr()
    const [total, active, essays, completed, pending, pay, att, board, late] = await Promise.all([
      head(supabase.from('student_profiles').select('user_id', { count: 'exact', head: true })),
      head(supabase.from('student_profiles').select('user_id', { count: 'exact', head: true }).gte('last_active_at', week)),
      head(supabase.from('essays').select('id', { count: 'exact', head: true }).eq('status', 'submitted')),
      head(supabase.from('exercise_attempts').select('id', { count: 'exact', head: true }).gt('points_awarded', 0).is('invalidated_at', null)),
      head(supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('published', true).gte('deadline', now)),
      supabase.rpc('payment_overview'),
      supabase.from('attendance_records').select('status').eq('lesson_date', today),
      supabase.rpc('get_leaderboard', { p_level: null }),
      supabase.from('assignment_submissions').select('id, assignments!inner(deadline)', { count: 'exact', head: true }).eq('status', 'in_progress').lt('assignments.deadline', now)
    ])
    if (pay.error) throw pay.error
    const p = pay.data as any[]; const b = (board.data ?? []) as any[]
    const att_c: Record<string, number> = {}; (att.data ?? []).forEach((a: any) => { att_c[a.status] = (att_c[a.status] ?? 0) + 1 })
    return { total, active, essays, completed, pending, late: late.count ?? 0, overdue: p.filter(x => x.status === 'overdue' || x.status === 'unpaid').length, soon: p.filter(x => x.status === 'due_soon' || x.status === 'due_today').length, att: att_c,
      avg: b.length ? Math.round(b.reduce((s, r) => s + r.points, 0) / b.length) : 0, levels: Object.entries(b.reduce((m: any, r) => (m[r.level] = (m[r.level] ?? 0) + 1, m), {})).map(([name, value]) => ({ name, value })) }
  }, [])
  if (loading) return <Skeletons n={4} />; if (error) return <ErrorBox error={error} retry={reload} />
  const d = data!; const L = (to: string, el: JSX.Element) => <Link to={to}>{el}</Link>
  const COLORS = ['#8b5cf6', '#2dd4bf', '#e0b95a', '#38bdf8', '#f472b6']
  return (
    <div><PageHeader title="Teacher Dashboard" subtitle="Every figure comes from live database records." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {L('/teacher/students', <Stat label="Registered students" value={d.total} icon={<Users />} />)}
        {L('/teacher/students', <Stat label="Active (last 7 days)" value={d.active} icon={<Activity />} />)}
        {L('/teacher/payments', <Stat label="Overdue / unpaid" value={d.overdue} icon={<AlertTriangle />} />)}
        {L('/teacher/payments', <Stat label="Payment due within 7 days" value={d.soon} icon={<Clock />} />)}
        {L('/teacher/attendance', <Stat label="Present today" value={d.att.present ?? 0} icon={<CalendarCheck />} />)}
        {L('/teacher/assignments', <Stat label="Open assignments" value={d.pending} icon={<ClipboardList />} />)}
        {L('/teacher/essays', <Stat label="Essays awaiting review" value={d.essays} icon={<FileCheck2 />} />)}
        {L('/teacher/ranking', <Stat label="Average student score" value={d.avg} icon={<Star />} />)}
        {L('/teacher/results', <Stat label="Exercises completed (all students)" value={d.completed} icon={<CheckCircle2 />} />)}
        {L('/teacher/assignments', <Stat label="Overdue unfinished submissions" value={d.late} icon={<UserX />} />)}
      </div>
      <Card className="mt-6"><h2 className="mb-2 font-semibold">Students by level</h2><div className="h-56"><ResponsiveContainer><PieChart><Pie data={d.levels} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} label>{d.levels.map((_, i) => <Cell key={i} fill={COLORS[i % 5]} />)}</Pie><Tooltip contentStyle={{ background: '#111846', border: 0, borderRadius: 12 }} /></PieChart></ResponsiveContainer></div></Card>
    </div>)
}
