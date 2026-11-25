import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { Card, PageHeader, Field } from '../../components/ui'
import { LEVELS, Level } from '../../lib/types'
export default function Settings() {
  const { me, student, user, refresh } = useAuth()
  const [pub, setPub] = useState(student?.public_ranking ?? true); const [emailN, setEmailN] = useState(true)
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    const { error } = await supabase.rpc('set_my_profile', { p_display: String(f.get('display')), p_level: String(f.get('level')) as Level, p_phone: String(f.get('phone') || ''), p_public: pub })
    const { error: e2 } = await supabase.from('user_settings').update({ email_notifications: emailN }).eq('user_id', user!.id)
    if (error || e2) return toast.error((error ?? e2)!.message); toast.success('Settings saved'); refresh()
  }
  return (<div className="max-w-xl"><PageHeader title="Profile & Settings" />
    <Card><form onSubmit={save} className="space-y-4">
      <Field label="Display name (shown on the leaderboard)"><input className="input" name="display" defaultValue={me?.display_name} maxLength={40} /></Field>
      <Field label="English level"><select className="input" name="level" defaultValue={student?.level}>{LEVELS.map(l => <option key={l.code} value={l.code}>{l.title}</option>)}</select></Field>
      <Field label="Phone (optional, visible to your teacher only)"><input className="input" name="phone" defaultValue={student?.phone ?? ''} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pub} onChange={e => setPub(e.target.checked)} /> Show me on the public leaderboard</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={emailN} onChange={e => setEmailN(e.target.checked)} /> Email notifications</label>
      <button className="btn-primary">Save</button></form></Card></div>)
}
