import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Level } from '../lib/types'

export interface Me { display_name: string; full_name: string; avatar_url: string | null }
export interface StudentInfo { level: Level; student_code: string; streak: number; public_ranking: boolean; phone: string | null }
interface Ctx {
  session: Session | null; user: User | null; role: 'student' | 'teacher' | null
  me: Me | null; student: StudentInfo | null; loading: boolean
  signOut: () => Promise<void>; refresh: () => Promise<void>
}
const C = createContext<Ctx>(null as any)
export const useAuth = () => useContext(C)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<Ctx['role']>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (s: Session | null) => {
    if (!s) { setRole(null); setMe(null); setStudent(null); return }
    // Role comes from the database (user_roles) – never from a client-editable field. RLS lets users read only their own row.
    const [{ data: roles }, { data: p }, { data: sp }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', s.user.id),
      supabase.from('profiles').select('display_name, full_name, avatar_url').eq('id', s.user.id).maybeSingle(),
      supabase.from('student_profiles').select('level, student_code, streak, public_ranking, phone').eq('user_id', s.user.id).maybeSingle()
    ])
    const isTeacher = (roles ?? []).some((r: any) => r.role === 'teacher')
    setRole(isTeacher ? 'teacher' : roles?.length ? 'student' : null)
    setMe(p as Me | null); setStudent(sp as StudentInfo | null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); await load(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setTimeout(() => load(s), 0) })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const value: Ctx = {
    session, user: session?.user ?? null, role, me, student, loading,
    signOut: async () => { await supabase.auth.signOut() },
    refresh: async () => load(session)
  }
  return <C.Provider value={value}>{children}</C.Provider>
}
