
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
      supabase
        .from('teacher_grades')
        .select('grade, comments, graded_at')
        .eq('student_id', user!.id)
        .order('graded_at', { ascending: false })
        .limit(3),
      supabase
        .from('assignments')
        .select('id, title, deadline')
        .eq('published', true)
        .order('deadline', { ascending: true, nullsFirst: false })
        .limit(5)
    ])

    if (stats.error) throw stats.error
    if (grades.error) throw grades.error
    if (asg.error) throw asg.error

    return {
      s: stats.data,
      grades: grades.data ?? [],
      asg: asg.data ?? []
    }
  }, [user?.id])

  if (loading) return <Skeletons n={4} />

  if (error) return <ErrorBox error={error} retry={reload} />

  const hasStats = data?.s != null

  const s = data?.s ?? {
    completed: 0,
    points: 0,
    attempts: 0,
    correct: 0,
    streak: 0,
    rank: null,
    level_total: 0
  }

  const grades = data?.grades ?? []
  const assignments = data?.asg ?? []

  const acc = percent(s.correct, s.attempts)
  const levelPct = percent(s.completed, s.level_total)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${me?.display_name ?? 'student'}`}
        subtitle={`Level ${student?.level ?? '—'} · Student ID ${student?.student_code ?? '—'}`}
        actions={
          <Link to="/app/learn" className="btn-primary">
            Continue Learning
          </Link>
        }
      />

      {!hasStats && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
          Your statistics are not available yet. Your dashboard is working,
          but your student profile or statistics may need to be checked.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Exercises completed"
          value={s.completed}
          icon={<CheckCircle2 />}
        />

        <Stat
          label="Correct answers"
          value={acc}
          suffix="%"
          decimals={1}
          icon={<Target />}
        />

        <Stat
          label="Total score"
          value={s.points}
          icon={<Star />}
        />

        <Stat
          label="Leaderboard position"
          value={s.rank ? `#${s.rank}` : 'Hidden'}
          icon={<Trophy />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold">
              Progress in {student?.level ?? 'your level'}
            </span>
            <span className="text-slate-400">
              {s.completed} / {s.level_total} exercises
            </span>
          </div>

          <ProgressBar value={levelPct} />

          <p className="mt-2 text-xs text-slate-400">
            {levelPct}% of published {student?.level ?? ''} exercises completed.
          </p>

          <div className="mt-5 flex items-center gap-2 text-sm">
            <Flame className="h-5 w-5 text-orange-400" />
            <b>{s.streak}</b> day learning streak
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Recent teacher feedback</h2>

          {grades.length === 0 ? (
            <p className="text-sm text-slate-400">No feedback yet.</p>
          ) : (
            grades.map((g: any, i: number) => (
              <div
                key={i}
                className="mb-3 border-b border-white/10 pb-3 last:border-0"
              >
                <div className="text-sm font-semibold">
                  Grade {g.grade}/5
                </div>

                {g.comments && (
                  <p className="text-xs text-slate-400">{g.comments}</p>
                )}
              </div>
            ))
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Upcoming assignments</h2>

        {assignments.length === 0 ? (
          <Empty title="Nothing assigned right now" />
        ) : (
          assignments.map((a: any) => (
            <Link
              key={a.id}
              to={`/app/assignment/${a.id}`}
              className="flex justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-white/5"
            >
              <span>{a.title}</span>
              <span className="text-slate-400">
                {a.deadline
                  ? new Date(a.deadline).toLocaleDateString()
                  : 'No deadline'}
              </span>
            </Link>
          ))
        )}
      </Card>
    </div>
  )
}
