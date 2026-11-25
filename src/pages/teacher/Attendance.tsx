import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Empty, Badge } from '../../components/ui'
import { todayStr } from '../../lib/payments'
import type { AttendanceStatus } from '../../lib/types'

export default function Attendance() {
  const [date, setDate] = useState(todayStr()); const [label, setLabel] = useState('Lesson')
  const { data, loading, error, reload } = useAsync(async () => {
    const [s, a] = await Promise.all([supabase.from('student_profiles').select('user_id, student_code, level, profiles(full_name)').eq('active', true), supabase.from('attendance_records').select('*').eq('lesson_date', date).eq('session_label', label)])
    if (s.error) throw s.error; return { s: s.data as any[], a: a.data ?? [] }
  }, [date, label])
  const set = async (sid: string, status: AttendanceStatus) => {
    const existing = data!.a.find((x: any) => x.student_id === sid)
    const { error } = await supabase.from('attendance_records').upsert({ student_id: sid, lesson_date: date, session_label: label, status, recorded_by: (await supabase.auth.getUser()).data.user!.id, corrected_at: existing ? new Date().toISOString() : null }, { onConflict: 'student_id,lesson_date,session_label' })
    error ? toast.error(error.message) : reload()
  }
  return (<div><PageHeader title="Attendance" subtitle="One record per student, date and session. Changing a record is saved as a correction." />
    <div className="mb-4 flex flex-wrap gap-3"><input type="date" className="input !w-auto" value={date} onChange={e => setDate(e.target.value)} /><input className="input !w-48" value={label} onChange={e => setLabel(e.target.value || 'Lesson')} aria-label="Session label" /></div>
    {loading ? <Skeletons /> : error ? <ErrorBox error={error} retry={reload} /> : !data!.s.length ? <Empty title="No students" /> :
      <Card className="!p-2">{data!.s.map((s: any) => { const rec = data!.a.find((x: any) => x.student_id === s.user_id)
        return (<div key={s.user_id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3 last:border-0"><div><div className="font-medium">{s.profiles?.full_name}</div><div className="text-xs text-slate-400">{s.student_code} · {s.level} {rec?.corrected_at && '· corrected'}</div></div>
          <div className="flex gap-1.5">{(['present', 'late', 'excused', 'absent'] as AttendanceStatus[]).map(st => <button key={st} onClick={() => set(s.user_id, st)} className={rec?.status === st ? 'btn-primary !py-1.5 text-xs' : 'btn-ghost !py-1.5 text-xs'}>{st}</button>)}</div></div>) })}</Card>}</div>)
}
