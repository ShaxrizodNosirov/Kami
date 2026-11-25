import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Empty, Badge } from '../../components/ui'
import { LEVELS, Level } from '../../lib/types'

export default function Essays() {
  const { student, user } = useAuth(); const [level, setLevel] = useState<Level>(student!.level)
  const { data, loading, error, reload } = useAsync(async () => {
    const [t, e] = await Promise.all([
      supabase.from('essay_topics').select('*').eq('level', level).order('title'),
      supabase.from('essays').select('id, topic_id, status').eq('student_id', user!.id)
    ])
    if (t.error) throw t.error; return { t: t.data ?? [], e: e.data ?? [] }
  }, [level])
  return (
    <div><PageHeader title="Writing & Essays" subtitle="Choose a topic. Drafts autosave; submitted essays are kept as versions." />
      <div className="mb-5 flex flex-wrap gap-2">{LEVELS.map(l => <button key={l.code} className={level === l.code ? 'btn-primary' : 'btn-ghost'} onClick={() => setLevel(l.code)}>{l.code}</button>)}</div>
      {loading ? <Skeletons /> : error ? <ErrorBox error={error} retry={reload} /> : !data!.t.length ? <Empty title="No topics for this level yet" /> :
        <div className="grid gap-4 md:grid-cols-2">{data!.t.map((t: any) => { const es: any = data!.e.find((x: any) => x.topic_id === t.id)
          return (<Link key={t.id} to={`/app/essays/${t.id}`}><Card hover className="h-full"><div className="mb-2 flex items-center justify-between"><Badge>{t.kind === 'general' ? t.level : t.kind.replace('_', ' ').toUpperCase()}</Badge>{es && <Badge kind={es.status === 'reviewed' ? 'paid' : 'due_soon'}>{es.status}</Badge>}</div>
            <div className="font-semibold">{t.title}</div><p className="mt-1 line-clamp-2 text-sm text-slate-400">{t.instructions}</p><div className="mt-2 text-xs text-slate-500">{t.min_words}{t.max_words ? `–${t.max_words}` : '+'} words</div></Card></Link>) })}</div>}
    </div>)
}
