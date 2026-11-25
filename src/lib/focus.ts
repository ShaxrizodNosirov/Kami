/** Counts qualifying exits for focus mode. visibilitychange + blur often fire together for ONE exit; they are merged. */
export const WARNINGS: Record<number, string> = {
  1: 'Warning 1 of 3. You left the assessment. Please return to your exercise. Repeated exits may reset this assessment.',
  2: 'Warning 2 of 3. This is your second exit. One more exit will trigger the configured assessment reset.',
  3: "Warning 3 of 3. The assessment will now be reset according to your teacher's rules."
}
export class ExitTracker {
  count = 0
  private lastExit = -Infinity
  private away = false
  private mergeMs: number
  constructor(mergeMs = 1500) { this.mergeMs = mergeMs }
  /** Returns the warning number (1..3) if this is a NEW qualifying exit, otherwise null. */
  leave(now: number): number | null {
    if (this.away || now - this.lastExit < this.mergeMs) return null   // already away, or duplicate event for same exit
    this.away = true; this.lastExit = now; this.count += 1
    return Math.min(this.count, 3)
  }
  /** Student came back. */
  back() { this.away = false }
  reset() { this.count = 0; this.away = false; this.lastExit = -Infinity }
  get shouldReset() { return this.count >= 3 }
}
