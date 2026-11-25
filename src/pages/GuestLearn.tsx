import { useState } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'
import { Curriculum } from '../components/Curriculum'
import { ExerciseView } from '../components/ExerciseView'
import { Card, useAsync, Skeletons, ErrorBox, Empty, ProgressBar } from '../components/ui'
import { LEVELS, Level, Exercise, CheckResult } from '../lib/types'
import { loadGuest, saveGuest, recordGuestResult, guestPoints } from '../lib/guest'

function Home() {
  const [g, setG] = useState(loadGuest()); const level = (g.level as Level) || null
  const pick = (l: Level) => { const s = { ...g, level: l }; saveGuest(s); setG(s) }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <b>Guest mode.</b> Your progress is saved only on this device and may be lost if you clear your browser data. Guest results are private: they are not shown to the teacher or in the official ranking. <Link to="/register" className="underline">Register to save progress to your account.</Link>
      </div>
      <Card className="flex flex-wrap items-center gap-6"><div><div className="text-2xl font-bold">{guestPoints(g)}</div><div className="text-xs text-slate-400">guest points</div></div>
        <div><div className="text-2xl font-bold">{Object.keys(g.done).length}</div><div className="text-xs text-slate-400">exercises completed</div></div>
        <div><div className="text-2xl font-bold">{g.attempts ? Math.round(100 * g.correct / g.attempts) : 0}%</div><div className="text-xs text-slate-400">correct</div></div></Card>
      <div className="flex flex-wrap gap-2">{LEVELS.map(l => <button key={l.code} onClick={() => pick(l.code)} className={level === l.code ? 'btn-primary' : 'btn-ghost'}>{l.title}</button>)}</div>
      {level ? <Curriculum level={level} lessonHref={id => `/learn/lesson/${id}`} /> : <Empty title="Choose your English level" />}
    </div>
  )
}

function GuestLesson() {
  const { id } = useParams(); const nav = useNavigate()
  const { data, loading, error, reload } = useAsync(async () => {
    const { data, error } = await supabase.from('exercises').select('id, lesson_id, position, type, prompt, data, max_points, explanation, manual_grading').eq('lesson_id', id!).order('position')
    if (error) throw error; return data as Exercise[]
  }, [id])
  const [i, setI] = useState(0)
  if (loading) return <Skeletons />
  if (error) return <ErrorBox error={error} retry={reload} />
  if (!data?.length) return <Empty title="This lesson has no exercises yet" />
  const ex = data[i]
  const submit = async (answer: any): Promise<CheckResult> => {
    const { data: r, error } = await supabase.rpc('check_answer', { p_exercise: ex.id, p_answer: answer })
    if (error) throw error
    if (!r.pending) recordGuestResult(ex.id, !!r.correct, r.points)
    return r as CheckResult
  }
  return (
    <Card className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between text-xs text-slate-400"><span>Exercise {i + 1} of {data.length}</span><button className="underline" onClick={() => nav('/learn')}>Return to lessons</button></div>
      <ProgressBar value={(i / data.length) * 100} className="mb-6" />
      <ExerciseView key={ex.id} ex={ex} onSubmit={submit} isLast={i === data.length - 1} onNext={() => i === data.length - 1 ? nav('/learn') : setI(i + 1)} />
    </Card>
  )
}

export default function GuestLearn() {
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <header className="mb-6 flex items-center justify-between"><Link to="/"><Logo compact /></Link><div className="flex gap-2"><Link to="/login" className="btn-ghost">Log in</Link><Link to="/register" className="btn-gold">Register</Link></div></header>
      <Routes><Route index element={<Home />} /><Route path="lesson/:id" element={<GuestLesson />} /></Routes>
    </div>
  )
}
