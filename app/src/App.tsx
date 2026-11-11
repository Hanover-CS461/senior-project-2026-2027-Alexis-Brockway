import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GenrePage from './pages/GenrePage'
import GenreRulesPage from './pages/GenreRulesPage'
import SubmitPage from './pages/SubmitPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ReaderQueuePage from './pages/ReaderQueuePage'
import ReaderSubmissionPage from './pages/ReaderSubmissionPage'
import EditorDashboardPage from './pages/EditorDashboardPage'
import EditorSubmissionPage from './pages/EditorSubmissionPage'
import { RequireAuth } from './components/RequireAuth'
import { useAuth } from './lib/auth'
import { authLinkError } from './lib/supabase'

function App() {
  const { session, member, recovery, signOut } = useAuth()
  const location = useLocation()

  return (
    <div className="app-shell">
      <nav className="site-nav">
        <Link to="/" className="brand">
          The Journal
        </Link>
        <div className="nav-links">
          <Link to="/submit">Submit</Link>
          <Link to="/reader">Reader queue</Link>
          <Link to="/editor">Editor dashboard</Link>
          {session ? (
            <button type="button" className="btn nav-btn" onClick={signOut}>
              Log out {member?.name ?? ''}
            </button>
          ) : (
            <Link to="/login">Log in</Link>
          )}
        </div>
      </nav>

      <main className="content">
        {/* A password-reset email lands on the app root (see ForgotPasswordPage),
            so bounce the person to the form once the recovery session exists —
            and also when the link was rejected, so the failure gets explained
            instead of dumping them on the home page. */}
        {(recovery || authLinkError) && location.pathname !== '/reset-password' && (
          <Navigate to="/reset-password" replace />
        )}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/submit/genre" element={<GenrePage />} />
          <Route path="/submit/genre/:genreSlug" element={<GenreRulesPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/reader"
            element={
              <RequireAuth>
                <ReaderQueuePage />
              </RequireAuth>
            }
          />
          <Route
            path="/reader/:submissionId"
            element={
              <RequireAuth>
                <ReaderSubmissionPage />
              </RequireAuth>
            }
          />
          <Route
            path="/editor"
            element={
              <RequireAuth editor>
                <EditorDashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/editor/:submissionId"
            element={
              <RequireAuth editor>
                <EditorSubmissionPage />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App