import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAsync, Skeletons, ErrorBox, Empty, Card } from './ui'
import type { Level, Unit, Lesson } from '../lib/types'

/** Level → Unit → Lesson list (published content only; enforced by RLS). */
export function Curriculum({ level, lessonHref, doneByLesson }: { level: Level; lessonHref: (lessonId: string) => string; doneByLesson?: Record<string, number> }) {
  const { data, loading, error, reload } = useAsync(async () => {
    const { data: units, error: e1 } = await supabase.from('units').select('*').eq('level', level).order('position')
    if (e1) throw e1
    const ids = (units ?? []).map(u => u.id)
    const { data: lessons, error: e2 } = ids.length ? await supabase.from('lessons').select('*').in('unit_id', ids).order('position') : { data: [], error: null }
    if (e2) throw e2
    return { units: (units ?? []) as Unit[], lessons: (lessons ?? []) as Lesson[] }
  }, [level])
  const [open, setOpen] = useState<string | null>(null)
  if (loading) return <Skeletons />
  if (error) return <ErrorBox error={error} retry={reload} />
  if (!data!.units.length) return <Empty title="No published units yet" hint="Your teacher is preparing this level." />
  return (
    <div className="space-y-3">
      {data!.units.map(u => {
        const ls = data!.lessons.filter(l => l.unit_id === u.id)
        const isOpen = open === u.id
        return (
          <Card key={u.id} className="!p-0">
            <button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpen(isOpen ? null : u.id)} aria-expanded={isOpen}>
              <div><div className="text-xs text-slate-400">Unit {u.position}</div><div className="font-semibold">{u.title}</div>{u.description && <div className="text-xs text-slate-400">{u.description}</div>}</div>
              <ChevronDown className={`h-5 w-5 transition ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="border-t border-white/10 p-2">
              {ls.length === 0 ? <div className="p-3 text-sm text-slate-400">No lessons published yet.</div> : ls.map(l => (
                <Link key={l.id} to={lessonHref(l.id)} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm hover:bg-white/5">
                  <span>Lesson {l.position}: {l.title}</span>{doneByLesson && <span className="text-xs text-slate-400">{doneByLesson[l.id] ?? 0} done</span>}
                </Link>))}
            </div>}
          </Card>)
      })}
    </div>
  )
}
