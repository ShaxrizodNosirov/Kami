import { ReactNode, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, LogOut, Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'

export interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean }

export function Shell({ items, base, portal }: { items: NavItem[]; base: string; portal: string }) {
  const { me, signOut, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])

  useEffect(() => {
    if (!user) return
    const count = async () => { const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null); setUnread(count ?? 0) }
    count()
    const ch = supabase.channel('notif-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, count).subscribe()
    const iv = setInterval(count, 60_000)   // fallback if realtime is unavailable
    return () => { supabase.removeChannel(ch); clearInterval(iv) }
  }, [user])

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label={portal}>
      {items.map(i => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) =>
          `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-violet-500/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
          {({ isActive }) => (<>{isActive && <motion.span layoutId={`${portal}-active`} className="absolute left-0 h-6 w-1 rounded-r bg-gold-400" />}<span className="h-5 w-5">{i.icon}</span>{i.label}</>)}
        </NavLink>
      ))}
    </nav>
  )
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-white/10 bg-navy-900/60 p-4 backdrop-blur lg:flex">
        <Link to={base}><Logo compact /></Link>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{portal}</div>
        {nav}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-navy-950/80 px-4 py-3 backdrop-blur">
          <button className="btn-ghost lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm text-slate-400 lg:block">{portal}</div>
          <div className="flex items-center gap-3">
            <Link to={`${base}/notifications`} className="btn-ghost relative !px-3" aria-label={`Notifications, ${unread} unread`}>
              <Bell className="h-5 w-5" />{unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-violet-500 px-1 text-[10px] font-bold">{unread}</span>}
            </Link>
            <div className="hidden text-sm sm:block">{me?.display_name}</div>
            <button className="btn-ghost !px-3" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
        </header>
        <AnimatePresence>{open && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="absolute left-0 top-0 flex h-full w-72 flex-col gap-4 bg-navy-900 p-4">
              <div className="flex items-center justify-between"><Logo compact /><button onClick={() => setOpen(false)} aria-label="Close menu"><X /></button></div>{nav}
            </motion.div>
          </motion.div>)}
        </AnimatePresence>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}><Outlet /></motion.div>
        </main>
      </div>
    </div>
  )
}
