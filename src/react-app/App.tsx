import { Route, Routes } from 'react-router'

import { AdminRoute } from './components/AdminRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicOnlyRoute } from './components/PublicOnlyRoute'
import { AdminPage } from './pages/AdminPage'
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
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
