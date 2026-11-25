import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons } from '../../components/ui'

export default function Settings() {
  const { data, loading, reload } = useAsync(async () => { const { data } = await supabase.from('app_settings').select('value').eq('key', 'leaderboard').maybeSingle(); return (data?.value as any)?.public ?? true }, [])
  const set = async (v: boolean) => { const { error } = await supabase.from('app_settings').upsert({ key: 'leaderboard', value: { public: v } }); error ? toast.error(error.message) : (toast.success('Saved'), reload()) }
  if (loading) return <Skeletons n={1} />
  return (<div className="max-w-xl"><PageHeader title="Settings" /><Card><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={!!data} onChange={e => set(e.target.checked)} /> Show the public student leaderboard to students (you always see it)</label>
    <p className="mt-3 text-xs text-slate-400">Individual students can also be hidden from rankings on their profile. Students appear under their display name only.</p></Card></div>)
}
