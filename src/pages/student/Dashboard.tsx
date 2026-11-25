import { Link } from 'react-router-dom'
import { CheckCircle2, Target, Trophy, Flame, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { Card, PageHeader, Stat, ProgressBar, useAsync, Skeletons, ErrorBox, Empty } from '../../components/ui'
import { percent } from '../../lib/scoring'

export default function Dashboard() {
  const { me, student, user } = useAuth()
  const { data, loading, error, reload } = useAsync(async () => {
    const [stats, grades, asg] = await Promise.all([
      supabase.rpc('my_stats'),
      supabase.from('teacher_grades').select('grade, comments, graded_at').eq('student_id', user!.id).order('graded_at', { ascending: false }).limit(3),
      supabase.from('assignments').select('id, title, deadline').eq('published', true).order('deadline', { ascending: true, nullsFirst: false }).limit(5)
    ])
    if (stats.error) throw stats.error
    return { s: stats.data as any, grades: grades.data ?? [], asg: asg.data ?? [] }
  }, [user?.id])
  if (loading) return <Skeletons n={4} />
  if (error) return <ErrorBox error={error} retry={reload} />
  const s = data!.s
  const acc = percent(s.correct, s.attempts)
  const levelPct = percent(s.completed, s.level_total)
  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${me?.display_name ?? 'student'}`} subtitle={`Level ${student?.level} · Student ID ${student?.student_code}`} actions={<Link to="/app/learn" className="btn-primary">Continue Learning</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Exercises completed" value={s.completed} icon={<CheckCircle2 />} />
        <Stat label="Correct answers" value={acc} suffix="%" decimals={1} icon={<Target />} />
        <Stat label="Total score" value={s.points} icon={<Star />} />
        <Stat label="Leaderboard position" value={s.rank ? `#${s.rank}` : 'Hidden'} icon={<Trophy />} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-2 flex justify-between text-sm"><span className="font-semibold">Progress in {student?.level}</span><span className="text-slate-400">{s.completed} / {s.level_total} exercises</span></div>
          <ProgressBar value={levelPct} /><p className="mt-2 text-xs text-slate-400">{levelPct}% of published {student?.level} exercises completed.</p>
          <div className="mt-5 flex items-center gap-2 text-sm"><Flame className="h-5 w-5 text-orange-400" /> <b>{s.streak}</b> day learning streak</div>
        </Card>
        <Card><h2 className="mb-3 font-semibold">Recent teacher feedback</h2>
          {data!.grades.length === 0 ? <p className="text-sm text-slate-400">No feedback yet.</p> : data!.grades.map((g: any, i: number) => (
            <div key={i} className="mb-3 border-b border-white/10 pb-3 last:border-0"><div className="text-sm font-semibold">Grade {g.grade}/5</div>{g.comments && <p className="text-xs text-slate-400">{g.comments}</p>}</div>))}
        </Card>
      </div>
      <Card><h2 className="mb-3 font-semibold">Upcoming assignments</h2>
        {data!.asg.length === 0 ? <Empty title="Nothing assigned right now" /> : data!.asg.map((a: any) => (
          <Link key={a.id} to={`/app/assignment/${a.id}`} className="flex justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-white/5"><span>{a.title}</span><span className="text-slate-400">{a.deadline ? new Date(a.deadline).toLocaleDateString() : 'No deadline'}</span></Link>))}
      </Card>
    </div>
  )
}
