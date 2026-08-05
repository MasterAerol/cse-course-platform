import type { StudentCourseCurriculum } from '../lib/curriculum.types'
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
    <div
      className="curriculum-drawer-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <aside
        className="mobile-curriculum-drawer"
        data-testid="curriculum-drawer"
        aria-label="Mobile course curriculum"
        onClick={(event) => event.stopPropagation()}
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
          onLessonNavigate={onClose}
        />
      </aside>
    </div>
  )
}
