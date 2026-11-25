import { useAuth } from '../../auth/AuthContext'
import { Curriculum } from '../../components/Curriculum'
import { PageHeader } from '../../components/ui'
import { LEVELS } from '../../lib/types'
export default function Learn() {
  const { student } = useAuth()
  return (<div><PageHeader title="Units & Lessons" subtitle={LEVELS.find(l => l.code === student?.level)?.title} />
    <Curriculum level={student!.level} lessonHref={id => `/app/lesson/${id}`} /></div>)
}
