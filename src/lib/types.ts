export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'IELTS'
export const LEVELS: { code: Level; title: string }[] = [
  { code: 'A1', title: 'A1 — Beginner' }, { code: 'A2', title: 'A2 — Elementary' },
  { code: 'B1', title: 'B1 — Intermediate' }, { code: 'B2', title: 'B2 — Upper-Intermediate' },
  { code: 'IELTS', title: 'IELTS Preparation' }
]
export type ExerciseType = 'mcq' | 'fill' | 'order' | 'match' | 'translation' | 'reading' | 'short'
export interface Exercise { id: string; lesson_id: string; position: number; type: ExerciseType; prompt: string; data: any; max_points: number; explanation: string | null; manual_grading: boolean }
export interface Unit { id: string; level: Level; position: number; title: string; description: string | null; published: boolean }
export interface Lesson { id: string; unit_id: string; position: number; title: string; published: boolean }
export interface CheckResult { correct: boolean | null; pending: boolean; points: number; explanation: string | null; already_scored?: boolean }
export type PaymentStatus = 'paid' | 'due_soon' | 'due_today' | 'overdue' | 'unpaid'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export const GRADE_LABELS: Record<number, string> = { 1: 'Very poor', 2: 'Needs significant improvement', 3: 'Satisfactory', 4: 'Good', 5: 'Excellent' }
