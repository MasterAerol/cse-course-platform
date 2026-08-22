import { Route, Routes } from 'react-router'

import { AdminRoute } from './components/AdminRoute'
import { AdminLayout } from './components/admin/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PremiumRoute } from './components/PremiumRoute'
import { PublicOnlyRoute } from './components/PublicOnlyRoute'
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage'
import { AdminCourseBuilderPage } from './pages/admin/AdminCourseBuilderPage'
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminBusinessPage } from './pages/admin/AdminBusinessPage'
import { AdminCommercialLearnersPage } from './pages/admin/AdminCommercialLearnersPage'
import { AdminCommercialSettingsPage } from './pages/admin/AdminCommercialSettingsPage'
import { AdminFeedbackPage } from './pages/admin/AdminFeedbackPage'
import { AdminLearnerAccessPage } from './pages/admin/AdminLearnerAccessPage'
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage'
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage'
import { CourseCatalogPage } from './pages/CourseCatalogPage'
import { CourseDetailPage } from './pages/CourseDetailPage'
import { DashboardPage } from './pages/DashboardPage'
import { EmailVerificationPage } from './pages/EmailVerificationPage'
import { ExamCalendarPage } from './pages/ExamCalendarPage'
import { HomePage } from './pages/HomePage'
import { LessonPage } from './pages/LessonPage'
import { LoginPage } from './pages/LoginPage'
import { MistakeNotebookDetailPage } from './pages/MistakeNotebookDetailPage'
import { MistakeNotebookPage } from './pages/MistakeNotebookPage'
import { AccountPage } from './pages/AccountPage'
import { ReadinessPage } from './pages/ReadinessPage'
import { PracticeAttemptPage } from './pages/PracticeAttemptPage'
import { PracticeResultPage } from './pages/PracticeResultPage'
import { QuizAttemptPage } from './pages/QuizAttemptPage'
import { QuizResultPage } from './pages/QuizResultPage'
import { RegistrationPage } from './pages/RegistrationPage'
import { SmartRecoveryPage } from './pages/SmartRecoveryPage'
import { SmartRecoveryAttemptPage } from './pages/SmartRecoveryAttemptPage'
import { SmartRecoveryResultPage } from './pages/SmartRecoveryResultPage'
import { SmartRecoverySkillPage } from './pages/SmartRecoverySkillPage'
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
        <Route path="verify-email" element={<EmailVerificationPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="exam-calendar" element={<ExamCalendarPage />} />
        <Route path="mistake-notebook" element={<PremiumRoute feature="mistake_notebook"><MistakeNotebookPage /></PremiumRoute>} />
        <Route path="readiness" element={<PremiumRoute feature="readiness_score"><ReadinessPage /></PremiumRoute>} />
        <Route path="mistake-notebook/:entryId" element={<PremiumRoute feature="mistake_notebook"><MistakeNotebookDetailPage /></PremiumRoute>} />
        <Route path="smart-recovery" element={<PremiumRoute feature="smart_recovery"><SmartRecoveryPage /></PremiumRoute>} />
        <Route
          path="smart-recovery/skills/:skillSlug"
          element={<PremiumRoute feature="smart_recovery"><SmartRecoverySkillPage /></PremiumRoute>}
        />
        <Route
          path="smart-recovery/attempts/:attemptPublicId"
          element={<PremiumRoute feature="smart_recovery"><SmartRecoveryAttemptPage /></PremiumRoute>}
        />
        <Route
          path="smart-recovery/attempts/:attemptPublicId/results"
          element={<PremiumRoute feature="smart_recovery"><SmartRecoveryResultPage /></PremiumRoute>}
        />
        <Route path="assessments/:assessmentSlug" element={<PremiumRoute feature="subject_assessments"><SubjectAssessmentPage /></PremiumRoute>} />
        <Route path="assessment-attempts/:attemptPublicId" element={<PremiumRoute feature="subject_assessments"><SubjectAssessmentAttemptPage /></PremiumRoute>} />
        <Route path="assessment-attempts/:attemptPublicId/results" element={<PremiumRoute feature="subject_assessments"><SubjectAssessmentResultPage /></PremiumRoute>} />
        <Route path="assessment-attempts/:attemptPublicId/review" element={<PremiumRoute feature="subject_assessments"><SubjectAssessmentReviewPage /></PremiumRoute>} />
        <Route path="mock-examinations/:mockExamSlug" element={<PremiumRoute feature="full_mock"><MockExamPage /></PremiumRoute>} />
        <Route path="mock-exam-attempts/:attemptPublicId" element={<PremiumRoute feature="full_mock"><MockExamAttemptPage /></PremiumRoute>} />
        <Route path="mock-exam-attempts/:attemptPublicId/results" element={<PremiumRoute feature="full_mock"><MockExamResultPage /></PremiumRoute>} />
        <Route path="mock-exam-attempts/:attemptPublicId/review" element={<PremiumRoute feature="full_mock"><MockExamReviewPage /></PremiumRoute>} />
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
            <Route path="commercial-learners" element={<AdminCommercialLearnersPage />} />
            <Route path="commercial-learners/:learnerId" element={<AdminLearnerAccessPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="business" element={<AdminBusinessPage />} />
            <Route path="commercial-settings" element={<AdminCommercialSettingsPage />} />
            <Route path="feedback" element={<AdminFeedbackPage />} />
            <Route path="audit-log" element={<AdminAuditLogPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
