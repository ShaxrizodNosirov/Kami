import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpenCheck, PenLine, Trophy, ShieldCheck, Sparkles, GraduationCap } from 'lucide-react'
import { Logo } from '../components/Logo'
import { LEVELS } from '../lib/types'
import { useAuth } from '../auth/AuthContext'

const features = [
  { icon: BookOpenCheck, t: 'Structured lessons', d: 'A1 → B2 curriculum: Level → Unit → Lesson → Exercise, with instant explanations.' },
  { icon: PenLine, t: 'Essay coaching', d: 'AI feedback in seconds, then personal review and a 1–5 grade from your teacher.' },
  { icon: Trophy, t: 'Fair ranking', d: 'Points count once per exercise. No rewards for repeated clicking.' },
  { icon: GraduationCap, t: 'IELTS preparation', d: 'Task 1 and Task 2 practice with estimated band scores.' },
  { icon: ShieldCheck, t: 'Private & secure', d: 'Your answers and essays are visible only to you and your teacher.' },
  { icon: Sparkles, t: 'Try as a guest', d: 'Start learning instantly. Create an account whenever you want to save progress.' }
]
export default function Landing() {
  const { role } = useAuth()
  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between p-5">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Main">
          <Link to="/learn" className="btn-ghost hidden sm:inline-flex">Try as guest</Link>
          <Link to="/login" className="btn-ghost">Student login</Link>
          <Link to="/register" className="btn-gold">Register</Link>
        </nav>
      </header>
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-gold-400">Academic Writing Coach</p>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">Learn English with <span className="bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">clarity</span> and confidence.</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">Lessons, writing practice and personal feedback in one elegant platform — from A1 beginner to IELTS.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={role === 'teacher' ? '/teacher' : role ? '/app' : '/register'} className="btn-primary">{role ? 'Open my dashboard' : 'Create free account'}</Link>
              <Link to="/learn" className="btn-ghost">Start as guest</Link>
              <Link to="/teacher/login" className="px-2 py-2.5 text-sm text-slate-400 underline-offset-4 hover:underline">Teacher login</Link>
            </div>
          </motion.div>
          <motion.img initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} src="/img/masterclass.jpg" alt="Teacher leading an essay masterclass" className="rounded-3xl border border-white/10 shadow-glow" width={1411} height={752} />
        </section>
        <section className="mx-auto max-w-6xl px-5 pb-16" aria-labelledby="f">
          <h2 id="f" className="mb-6 font-display text-2xl font-bold">Everything in one place</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: I, t, d }) => (
              <motion.article key={t} whileHover={{ y: -4 }} className="glass p-5"><I className="mb-3 h-6 w-6 text-violet-300" /><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-400">{d}</p></motion.article>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <h2 className="mb-4 font-display text-2xl font-bold">Choose your level</h2>
          <div className="flex flex-wrap gap-3">{LEVELS.map(l => <Link key={l.code} to="/learn" className="glass card-hover px-5 py-3 text-sm font-semibold">{l.title}</Link>)}</div>
        </section>
      </main>
      <footer className="border-t border-white/10 p-6 text-center text-xs text-slate-500">© English by Kami</footer>
    </div>
  )
}
