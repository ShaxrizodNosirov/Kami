import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Empty } from '../../components/ui'

export default function Progress() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsync(async () => {
    const { data, error } = await supabase.from('exercise_attempts').select('id, is_correct, points_awarded, created_at, exercises(prompt)').eq('user_id', user!.id).is('invalidated_at', null).order('created_at', { ascending: false }).limit(300)
    if (error) throw error; return data as any[]
  }, [user?.id])
  if (loading) return <Skeletons />
  if (error) return <ErrorBox error={error} retry={reload} />
  const byDay: Record<string, { day: string; points: number; attempts: number }> = {}
  for (const a of data!) { const d = a.created_at.slice(0, 10); byDay[d] ??= { day: d.slice(5), points: 0, attempts: 0 }; byDay[d].points += a.points_awarded; byDay[d].attempts += 1 }
  const chart = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([, v]) => v)
  return (
    <div><PageHeader title="My Progress" subtitle="Your learning history (last 300 attempts)." />
      {!data!.length ? <Empty title="No activity yet" hint="Complete an exercise to see your progress." /> : <>
        <Card className="mb-5"><h2 className="mb-3 font-semibold">Points earned per day</h2>
          <div className="h-64"><ResponsiveContainer><BarChart data={chart}><CartesianGrid stroke="rgba(255,255,255,.08)" /><XAxis dataKey="day" stroke="#94a3b8" /><YAxis stroke="#94a3b8" allowDecimals={false} /><Tooltip contentStyle={{ background: '#111846', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12 }} /><Bar dataKey="points" fill="#8b5cf6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><h2 className="mb-3 font-semibold">Recent attempts</h2><div className="divide-y divide-white/10">{data!.slice(0, 25).map(a => (
          <div key={a.id} className="flex justify-between py-2 text-sm"><span className="truncate pr-3">{a.exercises?.prompt}</span><span className={a.is_correct ? 'text-emerald-300' : a.is_correct === false ? 'text-red-300' : 'text-sky-300'}>{a.is_correct ? `✓ +${a.points_awarded}` : a.is_correct === false ? '✗' : 'review'}</span></div>))}</div></Card></>}
    </div>)
}
