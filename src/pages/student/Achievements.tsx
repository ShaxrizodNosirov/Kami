import { Award, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox } from '../../components/ui'
export default function Achievements() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsync(async () => {
    const [a, u] = await Promise.all([supabase.from('achievements').select('*'), supabase.from('user_achievements').select('code, earned_at').eq('user_id', user!.id)])
    if (a.error) throw a.error; return { a: a.data ?? [], u: u.data ?? [] }
  }, [user?.id])
  if (loading) return <Skeletons />; if (error) return <ErrorBox error={error} retry={reload} />
  return (<div><PageHeader title="Achievements" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data!.a.map((a: any) => { const got = data!.u.find((x: any) => x.code === a.code)
    return <Card key={a.code} className={got ? '' : 'opacity-50'}>{got ? <Award className="mb-2 h-7 w-7 text-gold-400" /> : <Lock className="mb-2 h-7 w-7" />}<div className="font-semibold">{a.title}</div><div className="text-sm text-slate-400">{a.description}</div>{got && <div className="mt-2 text-xs text-slate-500">Earned {new Date(got.earned_at).toLocaleDateString()}</div>}</Card> })}</div></div>)
}
