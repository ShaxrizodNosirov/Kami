import { FormEvent, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'
import { Field } from '../components/ui'
import { LEVELS, Level } from '../lib/types'
import { loadGuest, clearGuest } from '../lib/guest'

function Frame({ title, children, foot }: { title: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="glass w-full max-w-md p-7">
        <Link to="/"><Logo /></Link>
        <h1 className="mb-5 mt-6 font-display text-2xl font-bold">{title}</h1>
        {children}<div className="mt-5 text-center text-sm text-slate-400">{foot}</div>
      </div>
    </div>
  )
}

function useSignIn(expect: 'student' | 'teacher') {
  const nav = useNavigate(); const loc: any = useLocation(); const [busy, setBusy] = useState(false)
  const run = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: String(f.get('email')), password: String(f.get('password')) })
    if (error) { setBusy(false); return toast.error(error.message) }
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id)
    const isTeacher = (roles ?? []).some((r: any) => r.role === 'teacher'); setBusy(false)
    if (expect === 'teacher' && !isTeacher) { await supabase.auth.signOut(); return toast.error('This account is not authorised for the teacher dashboard.') }
    nav(isTeacher ? '/teacher' : (loc.state?.from?.startsWith('/app') ? loc.state.from : '/app'), { replace: true })
  }
  return { run, busy }
}

export function Login() {
  const { run, busy } = useSignIn('student')
  return (
    <Frame title="Student login" foot={<>New here? <Link className="text-gold-300 underline" to="/register">Register</Link> · <Link className="underline" to="/learn">Continue as guest</Link></>}>
      <form onSubmit={run} className="space-y-4">
        <Field label="Email"><input className="input" name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Password"><input className="input" name="password" type="password" required autoComplete="current-password" /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </Frame>
  )
}
export function TeacherLogin() {
  const { run, busy } = useSignIn('teacher')
  return (
    <Frame title="Teacher login" foot={<Link to="/" className="underline">Back to website</Link>}>
      <form onSubmit={run} className="space-y-4">
        <Field label="Email"><input className="input" name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Password"><input className="input" name="password" type="password" required autoComplete="current-password" /></Field>
        <button className="btn-gold w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in as teacher'}</button>
      </form>
    </Frame>
  )
}
export function Register() {
  const nav = useNavigate(); const [busy, setBusy] = useState(false); const guest = loadGuest()
  const [level, setLevel] = useState<Level>((guest.level as Level) || 'A1')
  const hasGuest = Object.keys(guest.done).length > 0
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: String(f.get('email')), password: String(f.get('password')),
      options: { data: { full_name: String(f.get('name')), level }, emailRedirectTo: window.location.origin + '/app' }   // role is never sent
    })
    setBusy(false)
    if (error) return toast.error(error.message)
    if (!data.session) { toast.success('Check your email to verify your account, then log in.'); return nav('/login') }
    // Guest progress is NOT trusted for scoring: it is kept locally and the student re-earns official points by completing exercises.
    if (hasGuest) toast.info('Your guest progress stays on this device. Official points are earned by completing exercises while logged in.')
    clearGuest(); nav('/app', { replace: true })
  }
  return (
    <Frame title="Create your account" foot={<>Already registered? <Link className="text-gold-300 underline" to="/login">Log in</Link></>}>
      {hasGuest && <p className="mb-4 rounded-xl bg-violet-500/15 p-3 text-xs text-violet-200">You have guest progress on this device. After registering you can continue at the same level; official ranking points are awarded only for work done while logged in.</p>}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name"><input className="input" name="name" required minLength={2} maxLength={80} autoComplete="name" /></Field>
        <Field label="Email"><input className="input" name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Password (min 8 characters)"><input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" /></Field>
        <Field label="English level"><select className="input" value={level} onChange={e => setLevel(e.target.value as Level)}>{LEVELS.map(l => <option key={l.code} value={l.code}>{l.title}</option>)}</select></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
      </form>
    </Frame>
  )
}
