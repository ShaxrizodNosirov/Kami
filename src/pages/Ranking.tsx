import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Empty, Badge } from '../components/ui'
import { LEVELS } from '../lib/types'

export default function Ranking({ teacher = false }: { teacher?: boolean }) {
  const [level, setLevel] = useState<string>('')
  const { data, loading, error, reload } = useAsync(async () => {
    const { data, error } = await supabase.rpc('get_leaderboard', { p_level: level || null }); if (error) throw error; return data as any[]
  }, [level])
  return (
    <div><PageHeader title="Student Ranking" subtitle="Score = points from first-time correct answers + 10 × teacher grade (1–5) per essay. Repeated attempts never add points." />
      <div className="mb-5 flex flex-wrap gap-2">{[{ code: '', title: 'All' }, ...LEVELS].map(l => <button key={l.code} className={level === l.code ? 'btn-primary' : 'btn-ghost'} onClick={() => setLevel(l.code)}>{l.code || 'All students'}</button>)}</div>
      {loading ? <Skeletons /> : error ? <ErrorBox error={error} retry={reload} /> : !data!.length ? <Empty title="No ranked students yet" hint={teacher ? 'Rankings may be hidden in settings.' : undefined} /> :
        <Card className="overflow-x-auto !p-2"><table className="w-full min-w-[640px]"><thead><tr><th className="th">#</th><th className="th">Student</th><th className="th">Level</th><th className="th">Completed</th><th className="th">Completion</th><th className="th">Points</th><th className="th">Badges</th></tr></thead>
          <tbody>{data!.map((r, i) => (<tr key={i} className={`border-t border-white/10 ${r.is_me ? 'bg-violet-500/15' : ''}`}>
            <td className="td font-bold">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</td>
            <td className="td"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-teal-400 text-xs font-bold">{r.display_name?.[0]?.toUpperCase()}</span>{r.display_name}{r.is_me && <Badge>You</Badge>}</div></td>
            <td className="td">{r.level}</td><td className="td">{r.completed}</td><td className="td">{r.completion_pct}%</td><td className="td font-semibold">{r.points}</td><td className="td">{r.achievements}</td></tr>))}</tbody></table></Card>}
    </div>)
}
