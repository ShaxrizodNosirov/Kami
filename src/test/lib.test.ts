import { describe, it, expect } from 'vitest'
import { addMonthsClamped, paymentStatus, remainingLabel, daysBetween } from '../lib/payments'
import { exercisePoints, essayPoints, matchesAny, percent } from '../lib/scoring'
import { ExitTracker } from '../lib/focus'
import { countWords } from '../lib/text'

describe('payments', () => {
  it('clamps month end without drift', () => {
    expect(addMonthsClamped('2025-01-31', 1)).toBe('2025-02-28')
    expect(addMonthsClamped('2025-01-31', 2)).toBe('2025-03-31')
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29')
    expect(addMonthsClamped('2025-11-15', 3)).toBe('2026-02-15')
  })
  it('status and labels', () => {
    expect(paymentStatus(null, '2025-05-01')).toBe('unpaid')
    expect(paymentStatus('2025-05-13', '2025-05-01')).toBe('paid')
    expect(paymentStatus('2025-05-05', '2025-05-01')).toBe('due_soon')
    expect(paymentStatus('2025-05-01', '2025-05-01')).toBe('due_today')
    expect(paymentStatus('2025-04-27', '2025-05-01')).toBe('overdue')
    expect(remainingLabel('2025-05-13', '2025-05-01')).toBe('12 days remaining')
    expect(remainingLabel('2025-05-01', '2025-05-01')).toBe('Expires today')
    expect(remainingLabel('2025-04-27', '2025-05-01')).toBe('Overdue by 4 days')
    expect(daysBetween('2025-03-29', '2025-03-31')).toBe(2)
  })
})
describe('scoring', () => {
  it('awards each exercise once and ignores invalidated attempts', () => {
    const r = exercisePoints([
      { exerciseId: 'a', correct: true, maxPoints: 10 }, { exerciseId: 'a', correct: true, maxPoints: 10 },
      { exerciseId: 'b', correct: false, maxPoints: 10 }, { exerciseId: 'b', correct: true, maxPoints: 5 },
      { exerciseId: 'c', correct: true, maxPoints: 10, invalidated: true }])
    expect(r).toEqual({ points: 15, completed: 2 })
  })
  it('essay grade points are separate and bounded', () => { expect(essayPoints([5, 3])).toBe(80); expect(essayPoints([9])).toBe(50) })
  it('text matching', () => {
    expect(matchesAny('  My name is Ali. ', ['My name is Ali'])).toBe(true)
    expect(matchesAny('I’m Ali', ["I'm Ali"])).toBe(true)
    expect(matchesAny('', [''])).toBe(false)
    expect(percent(1, 3)).toBe(33.3)
  })
})
describe('focus mode', () => {
  it('merges visibility+blur into one exit and warns 1,2,3', () => {
    const t = new ExitTracker()
    expect(t.leave(1000)).toBe(1); expect(t.leave(1100)).toBeNull()
    t.back(); expect(t.leave(1200)).toBeNull()
    expect(t.leave(5000)).toBe(2); t.back()
    expect(t.shouldReset).toBe(false)
    expect(t.leave(9000)).toBe(3); expect(t.shouldReset).toBe(true)
  })
})
describe('essay', () => { it('counts words', () => { expect(countWords('  one two\nthree ')).toBe(3); expect(countWords('')).toBe(0) }) })
