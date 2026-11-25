/** Mirrors the server formula in SQL (_scores). The server is authoritative; this is used for display & tests. */
export interface AttemptLite { exerciseId: string; correct: boolean; maxPoints: number; invalidated?: boolean }
/** Points count only for the FIRST valid correct attempt per exercise. Repeats and invalidated attempts add nothing. */
export function exercisePoints(attempts: AttemptLite[]): { points: number; completed: number } {
  const done = new Set<string>(); let points = 0
  for (const a of attempts) {
    if (a.invalidated || !a.correct || done.has(a.exerciseId)) continue
    done.add(a.exerciseId); points += a.maxPoints
  }
  return { points, completed: done.size }
}
export const essayPoints = (teacherGrades: number[]) => teacherGrades.reduce((s, g) => s + Math.max(1, Math.min(5, g)) * 10, 0)
export const totalScore = (ex: number, essay: number) => ex + essay
export const percent = (a: number, b: number) => (b <= 0 ? 0 : Math.round((1000 * a) / b) / 10)
/** Normalisation used by the server grader (norm_text) — kept in sync for tests. */
export const normalizeText = (t: string) => t.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '').toLowerCase()
export const matchesAny = (answer: string, accepted: string[]) => { const n = normalizeText(answer); return n !== '' && accepted.some(a => normalizeText(a) === n) }
