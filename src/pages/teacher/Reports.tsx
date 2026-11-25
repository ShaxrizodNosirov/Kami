import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox } from '../../components/ui'

export default function Reports() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [pay, att, grades, board] = await Promise.all([supabase.from('payment_records').select('amount, paid_on'), supabase.from('attendance_records').select('status'), supabase.from('teacher_grades').select('grade'), supabase.rpc('get_leaderboard', { p_level: null })])
    const inc: Record<string, number> = {}; (pay.data ?? []).forEach((p: any) => { const m = p.paid_on.slice(0, 7); inc[m] = (inc[m] ?? 0) + Number(p.amount) })
    const at: Record<string, number> = {}; (att.data ?? []).forEach((a: any) => { at[a.status] = (at[a.status] ?? 0) + 1 })
    const gd: Record<string, number> = {}; (grades.data ?? []).forEach((g: any) => { gd[g.grade] = (gd[g.grade] ?? 0) + 1 })
    const lv: Record<string, { n: number; pts: number }> = {}; ((board.data ?? []) as any[]).forEach(r => { lv[r.level] ??= { n: 0, pts: 0 }; lv[r.level].n++; lv[r.level].pts += r.points })
    return { income: Object.entries(inc).sort().map(([m, v]) => ({ m, v })), att: Object.entries(at).map(([k, v]) => ({ k, v })), gd: [1, 2, 3, 4, 5].map(g => ({ k: `${g}`, v: gd[g] ?? 0 })), lv: Object.entries(lv).map(([k, x]) => ({ k, v: Math.round(x.pts / x.n) })) }
  }, [])
  if (loading) return <Skeletons />; if (error) return <ErrorBox error={error} retry={reload} />
  const Chart = ({ title, rows, x }: { title: string; rows: any[]; x: string }) => <Card><h2 className="mb-2 font-semibold">{title}</h2><div className="h-56"><ResponsiveContainer><BarChart data={rows}><CartesianGrid stroke="rgba(255,255,255,.08)" /><XAxis dataKey={x} stroke="#94a3b8" /><YAxis stroke="#94a3b8" allowDecimals={false} /><Tooltip contentStyle={{ background: '#111846', border: 0, borderRadius: 12 }} /><Bar dataKey="v" fill="#8b5cf6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
  return (<div><PageHeader title="Reports & Statistics" /><div className="grid gap-5 lg:grid-cols-2">
    <Chart title="Income by month" rows={data!.income} x="m" /><Chart title="Attendance records by status" rows={data!.att} x="k" /><Chart title="Teacher grade distribution" rows={data!.gd} x="k" /><Chart title="Average score by level" rows={data!.lv} x="k" /></div></div>)
}
