import { Route, Routes } from 'react-router'

import { AdminRoute } from './components/AdminRoute'
import { AdminLayout } from './components/admin/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicOnlyRoute } from './components/PublicOnlyRoute'
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage'
import { AdminCourseBuilderPage } from './pages/admin/AdminCourseBuilderPage'
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage'
import { CourseCatalogPage } from './pages/CourseCatalogPage'
import { CourseDetailPage } from './pages/CourseDetailPage'
import { DashboardPage } from './pages/DashboardPage'
import { HomePage } from './pages/HomePage'
import { LessonPage } from './pages/LessonPage'
import { LoginPage } from './pages/LoginPage'
import { PracticeAttemptPage } from './pages/PracticeAttemptPage'
import { PracticeResultPage } from './pages/PracticeResultPage'
import { QuizAttemptPage } from './pages/QuizAttemptPage'
import { QuizResultPage } from './pages/QuizResultPage'
import { RegistrationPage } from './pages/RegistrationPage'
import { SubjectAssessmentPage } from './pages/SubjectAssessmentPage'
import { SubjectAssessmentAttemptPage } from './pages/SubjectAssessmentAttemptPage'
import { SubjectAssessmentResultPage } from './pages/SubjectAssessmentResultPage'
import { SubjectAssessmentReviewPage } from './pages/SubjectAssessmentReviewPage'
import { MockExamPage } from './pages/MockExamPage'
import { MockExamAttemptPage } from './pages/MockExamAttemptPage'
import { MockExamResultPage } from './pages/MockExamResultPage'
import { MockExamReviewPage } from './pages/MockExamReviewPage'

export function App() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="courses" element={<CourseCatalogPage />} />
      <Route path="courses/:courseSlug" element={<CourseDetailPage />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegistrationPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="assessments/:assessmentSlug" element={<SubjectAssessmentPage />} />
        <Route path="assessment-attempts/:attemptPublicId" element={<SubjectAssessmentAttemptPage />} />
        <Route path="assessment-attempts/:attemptPublicId/results" element={<SubjectAssessmentResultPage />} />
        <Route path="assessment-attempts/:attemptPublicId/review" element={<SubjectAssessmentReviewPage />} />
        <Route path="mock-examinations/:mockExamSlug" element={<MockExamPage />} />
        <Route path="mock-exam-attempts/:attemptPublicId" element={<MockExamAttemptPage />} />
        <Route path="mock-exam-attempts/:attemptPublicId/results" element={<MockExamResultPage />} />
        <Route path="mock-exam-attempts/:attemptPublicId/review" element={<MockExamReviewPage />} />
        <Route
          path="courses/:courseSlug/lessons/:lessonPublicId"
          element={<LessonPage />}
        />
        <Route
          path="practice-attempts/:attemptPublicId"
          element={<PracticeAttemptPage />}
        />
        <Route
          path="practice-attempts/:attemptPublicId/results"
          element={<PracticeResultPage />}
        />
        <Route
          path="quiz-attempts/:attemptPublicId"
          element={<QuizAttemptPage />}
        />
        <Route
          path="quiz-attempts/:attemptPublicId/results"
          element={<QuizResultPage />}
        />
        <Route element={<AdminRoute />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="courses" element={<AdminCoursesPage />} />
            <Route path="courses/:courseId" element={<AdminCourseBuilderPage />} />
            <Route path="students" element={<AdminStudentsPage />} />
            <Route path="audit-log" element={<AdminAuditLogPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
