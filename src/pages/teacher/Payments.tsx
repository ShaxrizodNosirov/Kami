import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Card, PageHeader, Stat, useAsync, Skeletons, ErrorBox, Empty, Badge, Modal, Field } from '../../components/ui'
import { remainingLabel, todayStr } from '../../lib/payments'
import { Wallet, AlertTriangle } from 'lucide-react'

export default function Payments() {
  const today = todayStr(); const [filter, setFilter] = useState(''); const [rec, setRec] = useState<any>(null); const [hist, setHist] = useState<any>(null)
  const { data, loading, error, reload } = useAsync(async () => {
    const [p, r] = await Promise.all([supabase.rpc('payment_overview'), supabase.from('payment_records').select('amount, paid_on')])
    if (p.error) throw p.error
    const m = today.slice(0, 7); const income = (r.data ?? []).filter((x: any) => x.paid_on.startsWith(m)).reduce((s: number, x: any) => s + Number(x.amount), 0)
    return { rows: p.data as any[], income }
  }, [])
  const outstanding = (data?.rows ?? []).filter(r => r.status === 'overdue' || r.status === 'unpaid').reduce((s, r) => s + Number(r.monthly_amount), 0)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    const { error } = await supabase.rpc('record_payment', { p_student: rec.student_id, p_amount: Number(f.get('amount')), p_paid_on: String(f.get('date')), p_method: String(f.get('method')) || null, p_reference: String(f.get('ref')) || null, p_note: String(f.get('note')) || null })
    error ? toast.error(error.message) : (toast.success('Payment recorded'), setRec(null), reload())
  }
  const openHist = async (r: any) => { const { data } = await supabase.from('payment_records').select('*').eq('student_id', r.student_id).order('paid_on', { ascending: false }); setHist({ r, rows: data ?? [] }) }
  if (loading) return <Skeletons />; if (error) return <ErrorBox error={error} retry={reload} />
  const rows = data!.rows.filter(r => !filter || r.status === filter).sort((a, b) => (a.days_remaining ?? -1e9) - (b.days_remaining ?? -1e9))
  return (<div><PageHeader title="Monthly Payments" subtitle="Payments are recorded manually. Each payment extends coverage by one billing month from the student's anchor date." />
    <div className="mb-5 grid gap-4 sm:grid-cols-2"><Stat label="Income this month" value={data!.income} icon={<Wallet />} /><Stat label="Outstanding (monthly fees of overdue/unpaid)" value={outstanding} icon={<AlertTriangle />} /></div>
    <div className="mb-4 flex flex-wrap gap-2">{['', 'paid', 'due_soon', 'due_today', 'overdue', 'unpaid'].map(s => <button key={s} className={filter === s ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilter(s)}>{s ? s.replace('_', ' ') : 'All'}</button>)}</div>
    {!rows.length ? <Empty title="No students in this filter" /> : <Card className="overflow-x-auto !p-2"><table className="w-full min-w-[800px]"><thead><tr>{['Student', 'Level', 'Monthly', 'Last payment', 'Paid through', 'Remaining', 'Status', ''].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
      <tbody>{rows.map(r => <tr key={r.student_id} className="border-t border-white/10"><td className="td font-medium">{r.full_name}</td><td className="td">{r.level}</td><td className="td">{r.monthly_amount}</td><td className="td text-xs">{r.last_paid_on ?? '—'}</td><td className="td text-xs">{r.paid_through ?? '—'}</td>
        <td className="td text-xs">{remainingLabel(r.paid_through, today)}</td><td className="td"><Badge kind={r.status}>{r.status.replace('_', ' ')}</Badge></td>
        <td className="td whitespace-nowrap"><button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => setRec(r)}>Record payment</button> <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => openHist(r)}>History</button></td></tr>)}</tbody></table></Card>}
    <Modal open={!!rec} onClose={() => setRec(null)} title={`Record payment — ${rec?.full_name}`}><form onSubmit={submit} className="space-y-3">
      <Field label="Amount"><input className="input" name="amount" type="number" step="0.01" min="0" required defaultValue={rec?.monthly_amount || ''} /></Field>
      <Field label="Payment date"><input className="input" name="date" type="date" required defaultValue={today} /></Field>
      <Field label="Method"><input className="input" name="method" placeholder="Cash, card, transfer…" /></Field><Field label="Reference"><input className="input" name="ref" /></Field><Field label="Note"><input className="input" name="note" /></Field>
      <button className="btn-primary">Save payment</button></form></Modal>
    <Modal open={!!hist} onClose={() => setHist(null)} title={`Payment history — ${hist?.r.full_name}`}>{!hist?.rows.length ? <p className="text-sm text-slate-400">No payments yet.</p> : hist.rows.map((p: any) => <div key={p.id} className="border-b border-white/10 py-2 text-sm">{p.paid_on} · <b>{p.amount}</b> · {p.period_start} → {p.period_end}{p.method ? ` · ${p.method}` : ''}{p.note ? <div className="text-xs text-slate-400">{p.note}</div> : null}</div>)}</Modal>
  </div>)
}
