import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, useAsync, Skeletons, ErrorBox, Badge, Modal, Field, Empty } from '../../components/ui'
import { LEVELS, Level, ExerciseType } from '../../lib/types'

const lines = (s: FormDataEntryValue | null) => String(s ?? '').split('\n').map(x => x.trim()).filter(Boolean)

export default function Content() {
  const [level, setLevel] = useState<Level>('A1'); const [lesson, setLesson] = useState<any>(null); const [form, setForm] = useState<'unit' | 'lesson' | 'exercise' | 'topic' | null>(null); const [unitId, setUnitId] = useState<string>('')
  const { data, loading, error, reload } = useAsync(async () => {
    const { data: units, error } = await supabase.from('units').select('*, lessons(id, position, title, published)').eq('level', level).order('position'); if (error) throw error
    return units as any[]
  }, [level])
  const toggle = async (table: 'units' | 'lessons' | 'exercises', row: any) => { const { error } = await supabase.from(table).update({ published: !row.published }).eq('id', row.id); error ? toast.error(error.message) : (reload(), lesson && setLesson({ ...lesson })) }

  const addUnit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget)
    const { error } = await supabase.from('units').insert({ level, position: Number(f.get('pos')), title: String(f.get('title')), description: String(f.get('desc')) || null }); error ? toast.error(error.message) : (setForm(null), reload()) }
  const addLesson = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget)
    const { error } = await supabase.from('lessons').insert({ unit_id: unitId, position: Number(f.get('pos')), title: String(f.get('title')) }); error ? toast.error(error.message) : (setForm(null), reload()) }
  const addTopic = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget)
    const { error } = await supabase.from('essay_topics').insert({ level: String(f.get('level')), kind: String(f.get('kind')), title: String(f.get('title')), instructions: String(f.get('instr')), min_words: Number(f.get('min') || 50), max_words: f.get('max') ? Number(f.get('max')) : null, vocabulary: String(f.get('vocab')).split(',').map(s => s.trim()).filter(Boolean), published: true }); error ? toast.error(error.message) : (toast.success('Topic added'), setForm(null)) }

  return (<div><PageHeader title="Content Management" subtitle="Add and publish units, lessons, exercises and essay topics without touching code." actions={<><button className="btn-ghost" onClick={() => setForm('topic')}>New essay topic</button><button className="btn-primary" onClick={() => setForm('unit')}>New unit</button></>} />
    <div className="mb-4 flex flex-wrap gap-2">{LEVELS.map(l => <button key={l.code} className={level === l.code ? 'btn-primary' : 'btn-ghost'} onClick={() => setLevel(l.code)}>{l.code}</button>)}</div>
    {loading ? <Skeletons /> : error ? <ErrorBox error={error} retry={reload} /> : !data!.length ? <Empty title="No units for this level" /> : <div className="space-y-3">{data!.map(u => <Card key={u.id}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><b>Unit {u.position}: {u.title}</b> <Badge kind={u.published ? 'paid' : 'unpaid'}>{u.published ? 'published' : 'draft'}</Badge></div>
        <div className="flex gap-2"><button className="btn-ghost !py-1.5 text-xs" onClick={() => toggle('units', u)}>{u.published ? 'Unpublish' : 'Publish'}</button><button className="btn-ghost !py-1.5 text-xs" onClick={() => { setUnitId(u.id); setForm('lesson') }}>+ Lesson</button></div></div>
      <div className="mt-2 space-y-1">{[...(u.lessons ?? [])].sort((a: any, b: any) => a.position - b.position).map((l: any) => <div key={l.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"><span>Lesson {l.position}: {l.title} <Badge kind={l.published ? 'paid' : 'unpaid'}>{l.published ? 'published' : 'draft'}</Badge></span>
        <span className="flex gap-2"><button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => toggle('lessons', l)}>{l.published ? 'Unpublish' : 'Publish'}</button><button className="btn-primary !px-2 !py-1 text-xs" onClick={() => setLesson(l)}>Exercises</button></span></div>)}</div></Card>)}</div>}
    <Modal open={form === 'unit'} onClose={() => setForm(null)} title="New unit"><form onSubmit={addUnit} className="space-y-3"><Field label="Position"><input name="pos" type="number" min={1} required className="input" /></Field><Field label="Title"><input name="title" required className="input" /></Field><Field label="Description"><input name="desc" className="input" /></Field><button className="btn-primary">Add unit</button></form></Modal>
    <Modal open={form === 'lesson'} onClose={() => setForm(null)} title="New lesson"><form onSubmit={addLesson} className="space-y-3"><Field label="Position"><input name="pos" type="number" min={1} required className="input" /></Field><Field label="Title"><input name="title" required className="input" /></Field><button className="btn-primary">Add lesson</button></form></Modal>
    <Modal open={form === 'topic'} onClose={() => setForm(null)} title="New essay topic"><form onSubmit={addTopic} className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Level"><select name="level" className="input" defaultValue={level}>{LEVELS.map(l => <option key={l.code}>{l.code}</option>)}</select></Field><Field label="Kind"><select name="kind" className="input"><option value="general">General</option><option value="ielts_task1">IELTS Task 1</option><option value="ielts_task2">IELTS Task 2</option></select></Field></div>
      <Field label="Title"><input name="title" required className="input" /></Field><Field label="Instructions"><textarea name="instr" required className="input" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Min words"><input name="min" type="number" className="input" defaultValue={50} /></Field><Field label="Max words"><input name="max" type="number" className="input" /></Field></div><Field label="Vocabulary (comma separated)"><input name="vocab" className="input" /></Field><button className="btn-primary">Add topic</button></form></Modal>
    {lesson && <Exercises lesson={lesson} onClose={() => setLesson(null)} toggle={toggle} />}</div>)
}

function Exercises({ lesson, onClose, toggle }: { lesson: any; onClose: () => void; toggle: any }) {
  const [type, setType] = useState<ExerciseType>('mcq')
  const { data, loading, reload } = useAsync(async () => (await supabase.from('exercises').select('*').eq('lesson_id', lesson.id).order('position')).data as any[], [lesson.id])
  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); let ddata: any = {}, key: any
    if (type === 'mcq' || type === 'reading') { const opts = lines(f.get('opts')); ddata = { options: opts, ...(type === 'reading' ? { passage: String(f.get('passage')) } : {}) }; key = { correct: String(Number(f.get('correct')) - 1) } }
    else if (type === 'order') { const w = String(f.get('words')).trim().split(/\s+/); ddata = { words: [...w].sort(() => Math.random() - 0.5) }; key = { correct: w } }
    else if (type === 'match') { const p = lines(f.get('pairs')).map(l => l.split('=').map(s => s.trim())); ddata = { left: p.map(x => x[0]), right: [...p.map(x => x[1])].sort(() => Math.random() - 0.5) }; key = { correct: Object.fromEntries(p) } }
    else key = { accepted: lines(f.get('accepted')) }
    const manual = f.get('manual') === 'on' || type === 'short'
    const { data: ex, error } = await supabase.from('exercises').insert({ lesson_id: lesson.id, position: (data?.length ?? 0) + 1, type, prompt: String(f.get('prompt')), data: ddata, max_points: Number(f.get('pts') || 10), explanation: String(f.get('expl')) || null, manual_grading: manual, published: f.get('pub') === 'on' }).select().single()
    if (error) return toast.error(error.message)
    const { error: e2 } = await supabase.from('exercise_keys').insert({ exercise_id: ex.id, answer: key }); e2 ? toast.error(e2.message) : (toast.success('Exercise added'), (e.target as HTMLFormElement).reset(), reload())
  }
  return (<Modal open onClose={onClose} title={`Exercises — ${lesson.title}`}>
    {loading ? <Skeletons n={2} /> : <div className="mb-4 max-h-40 space-y-1 overflow-y-auto text-sm">{(data ?? []).map(x => <div key={x.id} className="flex justify-between"><span>{x.position}. [{x.type}] {x.prompt}</span><button className="underline text-xs" onClick={async () => { await toggle('exercises', x); reload() }}>{x.published ? 'unpublish' : 'publish'}</button></div>)}{!data?.length && <p className="text-slate-400">No exercises yet.</p>}</div>}
    <form onSubmit={add} className="space-y-2 border-t border-white/10 pt-3"><Field label="Type"><select className="input" value={type} onChange={e => setType(e.target.value as ExerciseType)}>{['mcq', 'fill', 'order', 'match', 'translation', 'reading', 'short'].map(t => <option key={t}>{t}</option>)}</select></Field>
      {type === 'reading' && <Field label="Passage"><textarea name="passage" className="input" /></Field>}
      <Field label="Prompt"><input name="prompt" required className="input" /></Field>
      {(type === 'mcq' || type === 'reading') && <><Field label="Options (one per line)"><textarea name="opts" className="input" required /></Field><Field label="Correct option number"><input name="correct" type="number" min={1} className="input" required /></Field></>}
      {type === 'order' && <Field label="Correct sentence (words are shuffled for students)"><input name="words" className="input" required /></Field>}
      {type === 'match' && <Field label="Pairs, one per line: left=right"><textarea name="pairs" className="input" required /></Field>}
      {['fill', 'translation', 'short'].includes(type) && <Field label="Accepted answers (one per line; ignored if manual grading)"><textarea name="accepted" className="input" /></Field>}
      <div className="grid grid-cols-2 gap-3"><Field label="Points"><input name="pts" type="number" defaultValue={10} min={0} max={100} className="input" /></Field><Field label="Explanation"><input name="expl" className="input" /></Field></div>
      <label className="block text-sm"><input type="checkbox" name="manual" /> Manual grading</label><label className="block text-sm"><input type="checkbox" name="pub" defaultChecked /> Published</label>
      <button className="btn-primary">Add exercise</button></form></Modal>)
}
