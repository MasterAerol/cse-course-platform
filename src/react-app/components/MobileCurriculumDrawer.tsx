import type { StudentCourseCurriculum } from '../lib/api'
import { CourseCurriculumSidebar } from './CourseCurriculumSidebar'

interface MobileCurriculumDrawerProps {
  curriculum: StudentCourseCurriculum
  currentLessonPublicId: string
  open: boolean
  onClose: () => void
}

export function MobileCurriculumDrawer({
  curriculum,
  currentLessonPublicId,
  open,
  onClose,
}: MobileCurriculumDrawerProps) {
  if (!open) {
    return null
  }

  return (
    <div className="drawer-backdrop" role="presentation">
      <aside
        className="mobile-curriculum-drawer"
        aria-label="Mobile course curriculum"
      >
        <div className="drawer-header">
          <h2>Curriculum</h2>
          <button type="button" aria-label="Close curriculum" onClick={onClose}>
            Close
          </button>
        </div>
        <CourseCurriculumSidebar
          curriculum={curriculum}
          currentLessonPublicId={currentLessonPublicId}
          compact
        />
      </aside>
    </div>
  )
}
