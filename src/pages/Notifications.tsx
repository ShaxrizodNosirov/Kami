import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Empty } from '../components/ui'
export default function Notifications() {
  const { data, loading, error, reload } = useAsync(async () => { const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100); if (error) throw error; return data as any[] }, [])
  const markAll = async () => { await supabase.rpc('mark_notifications_read', { p_ids: null }); reload() }
  return (<div><PageHeader title="Notifications" actions={<button className="btn-ghost" onClick={markAll}>Mark all as read</button>} />
    {loading ? <Skeletons /> : error ? <ErrorBox error={error} retry={reload} /> : !data!.length ? <Empty title="You're all caught up" /> :
      <div className="space-y-2">{data!.map(n => (<Card key={n.id} className={`!p-4 ${n.read_at ? 'opacity-60' : 'border-violet-400/40'}`}>
        <div className="flex justify-between gap-3"><div>{n.link ? <Link to={n.link} onClick={() => supabase.rpc('mark_notifications_read', { p_ids: [n.id] })} className="font-semibold underline-offset-2 hover:underline">{n.title}</Link> : <div className="font-semibold">{n.title}</div>}{n.body && <p className="text-sm text-slate-400">{n.body}</p>}</div>
          <span className="shrink-0 text-xs text-slate-500">{new Date(n.created_at).toLocaleString()}</span></div></Card>))}</div>}</div>)
}
