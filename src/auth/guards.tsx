import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { FullPageSpinner } from '../components/ui'

/** UI guard only. Real protection = RLS + server functions; this just routes people sensibly. */
export function RequireRole({ role, children }: { role: 'student' | 'teacher'; children: ReactNode }) {
  const { user, role: r, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to={role === 'teacher' ? '/teacher/login' : '/login'} state={{ from: loc.pathname }} replace />
  if (role === 'teacher' && r !== 'teacher') return <Navigate to="/app" replace />
  if (role === 'student' && r === 'teacher') return <Navigate to="/teacher" replace />
  return <>{children}</>
}
