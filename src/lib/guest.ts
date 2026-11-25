// Guest progress lives only in this browser (localStorage). Never sent to the teacher or the official ranking.
const KEY = 'kami.guest.v1'
export interface GuestState { level: string | null; done: Record<string, { points: number; at: number }>; attempts: number; correct: number }
const empty = (): GuestState => ({ level: null, done: {}, attempts: 0, correct: 0 })
export function loadGuest(): GuestState { try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return empty() } }
export function saveGuest(s: GuestState) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage full/blocked */ } }
export function recordGuestResult(exerciseId: string, correct: boolean, points: number) {
  const s = loadGuest(); s.attempts += 1
  if (correct) { s.correct += 1; if (!s.done[exerciseId]) s.done[exerciseId] = { points, at: Date.now() } }
  saveGuest(s); return s
}
export const guestPoints = (s: GuestState) => Object.values(s.done).reduce((a, d) => a + d.points, 0)
export const clearGuest = () => localStorage.removeItem(KEY)
