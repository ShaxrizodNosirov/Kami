import { Routes, Route, Navigate } from 'react-router-dom'
import { Home, Layers, PenLine, BarChart3, Trophy, Award, Bell, Settings, GraduationCap, Users, CalendarCheck, Wallet, ClipboardList, FileCheck2, NotebookPen, LineChart as LC, Library, LayoutDashboard, ClipboardCheck } from 'lucide-react'
import { RequireRole } from './auth/guards'
import { Shell } from './components/Shell'
import Landing from './pages/Landing'
import { Login, Register, TeacherLogin } from './pages/AuthPages'
import GuestLearn from './pages/GuestLearn'
import { isConfigured } from './lib/supabase'
import Dashboard from './pages/student/Dashboard'
import Learn from './pages/student/Learn'
import Runner from './pages/student/Runner'
import Essays from './pages/student/Essays'
import EssayEditor from './pages/student/EssayEditor'
import Progress from './pages/student/Progress'
import Ranking from './pages/Ranking'
import Achievements from './pages/student/Achievements'
import Notifications from './pages/Notifications'
import StudentSettings from './pages/student/Settings'
import Assignments from './pages/student/Assignments'
import TDashboard from './pages/teacher/Dashboard'
import Students from './pages/teacher/Students'
import StudentProfile from './pages/teacher/StudentProfile'
import Attendance from './pages/teacher/Attendance'
import Payments from './pages/teacher/Payments'
import TAssignments from './pages/teacher/Assignments'
import Results from './pages/teacher/Results'
import EssayReview from './pages/teacher/EssayReview'
import Reports from './pages/teacher/Reports'
import Content from './pages/teacher/Content'
import TSettings from './pages/teacher/Settings'

const studentNav = [
  { to: '/app', label: 'Dashboard', icon: <Home className="h-5 w-5" />, end: true },
  { to: '/app/learn', label: 'Units & Lessons', icon: <Layers className="h-5 w-5" /> },
  { to: '/app/assignments', label: 'Assignments', icon: <ClipboardList className="h-5 w-5" /> },
  { to: '/app/essays', label: 'Writing & Essays', icon: <PenLine className="h-5 w-5" /> },
  { to: '/app/progress', label: 'My Progress', icon: <BarChart3 className="h-5 w-5" /> },
  { to: '/app/ranking', label: 'Student Ranking', icon: <Trophy className="h-5 w-5" /> },
  { to: '/app/achievements', label: 'Achievements', icon: <Award className="h-5 w-5" /> },
  { to: '/app/notifications', label: 'Notifications', icon: <Bell className="h-5 w-5" /> },
  { to: '/app/settings', label: 'Profile & Settings', icon: <Settings className="h-5 w-5" /> }
]
const teacherNav = [
  { to: '/teacher', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, end: true },
  { to: '/teacher/students', label: 'Student Register', icon: <Users className="h-5 w-5" /> },
  { to: '/teacher/attendance', label: 'Attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { to: '/teacher/payments', label: 'Monthly Payments', icon: <Wallet className="h-5 w-5" /> },
  { to: '/teacher/assignments', label: 'Assignments', icon: <ClipboardList className="h-5 w-5" /> },
  { to: '/teacher/results', label: 'Exercise Results', icon: <ClipboardCheck className="h-5 w-5" /> },
  { to: '/teacher/essays', label: 'Essay Review', icon: <FileCheck2 className="h-5 w-5" /> },
  { to: '/teacher/ranking', label: 'Student Ranking', icon: <Trophy className="h-5 w-5" /> },
  { to: '/teacher/reports', label: 'Reports & Statistics', icon: <LC className="h-5 w-5" /> },
  { to: '/teacher/content', label: 'Content Management', icon: <Library className="h-5 w-5" /> },
  { to: '/teacher/notifications', label: 'Notifications', icon: <Bell className="h-5 w-5" /> },
  { to: '/teacher/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> }
]

export default function App() {
  return (
    <>
      {!isConfigured && <div className="bg-amber-500/20 px-4 py-2 text-center text-xs text-amber-200">Supabase is not configured — copy .env.example to .env and set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.</div>}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/learn/*" element={<GuestLearn />} />

        <Route path="/app" element={<RequireRole role="student"><Shell items={studentNav} base="/app" portal="Student Portal" /></RequireRole>}>
          <Route index element={<Dashboard />} />
          <Route path="learn" element={<Learn />} />
          <Route path="lesson/:lessonId" element={<Runner />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="assignment/:assignmentId" element={<Runner />} />
          <Route path="essays" element={<Essays />} />
          <Route path="essays/:topicId" element={<EssayEditor />} />
          <Route path="progress" element={<Progress />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<StudentSettings />} />
        </Route>

        <Route path="/teacher" element={<RequireRole role="teacher"><Shell items={teacherNav} base="/teacher" portal="Teacher Dashboard" /></RequireRole>}>
          <Route index element={<TDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentProfile />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="payments" element={<Payments />} />
          <Route path="assignments" element={<TAssignments />} />
          <Route path="results" element={<Results />} />
          <Route path="essays" element={<EssayReview />} />
          <Route path="ranking" element={<Ranking teacher />} />
          <Route path="reports" element={<Reports />} />
          <Route path="content" element={<Content />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<TSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
