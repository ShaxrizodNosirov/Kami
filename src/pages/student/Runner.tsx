import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ExerciseView } from '../../components/ExerciseView'
import { Card, useAsync, Skeletons, ErrorBox, Empty, ProgressBar, Modal } from '../../components/ui'
import { Exercise, CheckResult } from '../../lib/types'
import { ExitTracker, WARNINGS } from '../../lib/focus'

const COLS = 'id, lesson_id, position, type, prompt, data, max_points, explanation, manual_grading'

/** Runs a free lesson (/app/lesson/:id) or an assignment (/app/assignment/:id, optionally focus-mode protected). */
export default function Runner() {
  const { lessonId, assignmentId } = useParams(); const nav = useNavigate()
  const [i, setI] = useState(0)
  const [started, setStarted] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [reset, setReset] = useState(0)
  const subRef = useRef<any>(null)

  const { data, loading, error, reload } = useAsync(async () => {
    if (lessonId) {
      const { data, error } = await supabase.from('exercises').select(COLS).eq('lesson_id', lessonId).order('position')
      if (error) throw error; return { exercises: data as Exercise[], assignment: null as any, submission: null as any }
    }
    const { data: a, error: e1 } = await supabase.from('assignments').select('*').eq('id', assignmentId!).single(); if (e1) throw e1
    const { data: sub, error: e2 } = await supabase.rpc('start_submission', { p_assignment: assignmentId }); if (e2) throw e2
    const { data: links } = await supabase.from('assignment_exercises').select('exercise_id').eq('assignment_id', assignmentId!)
    const ids = (links ?? []).map((l: any) => l.exercise_id)
    const { data: ex } = ids.length ? await supabase.from('exercises').select(COLS).in('id', ids).order('position') : { data: [] }
    subRef.current = sub
    return { exercises: (ex ?? []) as Exercise[], assignment: a, submission: sub }
  }, [lessonId, assignmentId, reset])

  const a = data?.assignment; const focus = !!a?.focus_mode
  const submissionId: string | undefined = data?.submission?.id
  const locked = !!data?.submission && data.submission.status !== 'in_progress'
  const tracker = useMemo(() => new ExitTracker(), [reset])

  // Focus mode: a deterrent only. Merges visibilitychange+blur into ONE exit; the server also de-duplicates.
  useEffect(() => {
    if (!focus || !started || !submissionId || locked) return
    const onLeave = async (src: string) => {
      const w = tracker.leave(Date.now()); if (!w) return
      setWarning(WARNINGS[w])
      const { data: r, error } = await supabase.rpc('log_exit', { p_submission: submissionId, p_detail: src })
      if (error) return toast.error('Could not record the exit: ' + error.message)
      if (r?.reset) { toast.error('Assessment reset. Please start again.'); setStarted(false); setI(0); tracker.reset(); setReset(x => x + 1) }
    }
    const vis = () => document.hidden ? onLeave('visibilitychange') : tracker.back()
    const blur = () => onLeave('blur'); const focusBack = () => { if (!document.hidden) tracker.back() }
    document.addEventListener('visibilitychange', vis); window.addEventListener('blur', blur); window.addEventListener('focus', focusBack)
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('blur', blur); window.removeEventListener('focus', focusBack) }
  }, [focus, started, submissionId, locked, tracker])

  if (loading) return <Skeletons />
  if (error) return <ErrorBox error={error} retry={reload} />
  if (!data!.exercises.length) return <Empty title="No exercises here yet" />
  if (locked) return <Empty title={`This assignment is ${data!.submission.status}`} hint="You can't change answers after submission." />

  if (focus && !started) return (
    <Card className="mx-auto max-w-xl">
      <ShieldAlert className="mb-3 h-8 w-8 text-gold-400" />
      <h1 className="mb-2 font-display text-2xl font-bold">Focus mode assessment</h1>
      <ul className="mb-5 list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li>Stay on this page until you finish. Leaving the tab or window is recorded.</li>
        <li>You get 3 warnings.{a.reset_on_third_exit ? ' On the third exit this attempt is cleared and you must restart.' : ''}</li>
        <li>Your earlier work and essays are never deleted.</li>
        <li>This is a deterrent. Your teacher sees the exit log and decides what it means.</li>
      </ul>
      <button className="btn-primary" onClick={() => setStarted(true)}>I understand — start</button>
    </Card>
  )

  const ex = data!.exercises[i]
  const submit = async (answer: any) => {
    const { data: r, error } = await supabase.rpc('submit_answer', { p_exercise: ex.id, p_answer: answer, p_submission: submissionId ?? null })
    if (error) { toast.error(error.message); throw error }
    return r as CheckResult
  }
  const next = async () => {
    if (i < data!.exercises.length - 1) return setI(i + 1)
    if (submissionId) { const { error } = await supabase.rpc('finish_submission', { p_submission: submissionId }); if (error) return toast.error(error.message); toast.success('Assignment submitted!') }
    nav(submissionId ? '/app/assignments' : '/app/learn')
  }
  return (
    <Card className="mx-auto max-w-2xl">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>{a ? a.title : 'Lesson'} · Exercise {i + 1} of {data!.exercises.length}</span>
        <button className="underline" onClick={() => nav(-1)}>Return to lesson</button>
      </div>
      <ProgressBar value={(i / data!.exercises.length) * 100} className="mb-6" />
      <ExerciseView key={ex.id + reset} ex={ex} onSubmit={submit} onNext={next} isLast={i === data!.exercises.length - 1} />
      <Modal open={!!warning} onClose={() => setWarning(null)} title="Assessment notice"><p className="mb-4 text-sm">{warning}</p><div className="flex justify-end"><button className="btn-primary" onClick={() => setWarning(null)}>Back to exercise</button></div></Modal>
    </Card>
  )
}
